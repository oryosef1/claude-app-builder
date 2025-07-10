# Development mode startup
Write-Host "Starting backend in development mode..." -ForegroundColor Green

# Set environment variables
$env:DASHBOARD_PORT = "8080"
$env:NODE_ENV = "development"

# Install dependencies if needed
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Run in dev mode with ts-node
Write-Host "Starting with ts-node..." -ForegroundColor Green
npx ts-node src/index.ts