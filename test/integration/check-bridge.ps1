Write-Host "Checking API Bridge..." -ForegroundColor Cyan

# Check root
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3001/" -Method GET
    Write-Host "Root: $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Root: Error" -ForegroundColor Red
}

# Check health
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET
    Write-Host "Health: $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Health: Error" -ForegroundColor Red
}

# Check employees  
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3001/employees" -Method GET
    Write-Host "Employees: $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Employees: Error" -ForegroundColor Red
}