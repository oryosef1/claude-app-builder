# Check ports
Write-Host "Checking service ports..." -ForegroundColor Cyan

$ports = @(3333, 3335, 3002, 8080)

foreach ($port in $ports) {
    $result = netstat -an | findstr ":$port.*LISTENING"
    if ($result) {
        Write-Host "Port $port`: LISTENING" -ForegroundColor Green
    } else {
        Write-Host "Port $port`: NOT LISTENING" -ForegroundColor Red
    }
}