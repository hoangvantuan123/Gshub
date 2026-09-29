// Package response provides helpers to write uniform JSON responses.
package response

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"api-gateway/internal/caller"
)

var reSquareBracket = regexp.MustCompile(`^\[(\d+)\]`)

var exactCodeMap = map[string]string{
	// 1000 - 1999 Auth
	"thông tin đăng nhập không hợp lệ":                                                 "1001",
	"thông tin đăng nhập không hợp lệ. vui lòng kiểm tra lại tên đăng nhập và mật khẩu": "1002",
	"tài khoản của bạn đã bị khóa. vui lòng liên hệ bộ phận hỗ trợ.":                   "1003",
	"tài khoản của bạn đã bị khóa. vui lòng liên hệ bộ phận hỗ trợ":                    "1003",
	"tài khoản chưa được kích hoạt. vui lòng đổi mật khẩu để tiếp tục.":                 "1004",
	"tài khoản chưa được kích hoạt. vui lòng đổi mật khẩu để tiếp tục":                 "1004",
	"vui lòng nhập đầy đủ tên đăng nhập, mật khẩu cũ và mật khẩu mới":                  "1005",
	"tài khoản chưa khởi tạo mật khẩu":                                                 "1006",
	"mật khẩu cũ không chính xác":                                                      "1007",
	"quá nhiều yêu cầu đăng nhập. vui lòng thử lại sau 1 phút":                         "1008",
	"quá nhiều yêu cầu đăng nhập":                                                      "1008",

	// 2000 - 2999 Success
	"thành công":            "2000",
	"truy vấn thành công":    "2000",
	"success":               "2000",
	"đã thêm mới thành công": "2001",
	"thêm mới thành công":   "2001",
	"đã cập nhật thành công": "2002",
	"cập nhật thành công":   "2002",
	"đã xóa thành công":     "2003",
	"xóa thành công":        "2003",

	// 4000 - 4999 Client & Validation
	"dữ liệu yêu cầu không hợp lệ":                            "4001",
	"lỗi kết nối backend":                                     "5000",
	"không tìm thấy dữ liệu yêu cầu":                          "4004",
	"không thể xóa bản ghi do có ràng buộc dữ liệu liên quan": "4009",
	"phiên làm việc hết hạn hoặc token không hợp lệ":           "4010",
	"bạn không có quyền thực hiện thao tác này":               "4030",
	"dữ liệu đã tồn tại trong hệ thống":                       "4090",

	// 5000 - 5999 System
	"lỗi xử lý hệ thống nội bộ": "5000",
	"lỗi thao tác cơ sở dữ liệu": "5001",

	// Code Strings
	"USER_NOT_FOUND":         "1001",
	"INVALID_CREDENTIALS":    "1002",
	"ACCOUNT_LOCKED":         "1003",
	"ACCOUNT_NOT_ACTIVATED":  "1004",
	"INVALID_INPUT":          "1005",
	"INVALID_AUTH_INPUT":     "1005",
	"PASSWORD_NOT_SET":       "1006",
	"OLD_PASSWORD_INCORRECT":  "1007",
	"RATE_LIMIT_EXCEEDED":    "1008",
}

// NormalizeCode converts plain text error/success messages into standardized numeric string codes (WordSeq)
func NormalizeCode(msg string, success bool) string {
	msg = strings.TrimSpace(msg)

	// If empty, return default success/error code
	if msg == "" {
		if success {
			return "2000"
		}
		return "5000"
	}

	// 1. If message is already a pure integer string (e.g. "2000", "1002", "4001"), return it directly
	if _, err := strconv.Atoi(msg); err == nil {
		return msg
	}

	// 2. If message is formatted like "[4001] Message...", extract "4001"
	if matches := reSquareBracket.FindStringSubmatch(msg); len(matches) > 1 {
		return matches[1]
	}

	// 3. Exact Lookup Match
	lowerMsg := strings.ToLower(msg)
	if code, found := exactCodeMap[lowerMsg]; found {
		return code
	}
	if code, found := exactCodeMap[msg]; found {
		return code
	}

	// 4. Fallbacks based on message content for Success / Error
	if success {
		if strings.Contains(lowerMsg, "thêm") || strings.Contains(lowerMsg, "add") {
			return "2001"
		}
		if strings.Contains(lowerMsg, "cập nhật") || strings.Contains(lowerMsg, "update") {
			return "2002"
		}
		if strings.Contains(lowerMsg, "xóa") || strings.Contains(lowerMsg, "delete") {
			return "2003"
		}
		return "2000"
	}

	// 5. Chặn toàn bộ lỗi kỹ thuật hạ tầng / gRPC transport / Network không được lộ cho client
	if strings.Contains(lowerMsg, "dial tcp") ||
		strings.Contains(lowerMsg, "connection error") ||
		strings.Contains(lowerMsg, "connection refused") ||
		strings.Contains(lowerMsg, "transport:") ||
		strings.Contains(lowerMsg, "transientfailure") ||
		strings.Contains(lowerMsg, "kết nối") ||
		strings.Contains(lowerMsg, "backend") ||
		strings.Contains(lowerMsg, "rpc error:") {
		return "5000"
	}

	// 6. Cho phép các thông báo nghiệp vụ chi tiết (ví dụ: dòng lỗi Excel, xung đột khóa ngoại, v.v.)
	if strings.Contains(msg, "\n") || strings.Contains(lowerMsg, "dòng ") ||
		strings.Contains(lowerMsg, "xung đột") || strings.Contains(lowerMsg, "bị khóa") ||
		strings.Contains(lowerMsg, "không được để trống") || strings.Contains(lowerMsg, "trùng lặp") ||
		strings.Contains(lowerMsg, "tồn tại") {
		return msg
	}

	// 7. Mapping các lỗi nghiệp vụ tiêu chuẩn
	if strings.Contains(lowerMsg, "không thể xóa") || strings.Contains(lowerMsg, "ràng buộc") || strings.Contains(lowerMsg, "conflict") {
		return "4009"
	}
	if strings.Contains(lowerMsg, "không tìm thấy") || strings.Contains(lowerMsg, "not found") {
		return "4004"
	}
	if strings.Contains(lowerMsg, "không có quyền") || strings.Contains(lowerMsg, "forbidden") {
		return "4030"
	}
	if strings.Contains(lowerMsg, "hết hạn") || strings.Contains(lowerMsg, "unauthorized") {
		return "4010"
	}

	// If the message is already descriptive (> 20 chars), preserve it as is
	if len(msg) > 20 {
		return msg
	}

	return "4001"
}

// JSON writes a CallResult as a JSON HTTP 200 response.
func JSON(c *gin.Context, result caller.CallResult) {
	if result.RawResponse != nil {
		c.Data(http.StatusOK, "application/json", result.RawResponse)
		return
	}

	result.Message = NormalizeCode(result.Message, result.Success)
	respMap := gin.H{
		"success": result.Success,
		"message": result.Message,
		"data":    result.Data,
	}
	if result.Page != nil {
		respMap["page"] = result.Page
	}
	if result.Pagination != nil {
		respMap["pagination"] = result.Pagination
	}
	if result.ErrorDetails != nil {
		respMap["error"] = result.ErrorDetails
	}

	c.JSON(http.StatusOK, respMap)
}

// Error writes a generic error response.
func Error(c *gin.Context, message string) {
	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"message": NormalizeCode(message, false),
		"data":    nil,
	})
}

// BadRequest returns 400 when request body is missing / invalid.
func BadRequest(c *gin.Context, message string) {
	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"message": NormalizeCode(message, false),
		"data":    nil,
	})
}
