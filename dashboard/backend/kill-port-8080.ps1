# Kill process on port 8080
Write-Host "Finding process on port 8080..." -ForegroundColor Yellow
$process = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -First 1

if ($process) {
    $pid = $process.OwningProcess
    Write-Host "Found process with PID: $pid" -ForegroundColor Cyan
    
    try {
        Stop-Process -Id $pid -Force
        Write-Host "Process killed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Failed to kill process. Try running as Administrator." -ForegroundColor Red
    }
} else {
    Write-Host "No process found on port 8080" -ForegroundColor Green
}

Write-Host ""
Write-Host "You can now start the debug server:" -ForegroundColor Yellow
Write-Host "  node debug-server.js" -ForegroundColor Cyan