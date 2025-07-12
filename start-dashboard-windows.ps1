# Kill any existing Node processes
Write-Host "Stopping any existing Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host ""
Write-Host "Starting POE Helper Dashboard on Windows..." -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
$backendPath = "C:\Users\בית\Downloads\poe helper\dashboard\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Installing backend dependencies...' -ForegroundColor Yellow; npm install; Write-Host 'Starting backend...' -ForegroundColor Green; npm run dev" -WindowStyle Normal

# Wait a bit
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
$frontendPath = "C:\Users\בית\Downloads\poe helper\dashboard\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Starting frontend...' -ForegroundColor Green; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Dashboard starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Frontend will be available at one of these URLs:" -ForegroundColor Yellow
Write-Host "  http://localhost:5173" -ForegroundColor White
Write-Host "  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Please wait for both services to fully initialize." -ForegroundColor Gray
Write-Host "Check the PowerShell windows for any errors." -ForegroundColor Gray