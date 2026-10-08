# Go Microservice Architecture: User Service

Tài liệu này mô tả cấu trúc kiến trúc của microservice Go được chuyển đổi từ NestJS, tập trung vào hiệu suất cao cho hệ thống ERP Big Data.

## 1. Công nghệ sử dụng (Tech Stack)
*   **Ngôn ngữ**: Go (Golang)
*   **Database Driver**: `sqlx` (Tối ưu Raw SQL) & `GORM` (Quản lý kết nối & tác vụ đơn giản).
*   **Transport**: gRPC (Google Remote Procedure Call).
*   **Dependency Injection**: Thủ công thông qua `AppContainer`.
*   **Logging**: `uber-go/zap` (High performance logging).

## 2. Cấu trúc thư mục (Project Structure)

```text
server-core/
├── cmd/
│   └── server/
│       └── main.go          # Điểm khởi đầu của ứng dụng
├── internal/
│   ├── app/
│   │   └── app.go           # AppContainer (DI) & Đăng ký Service
│   ├── config/              # Quản lý biến môi trường (.env)
│   ├── database/            # Khởi tạo kết nối GORM & SQLX
│   ├── domain/              # Định nghĩa Structs (Entities) & Interfaces
│   │   ├── app/
│   │   ├── auth/
│   │   ├── language/
│   │   ├── roles/
│   │   └── technique/
│   ├── service/             # Logic nghiệp vụ (A, U, D, Q) - Dùng SQLX
│   ├── repository/          # Tầng truy xuất dữ liệu
│   ├── transport/
│   │   └── grpc/            # Các gRPC Handlers (Controllers)
│   └── utils/               # Các hàm tiện ích (JWT, Hash,...)
├── proto/                   # Định nghĩa file .proto
└── gen_proto.ps1            # Script sinh mã nguồn gRPC
```

## 3. Các lớp xử lý chính

### Service Layer (Logic Nghiệp vụ)
Nằm trong `internal/service/`. Đây là nơi chứa toàn bộ logic chuyển từ NestJS sang.
*   **Đặc điểm**: Sử dụng `sqlx.DB` để thực hiện các truy vấn Raw SQL tối ưu.
*   **Xử lý A, U, D, Q**: Các hàm được thiết kế để xử lý hàng loạt (Batch) và join dữ liệu phức tạp mà không bị overhead bởi ORM.

### Domain Layer
Nằm trong `internal/domain/`.
*   Chứa các `struct` ánh xạ 1-1 với bảng trong Database.
*   Chứa các `interface` để đảm bảo tính module và dễ dàng Unit Test.

### Transport Layer (gRPC)
Nằm trong `internal/transport/grpc/`.
*   Đóng vai trò như các Controllers trong NestJS.
*   Nhận request từ gRPC, gọi Service tương ứng và trả về response theo chuẩn Proto.

## 4. Quản lý Kết nối Database
Hệ thống sử dụng cơ chế **Dual-Wrapper**:
*   **GORM**: Dùng để quản lý vòng đời kết nối, pooling và các tác vụ CRUD cực kỳ đơn giản.
*   **SQLX**: Dùng cho 90% logic nghiệp vụ ERP đòi hỏi tốc độ cao và query phức tạp.
*   Cả hai dùng chung một **Connection Pool** bên dưới để tiết kiệm tài nguyên.

## 5. Luồng xử lý (Request Flow)
`gRPC Client` -> `gRPC Handler` -> `Service (Business Logic + SQLX)` -> `Database`

---
**Ghi chú**: Khi phát triển module mới, hãy tuân thủ quy tắc "Mỗi bảng một file" trong domain và service để giữ code sạch sẽ và dễ quản lý.
