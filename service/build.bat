@echo off
setlocal enabledelayedexpansion
title GSHUB MICROSERVICES BUILDER
chcp 65001 >nul

echo =========================================================================
echo               GSHUB SERVICES - BUILD TOAN BO HE THONG
echo =========================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

if not exist logs mkdir logs

echo [1/3] === DANG BUILD GSHUB SERVER-CORE (gRPC :5051) ===
cd /d "%ROOT_DIR%server-core"
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
echo   - Windows binary...
go build -ldflags="-s -w" -o cmd\server\main.exe .\cmd\server
if %errorlevel% neq 0 (
    echo [ERROR] Loi build Windows cho server-core!
    pause
    exit /b %errorlevel%
)
copy /y cmd\server\main.exe "%ROOT_DIR%server-core.exe" >nul
copy /y cmd\server\main.exe "%ROOT_DIR%server.exe" >nul

echo   - Linux binary...
set GOOS=linux
set GOARCH=amd64
go build -ldflags="-s -w" -o cmd\server\main .\cmd\server
if %errorlevel% neq 0 (
    echo [ERROR] Loi cross-compile Linux cho server-core!
    pause
    exit /b %errorlevel%
)
copy /y cmd\server\main "%ROOT_DIR%server-core" >nul
copy /y cmd\server\main "%ROOT_DIR%server" >nul
echo [OK] Server-core build thanh cong!
echo.

echo [2/3] === DANG BUILD GSHUB SERVICE-DATAHUB (ERP/Reports :5052) ===
cd /d "%ROOT_DIR%service-datahub"
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
echo   - Windows binary...
go build -ldflags="-s -w" -o main.exe .
if %errorlevel% neq 0 (
    echo [ERROR] Loi build Windows cho service-datahub!
    pause
    exit /b %errorlevel%
)
copy /y main.exe "%ROOT_DIR%service-datahub.exe" >nul

echo   - Linux binary...
set GOOS=linux
set GOARCH=amd64
go build -ldflags="-s -w" -o main .
if %errorlevel% neq 0 (
    echo [ERROR] Loi cross-compile Linux cho service-datahub!
    pause
    exit /b %errorlevel%
)
copy /y main "%ROOT_DIR%service-datahub" >nul
echo [OK] Service-datahub build thanh cong!
echo.

echo [3/3] === DANG BUILD GSHUB API-GATEWAY (REST Gateway :9643) ===
cd /d "%ROOT_DIR%api-gateway"
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
echo   - Windows binary...
go build -ldflags="-s -w" -o main.exe .
if %errorlevel% neq 0 (
    echo [ERROR] Loi build Windows cho api-gateway!
    pause
    exit /b %errorlevel%
)
copy /y main.exe "%ROOT_DIR%api-gateway.exe" >nul

echo   - Linux binary...
set GOOS=linux
set GOARCH=amd64
go build -ldflags="-s -w" -o main .
if %errorlevel% neq 0 (
    echo [ERROR] Loi cross-compile Linux cho api-gateway!
    pause
    exit /b %errorlevel%
)
copy /y main "%ROOT_DIR%api-gateway" >nul
echo [OK] Api-gateway build thanh cong!
echo.

cd /d "%ROOT_DIR%"
set GOOS=windows
set GOARCH=amd64

echo =========================================================================
echo [SUCCESS] DA BUILD THANH CONG TOAN BO 3 MICROSERVICES!
echo.
echo Cac file Windows (.exe):
echo   - %ROOT_DIR%server-core.exe (va server-core\cmd\server\main.exe)
echo   - %ROOT_DIR%service-datahub.exe (va service-datahub\main.exe)
echo   - %ROOT_DIR%api-gateway.exe (va api-gateway\main.exe)
echo.
echo Cac file Linux (Server deploy):
echo   - %ROOT_DIR%server-core
echo   - %ROOT_DIR%service-datahub
echo   - %ROOT_DIR%api-gateway
echo =========================================================================
