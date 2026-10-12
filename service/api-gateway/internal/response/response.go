// Package response provides helpers to write uniform JSON responses.
package response

import (
	"net/http"
	"regexp"
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

var reBracketWithText = regexp.MustCompile(`^\[\d+\]\s*(.+)`)

var codeToVietnameseMap = map[string]string{
	// 1000 - 1999 Auth
	"1001": "Tài khoản không tồn tại hoặc thông tin đăng nhập không hợp lệ",
	"1002": "Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu",
	"1003": "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ",
	"1004": "Tài khoản chưa được kích hoạt. Vui lòng đổi mật khẩu để tiếp tục",
	"1005": "Vui lòng nhập đầy đủ thông tin đăng nhập",
	"1006": "Tài khoản chưa khởi tạo mật khẩu",
	"1007": "Mật khẩu cũ không chính xác",
	"1008": "Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 1 phút",

	// 2000 - 2999 Success
	"2000": "Thành công",
	"2001": "Đã thêm mới thành công",
	"2002": "Đã cập nhật thành công",
	"2003": "Đã xóa thành công",

	// 4000 - 4999 Client & Validation
	"4001": "Dữ liệu yêu cầu không hợp lệ",
	"4004": "Không tìm thấy dữ liệu yêu cầu",
	"4009": "Không thể xóa bản ghi do có ràng buộc dữ liệu liên quan",
	"4010": "Phiên làm việc hết hạn hoặc token không hợp lệ",
	"4030": "Bạn không có quyền thực hiện thao tác này",
	"4090": "Dữ liệu đã tồn tại trong hệ thống",

	// 5000 - 5999 System
	"5000": "Lỗi xử lý hệ thống nội bộ",
	"5001": "Lỗi thao tác cơ sở dữ liệu",
}

// NormalizeCode returns user-friendly Vietnamese messages instead of numeric error codes
func NormalizeCode(msg string, success bool) string {
	msg = strings.TrimSpace(msg)

	// If empty, return default success/error message
	if msg == "" {
		if success {
			return "Thành công"
		}
		return "Lỗi xử lý hệ thống nội bộ"
	}

	// 1. Chặn toàn bộ lỗi kỹ thuật hạ tầng / gRPC transport / Network không được lộ cho client
	lowerMsg := strings.ToLower(msg)
	if strings.Contains(lowerMsg, "dial tcp") ||
		strings.Contains(lowerMsg, "connection error") ||
		strings.Contains(lowerMsg, "connection refused") ||
		strings.Contains(lowerMsg, "transport:") ||
		strings.Contains(lowerMsg, "transientfailure") ||
		strings.Contains(lowerMsg, "rpc error:") {
		return "Lỗi xử lý hệ thống nội bộ"
	}

	// 2. If message is formatted like "[4009] Không thể xóa...", extract and return the Vietnamese detail text
	if matches := reBracketWithText.FindStringSubmatch(msg); len(matches) > 1 {
		detailMsg := strings.TrimSpace(matches[1])
		if detailMsg != "" {
			return detailMsg
		}
	}

	// 3. If message is formatted like "[4009]", convert code to Vietnamese message
	if matches := reSquareBracket.FindStringSubmatch(msg); len(matches) > 1 {
		if text, found := codeToVietnameseMap[matches[1]]; found {
			return text
		}
		return matches[1]
	}

	// 4. If message is already a pure integer string (e.g. "4009", "1002", "2000"), convert to Vietnamese text
	if text, found := codeToVietnameseMap[msg]; found {
		return text
	}

	// 5. If message is an English error code string (e.g. USER_NOT_FOUND)
	if code, found := exactCodeMap[msg]; found {
		if text, foundText := codeToVietnameseMap[code]; foundText {
			return text
		}
	}

	// 6. If message is already plain text (Vietnamese), PRESERVE IT AS-IS!
	return msg
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
