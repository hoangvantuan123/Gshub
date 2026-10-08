@echo off
setlocal enabledelayedexpansion
title GSHUB MICROSERVICES STOPPER
chcp 65001 >nul

echo =========================================================================
echo              GSHUB SERVICES - DỪNG TOÀN BỘ CÁC DỊCH VỤ
echo =========================================================================
echo.

echo [1/2] Dừng các tiến trình PM2 nếu có...
where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    pm2 stop ecosystem.config.js 2>nul
    pm2 delete ecosystem.config.js 2>nul
)

echo [2/2] Tắt các tiến trình binary và Go processes liên quan...
taskkill /f /im server-core.exe 2>nul
taskkill /f /im service-datahub.exe 2>nul
taskkill /f /im api-gateway.exe 2>nul
taskkill /f /im server.exe 2>nul
taskkill /f /fi "WINDOWTITLE eq GSHUB-SERVER-CORE*" /im cmd.exe 2>nul
taskkill /f /fi "WINDOWTITLE eq GSHUB-SERVICE-DATAHUB*" /im cmd.exe 2>nul
taskkill /f /fi "WINDOWTITLE eq GSHUB-API-GATEWAY*" /im cmd.exe 2>nul

echo.
echo =========================================================================
echo [SUCCESS] ĐÃ DỪNG TOÀN BỘ CÁC DỊCH VỤ GSHUB!
echo =========================================================================
