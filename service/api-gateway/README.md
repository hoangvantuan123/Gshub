# Hướng dẫn Vận hành API Gateway Go

Tài liệu này hướng dẫn cách cài đặt, xây dựng bản build và triển khai API Gateway viết bằng Go cho hệ thống ERP.

## 1. Yêu cầu Hệ thống
- **Ngôn ngữ**: Go 1.21 trở lên.
- **Thư viện**: Tải tất cả các phụ thuộc (dependencies) bằng lệnh:
  ```powershell
  go mod download
  ```

## 2. Cấu trúc Dự án Quan trọng
Để ứng dụng có thể chạy, bạn cần duy trì cấu trúc tối thiểu sau trong thư mục chạy:
```text
dist/
  ├── api-gateway (.exe cho Windows hoặc nhị phân cho Linux)
  ├── .env           (Chứa cấu hình IP, Port, Redis, gRPC hosts)
  └── proto/         (Thư mục chứa các file .proto từ thư mục gốc)
```

## 3. Cấu hình .env (Quan trọng nhất)
Đảm bảo file `.env` được cấu hình đúng đường dẫn:
```env
# Đường dẫn tới thư mục chứa các file .proto (tương đối hoặc tuyệt đối)
PROTO_DIR=./proto

# Thư mục lưu trữ Logs (sẽ tự động tạo cấu trúc Năm/Tháng/Ngày)
LOG_STORAGE=./logs

# Môi trường chạy (dev hoặc production)
NODE_ENV=dev
```

## 4. Cách chạy và Build

### Chạy trực tiếp (Phát triển)
```powershell
go run main.go
```

### Xây dựng bản Build cho Windows Server
```powershell
# Chạy trong thư mục dự án
$env:GOOS="windows"; $env:GOARCH="amd64"; go build -o api-gateway.exe main.go
```

### Xây dựng bản Build cho Linux Server
```powershell
# Chạy trong thư mục dự án
$env:GOOS="linux"; $env:GOARCH="amd64"; go build -o api-gateway main.go
```

## 5. Triển khai Chạy ngầm bằng PM2 (Khuyên dùng)
Vì ứng dụng viết bằng Go là đơn tiến trình cực nhẹ, hãy dùng PM2 để quản lý và tự khởi động lại:

**Để khởi động:**
```bash
pm2 start .\api-gateway.exe --name "api-gateway"
```

**Để xem Log đang chạy:**
```bash
pm2 logs api-gateway --lines 50
```

**Để lưu cấu hình (Startup):**
```bash
pm2 save
```

## 6. Ghi chú về Hiệu năng
- Ứng dụng Go tốn rất ít RAM so với Node.js (thường < 30MB).
- Toàn bộ Log của gRPC (Requests/Payloads/Responses) được ghi lại liên tục vào thư mục `logs/` theo từng ngày.
- Mọi điều chỉnh về IP/Port của các dịch vụ backend đều được thực hiện qua file `.env` mà không cần build lại code.
