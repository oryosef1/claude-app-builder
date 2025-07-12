Write-Host "Testing Dashboard Services..." -ForegroundColor Cyan

# Test Frontend
Write-Host "Testing Frontend on port 5173..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 3
    Write-Host "Frontend is RUNNING on http://localhost:5173" -ForegroundColor Green
} catch {
    Write-Host "Frontend not responding on port 5173" -ForegroundColor Red
}

# Test Backend
Write-Host "Testing Backend on port 8080..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 3
    Write-Host "Backend is RUNNING on http://localhost:8080" -ForegroundColor Green
} catch {
    Write-Host "Backend not responding on port 8080" -ForegroundColor Red
}

Write-Host ""
Write-Host "Dashboard URL: http://localhost:5173" -ForegroundColor White