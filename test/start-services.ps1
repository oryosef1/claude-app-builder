# Start all POE Helper services for testing
Write-Host "Starting POE Helper Services..." -ForegroundColor Cyan

$projectRoot = Join-Path $PSScriptRoot ".."
Set-Location $projectRoot

# Load environment variables
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Check if services are already running
$ports = @{
    "Memory API" = 3333
    "API Bridge" = 3002
    "Dashboard" = 8080
}

$needsStart = @{}
foreach ($service in $ports.Keys) {
    $port = $ports[$service]
    $result = netstat -an | findstr ":$port.*LISTENING"
    if (-not $result) {
        $needsStart[$service] = $true
        Write-Host "  $service needs to be started (port $port)" -ForegroundColor Yellow
    } else {
        Write-Host "  $service already running (port $port)" -ForegroundColor Green
    }
}

# Start services if needed
if ($needsStart["Memory API"]) {
    Write-Host "Starting Memory API..." -ForegroundColor Yellow
    Push-Location "src"
    Start-Process node -ArgumentList "index.js" -WindowStyle Hidden
    Pop-Location
}

if ($needsStart["API Bridge"]) {
    Write-Host "Starting API Bridge..." -ForegroundColor Yellow
    Push-Location "api-bridge"
    Start-Process node -ArgumentList "server.js" -WindowStyle Hidden
    Pop-Location
}

if ($needsStart["Dashboard"]) {
    Write-Host "Starting Dashboard Backend..." -ForegroundColor Yellow
    Push-Location "dashboard\backend"
    Start-Process node -ArgumentList "dist\index.js" -WindowStyle Hidden
    Pop-Location
}

if ($needsStart.Count -gt 0) {
    Write-Host "Waiting for services to initialize..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
}

Write-Host "All services ready!" -ForegroundColor Green