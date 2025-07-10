# PowerShell Integration Tests for API Bridge
Write-Host "`n=== API Bridge Integration Tests ===`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3002"
$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$TestName,
        [scriptblock]$TestBlock
    )
    
    Write-Host "Test: $TestName" -ForegroundColor Yellow
    try {
        & $TestBlock
        $script:testsPassed++
        Write-Host "✓ PASSED" -ForegroundColor Green
    } catch {
        $script:testsFailed++
        Write-Host "✗ FAILED: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 1: Health Check
Test-Endpoint "Health Check" {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET
    if ($response.StatusCode -ne 200) { throw "Health check failed" }
    
    $health = $response.Content | ConvertFrom-Json
    if (-not $health.status) { throw "Missing health status" }
    Write-Host "  Status: $($health.status)" -ForegroundColor Gray
}

# Test 2: Employee List
Test-Endpoint "Get All Employees" {
    $response = Invoke-WebRequest -Uri "$baseUrl/employees" -Method GET
    $employees = $response.Content | ConvertFrom-Json
    
    if ($employees.Count -ne 13) { 
        throw "Expected 13 employees, got $($employees.Count)" 
    }
    Write-Host "  Found $($employees.Count) employees" -ForegroundColor Gray
}

# Test 3: Get Specific Employee
Test-Endpoint "Get Employee by ID" {
    $response = Invoke-WebRequest -Uri "$baseUrl/employees/emp_001" -Method GET
    $employee = $response.Content | ConvertFrom-Json
    
    if ($employee.id -ne "emp_001") { 
        throw "Employee ID mismatch" 
    }
    Write-Host "  Employee: $($employee.name) - $($employee.role)" -ForegroundColor Gray
}

# Test 4: Employee Not Found
Test-Endpoint "Handle Non-existent Employee" {
    $errorOccurred = $false
    try {
        Invoke-WebRequest -Uri "$baseUrl/employees/emp_999" -Method GET -ErrorAction Stop
        throw "Should have returned 404"
    } catch {
        $errorOccurred = $true
        if ($_.Exception.Response.StatusCode -ne 404) {
            throw "Expected 404, got $($_.Exception.Response.StatusCode)"
        }
        Write-Host "  Correctly returned 404" -ForegroundColor Gray
    }
    
    if (-not $errorOccurred) {
        throw "No error occurred when it should have"
    }
}

# Test 5: Filter Employees by Department
Test-Endpoint "Filter Employees by Department" {
    $response = Invoke-WebRequest -Uri "$baseUrl/employees?department=Development" -Method GET
    $devs = $response.Content | ConvertFrom-Json
    
    $nonDevs = $devs | Where-Object { $_.department -ne "Development" }
    if ($nonDevs) {
        throw "Found non-Development employees in filtered results"
    }
    Write-Host "  Found $($devs.Count) Development employees" -ForegroundColor Gray
}

# Test 6: Performance Metrics
Test-Endpoint "Get Performance Metrics" {
    $response = Invoke-WebRequest -Uri "$baseUrl/performance" -Method GET
    $perf = $response.Content | ConvertFrom-Json
    
    if (-not $perf.overall_metrics) { throw "Missing overall_metrics" }
    if (-not $perf.department_metrics) { throw "Missing department_metrics" }
    Write-Host "  Average Score: $($perf.overall_metrics.average_score)" -ForegroundColor Gray
}

# Test 7: Create Task
Test-Endpoint "Create New Task" {
    $task = @{
        title = "PowerShell Integration Test Task"
        description = "Testing task creation from PowerShell"
        skills_required = @("testing", "powershell")
        priority = "high"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/tasks" `
        -Method POST -Body $task -ContentType "application/json"
    
    if ($response.StatusCode -ne 201) { 
        throw "Expected 201, got $($response.StatusCode)" 
    }
    
    $result = $response.Content | ConvertFrom-Json
    Write-Host "  Task created: $($result.task_id)" -ForegroundColor Gray
}

# Test 8: System Information
Test-Endpoint "Get System Information" {
    $response = Invoke-WebRequest -Uri "$baseUrl/system" -Method GET
    $system = $response.Content | ConvertFrom-Json
    
    if (-not $system.company) { throw "Missing company info" }
    if (-not $system.employees) { throw "Missing employees info" }
    Write-Host "  Company: $($system.company)" -ForegroundColor Gray
    Write-Host "  Total Capacity: $($system.capacity.total)" -ForegroundColor Gray
}

# Test 9: Memory API Health Check (Proxy)
Test-Endpoint "Memory API Proxy Health" {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/memory/health" -Method GET
        Write-Host "  Memory API Status: Available" -ForegroundColor Gray
    } catch {
        # It's OK if Memory API is not available
        Write-Host "  Memory API Status: Not Available" -ForegroundColor Yellow
    }
}

# Test 10: Concurrent Requests
Test-Endpoint "Handle Concurrent Requests" {
    $startTime = Get-Date
    
    # Create 5 concurrent requests
    $jobs = @()
    1..5 | ForEach-Object {
        $jobs += Start-Job -ScriptBlock {
            param($url)
            Invoke-WebRequest -Uri "$url/employees" -Method GET
        } -ArgumentList $baseUrl
    }
    
    # Wait for all to complete
    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
    
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    # Check all succeeded
    $failed = $results | Where-Object { $_.StatusCode -ne 200 }
    if ($failed) {
        throw "$($failed.Count) requests failed"
    }
    
    Write-Host "  Completed 5 concurrent requests in $([math]::Round($duration, 2))s" -ForegroundColor Gray
}

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red

$totalTests = $testsPassed + $testsFailed
$passRate = if ($totalTests -gt 0) { [math]::Round(($testsPassed / $totalTests) * 100, 2) } else { 0 }
Write-Host "Pass Rate: $passRate%" -ForegroundColor Cyan

if ($testsFailed -eq 0) {
    Write-Host "`n✓ All API Bridge integration tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n✗ Some tests failed. Check the errors above." -ForegroundColor Red
    exit 1
}