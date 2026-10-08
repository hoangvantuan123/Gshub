package constants

import "fmt"

// ============================================================================
// [1] MÃ SỐ TỪ ĐIỂN & LỖI (NUMERIC WORDSEQ & ERROR CODES)
// Quy chuẩn phân khoảng đầu số WordSeq cho toàn hệ thống:
// - 1000 - 1999: Lỗi Đăng Nhập & Bảo Mật (Auth & Security)
// - 2000 - 2999: Phản hồi Thành Công (Success)
// - 4000 - 4999: Lỗi Dữ Liệu Client & Validation (Client & CRUD Errors)
// - 5000 - 5999: Lỗi Máy Chủ & Cơ Sở Dữ Liệu (System & DB Errors)
// ============================================================================
const (
	// [Nhóm 1: Auth & Security (1000 - 1999)]
	CodeUserNotFound        = 1001
	CodeInvalidCredentials  = 1002
	CodeAccountLocked       = 1003
	CodeAccountNotActivated = 1004
	CodeInvalidAuthInput    = 1005
	CodePasswordNotSet      = 1006
	CodeOldPassIncorrect    = 1007
	CodeRateLimitExceeded   = 1008

	// [Nhóm 2: Success (2000 - 2999)]
	CodeSuccess = 2000
	CodeCreated = 2001

	// [Nhóm 3: Client & Validation Errors (4000 - 4999)]
	CodeInvalidInput   = 4001
	CodeNotFound       = 4004
	CodeDeleteConflict = 4009
	CodeUnauthorized   = 4010
	CodeForbidden      = 4030
	CodeDuplicate      = 4090

	// [Nhóm 4: System & DB Errors (5000 - 5999)]
	CodeInternalError = 5000
	CodeDatabaseError = 5001
)

// Alias tương thích ngược với các file service cũ
const (
	ErrCodeInvalidInput   = CodeInvalidInput
	ErrCodeDeleteConflict = CodeDeleteConflict
	ErrCodeDatabaseError  = CodeDatabaseError
	ErrCodeNotFound       = CodeNotFound
)

// ============================================================================
// [2] THÔNG BÁO TIẾNG VIỆT
// ============================================================================
const (
	MsgNoRecordsInsert = "Không có dữ liệu để thêm mới"
	MsgNoRecordsUpdate = "Không có dữ liệu để cập nhật"
	MsgNoRecordsDelete = "Không có danh sách ID để xóa"
	MsgInvalidID       = "ID %v không hợp lệ"

	MsgDeleteConflictRoleUsers   = "Không thể xóa: %d bản ghi đang được gán quyền cho Vai trò/Người dùng"
	MsgDeleteConflictMenus       = "Không thể xóa: %d bản ghi đang chứa các menu con bên trong"
	MsgDeleteConflictSubRoot     = "Không thể xóa: %d bản ghi đang được dùng làm menu gốc phụ (sub-root)"
	MsgDeleteConflictGroups      = "Không thể xóa: %d nhóm đang được gán cho các vai trò hiện có"
	MsgDeleteConflictActionPerms = "Không thể xóa: %d bản ghi đang chứa các quyền hành động chi tiết"
	MsgDeleteConflictGeneric     = "Không thể xóa: bản ghi này đang được sử dụng ở bảng khác"
	MsgDuplicateID               = "Dữ liệu đã tồn tại: %s"
)

// Thông báo thành công (Success Messages)
const (
	MsgDeleteSuccess = "Đã xóa thành công %d bản ghi"
	MsgAddSuccess    = "Đã thêm mới thành công %d bản ghi"
	MsgUpdateSuccess = "Đã cập nhật thành công %d bản ghi"
)

// ============================================================================
// [3] APP ERROR FRAMEWORK - KHUNG LỖI CHUẨN TRẢ RA API
// ============================================================================

// AppError là khung chuẩn để chứa mã số (Code) và Thông báo (Message)
type AppError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// Error() giúp AppError thỏa mãn interface 'error' mặc định của Go
func (e *AppError) Error() string {
	return fmt.Sprintf("[%d] %s", e.Code, e.Message)
}

// NewError tạo một AppError trả về chuẩn mã số lỗi
// Dùng ở Service: return nil, constants.NewError(constants.CodeInvalidInput, constants.MsgNoRecordsInsert)
func NewError(code int, message string, args ...interface{}) *AppError {
	msg := message
	if len(args) > 0 {
		msg = fmt.Sprintf(message, args...)
	}
	return &AppError{
		Code:    code,
		Message: msg,
	}
}

// FormatError: Giữ lại hàm cũ FormatError trả về chuỗi để không bị break code ở các service cũ
func FormatError(code int, message string, args ...interface{}) string {
	fullMsg := message
	if len(args) > 0 {
		fullMsg = fmt.Sprintf(message, args...)
	}
	return fmt.Sprintf("[%d] %s", code, fullMsg)
}

