# AI Company Services Startup Script
Write-Host "🤖 Starting AI Company Services..." -ForegroundColor Green
Write-Host ""

# Change to project directory
Set-Location "C:\Users\בית\Downloads\poe helper"

# Start Memory API
Write-Host "🧠 Starting Memory API on port 3333..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd 'C:\Users\בית\Downloads\poe helper'; npm start" -WindowStyle Minimized
Start-Sleep -Seconds 5

# Start API Bridge
Write-Host "🌉 Starting API Bridge on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd 'C:\Users\בית\Downloads\poe helper\api-bridge'; node server.js" -WindowStyle Minimized
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Service URLs:" -ForegroundColor Cyan
Write-Host "  Memory API:  http://localhost:3333/health"
Write-Host "  API Bridge:  http://localhost:3001/health" 
Write-Host ""

# Test services
Write-Host "🔍 Testing services..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $memoryTest = Invoke-WebRequest -Uri "http://localhost:3333/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Memory API: Online" -ForegroundColor Green
} catch {
    Write-Host "❌ Memory API: Offline" -ForegroundColor Red
}

try {
    $bridgeTest = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ API Bridge: Online" -ForegroundColor Green
} catch {
    Write-Host "❌ API Bridge: Offline" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 API services are ready!"
Write-Host ""
Write-Host "Press any key to exit..."
Read-Host