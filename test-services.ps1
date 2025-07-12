Write-Host "Testing POE Helper Services..." -ForegroundColor Cyan
Write-Host ""

# Test Memory API
Write-Host "Testing Memory API (port 3333)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri http://localhost:3333/health -Method GET -UseBasicParsing
    Write-Host "✓ Memory API is running" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json
} catch {
    Write-Host "✗ Memory API is not responding" -ForegroundColor Red
}

Write-Host ""

# Test API Bridge
Write-Host "Testing API Bridge (port 3002)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri http://localhost:3002/health -Method GET -UseBasicParsing
    Write-Host "✓ API Bridge is running" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json
} catch {
    Write-Host "✗ API Bridge is not responding" -ForegroundColor Red
}

Write-Host ""

# Test Dashboard Backend
Write-Host "Testing Dashboard Backend (port 8080)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri http://localhost:8080/health -Method GET -UseBasicParsing
    Write-Host "✓ Dashboard Backend is running" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json
} catch {
    Write-Host "✗ Dashboard Backend is not responding" -ForegroundColor Red
}

Write-Host ""

# Test Dashboard Frontend
Write-Host "Testing Dashboard Frontend (port 3000)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri http://localhost:3000 -Method GET -UseBasicParsing
    Write-Host "✓ Dashboard Frontend is running" -ForegroundColor Green
    Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Dashboard Frontend is not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "Service Check Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "To access the dashboard, open your browser and go to:" -ForegroundColor Yellow
Write-Host "http://localhost:3000" -ForegroundColor White