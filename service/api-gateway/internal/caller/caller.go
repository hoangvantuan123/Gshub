package caller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/golang/protobuf/jsonpb"
	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/dynamic"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/descriptorpb"
)

type CallResult struct {
	Success      bool        `json:"success"`
	Message      string      `json:"message"`
	Data         interface{} `json:"data,omitempty"`
	Page         interface{} `json:"page,omitempty"`
	PageInfo     interface{} `json:"pageInfo,omitempty"`
	Pagination   interface{} `json:"pagination,omitempty"`
	ErrorDetails interface{} `json:"errorDetails,omitempty"`
	RawResponse  []byte      `json:"-"` // Dùng để trả về dữ liệu thô
}

// nukeSignal xóa trường 'signal' ở bất kỳ tầng nào trong dữ liệu
// (Vì signal là AbortController của Frontend, không có trong Proto gRPC)
func nukeSignal(data interface{}) {
	if m, ok := data.(map[string]interface{}); ok {
		delete(m, "signal")
		for _, v := range m {
			nukeSignal(v)
		}
	} else if a, ok := data.([]interface{}); ok {
		for _, v := range a {
			nukeSignal(v)
		}
	}
}

// convertScalar ép kiểu dữ liệu từ JSON float64/int/string về đúng kiểu proto descriptor
func convertScalar(val interface{}, fd *desc.FieldDescriptor) interface{} {
	if val == nil || fd == nil {
		return val
	}
	switch fd.GetType() {
	case descriptorpb.FieldDescriptorProto_TYPE_INT64,
		descriptorpb.FieldDescriptorProto_TYPE_SINT64,
		descriptorpb.FieldDescriptorProto_TYPE_SFIXED64,
		descriptorpb.FieldDescriptorProto_TYPE_UINT64,
		descriptorpb.FieldDescriptorProto_TYPE_FIXED64:
		switch v := val.(type) {
		case float64:
			return int64(v)
		case float32:
			return int64(v)
		case int:
			return int64(v)
		case int32:
			return int64(v)
		case int64:
			return v
		case uint:
			return int64(v)
		case uint32:
			return int64(v)
		case uint64:
			return int64(v)
		case string:
			if i, err := strconv.ParseInt(strings.TrimSpace(v), 10, 64); err == nil {
				return i
			}
		}
	case descriptorpb.FieldDescriptorProto_TYPE_INT32,
		descriptorpb.FieldDescriptorProto_TYPE_SINT32,
		descriptorpb.FieldDescriptorProto_TYPE_SFIXED32,
		descriptorpb.FieldDescriptorProto_TYPE_UINT32,
		descriptorpb.FieldDescriptorProto_TYPE_FIXED32:
		switch v := val.(type) {
		case float64:
			return int32(v)
		case float32:
			return int32(v)
		case int:
			return int32(v)
		case int32:
			return v
		case int64:
			return int32(v)
		case uint:
			return int32(v)
		case uint32:
			return int32(v)
		case uint64:
			return int32(v)
		case string:
			if i, err := strconv.ParseInt(strings.TrimSpace(v), 10, 32); err == nil {
				return int32(i)
			}
		}
	case descriptorpb.FieldDescriptorProto_TYPE_DOUBLE:
		switch v := val.(type) {
		case float64:
			return v
		case float32:
			return float64(v)
		case int:
			return float64(v)
		case int64:
			return float64(v)
		case string:
			if d, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil {
				return d
			}
		}
	case descriptorpb.FieldDescriptorProto_TYPE_FLOAT:
		switch v := val.(type) {
		case float32:
			return v
		case float64:
			return float32(v)
		case int:
			return float32(v)
		case int64:
			return float32(v)
		case string:
			if d, err := strconv.ParseFloat(strings.TrimSpace(v), 32); err == nil {
				return float32(d)
			}
		}
	case descriptorpb.FieldDescriptorProto_TYPE_BOOL:
		switch v := val.(type) {
		case bool:
			return v
		case string:
			if b, err := strconv.ParseBool(strings.TrimSpace(v)); err == nil {
				return b
			}
		case int:
			return v != 0
		case float64:
			return v != 0
		}
	case descriptorpb.FieldDescriptorProto_TYPE_STRING:
		switch v := val.(type) {
		case string:
			return v
		case float64:
			return strconv.FormatFloat(v, 'f', -1, 64)
		default:
			return fmt.Sprintf("%v", v)
		}
	}
	return val
}

// fillMessage nạp dữ liệu từ map vào gRPC Message, hỗ trợ không phân biệt hoa thường và ép kiểu linh hoạt
func fillMessage(m *dynamic.Message, data map[string]interface{}) {
	descriptor := m.GetMessageDescriptor()
	for k, v := range data {
		var targetField *desc.FieldDescriptor
		cleanK := strings.ToLower(strings.ReplaceAll(k, "_", ""))
		for _, fd := range descriptor.GetFields() {
			cleanFdName := strings.ToLower(strings.ReplaceAll(fd.GetName(), "_", ""))
			if cleanFdName == cleanK {
				targetField = fd
				break
			}
		}

		if targetField == nil {
			continue
		}

		// ── Bước 1: Ép kiểu dữ liệu thông minh (Smart Type Conversion) ──
		finalVal := convertScalar(v, targetField)

		// ── Bước 2: Nạp dữ liệu vào Message theo cấu trúc Protobuf ──
		if targetField.IsMap() {
			if mapVal, ok := v.(map[string]interface{}); ok {
				for mk, mv := range mapVal {
					_ = m.TryPutMapField(targetField, mk, fmt.Sprintf("%v", mv))
				}
			} else {
				if err := m.TrySetField(targetField, finalVal); err != nil {
					Log.Warn("TrySetField error", zap.String("field", targetField.GetName()), zap.Any("val", finalVal), zap.Error(err))
				}
			}
		} else if targetField.IsRepeated() {
			if slice, ok := v.([]interface{}); ok {
				for _, item := range slice {
					if itemMap, ok := item.(map[string]interface{}); ok && targetField.GetMessageType() != nil {
						subMsg := dynamic.NewMessage(targetField.GetMessageType())
						fillMessage(subMsg, itemMap)
						if err := m.TryAddRepeatedField(targetField, subMsg); err != nil {
							Log.Warn("TryAddRepeatedField subMsg error", zap.String("field", targetField.GetName()), zap.Error(err))
						}
					} else {
						repVal := convertScalar(item, targetField)
						if err := m.TryAddRepeatedField(targetField, repVal); err != nil {
							Log.Warn("TryAddRepeatedField scalar error", zap.String("field", targetField.GetName()), zap.Any("val", repVal), zap.Error(err))
						}
					}
				}
			} else if itemMap, ok := v.(map[string]interface{}); ok && targetField.GetMessageType() != nil {
				// Hỗ trợ trường hợp client gửi 1 object đơn lẻ cho trường repeated message
				subMsg := dynamic.NewMessage(targetField.GetMessageType())
				fillMessage(subMsg, itemMap)
				if err := m.TryAddRepeatedField(targetField, subMsg); err != nil {
					Log.Warn("TryAddRepeatedField single subMsg error", zap.String("field", targetField.GetName()), zap.Error(err))
				}
			} else {
				// Hỗ trợ trường hợp client gửi 1 giá trị scalar đơn lẻ cho trường repeated scalar
				repVal := convertScalar(v, targetField)
				if err := m.TryAddRepeatedField(targetField, repVal); err != nil {
					Log.Warn("TryAddRepeatedField single scalar error", zap.String("field", targetField.GetName()), zap.Any("val", repVal), zap.Error(err))
				}
			}
		} else if targetField.GetMessageType() != nil {
			// Object lồng nhau (Nested message)
			if subMap, ok := v.(map[string]interface{}); ok {
				subMsg := dynamic.NewMessage(targetField.GetMessageType())
				fillMessage(subMsg, subMap)
				m.SetField(targetField, subMsg)
			}
		} else {
			// Trường đơn (string, int...)
			if err := m.TrySetField(targetField, finalVal); err != nil {
				Log.Warn("TrySetField error", zap.String("field", targetField.GetName()), zap.Any("val", finalVal), zap.Error(err))
			}
		}
	}

	// Tự động nạp toàn bộ body vào filters_json nếu proto có hỗ trợ
	for _, fd := range descriptor.GetFields() {
		if strings.EqualFold(fd.GetName(), "filters_json") || strings.EqualFold(fd.GetName(), "filtersJson") {
			if jsonBytes, err := json.Marshal(data); err == nil {
				_ = m.TrySetField(fd, string(jsonBytes))
			}
			break
		}
	}
}

func Invoke(
	ctx context.Context,
	conn *grpc.ClientConn,
	methodPath string,
	body map[string]interface{},
	authHeader string,
	clientIP string,
	requestID string,
	timeoutSec int,
) CallResult {
	var err error

	// Dynamic Timeout: Mặc định 60 giây, hỗ trợ nâng lên tới 600 giây (10 phút) cho tác vụ nặng (Export, Giá thành...)
	callTimeout := 60 * time.Second
	if timeoutSec > 0 {
		if timeoutSec > 600 {
			timeoutSec = 600
		} else if timeoutSec < 5 {
			timeoutSec = 5
		}
		callTimeout = time.Duration(timeoutSec) * time.Second
	}

	ctx, cancel := context.WithTimeout(ctx, callTimeout)
	defer cancel()

	reflector := GetReflector()
	md := reflector.GetMethod(methodPath)
	if md == nil {
		return CallResult{Success: false, Message: fmt.Sprintf("gRPC method not found: %s", methodPath)}
	}

	inputType := md.GetInputType()
	reqMsg := dynamic.NewMessage(inputType)

	// ── 1. Chuẩn bị dữ liệu ─────────────────────────────────────────────
	nukeSignal(body)

	if body["result"] == nil {
		var resultField *desc.FieldDescriptor
		for _, fd := range inputType.GetFields() {
			if strings.EqualFold(fd.GetName(), "result") {
				resultField = fd
				break
			}
		}

		if resultField != nil {
			newResult := make(map[string]interface{})
			for k, v := range body {
				if !strings.EqualFold(k, "metadata") && !strings.EqualFold(k, "result") {
					newResult[k] = v
				}
			}
			if len(newResult) > 0 {
				// Xóa các trường cũ đã được gom
				for k := range newResult {
					delete(body, k)
				}
				if resultField.IsRepeated() && !resultField.IsMap() {
					body["result"] = []interface{}{newResult}
				} else {
					body["result"] = newResult
				}
			}
		}
	} else {
		// Nếu client gửi "result" dạng Object đơn lẻ trong khi Proto định nghĩa repeated (không phải map)
		for _, fd := range inputType.GetFields() {
			if strings.EqualFold(fd.GetName(), "result") && fd.IsRepeated() && !fd.IsMap() {
				if obj, ok := body["result"].(map[string]interface{}); ok {
					body["result"] = []interface{}{obj}
				}
				break
			}
		}
	}

	if body["metadata"] == nil {
		body["metadata"] = make(map[string]interface{})
	}
	if meta, ok := body["metadata"].(map[string]interface{}); ok {
		meta["authorization"] = authHeader
		if requestID != "" {
			meta["request_id"] = requestID
		}
	}

	// ── 2. Nạp dữ liệu thông minh (Khắc phục sự khắt khe của Go gRPC) ──
	fillMessage(reqMsg, body)

	// ── 3. Gọi gRPC kèm Distributed Tracing Metadata ───────────────────
	metaPairs := []string{
		"authorization", authHeader,
		"x-forwarded-for", clientIP,
	}
	if requestID != "" {
		metaPairs = append(metaPairs, "x-request-id", requestID)
	}
	mdMD := metadata.Pairs(metaPairs...)
	ctx = metadata.NewOutgoingContext(ctx, mdMD)

	respMsg := dynamic.NewMessage(md.GetOutputType())
	err = conn.Invoke(ctx, methodPath, reqMsg, respMsg)
	if err != nil {
		numCode := "5000"
		if st, ok := status.FromError(err); ok {
			errMsg := strings.TrimSpace(st.Message())
			switch st.Code() {
			case codes.ResourceExhausted:
				if strings.Contains(strings.ToLower(errMsg), "larger than max") || strings.Contains(strings.ToLower(errMsg), "received message larger") {
					numCode = "Dung lượng dữ liệu quá lớn vượt quá giới hạn truyền tải gRPC. Vui lòng chia nhỏ gói lưu."
				} else if errMsg != "" && !strings.EqualFold(errMsg, "resource exhausted") {
					numCode = errMsg
				} else {
					numCode = "1008" // Quá nhiều yêu cầu (Rate Limit Exceeded)
				}
			case codes.Unauthenticated:
				numCode = "4010" // Token không hợp lệ / Hết hạn
			case codes.PermissionDenied:
				numCode = "4030" // Không có quyền truy cập
			case codes.NotFound:
				if errMsg != "" {
					numCode = errMsg
				} else {
					numCode = "4004" // Không tìm thấy dữ liệu
				}
			case codes.AlreadyExists:
				if errMsg != "" {
					numCode = errMsg
				} else {
					numCode = "4090" // Trùng lặp dữ liệu
				}
			case codes.InvalidArgument:
				if errMsg != "" {
					numCode = errMsg
				} else {
					numCode = "4001" // Dữ liệu không hợp lệ
				}
			case codes.Unavailable:
				Log.Error("gRPC backend service unavailable", zap.String("method", methodPath), zap.Error(err))
				numCode = "5000" // Backend service không khả dụng / chưa khởi chạy
			case codes.DeadlineExceeded:
				Log.Error("gRPC request timeout", zap.String("method", methodPath), zap.Error(err))
				numCode = "5000" // Quá thời gian chờ xử lý
			case codes.Internal:
				Log.Error("gRPC internal error", zap.String("method", methodPath), zap.Error(err))
				numCode = "5000"
			default:
				Log.Error("gRPC invocation failed", zap.String("method", methodPath), zap.Error(err))
				lower := strings.ToLower(errMsg)
				if strings.Contains(lower, "dial tcp") ||
					strings.Contains(lower, "connection refused") ||
					strings.Contains(lower, "connection error") ||
					strings.Contains(lower, "transport:") ||
					strings.Contains(lower, "transientfailure") {
					numCode = "5000"
				} else if errMsg != "" {
					numCode = errMsg
				}
			}
		} else {
			Log.Error("gRPC non-status error", zap.String("method", methodPath), zap.Error(err))
		}
		return CallResult{Success: false, Message: numCode}
	}

	var buf bytes.Buffer
	m := jsonpb.Marshaler{EmitDefaults: true}
	err = m.Marshal(&buf, respMsg)
	if err != nil {
		return CallResult{Success: false, Message: "5000"}
	}
	respBytes := buf.Bytes()

	var protoMap map[string]interface{}
	if err := json.Unmarshal(respBytes, &protoMap); err == nil {
		success := true
		if s, ok := protoMap["success"].(bool); ok {
			success = s
		}
		msg := ""
		if m, ok := protoMap["message"].(string); ok {
			msg = m
		}
		var finalData interface{} = nil
		if dataJson, ok := protoMap["dataJson"].(string); ok && strings.TrimSpace(dataJson) != "" {
			trimmed := strings.TrimSpace(dataJson)
			if (strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]")) ||
				(strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}")) {
				finalData = json.RawMessage(trimmed)
			}
		} else if dataRaw, ok := protoMap["data_json"].(string); ok && strings.TrimSpace(dataRaw) != "" {
			trimmed := strings.TrimSpace(dataRaw)
			if (strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]")) ||
				(strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}")) {
				finalData = json.RawMessage(trimmed)
			}
		}

		if finalData == nil {
			if d, ok := protoMap["data"]; ok && d != nil {
				if dataStr, ok := d.(string); ok {
					trimmed := strings.TrimSpace(dataStr)
					if (strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]")) ||
						(strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}")) {
						finalData = json.RawMessage(trimmed)
					} else if trimmed != "" {
						finalData = trimmed
					}
				} else {
					finalData = d
				}
			}
		}

		if finalData == nil || finalData == "" {
			if configs, ok := protoMap["configs"]; ok {
				finalData = configs
			} else if factories, ok := protoMap["factories"]; ok {
				finalData = factories
			} else if logs, ok := protoMap["logs"]; ok {
				finalData = logs
			} else if items, hasItems := protoMap["items"]; hasItems && items != nil {
				finalData = protoMap
			} else if summary, hasSummary := protoMap["summary"]; hasSummary && summary != nil {
				finalData = protoMap
			} else if master, ok := protoMap["master"]; ok {
				finalData = master
			}
		}
		var finalPage interface{} = nil
		pageInfoMap := make(map[string]interface{})

		// Extract pagination numbers from protoMap
		hasPagination := false
		if tr, ok := protoMap["totalRecords"]; ok {
			pageInfoMap["totalRecords"] = tr
			pageInfoMap["total"] = tr
			pageInfoMap["totalRows"] = tr
			hasPagination = true
		} else if tr, ok := protoMap["total_records"]; ok {
			pageInfoMap["totalRecords"] = tr
			pageInfoMap["total"] = tr
			pageInfoMap["totalRows"] = tr
			hasPagination = true
		} else if tr, ok := protoMap["totalRows"]; ok {
			pageInfoMap["totalRows"] = tr
			pageInfoMap["total"] = tr
			pageInfoMap["totalRecords"] = tr
			hasPagination = true
		} else if tr, ok := protoMap["total_rows"]; ok {
			pageInfoMap["totalRows"] = tr
			pageInfoMap["total"] = tr
			pageInfoMap["totalRecords"] = tr
			hasPagination = true
		}

		if ta, ok := protoMap["totalAll"]; ok {
			pageInfoMap["totalAll"] = ta
			hasPagination = true
		} else if ta, ok := protoMap["total_all"]; ok {
			pageInfoMap["totalAll"] = ta
			hasPagination = true
		}

		if tp, ok := protoMap["totalPages"]; ok {
			pageInfoMap["totalPages"] = tp
			hasPagination = true
		} else if tp, ok := protoMap["total_pages"]; ok {
			pageInfoMap["totalPages"] = tp
			hasPagination = true
		}

		if p, ok := protoMap["page"]; ok {
			pageInfoMap["page"] = p
		}
		if ps, ok := protoMap["pageSize"]; ok {
			pageInfoMap["pageSize"] = ps
			hasPagination = true
		} else if ps, ok := protoMap["page_size"]; ok {
			pageInfoMap["pageSize"] = ps
			hasPagination = true
		}

		if pageStr, ok := protoMap["page"].(string); ok && pageStr != "" {
			trimmed := strings.TrimSpace(pageStr)
			if (strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]")) ||
				(strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}")) {
				finalPage = json.RawMessage(trimmed)
			} else {
				finalPage = pageStr
			}
		} else if hasPagination {
			finalPage = pageInfoMap
		}

		var finalError interface{} = nil
		if errObj, ok := protoMap["error"]; ok && errObj != nil {
			finalError = errObj
		}

		var finalPagination interface{} = nil
		if hasPagination {
			finalPagination = pageInfoMap
		}

		return CallResult{
			Success:      success,
			Message:      msg,
			Data:         finalData,
			Page:         finalPage,
			PageInfo:     finalPagination,
			Pagination:   finalPagination,
			ErrorDetails: finalError,
		}
	}

	return CallResult{
		Success:     true,
		RawResponse: respBytes,
	}
}
