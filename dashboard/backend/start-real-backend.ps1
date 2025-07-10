# Real Dashboard Backend Startup Script
Write-Host "Starting REAL Dashboard Backend (not mock)..." -ForegroundColor Green
Write-Host "This connects to:" -ForegroundColor Yellow
Write-Host "  - Memory API on port 3333" -ForegroundColor Cyan
Write-Host "  - API Bridge on port 3002" -ForegroundColor Cyan
Write-Host "  - Loads all 13 AI employees" -ForegroundColor Cyan
Write-Host ""

# Set environment variable for this session
$env:DASHBOARD_PORT = "8080"

Write-Host "Building TypeScript..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Starting Dashboard Backend on port 8080..." -ForegroundColor Green
    node dist/index.js
} else {
    Write-Host "Build failed!" -ForegroundColor Red
}