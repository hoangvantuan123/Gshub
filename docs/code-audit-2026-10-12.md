# Rà soát source Gshub — 12/10/2026

Phạm vi: source dự án Desktop/Gshub; phân tích tĩnh 422 tệp JS/JSX, kiểm tra ba Go module, xem đường đăng nhập/quyền/API tài khoản/Electron. Đây không phải kiểm chứng mọi luồng nghiệp vụ hoặc kiểm thử tải production.

## Đã sửa

- API users.auth.users.UsersService thiếu policy quyền: thêm quyền View/Create/Edit/Delete theo menu tài khoản; đặt lại mật khẩu và đổi trạng thái yêu cầu Edit. Phương thức chưa khai báo bị từ chối. Kiểm thử policy bao phủ cả sáu RPC.
- Đặt lại mật khẩu dereference UserId nil và bỏ qua lỗi bcrypt: kiểm tra đầu vào, trả lỗi và rollback giao dịch.
- workProcessApi.js dùng DATAHUB_API_URL chưa khai báo: dùng getApiUrl() theo cấu hình hiện hành.
- RealtimeMonitor.jsx thiếu import Button: bổ sung.
- main.jsx dùng React.StrictMode dựa vào transform tự chèn React: dùng import StrictMode rõ ràng, tương thích cấu hình build.
- Thống kê hanoiGs1/quevoGs5 khai báo auditCategory hai lần: bỏ giá trị ghi đè, giữ INVALID_TIME khi giờ bị đảo; đồng bộ AuditCategory.

## Còn cần xử lý

1. Lớp PermissionInterceptor chỉ bao phủ danh sách service định sẵn. Các API bảng kỹ thuật, hệ thống và nghiệp vụ chưa nằm trong mapping này; phải kiểm tra và bổ sung policy riêng theo tài nguyên, gồm phạm vi dữ liệu. Không thể coi việc ẩn menu là bảo vệ mọi API. Không tự gắn tất cả API vào một menu vì sẽ cấp sai quyền.
2. Access/refresh token còn ở localStorage. Quyền/menu không lưu tại đó, nhưng XSS vẫn có thể lấy token đăng nhập. Cần thiết kế cookie HttpOnly cho web hoặc kho bí mật OS cho Electron và chuyển đồng bộ toàn bộ luồng refresh/logout.
3. Khóa AES của cache menu nằm trong frontend. Cache không có khả năng chống người dùng sửa trên máy; backend phải luôn làm nguồn quyết định. JWT quyền hiện ký, không mã hóa nội dung.
4. Electron mở URL ngoài qua shell.openExternal(details.url) chưa kiểm tra scheme; IPC đọc/ghi/xóa nhận đường dẫn từ renderer, cửa sổ tắt sandbox. Cần quy định scheme, nguồn IPC và phạm vi file theo từng chức năng trước khi khóa để tránh hỏng nhập/xuất.
5. Các truy vấn kiểm tra quyền cần benchmark thực tế và xem EXPLAIN trước khi triển khai migration index đã chuẩn bị. Chưa chạy kiểm thử tải và chưa áp dụng index trong đợt này.
6. Lint toàn source vẫn còn cảnh báo: biến không dùng, prop-types, catch rỗng, dependencies hook và regex Unicode. Báo cáo máy đọc: eslint-audit-2026-10-12.json. Phần lớn không đồng nghĩa lỗi runtime; không sửa hàng loạt không có kiểm chứng.

## Kiểm chứng

- 42 kiểm thử Node quyền/menu/cache/assignment/thứ tự đạt trước các bản sửa runtime trong đợt này.
- go test ./... và go vet ./... đạt cho server-core, api-gateway, service-datahub; core chạy lại sau sửa quyền tài khoản đạt.
- Không đổi mật khẩu hay dữ liệu người dùng để kiểm thử. Các package ghi no test files chỉ được kiểm tra compile/vet, không có kiểm thử nghiệp vụ.

- Build web cuối cùng đạt (13,75 giây); chưa chạy ứng dụng Electron để kiểm tra trực tiếp các màn hình.
