# Quick test script for PowerShell
Write-Host "Testing Dashboard Backend..." -ForegroundColor Yellow

# Set environment variable
$env:DASHBOARD_PORT = "8080"

# Try to run the backend directly
Write-Host "`nStarting backend..." -ForegroundColor Green
node dist/index.js