# SysCore DataHub Service (Dual Engine: REST + Protobuf / gRPC)

Dịch vụ Backend trung gian hiệu năng cao kết nối và xác thực động giữa Frontend (FE) / Desktop App và hệ thống ERP bên ngoài (Bravo ERP, etc.), tích hợp cơ sở dữ liệu **PostgreSQL (`DATAHUB`)** để lưu trữ cấu hình địa chỉ/tham số, phiên token và nhật ký truy vết (`AuditLog`).

---

## ⚡ Kiến Trúc Đa Giao Thức (Dual Engine)

1. **Protobuf / gRPC Engine (Port: `50057`)**:
   - Sử dụng **Protocol Buffers v3 binary wire format** giúp tối ưu hóa serialize/deserialize, giảm dung lượng truyền tải mạng 60% – 80%.
   - Chạy trên **HTTP/2 Multiplexing**: Hàng nghìn request song song trên 1 TCP socket duy nhất, loại bỏ hoàn toàn độ trễ mở kết nối liên tục.
   - Hỗ trợ **Bi-directional Streaming (`StreamProxy`)** cho các tác vụ chuyển tiếp dữ liệu lớn đồng thời.
2. **REST JSON Engine (Port: `8080`)**:
   - Tương thích ngược với các web browser và HTTP clients truyền thống.

---

## 1. Cấu Trúc Bảng CSDL (Database: `DATAHUB`)

1. **`"ErpConfig"`**: Quản lý cấu hình địa chỉ `AuthUrl`, `BaseApiUrl`, `ClientId`, `ClientSecret`, `DeviceCode`, etc. theo từng `ConfigKey`.
2. **`"TokenSession"`**: Lưu trữ và tự động làm mới phiên làm việc / Token OAuth của từng tài khoản theo từng `ConfigKey`.
3. **`"AuditLog"`**: Ghi lại lịch sử toàn bộ các thao tác login, gọi API, đo lường độ trễ (`LatencyMs`) và trạng thái (`StatusCode`).

---

## 2. Protobuf / gRPC API (`proto/datahub.proto`)

- **Package**: `datahub`
- **Service**: `DataHubService`

| RPC Method | Input Type | Output Type | Mô tả |
| :--- | :--- | :--- | :--- |
| `Login` | `LoginProtoRequest` | `LoginProtoResponse` | Đăng nhập ERP, lưu token session |
| `GetSession` | `SessionProtoRequest` | `SessionProtoResponse` | Lấy phiên token đang hoạt động |
| `GetAllConfigs` | `GetConfigsProtoRequest` | `GetConfigsProtoResponse` | Lấy danh sách cấu hình ERP |
| `SaveConfig` | `SaveConfigProtoRequest` | `SaveConfigProtoResponse` | Tạo mới/cập nhật cấu hình |
| `DeleteConfig` | `DeleteConfigProtoRequest` | `DeleteConfigProtoResponse` | Xóa cấu hình theo key |
| `ProxyForward` | `ProxyProtoRequest` | `ProxyProtoResponse` | Forward request sang ERP cực nhanh |
| `StreamProxy` | `stream ProxyProtoRequest` | `stream ProxyProtoResponse` | Stream proxy song song 2 chiều |
| `GetAuditLogs` | `AuditLogsProtoRequest` | `AuditLogsProtoResponse` | Tra cứu lịch sử truy vết |
| `HealthCheck` | `HealthProtoRequest` | `HealthProtoResponse` | Kiểm tra tình trạng server & DB |

---

## 3. Danh Sách REST Endpoints (Port `8080`)

### 3.1. Đăng nhập (Auth & Login)
- **`POST /api/v1/auth/login`**
- **`GET /api/v1/auth/session?config_key=BravoDefault&username=IT_TUANHV`**

### 3.2. Quản lý Cấu hình Kết nối ERP (`ErpConfig`)
- **`GET /api/v1/configs`**
- **`GET /api/v1/configs/:key`**
- **`POST /api/v1/configs`**
- **`DELETE /api/v1/configs/:key`**

### 3.3. Proxy Chuyển Tiếp & Audit Logs
- **`POST /api/v1/datahub/proxy`**
- **`GET /api/v1/datahub/logs?limit=50&offset=0`**
- **`GET /health`**

---

## 4. Cách Khởi Động Server

```powershell
# Chạy trực tiếp từ mã nguồn
go run cmd/server/main.go

# Hoặc chạy file build thực thi
.\datahub-server.exe
```
