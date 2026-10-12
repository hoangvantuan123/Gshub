package h

import (
	"api-gateway/internal/proof"
	"encoding/json"
	"google.golang.org/grpc/metadata"
	"strconv"
	"strings"

	"api-gateway/internal/caller"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/response"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Handle xử lý proxy HTTP -> gRPC bất đồng bộ thông qua Goroutine tự nhiên của Go
func Handle(pool *grpcclient.Pool, host, methodPath string) gin.HandlerFunc {
	return HandleWithDefaults(pool, host, methodPath, nil)
}

// HandleWithDefaults hỗ trợ tiêm các tham số mặc định (ví dụ factoryCode=GS5) nếu client không truyền
func HandleWithDefaults(pool *grpcclient.Pool, host, methodPath string, defaults map[string]interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		var rawBody interface{}
		_ = c.ShouldBindJSON(&rawBody)
		body := make(map[string]interface{})
		if rawMap, ok := rawBody.(map[string]interface{}); ok {
			body = rawMap
		} else if rawSlice, ok := rawBody.([]interface{}); ok {
			body["data"] = rawSlice
			body["items"] = rawSlice
			body["master_seqs"] = rawSlice
			body["masterSeqs"] = rawSlice
			body["detail_seqs"] = rawSlice
			body["detailSeqs"] = rawSlice
			if jsonBytes, err := json.Marshal(rawSlice); err == nil {
				body["data_json"] = string(jsonBytes)
				body["dataJson"] = string(jsonBytes)
			}
		}

		// Áp dụng các giá trị mặc định nếu chưa có trong body
		for k, v := range defaults {
			if cur, exists := body[k]; !exists || cur == nil || cur == "" {
				body[k] = v
			}
		}

		auth := c.GetHeader("Authorization")
		clientIP := c.ClientIP()
		requestID := c.GetString("requestID")

		// Đọc cấu hình timeout động từ client nếu có (ví dụ: Export Excel, Chạy giá thành)
		timeoutSec := 0
		if toHeader := c.GetHeader("X-Request-Timeout"); toHeader != "" {
			if s, err := strconv.Atoi(toHeader); err == nil && s > 0 {
				timeoutSec = s
			}
		}

		// Mượn kết nối từ gRPC Connection Pool (Multiplexing HTTP/2)
		conn, err := pool.Get(host)
		if err != nil {
			caller.Log.Error("gRPC connection pool get failed", zap.String("host", host), zap.Error(err))
			response.Error(c, "5000")
			return
		}

		// Gọi gRPC qua Goroutine tự nhiên kết hợp Context của request
		ctx := c.Request.Context()
		if raw := c.GetHeader("DPoP"); raw != "" {
			scheme := "http"
			if c.Request.TLS != nil {
				scheme = "https"
			}
			if c.GetHeader("X-Forwarded-Proto") == "https" {
				scheme = "https"
			}
			uri := scheme + "://" + c.Request.Host + c.Request.URL.EscapedPath()
			if _, err := proof.Verify(raw, c.Request.Method, uri, strings.TrimPrefix(auth, "Bearer "), ""); err != nil {
				c.AbortWithStatusJSON(401, gin.H{"success": false, "message": "Invalid session proof. Please log in again."})
				return
			}
			ctx = metadata.NewOutgoingContext(ctx, metadata.Pairs("dpop", raw, "dpop-htm", c.Request.Method, "dpop-htu", uri))
		}
		result := caller.Invoke(ctx, conn, methodPath, body, auth, clientIP, requestID, timeoutSec)

		// Trả kết quả về cho client
		if !result.Success {
			response.JSON(c, result)
			return
		}

		response.JSON(c, result)
	}
}
