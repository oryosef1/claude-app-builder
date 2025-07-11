# Check API Bridge Status
Write-Host "Checking API Bridge on port 3001..." -ForegroundColor Cyan

try {
    # Try root endpoint
    $response = Invoke-WebRequest -Uri "http://localhost:3001/" -Method GET
    Write-Host "Root endpoint status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "Root endpoint error: $_" -ForegroundColor Red
}

Write-Host "`nTrying different health endpoints:" -ForegroundColor Yellow

# Try different health endpoint variations
$endpoints = @("/", "/health", "/api/health", "/status", "/api/status")

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001$endpoint" -Method GET
        Write-Host "✓ $endpoint - Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "✗ $endpoint - Error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}