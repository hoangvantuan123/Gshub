# 📘 QUY CHUẨN MÃ SỐ TỪ ĐIỂN VÀ LỖI HỆ THỐNG (SYSTEM DICTIONARY & ERROR TAXONOMY)

Tài liệu này định nghĩa quy chuẩn danh mục 3 cột thống nhất cho **API Gateway**, **server-core**, **service-warehouse**, **Frontend Web/App** và tất cả các Microservices khác trong hệ thống ERP.

---

## 📋 BẢNG DANH MỤC 3 CỘT NGUYÊN BẢN CỦA HỆ THỐNG

| Mã Số (`WordSeq`) | Mã Chuỗi (`Description / Key`) | Nội Dung Tiếng Việt Mặc Định (`Word`) |
| :---: | :--- | :--- |
| **`1001`** | `USER_NOT_FOUND` | Thông tin đăng nhập không hợp lệ |
| **`1002`** | `INVALID_CREDENTIALS` | Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu |
| **`1003`** | `ACCOUNT_LOCKED` | Tài khoản của bạn đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ. |
| **`1004`** | `ACCOUNT_NOT_ACTIVATED` | Tài khoản chưa được kích hoạt. Vui lòng đổi mật khẩu để tiếp tục. |
| **`1005`** | `INVALID_AUTH_INPUT` | Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu cũ và mật khẩu mới |
| **`1006`** | `PASSWORD_NOT_SET` | Tài khoản chưa khởi tạo mật khẩu |
| **`1007`** | `OLD_PASSWORD_INCORRECT` | Mật khẩu cũ không chính xác |
| **`1008`** | `RATE_LIMIT_EXCEEDED` | Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 1 phút |
| **`2000`** | `SUCCESS` | Thành công |
| **`2001`** | `CREATED` | Đã thêm mới thành công |
| **`2002`** | `UPDATED` | Đã cập nhật thành công |
| **`2003`** | `DELETED` | Đã xóa thành công |
| **`3001`** | `BTN_SEARCH` | Tìm kiếm |
| **`3002`** | `BTN_ADD` | Thêm mới |
| **`3003`** | `BTN_EDIT` | Sửa |
| **`3004`** | `BTN_DELETE` | Xóa |
| **`3005`** | `BTN_SAVE` | Lưu |
| **`3006`** | `BTN_CANCEL` | Hủy bỏ |
| **`3007`** | `BTN_EXPORT_EXCEL` | Xuất Excel |
| **`3008`** | `BTN_IMPORT_EXCEL` | Nhập Excel |
| **`3009`** | `BTN_PRINT` | In tem / Nhãn |
| **`3010`** | `BTN_CLOSE` | Đóng |
| **`4001`** | `INVALID_INPUT` | Dữ liệu yêu cầu không hợp lệ |
| **`4004`** | `NOT_FOUND` | Không tìm thấy dữ liệu yêu cầu |
| **`4009`** | `DELETE_CONFLICT` | Không thể xóa bản ghi do có ràng buộc dữ liệu liên quan |
| **`4010`** | `UNAUTHORIZED` | Phiên làm việc hết hạn hoặc Token không hợp lệ |
| **`4030`** | `FORBIDDEN` | Bạn không có quyền thực hiện thao tác này |
| **`4090`** | `DUPLICATE_DATA` | Dữ liệu đã tồn tại trong hệ thống |
| **`5000`** | `INTERNAL_SERVER_ERROR` | Lỗi xử lý hệ thống nội bộ |
| **`5001`** | `DATABASE_ERROR` | Lỗi thao tác cơ sở dữ liệu |
| **`6001`** | `COL_SEQ` | Mã số |
| **`6002`** | `COL_USER_NAME` | Tên người dùng |
| **`6003`** | `COL_USER_ID` | Tài khoản đăng nhập |
| **`6004`** | `COL_EMAIL` | Thư điện tử |
| **`6005`** | `COL_PHONE` | Số điện thoại |
| **`6006`** | `COL_EMP_ID` | Mã nhân viên |
| **`6007`** | `COL_STATUS` | Trạng thái |
| **`6008`** | `COL_CREATED_AT` | Ngày tạo |
| **`6009`** | `COL_CREATED_BY` | Người tạo |
| **`6010`** | `COL_UPDATED_AT` | Ngày cập nhật |
| **`6011`** | `COL_UPDATED_BY` | Người cập nhật |
| **`6012`** | `COL_REMARK` | Ghi chú |
| **`6013`** | `COL_LANG_NAME` | Tên ngôn ngữ |
| **`6014`** | `COL_LANG_CODE` | Mã ngôn ngữ |
| **`6015`** | `COL_WORD` | Từ từ điển |
| **`6016`** | `COL_WORD_SEQ` | Mã từ điển |
| **`7001`** | `PAGE_USER_MGMT` | Danh mục người dùng |
| **`7002`** | `PAGE_LANG_MGMT` | Danh mục đa ngôn ngữ |
| **`7003`** | `PAGE_DICT_MGMT` | Từ điển hệ thống |
| **`7004`** | `PAGE_ROLE_MGMT` | Phân quyền vai trò |
| **`7005`** | `PAGE_WH_MGMT` | Danh mục kho hàng |
| **`7006`** | `PAGE_CHANGE_PASS` | Đổi mật khẩu |
| **`7007`** | `PAGE_PROFILE` | Thông tin cá nhân |

---

## 🛠️ Hướng Dẫn Áp Dụng Cho Developer & Frontend

1. **Ở Backend Service (Go Microservices & Gateway)**:
   - Khi trả về Response, luôn bọc qua hàm helper `utils.SuccessResponse` hoặc `utils.ErrorResponse`.
   - Hệ thống sẽ tự động map thông báo thành chuỗi Mã số (`"1002"`, `"1008"`, `"2000"`, `"4001"`...) ở trường `message` và `error.message`.

2. **Ở Frontend (Web & App)**:
   - Sử dụng hàm i18n `t(WordSeq)` cho tất cả mọi thành phần trên giao diện:
     - Tiêu đề màn hình: `t("7001")` $\rightarrow$ "Danh mục người dùng"
     - Tiêu đề cột Table: `t("6002")` $\rightarrow$ "Tên người dùng"
     - Nút bấm action: `t("3001")` $\rightarrow$ "Tìm kiếm", `t("3005")` $\rightarrow$ "Lưu"
     - Phản hồi API: `t(res.message)` $\rightarrow$ "Thông tin đăng nhập không hợp lệ"
   - Bộ từ điển `_ERPDictionary` sẽ tự động hiển thị câu dịch chuẩn theo ngôn ngữ của người dùng (Tiếng Việt, Tiếng Anh, Tiếng Hàn...).
