# GSHUB Microservices Orchestration

Thư mục tổng điều khiển toàn bộ backend microservices của hệ thống **GsHub**, bao gồm:
1. **`server-core`**: Core Engine, Authentication, Role & User management (gRPC `:60051`).
2. **`service-datahub`**: Bravo ERP Integration & Production/Report calculation engine (gRPC `:60052`, HTTP `:9645`).
3. **`api-gateway`**: REST Gateway & JWT Authentication Middleware (`:9643`).

---

## 🚀 1. Lệnh Chạy Toàn Bộ Hệ Thống (Run All Services)

### Cách 1: Sử dụng File Batch / Menu Tổng (Khuyến nghị trên Windows)
- Nhấp đúp vào [start.bat](file:///c:/Users/tuanhoang/Desktop/Gshub/service/start.bat) hoặc chạy trên Command Prompt / PowerShell:
  ```bat
  # Mở menu tùy chọn tương tác:
  start.bat

  # Hoặc chạy trực tiếp chế độ DEV (mở đồng thời 3 cửa sổ Go Live):
  start.bat dev

  # Hoặc chạy qua PM2:
  start.bat pm2

  # Hoặc dừng toàn bộ dịch vụ:
  start.bat stop
  ```

### Cách 2: Sử dụng PowerShell Script
```powershell
# Chế độ Dev (mở 3 tab/window chạy live):
.\start.ps1 -Mode dev

# Chế độ PM2:
.\start.ps1 -Mode pm2

# Dừng tất cả:
.\start.ps1 -Mode stop
```

### Cách 3: Sử dụng NPM (Nếu quen thuộc với Node/NPM)
```bash
# Chế độ Dev:
npm run dev

# Chạy PM2:
npm run pm2:start

# Xem logs PM2:
npm run pm2:logs

# Dừng tất cả:
npm run stop
```

---

## 🔨 2. Lệnh Build Toàn Bộ Hệ Thống (Build All Services)

### Build cho Windows & Linux cùng lúc:
- Nhấp đúp vào [build.bat](file:///c:/Users/tuanhoang/Desktop/Gshub/service/build.bat) hoặc gõ:
  ```bat
  build.bat
  ```

### Build qua PowerShell:
```powershell
# Build cả Windows và Linux:
.\build.ps1 -Target all

# Chỉ build Windows (.exe):
.\build.ps1 -Target win

# Chỉ build Linux (để deploy server):
.\build.ps1 -Target linux
```

### Build qua Bash / Linux:
```bash
chmod +x build.sh
./build.sh
```

---

## 📂 3. Cấu Trúc File & Port Mặc Định

| Dịch vụ | Giao thức / Port | File Binary Windows | File Binary Linux |
| :--- | :--- | :--- | :--- |
| **GSHUB Server-Core** | gRPC `:60051` | `server-core.exe` | `server-core` |
| **GSHUB Service-Datahub** | gRPC `:60052` / HTTP `:9645` | `service-datahub.exe` | `service-datahub` |
| **GSHUB API-Gateway** | REST `:9643` | `api-gateway.exe` | `api-gateway` |

---

## 🛑 4. Dừng Toàn Bộ Hệ Thống
Chạy [stop.bat](file:///c:/Users/tuanhoang/Desktop/Gshub/service/stop.bat) để dọn dẹp và tắt tất cả các tiến trình server đang chạy nền hoặc qua PM2:
```bat
stop.bat
```
