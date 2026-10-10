# PowerShell Build Script for GSHUB Microservices
# Usage: .\build.ps1 -Target all (or win / linux)

param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("win", "linux", "all")]
    $Target = "all"
)

$RootDir = $PSScriptRoot
Set-Location $RootDir

$logsDir = Join-Path $RootDir "logs"
if (!(Test-Path $logsDir)) {
    New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
}

Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "             GSHUB SERVICES - BUILD TOAN BO HE THONG                     " -ForegroundColor Cyan
Write-Host " Target: $Target" -ForegroundColor Yellow
Write-Host "=========================================================================" -ForegroundColor Cyan

function Build-Service($serviceName, $sourcePath, $outputExeRelative, $outputLinuxRelative, $rootExeName, $rootLinuxName) {
    Write-Host "`n>>> [BUILDING] $serviceName..." -ForegroundColor Magenta
    
    # 1. Windows Build
    if ($Target -eq "win" -or $Target -eq "all") {
        Write-Host "  -> Compiling Windows binary ($rootExeName.exe)..." -ForegroundColor Gray
        $env:GOOS = "windows"
        $env:GOARCH = "amd64"
        $env:CGO_ENABLED = "0"
        
        $destPath = Join-Path $RootDir $outputExeRelative
        $destDir = Split-Path $destPath
        if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        
        go build -ldflags="-s -w" -o $destPath $sourcePath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [ERROR] Loi build Windows cho $serviceName!" -ForegroundColor Red
            return $false
        }
        
        $rootExe = Join-Path $RootDir "$rootExeName.exe"
        Copy-Item -Path $destPath -Destination $rootExe -Force
        Write-Host "  [OK] Windows binary: $rootExe" -ForegroundColor Green
    }
    
    # 2. Linux Build
    if ($Target -eq "linux" -or $Target -eq "all") {
        Write-Host "  -> Compiling Linux binary ($rootLinuxName)..." -ForegroundColor Gray
        $env:GOOS = "linux"
        $env:GOARCH = "amd64"
        $env:CGO_ENABLED = "0"
        
        $destLinuxPath = Join-Path $RootDir $outputLinuxRelative
        $destLinuxDir = Split-Path $destLinuxPath
        if (!(Test-Path $destLinuxDir)) { New-Item -ItemType Directory -Force -Path $destLinuxDir | Out-Null }
        
        go build -ldflags="-s -w" -o $destLinuxPath $sourcePath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [ERROR] Loi build Linux cho $serviceName!" -ForegroundColor Red
            return $false
        }
        
        $rootLinux = Join-Path $RootDir $rootLinuxName
        Copy-Item -Path $destLinuxPath -Destination $rootLinux -Force
        Write-Host "  [OK] Linux binary: $rootLinux" -ForegroundColor Green
    }
    
    return $true
}

# 1. Server Core (:60051)
$res1 = Build-Service "server-core" "./server-core/cmd/server" "server-core/cmd/server/main.exe" "server-core/cmd/server/main" "server-core" "server-core"

# 2. Service Datahub (:60052)
$res2 = Build-Service "service-datahub" "./service-datahub" "service-datahub/main.exe" "service-datahub/main" "service-datahub" "service-datahub"

# 3. Api Gateway (:9643)
$res3 = Build-Service "api-gateway" "./api-gateway" "api-gateway/main.exe" "api-gateway/main" "api-gateway" "api-gateway"

# Reset Environment
$env:GOOS = "windows"
$env:GOARCH = "amd64"

Write-Host "`n=========================================================================" -ForegroundColor Cyan
if ($res1 -and $res2 -and $res3) {
    Write-Host " [SUCCESS] HOAN TAT BUILD TOAN BO 3 DICH VU MICROSERVICES THANH CONG!" -ForegroundColor Green
} else {
    Write-Host " [WARNING] Co loi xay ra trong qua trinh build!" -ForegroundColor Red
}
Write-Host "=========================================================================" -ForegroundColor Cyan
