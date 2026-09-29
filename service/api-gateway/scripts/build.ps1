# Chuyển về thư mục gốc của dự án
Set-Location "$PSScriptRoot/.."

$BINARY_NAME = "api-gateway"
$MAIN_PATH = "./main.go"
$OUTPUT_DIR = "./bin"

if (!(Test-Path $OUTPUT_DIR)) {
    New-Item -ItemType Directory -Force -Path $OUTPUT_DIR
}

Write-Host "--- 1. Đang tối ưu hóa API Gateway ---" -ForegroundColor Cyan
go mod tidy

function Invoke-AppBuild($os, $arch, $suffix) {
    Write-Host "--- 2. Đang build cho $os ($arch) ---" -ForegroundColor Green
    $env:GOOS = $os
    $env:GOARCH = $arch
    $output = "$OUTPUT_DIR/$BINARY_NAME-$os$suffix"
    # -s: Omit symbol table and debug information
    # -w: Omit DWARF symbol table
    go build -ldflags="-s -w" -o $output $MAIN_PATH
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Thành công: $output" -ForegroundColor Yellow
    } else {
        Write-Host "Thất bại khi build cho $os" -ForegroundColor Red
    }
}

param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("win", "linux", "mac", "all")]
    $Target = "all"
)

switch ($Target) {
    "win"   { Invoke-AppBuild "windows" "amd64" ".exe" }
    "linux" { Invoke-AppBuild "linux" "amd64" "" }
    "mac"   { Invoke-AppBuild "darwin" "amd64" "" }
    "all"   {
        Invoke-AppBuild "windows" "amd64" ".exe"
        Invoke-AppBuild "linux" "amd64" ""
        Invoke-AppBuild "darwin" "amd64" ""
    }
}

# Reset env sau khi build
$env:GOOS = "windows"
$env:GOARCH = "amd64"
Write-Host "--- Hoàn tất! Tất cả file nằm trong thư mục /bin ---" -ForegroundColor White
