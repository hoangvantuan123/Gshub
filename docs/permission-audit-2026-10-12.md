# Kiểm tra quyền đăng nhập và sửa lỗi menu trống — 12/10/2026

Sửa trực tiếp tại C:\Users\tuanhoang\Desktop\Gshub.

## Nguyên nhân đã xác nhận bằng database

- Login bỏ qua Type=submenu trong _ERPRolesUsers, làm mất thư mục cha.
- Key module ROOT_REPORT/ROOT_SYSTEM chưa được chuẩn hóa về report/system.
- Nhiều menu có quyền nhưng không có bản ghi quyền thư mục cha. Danh mục mẫu
  trước đây che lỗi này; bỏ mẫu làm các menu không được ghép vào cây.
- Login ghi/xóa cache quyền hai lần, có thể tạo khoảng trống khi router đọc lại.
- Các route có permission lại đánh dấu public=true, bỏ qua kiểm tra quyền.
- Có 27 dòng action trỏ tới MenuId=1 trong khi menu này không còn trong danh mục.
  Không đủ dữ liệu để tự chuyển các quyền đó sang một màn hình khác.

## Luồng đã sửa

/api/v2/acc/p2/login đi qua API Gateway tới Server-core LoginUserB. Luồng OAuth
ERP ngoài /api/v1/auth/login là luồng DataHub riêng; không dùng nó để tự cấp
quyền menu nội bộ.

Sau khi xác thực tài khoản, server lấy nhóm bằng UserSeq và Type=user. Không
cấp quyền chỉ vì một UserId do client gửi. Login trả tokenRolesUserMenu gồm
5 phần: menu, rootMenu, menuItem, roleTable và action. Mỗi menu/menuItem có map
actions, giữ cả action chuẩn và mã tùy chỉnh. Các quyền Import/Export trên
bản ghi menu được giữ. Quyền giữa các nhóm được cộng bằng OR.

Thư mục/module cha thiếu được lấy từ danh mục database theo cây tổ tiên.
Các dòng bổ sung có NavigationOnly=true, không có URL nghiệp vụ hay quyền
Create/Edit/Delete; không được dùng để cấp quyền route. Quyền View=false đã
khai báo trên thư mục cha được giữ nguyên. Không dùng danh mục menu mẫu.

Frontend dùng cùng bộ phân tích token cho login/router/cache, kiểm tra hạn và
UserSeq, ghi cache một lần và dựng lại cây sau khi đọc cache. Route có permission
không còn tự cho phép truy cập. Hook quyền đọc Print/Save cùng action tùy chỉnh.
Nút và phím tắt lưu phân quyền dùng canSave cùng quyền A/U/D.

API quản trị kiểm tra quyền từ database, gồm Search/Save nếu được khai báo;
thiếu khai báo giữ tương thích với View/Create/Edit cũ. Các sheet nhóm và gán
quyền trong API Role được kiểm tra riêng; batch trộn cần đủ quyền cả hai.
Service lưu action từ chối MenuId đã xóa hoặc không phải màn hình. Màn hình
quản lý quyền cảnh báo action còn trỏ tới menu đã xóa để người quản trị gán lại.
Không sửa, xóa hoặc tự cấp thêm quyền trong database.

## Mã hóa và nơi lưu

- Quyền gốc: _ERPRolesUsers; danh mục: _ERPMenus, _ERPRootMenus.
- Token quyền: JWT HS256 có chữ ký, sub=UserSeq, exp và token_use=permissions.
  JWT bảo vệ tính toàn vẹn; nội dung JWT không được mã hóa.
- Gateway hiện trả JSON; HTTPS bảo vệ dữ liệu trên mạng ở môi trường production.
  HTTP localhost không có mã hóa TLS. Không tuyên bố response login là JWE/AES.
- Menu/action cache: IndexedDB menuDatabase, store menus, record active_menu,
  mã hóa AES. Khóa phía frontend chỉ giúp che dữ liệu; không chống người kiểm
  soát máy đọc/sửa. Backend không tin cache này khi quyết định quyền.
- UserInfo và bearer token vẫn dùng cookie/localStorage theo kiến trúc hiện có.
  Chống sao chép bearer token cần thiết kế phiên/khóa thiết bị riêng; chưa triển khai.

## Xác minh

- Truy vấn mới đã chạy với database thật, tài khoản superadmin, ở chế độ chỉ đọc.
  Kết quả: 2 module, 16 màn hình hiển thị trong cây frontend. Màn hình còn lại
  bị ẩn vì thư mục cha được khai báo View=false; không tự bỏ quyền từ chối này.
- Map action của MenuId 302 giữ đúng Create/Edit/Delete/Import/Export, Search,
  Save, Print, Lock và TEST. Các action trỏ MenuId 1 không được gán sang menu khác.
- SQL của PermissionInterceptor đã kiểm tra với database thật: các API quản trị
  được phép với tài khoản kiểm tra; UserSeq không có nhóm bị từ chối khi gọi sửa.
- 29 kiểm thử frontend chạy thành công, gồm cây menu, token hết hạn/sai tài khoản
  và vòng mã hóa/giải mã AES giữ nguyên action.
- Kiểm thử Go chạy thành công cho auth, middleware, utils, role_user và cmd/server;
  kiểm tra chữ ký JWT giữ đủ 5 phần và action tùy chỉnh.
- Build web và backend thành công. Backend local đã lắng nghe cổng 60051.

Đã thử đăng nhập thật qua gateway Dev http://127.0.0.1:9643 bằng tài khoản admin
người dùng cung cấp. Đăng nhập thành công; chữ ký access token và token quyền
đều hợp lệ, cùng UserSeq. Response có đủ 5 phần, dựng được 2 module và 16 màn
hình, giữ 125 mục action. API RoleQ truy vấn nhóm quyền được phép và trả 6 nhóm.
Script chỉ xử lý mật khẩu/token trong bộ nhớ, không ghi chúng vào file; các
script chẩn đoán tạm đã xóa. Chưa thao tác trực tiếp cửa sổ ứng dụng của người
 dùng. Cần tải lại ứng dụng và đăng xuất/đăng nhập lại để nhận token mới.
Nếu dùng server remote/Official, cần triển khai backend lên server đó; sửa
source local không cập nhật server remote.
## Phạm vi còn lại

API nghiệp vụ ngoài danh sách permissionMenus vẫn cần chính sách backend riêng
cho thao tác, phạm vi dữ liệu và trường. Các assignment cũ chỉ có UserId cần được
đối chiếu UserSeq; không tự đoán bằng tên hiển thị. Các index trong migration
migration_permission_indexes.sql đã chuẩn bị nhưng chưa chạy. Chưa đo latency/EXPLAIN ở
tải thực tế. Các action mồ côi cần được người quản trị chọn đúng màn hình và gán
lại; không tự cấp chúng cho toàn bộ menu.



## Bổ sung: sidebar và quyền localStorage

Sidebar dùng chung danh sách đã lọc theo quyền View từ snapshot cho biểu tượng
module, danh sách module và các menu con. Nhóm rỗng/module không có màn hình
được phép xem bị ẩn. Shortcut module còn phụ thuộc RootMenuUtilities=true;
không mặc định hiện hai module. Backend đã trả thứ tự IdxNo của module thành
OrderSeq; sidebar dùng OrderSeq/IdxNo cho thứ tự module và menu.

Nút Search bị mất vì bộ chuẩn hóa tự thêm Search=false khi server không khai
báo Search. Đã sửa để fallback theo View, giống backend; khai báo Search/BTN_SEARCH
false vẫn bị từ chối. Hook React đã được kiểm thử trên ba trang module/menu/action.

Không lưu snapshot menu/action/token quyền vào localStorage. Luồng lưu toàn bộ
phiên được lọc bỏ quyền kể cả dữ liệu lồng nhau; các khóa quyền cũ được dọn khi
khởi động/đăng nhập. UserInfo chỉ giữ dữ liệu đã lọc; token quyền không được dùng
như access token từ URL để ghi vào localStorage. Menu/action cache vẫn nằm trong
IndexedDB với AES. Trạng thái mở/đóng sidebar, độ rộng cột là tùy chọn giao diện,
không phải quyền truy cập và không được dùng để quyết định quyền.
