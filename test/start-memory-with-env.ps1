# Start Memory API with proper environment
Write-Host "Starting Memory API with environment variables..." -ForegroundColor Cyan

# Navigate to project root (where .env file is)
$projectRoot = Join-Path $PSScriptRoot ".."
Set-Location $projectRoot

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Gray
Write-Host "Checking .env file..." -ForegroundColor Gray

if (Test-Path ".env") {
    Write-Host ".env file found!" -ForegroundColor Green
    
    # Load environment variables from .env file
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    
    Write-Host "Loaded environment variables" -ForegroundColor Green
    Write-Host "PINECONE_API_KEY: $([Environment]::GetEnvironmentVariable('PINECONE_API_KEY', 'Process').Substring(0, 10))..." -ForegroundColor Gray
} else {
    Write-Host ".env file NOT found!" -ForegroundColor Red
}

# Start Memory API from src directory
Write-Host "`nStarting Memory API..." -ForegroundColor Yellow
Set-Location "src"
$process = Start-Process node -ArgumentList "index.js" -PassThru -NoNewWindow

# Wait for startup
Start-Sleep -Seconds 5

# Check if running
Write-Host "`nChecking Memory API status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3333/health" -Method GET -ErrorAction Stop
    Write-Host "SUCCESS: Memory API is running on port 3333!" -ForegroundColor Green
    $health = $response.Content | ConvertFrom-Json
    Write-Host "Status: $($health.status)" -ForegroundColor Gray
} catch {
    Write-Host "FAILED: Memory API is not accessible on port 3333" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}