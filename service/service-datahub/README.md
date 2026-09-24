# SysCore DataHub Service

Dịch vụ Backend trung gian kết nối và xác thực động giữa Frontend (FE) và hệ thống ERP bên ngoài (Bravo ERP, etc.), tích hợp cơ sở dữ liệu **PostgreSQL (`DATAHUB`)** để lưu trữ cấu hình địa chỉ/tham số, phiên token và nhật ký truy vết (`AuditLog`).

---

## 1. Cấu Trúc Bảng CSDL (Database: `DATAHUB`)

1. **`"ErpConfig"`**: Quản lý cấu hình địa chỉ `AuthUrl`, `BaseApiUrl`, `ClientId`, `ClientSecret`, `DeviceCode`, etc. theo từng `ConfigKey`.
2. **`"TokenSession"`**: Lưu trữ và tự động làm mới phiên làm việc / Token OAuth của từng tài khoản theo từng `ConfigKey`.
3. **`"AuditLog"`**: Ghi lại lịch sử toàn bộ các thao tác login, gọi API, đo lường độ trễ (`LatencyMs`) và trạng thái (`StatusCode`).

---

## 2. Danh Sách API Endpoints Cho Frontend (FE)

### 2.1. Đăng nhập (Auth & Login)
- **`POST /api/v1/auth/login`**
  - **Mục đích**: FE gửi thông tin đăng nhập, server đọc cấu hình từ `ErpConfig` trong DB `DATAHUB` và chuyển tiếp xác thực sang ERP.
  - **Body Payload**:
    ```json
    {
      "username": "IT_TUANHV",
      "password": "Tuan3112@",
      "config_key": "BravoDefault"
    }
    ```
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Authentication successful",
      "data": {
        "success": true,
        "config_key": "BravoDefault",
        "username": "IT_TUANHV",
        "access_token": "eyJhbGciOi...",
        "token_type": "Bearer",
        "expires_in": 3600,
        "expires_at": "2026-09-24T19:54:00Z"
      }
    }
    ```

- **`GET /api/v1/auth/session?config_key=BravoDefault&username=IT_TUANHV`**
  - **Mục đích**: Kiểm tra xem phiên token của user này có còn hiệu lực trong database hay không.

---

### 2.2. Quản lý Cấu hình Kết nối ERP (`ErpConfig`)
- **`GET /api/v1/configs`**: Lấy danh sách tất cả các cấu hình hệ thống đang có.
- **`GET /api/v1/configs/:key`**: Xem chi tiết 1 cấu hình theo key (vd: `/api/v1/configs/BravoDefault`).
- **`POST /api/v1/configs`**: Tạo mới hoặc cập nhật thông số cấu hình ERP từ FE.
  ```json
  {
    "config_key": "BravoDefault",
    "config_name": "Bravo ERP Goldsun Packaging",
    "provider": "Bravo",
    "auth_url": "https://bravo.goldsunpackaging.vn:5051/fa837234b0b27bc02365a940995bdc24",
    "base_api_url": "https://bravo.goldsunpackaging.vn:5051",
    "referer": "https://bravo.goldsunpackaging.vn:5052/",
    "client_id": "c52bd596-07ff-4329-a640-67f41a51a90e",
    "client_secret": "DC86276E4BF54018BE9EC05650681914",
    "device_code": "45fd8c9a3974fe45589811c5dfbc2fef",
    "connection_name": "Default",
    "grant_type": "password",
    "scope": "ApiGateway offline_access",
    "insecure_skip_verify": true,
    "is_active": true
  }
  ```
- **`DELETE /api/v1/configs/:key`**: Xóa một cấu hình.

---

### 2.3. Proxy Chuyển Tiếp & Audit Logs
- **`POST /api/v1/datahub/proxy`**: Chuyển tiếp request bất kỳ sang ERP đích bằng token đã login.
  ```json
  {
    "config_key": "BravoDefault",
    "username": "IT_TUANHV",
    "method": "GET",
    "path": "/api/v1/orders",
    "params": {
      "page": "1",
      "limit": "20"
    }
  }
  ```
- **`GET /api/v1/datahub/logs?limit=50&offset=0`**: Tra cứu danh sách nhật ký Audit Log.
- **`GET /health`**: Kiểm tra trạng thái máy chủ và kết nối PostgreSQL.

---

## 3. Cách Khởi Động Server

```powershell
# Chạy trực tiếp từ mã nguồn
go run cmd/server/main.go

# Hoặc chạy file build thực thi
.\datahub-server.exe
```
