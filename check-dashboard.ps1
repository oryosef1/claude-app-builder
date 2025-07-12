Write-Host "`nChecking Dashboard Status..." -ForegroundColor Cyan
Write-Host ""

# Check Frontend
Write-Host "Frontend Status:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri http://localhost:5173 -UseBasicParsing -TimeoutSec 3
    Write-Host "✓ Frontend is running on http://localhost:5173" -ForegroundColor Green
} catch {
    try {
        $response = Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 3
        Write-Host "✓ Frontend is running on http://localhost:3000" -ForegroundColor Green
    } catch {
        Write-Host "✗ Frontend is not responding" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Gray
    }
}

Write-Host ""

# Check Backend
Write-Host "Backend Status:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri http://localhost:8080/health -UseBasicParsing -TimeoutSec 3
    Write-Host "✓ Backend is running on http://localhost:8080" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend is not responding" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Dashboard URLs to try:" -ForegroundColor Yellow
Write-Host "1. http://localhost:5173" -ForegroundColor White
Write-Host "2. http://localhost:3000" -ForegroundColor White
Write-Host "3. http://127.0.0.1:5173" -ForegroundColor White
Write-Host "4. http://127.0.0.1:3000" -ForegroundColor White