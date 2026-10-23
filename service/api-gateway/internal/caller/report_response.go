package caller

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/jhump/protoreflect/dynamic"
)

func isProductionReport(method string) bool {
	return method == "/datahub.DataHubService/GetProductionPlanReport" || method == "/datahub.DataHubService/GetProductionStatisticsReport"
}

// Reports already carry the complete, typed HTTP payload in data_json. Reading
// scalar metadata directly avoids encoding that payload as an escaped JSON string
// and then decoding a second copy of every protobuf detail row at the gateway.
func productionReportResult(msg *dynamic.Message) (CallResult, bool) {
	field := func(name string) interface{} {
		fd := msg.GetMessageDescriptor().FindFieldByName(name)
		if fd == nil {
			return nil
		}
		return msg.GetField(fd)
	}
	raw, ok := field("data_json").(string)
	raw = strings.TrimSpace(raw)
	if !ok || len(raw) < 2 || (raw[0] != '{' && raw[0] != '[') || !json.Valid([]byte(raw)) {
		return CallResult{}, false
	}
	success, _ := field("success").(bool)
	message, _ := field("message").(string)
	total, _ := field("total_records").(int64)
	page, _ := field("page").(int32)
	size, _ := field("page_size").(int32)
	pages, _ := field("total_pages").(int32)
	// Protobuf JSON encodes int64 as strings. Preserve the HTTP metadata contract.
	totalString := strconv.FormatInt(total, 10)
	pagination := map[string]interface{}{
		"totalRecords": totalString, "total": totalString, "totalRows": totalString,
		"page": page, "pageSize": size, "totalPages": pages,
	}
	return CallResult{Success: success, Message: message, Data: json.RawMessage(raw),
		Page: pagination, PageInfo: pagination, Pagination: pagination}, true
}
