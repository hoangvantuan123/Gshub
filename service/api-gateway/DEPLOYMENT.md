# Hướng dẫn Triển khai API Gateway (Go)

## 1. Tối ưu hóa
Script build đã sử dụng `-ldflags="-s -w"` để nén file thực thi nhỏ gọn nhất cho server.

## 2. Cách Build
Chạy lệnh sau tại thư mục gốc của API Gateway:
```powershell
.\scripts\build.ps1 -Target linux
```

## 3. Triển khai
1. Copy file `api-gateway-linux` lên server.
2. Copy file `.env` tương ứng cho môi trường Production.
3. Sử dụng PM2 để chạy ngầm và tự khởi động lại:
   ```bash
   pm2 start ./api-gateway-linux --name "api-gateway"
   ```

## 4. Cấu hình Nginx (Nếu cần)
API Gateway thường chạy sau Nginx. Đảm bảo cấu hình `proxy_set_header` để Gateway nhận đúng IP của người dùng.
