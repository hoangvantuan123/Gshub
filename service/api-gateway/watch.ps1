# watch.ps1 — Dev runner với auto-restart khi file .go thay đổi
# Cách dùng: .\watch.ps1

$ProjectDir = $PSScriptRoot
$GoFiles = "$ProjectDir\**\*.go"
$ProcId = $null

function Start-Server {
    if ($ProcId -ne $null) {
        Write-Host "🔄 Restarting..." -ForegroundColor Yellow
        try { Stop-Process -Id $ProcId -Force -ErrorAction SilentlyContinue } catch {}
    }
    Write-Host "▶ go run main.go" -ForegroundColor Cyan
    $global:ProcId = (Start-Process -FilePath "go" -ArgumentList "run", "main.go" -WorkingDirectory $ProjectDir -PassThru -NoNewWindow).Id
}

Start-Server

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $ProjectDir
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName

$protoPath = Join-Path $ProjectDir "..\proto"
$protoWatcher = $null
if (Test-Path $protoPath) {
    $protoWatcher = New-Object System.IO.FileSystemWatcher
    $protoWatcher.Path = (Resolve-Path $protoPath).Path
    $protoWatcher.Filter = "*.proto"
    $protoWatcher.IncludeSubdirectories = $true
    $protoWatcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName
}

$action = {
    $file = $Event.SourceEventArgs.FullPath
    if ($file -match '\.(go|proto|env|toml)$') {
        Write-Host "📝 Changed: $file" -ForegroundColor Magenta
        Start-Sleep -Milliseconds 500  # debounce
        Start-Server
    }
}

Register-ObjectEvent $watcher Changed -Action $action | Out-Null
Register-ObjectEvent $watcher Created -Action $action | Out-Null
$watcher.EnableRaisingEvents = $true

if ($protoWatcher -ne $null) {
    Register-ObjectEvent $protoWatcher Changed -Action $action | Out-Null
    Register-ObjectEvent $protoWatcher Created -Action $action | Out-Null
    $protoWatcher.EnableRaisingEvents = $true
}

Write-Host "👀 Watching for .go / .proto file changes... (Ctrl+C to stop)" -ForegroundColor Green
Write-Host "🌐 Server: http://localhost:8386" -ForegroundColor Green

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    if ($ProcId -ne $null) {
        Stop-Process -Id $ProcId -Force -ErrorAction SilentlyContinue
    }
    $watcher.Dispose()
    if ($protoWatcher -ne $null) { $protoWatcher.Dispose() }
    Write-Host "✅ Stopped." -ForegroundColor Red
}
