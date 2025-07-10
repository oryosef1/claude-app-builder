# Dashboard Backend Startup Script
Write-Host "Building TypeScript backend..." -ForegroundColor Yellow
npm run build

Write-Host "Starting Dashboard Backend..." -ForegroundColor Green
node dist/index.js