# Phân loại diễn giải TKSX

Danh mục dùng chung cho GS1/GS5, lưu tại `public."_ERPProdStatsRemarkType"`.
Model không khai báo primary key, foreign key, unique hoặc check constraint.
DataHub tự sinh UUIDv7 khi thêm mới nếu không truyền `IdSeq`.

## Cấu trúc

- `models/report/erp_prod_stats_remark_type.go`: model.
- `services/report/prod_stats_remark_type/`: service, A/U/D/Q và bộ giải mã request dùng chung.
- `handlers/prod_stats_remark_type_handler.go`: REST.
- `grpcserver/prod_stats_remark_type_server.go`: gRPC service riêng.
- `proto/prod_stats_remark_type.proto`: hợp đồng gRPC (bản sao ở `service/proto/datahub`, `proto`, `software/src/main/datahub/proto`).
- `database/migration_prod_stats_remark_type.sql`: tạo bảng, thêm cột diễn giải và đăng ký menu/action.

## Cài đặt

1. Chạy `database/migration_prod_stats_remark_type.sql` trên `GsHub` bằng psql với `-v ON_ERROR_STOP=1`.
   Migration cần các bảng menu/action hiện có và submenu `report_registration_group`.
   Migration chạy lại được, giữ nguyên các quyền đã cấp, không tự cấp quyền cho nhóm bất kỳ.
2. Trong quản lý phân quyền, cấp quyền menu `report_prod_stats_remark_type` cho nhóm được phép sử dụng.
3. Build và triển khai lại DataHub và API Gateway, kèm file proto mới trong thư mục `PROTO_DIR`.

DataHub AutoMigrate cũng nhận model mới, nhưng không tự thực thi migration menu.
Link menu đăng ký: `/erp/u/report/prod-stats-remark-type`.
Frontend cung cấp trang danh sách, tìm kiếm, thêm, sửa và xóa tại link này.

## API

Base path tại Gateway và DataHub: `/api/v2/report/prod-stats-remark-type`.
Tất cả endpoint yêu cầu phiên đăng nhập hợp lệ. Danh tính ghi audit lấy từ phiên đăng nhập,
không lấy `CreatedBy`/`UpdatedBy` do client gửi.

| Method | Endpoint | Quyền |
|---|---|---|
| POST | `/ProdStatsRemarkTypeA` | View + Create |
| POST | `/ProdStatsRemarkTypeU` | View + Edit |
| POST | `/ProdStatsRemarkTypeD` | View + Delete |
| POST / GET | `/ProdStatsRemarkTypeQ` | View + Search |

Các quyền BTN_SAVE/BTN_SEARCH khai báo tường minh được xử lý theo middleware phân quyền hiện có.
Gọi REST trực tiếp tới DataHub vẫn cần các header bảo mật ứng dụng hiện có.

### A: thêm mới

Nhận mảng trực tiếp hoặc object `items`/`data`. Tối đa 500 dòng, lưu toàn bộ trong một transaction.
`TypeCode` và `TypeName` bắt buộc; `IsActive` mặc định true, có thể truyền false.

```json
{"items":[{"TypeCode":"WAIT_MATERIAL","TypeName":"Chờ nguyên vật liệu","Description":"Diễn giải nguyên nhân chờ","IsActive":true,"IdxNo":1}]}
```

### U: sửa

Nhận cùng định dạng A; mỗi dòng bắt buộc có `IdSeq`, `TypeCode`, `TypeName`.
Thay thế các trường văn bản có thể sửa. Bỏ `Description`/`IdxNo` hoặc truyền null sẽ xóa giá trị;
bỏ `IsActive` hoặc truyền null giữ trạng thái hiện tại. Không thay đổi `CreatedBy`/`CreatedAt`.

```json
{"items":[{"IdSeq":"UUIDv7 đã nhận từ A","TypeCode":"WAIT_MATERIAL","TypeName":"Chờ vật tư","Description":"Nội dung mới","IsActive":false,"IdxNo":1}]}
```

### D: xóa

Nhận mảng UUIDv7 hoặc object `idSeqs`, tối đa 500 mã.
Không xóa phân loại đã được sử dụng tại `_ERPProdStatsDetail.RemarkTypeSeq`;
có thể ngừng sử dụng bằng U với `IsActive=false`. Batch thiếu một mã hoặc có mã trùng sẽ bị từ chối.

```json
{"idSeqs":["UUIDv7 đã nhận từ A"]}
```

### Q: truy vấn

```json
{"Keyword":"chờ","IsActive":true,"page":1,"pageSize":100}
```

Hỗ trợ `IdSeq` (khớp chính xác), `TypeCode`, `TypeName`, `Keyword` (tìm cả mô tả), `IsActive`,
`page` và `pageSize`. Mặc định page=1, pageSize=100, tối đa 1000 dòng/trang.
GET nhận các tham số trên qua query string; POST nhận qua JSON body.
Phản hồi gồm `success`, `data` và thông tin phân trang (REST DataHub: `pageInfo`, Gateway: `page`). Mỗi dòng có `RowVersion`; thao tác cập nhật và xóa phải gửi phiên bản đã truy vấn. Phiên bản được tăng sau mỗi lần cập nhật, còn dữ liệu cũ hơn sẽ nhận lỗi xung đột để người dùng truy vấn lại.

Do không có UNIQUE constraint, API tuần tự hóa các thao tác ghi danh mục bằng transaction và table lock
để kiểm tra trùng `IdSeq`/`TypeCode` (mã không phân biệt hoa thường). Các thao tác ghi SQL trực tiếp
không đi qua API cần tự giữ đúng quy tắc này.

## Kiểm thử

`go test ./...` kiểm tra build, payload và bảo vệ endpoint REST/gRPC.
Đặt `PROD_STATS_REMARK_TYPE_TEST_DSN` (DSN dạng `host=... port=... user=... dbname=... sslmode=disable`)
đến **database PostgreSQL dùng riêng cho kiểm thử, còn trống** để chạy kiểm thử A/U/D/Q thực tế,
rollback batch, audit, chống trùng khi ghi đồng thời và xác minh bảng không có constraint.
Không đặt biến này trỏ tới `GsHub` đang sử dụng.
