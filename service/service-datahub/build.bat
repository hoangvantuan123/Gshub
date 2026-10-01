@echo off
echo ========================================================
echo   BUILD PRODUCTION BINARIES FOR GSHUB SERVICE-DATAHUB
echo ========================================================

echo [1/2] Compiling Windows binary (service-datahub.exe)...
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
go build -ldflags="-s -w" -o service-datahub.exe .
if %errorlevel% neq 0 (
    echo [ERROR] Failed to compile Windows binary!
    exit /b %errorlevel%
)

echo [2/2] Cross-compiling Linux binary for Server (service-datahub)...
set GOOS=linux
set GOARCH=amd64
set CGO_ENABLED=0
go build -ldflags="-s -w" -o service-datahub .
if %errorlevel% neq 0 (
    echo [ERROR] Failed to cross-compile Linux binary!
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo [SUCCESS] Both binaries built successfully!
echo   - Windows: service-datahub.exe
echo   - Linux:   service-datahub
echo ========================================================
