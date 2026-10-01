# Hướng dẫn Vận hành & Build Service DataHub

Dịch vụ backend hiệu năng cao cho hệ thống GsHub (REST API: Port `9643`, gRPC: Port `9644`).

---

## 1. Môi trường Development (Phát triển)
Khi đang code và muốn hot-reload tự động:
```bash
# Sử dụng Air (tự động reload khi sửa code)
air

# Hoặc chạy trực tiếp
go run main.go
```

---

## 2. Build Production

### Cách 1: Build từ máy Windows (Khuyên dùng)
Chạy file [build.bat](build.bat) (hoặc gõ lệnh bên dưới). Script sẽ tự động đóng gói cả 2 bản cho Windows và Linux:
```cmd
build.bat
```
*(Lệnh chi tiết nếu gõ tay:)*
- **Bản Windows**: `go build -ldflags="-s -w" -o service-datahub.exe .`
- **Bản Linux (Server)**: `set GOOS=linux && set GOARCH=amd64 && set CGO_ENABLED=0 && go build -ldflags="-s -w" -o service-datahub .`

### Cách 2: Build trực tiếp trên máy chủ Linux
Đứng tại thư mục service trên server:
```bash
chmod +x build.sh
./build.sh
```
*(Hoặc lệnh trực tiếp: `CGO_ENABLED=0 go build -ldflags="-s -w" -o service-datahub .`)*

---

## 3. Khởi chạy và Quản lý với PM2

### Trên máy chủ Linux:
```bash
# 1. Kéo code mới về
git pull

# 2. Cấp quyền thực thi file chạy (bắt buộc)
chmod +x service-datahub

# 3. Khởi động hoặc Restart service
pm2 start ecosystem.config.js
# hoặc nếu đã chạy:
pm2 restart gshub-service
```

### Trên máy Windows:
```cmd
pm2 start ecosystem.config.js
# hoặc
pm2 restart gshub-service
```

---

## 4. Các lệnh PM2 thường dùng

| Thao tác | Câu lệnh |
| :--- | :--- |
| **Xem trạng thái** | `pm2 status` |
| **Xem log trực tiếp** | `pm2 logs gshub-service` |
| **Khởi động lại** | `pm2 restart gshub-service` |
| **Dừng tiến trình** | `pm2 stop gshub-service` |
| **Lưu cấu hình PM2** | `pm2 save` |
