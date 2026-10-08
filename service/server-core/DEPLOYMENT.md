# Hướng dẫn Triển khai (Deployment Guide)

Tài liệu này hướng dẫn cách build và triển khai Microservice Go lên môi trường Production một cách tối ưu nhất.

## 1. Tối ưu hóa kích thước file (Optimization)
Các script build đã được cấu hình với flag `-ldflags="-s -w"`:
*   **`-s`**: Xóa bảng ký hiệu (symbol table).
*   **`-w`**: Xóa thông tin debug (DWARF).
*   **Kết quả**: Giảm ~30% kích thước file thực thi, giúp khởi động nhanh hơn và tiết kiệm tài nguyên server.

---

## 2. Cách Build (Dành cho Dev)

### Trên Windows (Sử dụng PowerShell)
Mở terminal tại thư mục gốc của dự án và chạy:

*   **Build cho mọi nền tảng:**
    ```powershell
    .\scripts\build.ps1
    ```
*   **Chỉ build cho Linux (Deploy lên Server):**
    ```powershell
    .\scripts\build.ps1 -Target linux
    ```
*   **Chỉ build cho Windows:**
    ```powershell
    .\scripts\build.ps1 -Target win
    ```

### Trên Linux/macOS (Sử dụng Makefile)
```bash
make gen           # Tạo lại file Proto
make build-linux   # Build cho Linux
```

---

## 3. Quy trình triển khai lên Server Production

Sau khi build, bạn sẽ nhận được file thực thi trong thư mục `/bin`. Để chạy trên server, hãy làm theo các bước sau:

### Bước 1: Chuẩn bị thư mục trên Server
Tạo một thư mục ứng dụng (ví dụ: `/var/www/micro-user`) và copy các file sau vào:
1.  File thực thi (ví dụ: `server-core-linux`)
2.  File cấu hình `.env` (chứa thông tin DB, Port của Production)
3.  Thư mục `cert/` (nếu có sử dụng SSL/TLS)

### Bước 2: Cấp quyền thực thi (Chỉ dành cho Linux)
```bash
chmod +x server-core-linux
```

### Bước 3: Quản lý vận hành (Khuyên dùng PM2 hoặc Systemd)

#### Cách 1: Dùng PM2 (Đơn giản nhất)
```bash
pm2 start ./server-core-linux --name "server-core"
```

#### Cách 2: Dùng Systemd (Chuẩn Server Linux)
Tạo file `/etc/systemd/system/micro-user.service`:
```ini
[Unit]
Description=Go User Microservice
After=network.target

[Service]
ExecStart=/path/to/your/app/server-core-linux
WorkingDirectory=/path/to/your/app
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```
Sau đó chạy:
```bash
systemctl start micro-user
systemctl enable micro-user
```

---

## 4. Kiểm tra trạng thái
*   **Log hệ thống:** Xem tại thư mục `/logs` (đã được cấu hình tự động xoay vòng hàng ngày).
*   **Health Check:** `http://localhost:port/health` (nếu có).

---
*Chúc bạn triển khai thành công!*
