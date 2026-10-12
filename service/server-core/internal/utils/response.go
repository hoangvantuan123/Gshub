package utils

import (
	"encoding/json"
	"reflect"
	"regexp"
	"strings"
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

	// 1. If message is formatted like "[4009] Không thể xóa...", extract and return the Vietnamese detail text
	if matches := reBracketWithText.FindStringSubmatch(msg); len(matches) > 1 {
		detailMsg := strings.TrimSpace(matches[1])
		if detailMsg != "" {
			return detailMsg
		}
	}

	// 2. If message is formatted like "[4009]", convert code to Vietnamese message
	if matches := reSquareBracket.FindStringSubmatch(msg); len(matches) > 1 {
		if text, found := codeToVietnameseMap[matches[1]]; found {
			return text
		}
		return matches[1]
	}

	// 3. If message is already a pure integer string (e.g. "4009", "1002", "2000"), convert to Vietnamese text
	if text, found := codeToVietnameseMap[msg]; found {
		return text
	}

	// 4. If message is an English error code string (e.g. USER_NOT_FOUND)
	if code, found := exactCodeMap[msg]; found {
		if text, foundText := codeToVietnameseMap[code]; foundText {
			return text
		}
	}

	// 5. If message is already plain text (Vietnamese), PRESERVE IT AS-IS!
	return msg
}

// SetResponseFields uses reflection to set Success, Message, Data, and Error fields on a gRPC response struct.
// Ensures Message field always carries the numeric code string (WordSeq) so FE t(res.message) works seamlessly.
func SetResponseFields(resp interface{}, success bool, message string, data string, errInfo interface{}) {
	v := reflect.ValueOf(resp)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}

	if v.Kind() != reflect.Struct {
		return
	}

	// Set Success
	if f := v.FieldByName("Success"); f.IsValid() && f.CanSet() {
		f.SetBool(success)
	}

	// Set Message to normalized numeric code (e.g., "2000", "1002", "4001") for FE i18n t() hook
	codeMsg := NormalizeCode(message, success)
	if f := v.FieldByName("Message"); f.IsValid() && f.CanSet() {
		f.SetString(codeMsg)
	}

	// Set Data
	if f := v.FieldByName("Data"); f.IsValid() && f.CanSet() {
		f.SetString(data)
	}

	// Set Error (Structured error info)
	if errInfo != nil {
		errVal := reflect.ValueOf(errInfo)
		if errVal.Kind() == reflect.Ptr {
			errVal = errVal.Elem()
		}
		if errVal.Kind() == reflect.Struct {
			if fMsg := errVal.FieldByName("Message"); fMsg.IsValid() && fMsg.CanSet() {
				// Normalize nested error.message to numeric code string as well
				fMsg.SetString(NormalizeCode(fMsg.String(), false))
			}
		}
		if f := v.FieldByName("Error"); f.IsValid() && f.CanSet() {
			f.Set(reflect.ValueOf(errInfo))
		}
	}
}

// SuccessResponse creates a new response of type T and sets success=true
func SuccessResponse[T any](message string, data interface{}, page ...string) *T {
	resp := new(T)
	dataStr := "[]"
	if data != nil {
		if s, ok := data.(string); ok {
			if s == "null" || s == "" {
				dataStr = "[]"
			} else {
				dataStr = s
			}
		} else {
			b, _ := json.Marshal(data)
			if string(b) == "null" {
				dataStr = "[]"
			} else {
				dataStr = string(b)
			}
		}
	}
	SetResponseFields(resp, true, message, dataStr, nil)
	if len(page) > 0 && page[0] != "" {
		v := reflect.ValueOf(resp)
		if v.Kind() == reflect.Ptr {
			v = v.Elem()
		}
		if f := v.FieldByName("Page"); f.IsValid() && f.CanSet() {
			f.SetString(page[0])
		}
	}
	return resp
}

// ErrorResponse creates a new response of type T and sets success=false
func ErrorResponse[T any](message string) *T {
	resp := new(T)
	SetResponseFields(resp, false, message, "", nil)
	return resp
}

// ErrorResponseFromErr creates a response from error, preserving structured error JSON if available
func ErrorResponseFromErr[T any](err error) *T {
	if err == nil {
		return ErrorResponse[T]("")
	}
	b, jsonErr := json.Marshal(err)
	if jsonErr == nil && len(b) > 2 && string(b) != "{}" {
		return ErrorWithDataResponse[T](err.Error(), err)
	}
	return ErrorResponse[T](err.Error())
}

// ErrorWithDataResponse creates a new error response with message and structured data payload
func ErrorWithDataResponse[T any](message string, data interface{}) *T {
	resp := new(T)
	dataStr := ""
	if data != nil {
		if s, ok := data.(string); ok {
			dataStr = s
		} else {
			b, _ := json.Marshal(data)
			dataStr = string(b)
		}
	}
	SetResponseFields(resp, false, message, dataStr, nil)
	return resp
}

// ErrorWithCodeResponse creates a new response of type T with a specific error code
func ErrorWithCodeResponse[T any](message string, code string, errInfo interface{}) *T {
	resp := new(T)
	SetResponseFields(resp, false, code, "", errInfo)
	return resp
}
