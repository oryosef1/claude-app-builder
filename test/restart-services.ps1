# Restart POE Helper Services

Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
try {
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Stopped all Node processes" -ForegroundColor Green
} catch {
    Write-Host "No Node processes to stop" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

Write-Host "`nStarting services..." -ForegroundColor Cyan

# Start Memory API
Write-Host "Starting Memory API..." -ForegroundColor Yellow
$memoryPath = Join-Path $PSScriptRoot "..\src"
Push-Location $memoryPath
Start-Process node -ArgumentList "index.js" -WindowStyle Hidden
Pop-Location
Start-Sleep -Seconds 1

# Start API Bridge
Write-Host "Starting API Bridge..." -ForegroundColor Yellow
$bridgePath = Join-Path $PSScriptRoot "..\api-bridge"
Push-Location $bridgePath
Start-Process node -ArgumentList "server.js" -WindowStyle Hidden
Pop-Location
Start-Sleep -Seconds 1

# Start Dashboard Backend
Write-Host "Starting Dashboard Backend..." -ForegroundColor Yellow
$dashboardPath = Join-Path $PSScriptRoot "..\dashboard\backend"
Push-Location $dashboardPath
Start-Process node -ArgumentList "dist\index.js" -WindowStyle Hidden
Pop-Location
Start-Sleep -Seconds 2

Write-Host "`nAll services restarted!" -ForegroundColor Green