# PowerShell Launcher for GSHUB Microservices
# Usage: .\start.ps1 -Mode dev (or pm2 / prod / build / stop)

param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "pm2", "prod", "build", "stop")]
    $Mode = "dev"
)

$RootDir = $PSScriptRoot
Set-Location $RootDir

Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "               GSHUB SERVICES - TRINH DIEU KHIEN TONG (PS)               " -ForegroundColor Cyan
Write-Host " Mode: $Mode" -ForegroundColor Yellow
Write-Host "=========================================================================" -ForegroundColor Cyan

switch ($Mode) {
    "dev" {
        Write-Host "`n>>> [1/3] Khoi dong GSHUB Server-Core (:5051)..." -ForegroundColor Green
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootDir/server-core'; Write-Host '[GSHUB-CORE :5051] Starting...' -ForegroundColor Cyan; go run ./cmd/server"
        Start-Sleep -Seconds 2

        Write-Host ">>> [2/3] Khoi dong GSHUB Service-Datahub (:5052)..." -ForegroundColor Green
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootDir/service-datahub'; Write-Host '[GSHUB-DATAHUB :5052] Starting...' -ForegroundColor Cyan; go run ."
        Start-Sleep -Seconds 2

        Write-Host ">>> [3/3] Khoi dong GSHUB Api-Gateway (:9643)..." -ForegroundColor Green
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootDir/api-gateway'; Write-Host '[GSHUB-GATEWAY :9643] Starting...' -ForegroundColor Cyan; go run ."

        Write-Host "`n[SUCCESS] Da khoi chay dong thoi 3 Microservices o cac cua so rieng biet!" -ForegroundColor Yellow
        Write-Host " - REST Gateway  : http://127.0.0.1:9643" -ForegroundColor White
        Write-Host " - DataHub HTTP  : http://127.0.0.1:9645 (gRPC :5052)" -ForegroundColor White
        Write-Host " - Core Engine   : gRPC :5051" -ForegroundColor White
    }
    "pm2" {
        Write-Host "`n>>> Khoi chay toan bo voi PM2..." -ForegroundColor Green
        pm2 start ecosystem.config.js
        pm2 status
    }
    "prod" {
        Write-Host "`n>>> Khoi chay cac file thuc thi Binary..." -ForegroundColor Green
        if (!(Test-Path "$RootDir/server-core/cmd/server/main.exe")) {
            Write-Host "Chua co file binary. Tien hanh build truoc..." -ForegroundColor Yellow
            & "$RootDir/build.ps1" -Target win
        }
        Start-Process "$RootDir/server-core/cmd/server/main.exe" -WorkingDirectory "$RootDir/server-core/cmd/server"
        Start-Sleep -Seconds 1
        Start-Process "$RootDir/service-datahub/main.exe" -WorkingDirectory "$RootDir/service-datahub"
        Start-Sleep -Seconds 1
        Start-Process "$RootDir/api-gateway/main.exe" -WorkingDirectory "$RootDir/api-gateway"
        Write-Host "[SUCCESS] Da khoi chay cac binary thuc thi!" -ForegroundColor Green
    }
    "build" {
        & "$RootDir/build.ps1" -Target all
    }
    "stop" {
        Write-Host "`n>>> Dang dung toan bo cac dich vu..." -ForegroundColor Yellow
        try { pm2 stop ecosystem.config.js 2>$null; pm2 delete ecosystem.config.js 2>$null } catch {}
        Get-Process -Name "server-core", "service-datahub", "api-gateway", "server" -ErrorAction SilentlyContinue | Stop-Process -Force
        Write-Host "[SUCCESS] Da dung toan bo dich vu." -ForegroundColor Green
    }
}
