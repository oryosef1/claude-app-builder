# API Bridge Integration Tests
Write-Host "=== API Bridge Integration Tests ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$testsPassed = 0
$testsFailed = 0

function Test-ApiEndpoint {
    param([string]$Name, [scriptblock]$Test)
    
    Write-Host "`nTest: $Name" -ForegroundColor Yellow
    try {
        & $Test
        $script:testsPassed++
        Write-Host "PASSED" -ForegroundColor Green
    } catch {
        $script:testsFailed++
        Write-Host "FAILED: $_" -ForegroundColor Red
    }
}

# Test 1: Health Check
Test-ApiEndpoint "Health Check" {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET
    if ($response.StatusCode -ne 200) { throw "Health check failed" }
}

# Test 2: Employee List
Test-ApiEndpoint "Get All Employees" {
    $response = Invoke-WebRequest -Uri "$baseUrl/employees" -Method GET
    $employees = $response.Content | ConvertFrom-Json
    if ($employees.Count -ne 13) { throw "Expected 13 employees" }
}

# Test 3: Get Specific Employee
Test-ApiEndpoint "Get Employee by ID" {
    $response = Invoke-WebRequest -Uri "$baseUrl/employees/emp_001" -Method GET
    $employee = $response.Content | ConvertFrom-Json
    if ($employee.id -ne "emp_001") { throw "Employee ID mismatch" }
}

# Test 4: Performance Metrics
Test-ApiEndpoint "Get Performance Metrics" {
    $response = Invoke-WebRequest -Uri "$baseUrl/performance" -Method GET
    $perf = $response.Content | ConvertFrom-Json
    if (-not $perf.overall_metrics) { throw "Missing metrics" }
}

# Test 5: System Information
Test-ApiEndpoint "Get System Information" {
    $response = Invoke-WebRequest -Uri "$baseUrl/system" -Method GET
    $system = $response.Content | ConvertFrom-Json
    if (-not $system.company) { throw "Missing company info" }
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor Red