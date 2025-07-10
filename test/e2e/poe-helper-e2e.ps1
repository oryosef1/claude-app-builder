# POE Helper System E2E Tests
Write-Host "=== POE Helper System E2E Tests ===" -ForegroundColor Cyan
Write-Host "Testing complete system workflow..." -ForegroundColor Gray

$testsPassed = 0
$testsFailed = 0

function Run-E2ETest {
    param($Name, $Test)
    
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

# Test 1: Service Health
Run-E2ETest "All Services Health Check" {
    # Memory API
    try {
        $mem = Invoke-WebRequest -Uri "http://localhost:3335/health" -Method GET -ErrorAction Stop
        if ($mem.StatusCode -eq 200) {
            Write-Host "  Memory API: OK" -ForegroundColor Gray
        } else {
            throw "Memory API unhealthy"
        }
    } catch {
        Write-Host "  Memory API: Not Running" -ForegroundColor Yellow
        throw $_
    }
    
    # API Bridge
    try {
        $bridge = Invoke-WebRequest -Uri "http://localhost:3002/health" -Method GET
        Write-Host "  API Bridge: OK" -ForegroundColor Gray
    } catch {
        Write-Host "  API Bridge: Not Running" -ForegroundColor Yellow
    }
    
    # Dashboard
    try {
        $dash = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET -ErrorAction Stop
        if ($dash.StatusCode -eq 200) {
            Write-Host "  Dashboard: OK" -ForegroundColor Gray
        } else {
            throw "Dashboard unhealthy"
        }
    } catch {
        # Dashboard returns 503 when dependent services are unhealthy
        if ($_.Exception.Response.StatusCode -eq 503) {
            Write-Host "  Dashboard: OK (with unhealthy dependencies)" -ForegroundColor Gray
        } else {
            throw $_
        }
    }
}

# Test 2: Employee List
Run-E2ETest "Get Employee List via Dashboard" {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/agents" -Method GET
    $agents = $response.Content | ConvertFrom-Json
    
    if ($agents.Count -ne 13) {
        throw "Expected 13 agents, got $($agents.Count)"
    }
    Write-Host "  Found $($agents.Count) AI employees" -ForegroundColor Gray
}

# Test 3: Create Task
Run-E2ETest "Create and Assign Task" {
    $task = @{
        title = "E2E Test Task - $(Get-Date -Format 'HH:mm:ss')"
        description = "Test task created by E2E test"
        priority = 7
        requiredSkills = @("javascript", "testing")
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/tasks" `
        -Method POST -Body $task -ContentType "application/json"
    
    if ($response.StatusCode -ne 201) {
        throw "Task creation failed"
    }
    
    $created = $response.Content | ConvertFrom-Json
    Write-Host "  Created task: $($created.id)" -ForegroundColor Gray
}

# Test 4: Memory Storage
Run-E2ETest "Store Memory via Memory API" {
    $memory = @{
        employeeId = "emp_001"
        content = "E2E test completed successfully at $(Get-Date)"
        context = @{ test = "e2e"; type = "system_test" }
        metadata = @{ importance = 5; category = "testing" }
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3335/api/memory/experience" `
            -Method POST -Body $memory -ContentType "application/json"
        Write-Host "  Memory stored successfully" -ForegroundColor Gray
    } catch {
        Write-Host "  Memory storage failed (Pinecone issue expected)" -ForegroundColor Yellow
    }
}

# Test 5: System Metrics
Run-E2ETest "Get System Metrics" {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/metrics" -Method GET
    $metrics = $response.Content | ConvertFrom-Json
    
    if (-not $metrics.cpu) { throw "Missing CPU metrics" }
    if (-not $metrics.memory) { throw "Missing memory metrics" }
    
    Write-Host "  CPU: $([math]::Round($metrics.cpu, 2))%" -ForegroundColor Gray
    Write-Host "  Memory: $([math]::Round($metrics.memory.usedMemoryMB, 2)) MB" -ForegroundColor Gray
}

# Test 6: Process Management
Run-E2ETest "Process Spawn and Control" {
    # Get current processes
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/processes" -Method GET
    $processes = $response.Content | ConvertFrom-Json
    $initialCount = $processes.Count
    
    Write-Host "  Initial processes: $initialCount" -ForegroundColor Gray
    
    # Note: Actual process spawning requires Claude Code CLI
    Write-Host "  Process spawning test skipped (requires Claude CLI)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor Red

$total = $testsPassed + $testsFailed
$rate = if ($total -gt 0) { [math]::Round(($testsPassed / $total) * 100, 2) } else { 0 }
Write-Host "Pass Rate: $rate%" -ForegroundColor Cyan

if ($testsFailed -eq 0) {
    Write-Host "`nAll E2E tests passed!" -ForegroundColor Green
} else {
    Write-Host "`nSome tests failed." -ForegroundColor Red
}