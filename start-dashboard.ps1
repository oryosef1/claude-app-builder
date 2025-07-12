# Start Dashboard Services
Write-Host "Starting POE Helper Dashboard..." -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting Dashboard Backend..." -ForegroundColor Yellow
$backendPath = "C:\Users\בית\Downloads\poe helper\dashboard\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev" -WindowStyle Minimized

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Dashboard Frontend..." -ForegroundColor Yellow
$frontendPath = "C:\Users\בית\Downloads\poe helper\dashboard\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"

Write-Host ""
Write-Host "Dashboard is starting..." -ForegroundColor Green
Write-Host "Please wait a few seconds for the services to initialize." -ForegroundColor Gray
Write-Host ""
Write-Host "The dashboard will be available at:" -ForegroundColor Yellow
Write-Host "http://localhost:5173" -ForegroundColor White
Write-Host "(Vite typically runs on port 5173, not 3000)" -ForegroundColor Gray
Write-Host ""
Write-Host "If the browser doesn't open automatically, please open it manually." -ForegroundColor Gray