@echo off
setlocal enabledelayedexpansion
title GSHUB MICROSERVICES LAUNCHER
chcp 65001 >nul

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

if "%1"=="dev" goto MODE_DEV
if "%1"=="--dev" goto MODE_DEV
if "%1"=="-dev" goto MODE_DEV
if "%1"=="pm2" goto MODE_PM2
if "%1"=="--pm2" goto MODE_PM2
if "%1"=="-pm2" goto MODE_PM2
if "%1"=="prod" goto MODE_PROD
if "%1"=="--prod" goto MODE_PROD
if "%1"=="-prod" goto MODE_PROD
if "%1"=="build" goto MODE_BUILD
if "%1"=="--build" goto MODE_BUILD
if "%1"=="-build" goto MODE_BUILD
if "%1"=="stop" goto MODE_STOP
if "%1"=="--stop" goto MODE_STOP
if "%1"=="-stop" goto MODE_STOP

:MENU
cls
echo =========================================================================
echo               GSHUB SERVICES - TRÌNH ĐIỀU KHIỂN TỔNG
echo =========================================================================
echo.
echo   [1] Chạy chế độ DEV (Mở 3 cửa sổ Go Live: Core, Datahub, Gateway)
echo   [2] Chạy chế độ PM2 (Chạy nền tự động quản trị qua PM2)
echo   [3] Chạy chế độ PRODUCTION BINARY (Chạy 3 file .exe)
echo   [4] Build toàn bộ hệ thống (build.bat)
echo   [5] Build và Khởi động ngay với PM2
echo   [6] Dừng toàn bộ các Server đang chạy
echo   [0] Thoát
echo.
echo =========================================================================
set /p opt="Vui lòng chọn [1-6, 0]: "

if "%opt%"=="1" goto MODE_DEV
if "%opt%"=="2" goto MODE_PM2
if "%opt%"=="3" goto MODE_PROD
if "%opt%"=="4" goto MODE_BUILD
if "%opt%"=="5" goto MODE_BUILD_AND_PM2
if "%opt%"=="6" goto MODE_STOP
if "%opt%"=="0" exit /b 0
echo Lựa chọn không hợp lệ!
timeout /t 2 >nul
goto MENU

:MODE_DEV
echo.
echo =========================================================================
echo  ĐANG KHỞI ĐỘNG CÁC DỊCH VỤ Ở CHẾ ĐỘ DEV (GO RUN)...
echo =========================================================================
echo.
echo 1. Khởi động GSHUB SERVER-CORE (gRPC Port :60051)...
start "GSHUB-SERVER-CORE (:60051)" cmd /k "cd /d %ROOT_DIR%server-core && echo [GSHUB-CORE] Starting... && go run ./cmd/server"
timeout /t 2 /nobreak >nul

echo 2. Khởi động GSHUB SERVICE-DATAHUB (gRPC :60052 / HTTP :9645)...
start "GSHUB-SERVICE-DATAHUB (:60052)" cmd /k "cd /d %ROOT_DIR%service-datahub && echo [GSHUB-DATAHUB] Starting... && go run ."
timeout /t 2 /nobreak >nul

echo 3. Khởi động GSHUB API-GATEWAY (REST Entrypoint :9643)...
start "GSHUB-API-GATEWAY (:9643)" cmd /k "cd /d %ROOT_DIR%api-gateway && echo [GSHUB-GATEWAY] Starting... && go run ."
echo.
echo [SUCCESS] Đã khởi chạy 3 cửa sổ dịch vụ!
echo - API Gateway : http://127.0.0.1:9643
echo - DataHub HTTP: http://127.0.0.1:9645 (gRPC :60052)
echo - Server-Core : gRPC :60051
goto END

:MODE_PM2
echo.
echo =========================================================================
echo  ĐANG KHỞI ĐỘNG CÁC DỊCH VỤ VỚI PM2...
echo =========================================================================
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Không tìm thấy lệnh PM2 trên máy tính!
    echo Bạn có thể cài đặt bằng: npm install -g pm2
    echo Hoặc dùng chế độ [1] DEV (không cần PM2).
    pause
    goto MENU
)
pm2 start ecosystem.config.js
pm2 status
echo.
echo [SUCCESS] Đã khởi chạy các dịch vụ qua PM2.
echo Để xem log: pm2 logs
echo Để dừng:   pm2 stop ecosystem.config.js
goto END

:MODE_PROD
echo.
echo =========================================================================
echo  ĐANG KHỞI ĐỘNG CÁC FILE THỰC THI .EXE (PRODUCTION BINARY)...
echo =========================================================================
if not exist "%ROOT_DIR%server-core\cmd\server\main.exe" (
    echo [WARNING] Chưa tìm thấy file binary. Đang tiến hành build trước...
    call "%ROOT_DIR%build.bat"
)
start "GSHUB-CORE-EXE" /d "%ROOT_DIR%server-core\cmd\server" main.exe
timeout /t 2 /nobreak >nul
start "GSHUB-DATAHUB-EXE" /d "%ROOT_DIR%service-datahub" main.exe
timeout /t 2 /nobreak >nul
start "GSHUB-GATEWAY-EXE" /d "%ROOT_DIR%api-gateway" main.exe
echo.
echo [SUCCESS] Đã khởi chạy 3 binary background!
goto END

:MODE_BUILD
call "%ROOT_DIR%build.bat"
goto END

:MODE_BUILD_AND_PM2
call "%ROOT_DIR%build.bat"
goto MODE_PM2

:MODE_STOP
call "%ROOT_DIR%stop.bat"
goto END

:END
echo.
echo Nhấn phím bất kỳ để đóng trình điều khiển...
pause >nul
