# PowerShell Integration Tests for Memory API
Write-Host "`n=== Memory API Integration Tests ===" -ForegroundColor Cyan

$apiUrl = "http://localhost:3335"
$testsPassed = 0
$testsFailed = 0

function Test-MemoryAPI {
    param(
        [string]$TestName,
        [scriptblock]$TestBlock
    )
    
    Write-Host "`nTesting: $TestName" -ForegroundColor Yellow
    try {
        & $TestBlock
        $script:testsPassed++
        Write-Host "✓ PASSED" -ForegroundColor Green
    } catch {
        $script:testsFailed++
        Write-Host "✗ FAILED: $_" -ForegroundColor Red
    }
}

# Test 1: Health Check
Test-MemoryAPI "API Health Check" {
    $response = Invoke-WebRequest -Uri "$apiUrl/health" -Method GET
    if ($response.StatusCode -ne 200) { throw "Expected status 200, got $($response.StatusCode)" }
    
    $health = $response.Content | ConvertFrom-Json
    if ($health.status -ne "healthy") { throw "API not healthy" }
    Write-Host "  API Status: $($health.status)" -ForegroundColor Gray
}

# Test 2: Store Experience Memory
Test-MemoryAPI "Store Experience Memory" {
    $memory = @{
        employeeId = "emp_test_001"
        content = "Integration test: PowerShell test successfully storing memory"
        context = @{
            test_platform = "PowerShell"
            test_type = "integration"
            timestamp = (Get-Date).ToString()
        }
        metadata = @{
            importance = 8
            category = "integration_test"
        }
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-WebRequest -Uri "$apiUrl/api/memory/experience" -Method POST -Body $memory -ContentType "application/json"
    if ($response.StatusCode -ne 200) { throw "Failed to store memory" }
    
    $result = $response.Content | ConvertFrom-Json
    if (-not $result.success) { throw "Memory storage not successful" }
    Write-Host "  Memory ID: $($result.memoryId)" -ForegroundColor Gray
}

# Test 3: Store Knowledge Memory
Test-MemoryAPI "Store Knowledge Memory" {
    $knowledge = @{
        employeeId = "emp_test_002"
        content = "PowerShell is excellent for testing Windows services due to native integration"
        context = @{
            technology = "PowerShell"
            domain = "testing"
        }
        metadata = @{
            importance = 7
            category = "best_practice"
        }
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-WebRequest -Uri "$apiUrl/api/memory/knowledge" -Method POST -Body $knowledge -ContentType "application/json"
    if ($response.StatusCode -ne 200) { throw "Failed to store knowledge" }
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.type -ne "knowledge") { throw "Wrong memory type" }
}

# Test 4: Store Decision Memory
Test-MemoryAPI "Store Decision Memory" {
    $decision = @{
        employeeId = "emp_test_002"
        content = "Decided to use PowerShell for Windows service integration testing"
        context = @{
            alternatives = @("WSL", "Node.js", "Python")
            rationale = "Native Windows integration and no connectivity issues"
        }
        metadata = @{
            importance = 9
            category = "architecture_decision"
        }
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-WebRequest -Uri "$apiUrl/api/memory/decision" -Method POST -Body $decision -ContentType "application/json"
    if ($response.StatusCode -ne 200) { throw "Failed to store decision" }
}

# Test 5: Search Memories
Test-MemoryAPI "Search Memories" {
    Start-Sleep -Seconds 2  # Wait for indexing
    
    $searchQuery = @{
        employeeId = "emp_test_001"
        query = "PowerShell integration test"
        limit = 5
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$apiUrl/api/memory/search" -Method POST -Body $searchQuery -ContentType "application/json"
    if ($response.StatusCode -ne 200) { throw "Search failed" }
    
    $results = $response.Content | ConvertFrom-Json
    if ($results.memories.Count -eq 0) { throw "No memories found" }
    Write-Host "  Found $($results.memories.Count) memories" -ForegroundColor Gray
    Write-Host "  Best match score: $($results.memories[0].score)" -ForegroundColor Gray
}

# Test 6: Get Memory Statistics
Test-MemoryAPI "Memory Statistics" {
    $response = Invoke-WebRequest -Uri "$apiUrl/api/memory/stats/emp_test_002" -Method GET
    if ($response.StatusCode -ne 200) { throw "Failed to get stats" }
    
    $stats = $response.Content | ConvertFrom-Json
    Write-Host "  Total memories: $($stats.stats.totalMemories)" -ForegroundColor Gray
    Write-Host "  Storage size: $($stats.stats.estimatedSizeMB) MB" -ForegroundColor Gray
}

# Test 7: Error Handling - Invalid Request
Test-MemoryAPI "Error Handling - Invalid Memory" {
    $invalidMemory = @{
        content = "Missing employeeId"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$apiUrl/api/memory/experience" -Method POST -Body $invalidMemory -ContentType "application/json" -ErrorAction Stop
        throw "Should have failed with 400 error"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            # Expected behavior - test passes
        } else {
            throw "Expected 400 error, got $($_.Exception.Response.StatusCode)"
        }
    }
}

# Test 8: Concurrent Operations
Test-MemoryAPI "Concurrent Memory Operations" {
    $jobs = @()
    $startTime = Get-Date
    
    # Start 5 concurrent requests
    1..5 | ForEach-Object {
        $jobs += Start-Job -ScriptBlock {
            param($apiUrl, $index)
            $memory = @{
                employeeId = "emp_concurrent_$index"
                content = "Concurrent test $index"
                context = @{ test_id = $index }
                metadata = @{ importance = 5; category = "concurrent_test" }
            } | ConvertTo-Json -Depth 10
            
            Invoke-WebRequest -Uri "$apiUrl/api/memory/experience" -Method POST -Body $memory -ContentType "application/json"
        } -ArgumentList $apiUrl, $_
    }
    
    # Wait for all jobs
    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
    
    $duration = ((Get-Date) - $startTime).TotalSeconds
    Write-Host "  Processed 5 concurrent requests in $($duration) seconds" -ForegroundColor Gray
    
    # Verify all succeeded
    $results | ForEach-Object {
        if ($_.StatusCode -ne 200) { throw "One or more requests failed" }
    }
}

# Test 9: Complex Data Structures
Test-MemoryAPI "Complex Nested Data" {
    $complexMemory = @{
        employeeId = "emp_complex"
        content = "Testing complex data structures"
        context = @{
            level1 = @{
                level2 = @{
                    data = "nested value"
                    array = @(1, 2, @{ nested = $true })
                }
                tags = @("test", "complex", "integration")
            }
        }
        metadata = @{
            importance = 6
            category = "complex_test"
        }
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-WebRequest -Uri "$apiUrl/api/memory/knowledge" -Method POST -Body $complexMemory -ContentType "application/json"
    if ($response.StatusCode -ne 200) { throw "Failed to store complex memory" }
}

# Test 10: CORS Headers
Test-MemoryAPI "CORS Support" {
    $response = Invoke-WebRequest -Uri "$apiUrl/health" -Method GET -Headers @{ "Origin" = "http://localhost:8080" }
    
    if (-not $response.Headers["Access-Control-Allow-Credentials"]) {
        throw "Missing CORS credentials header"
    }
    Write-Host "  CORS headers present" -ForegroundColor Gray
}

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red

if ($testsFailed -eq 0) {
    Write-Host "`n✓ All integration tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n✗ Some tests failed!" -ForegroundColor Red
    exit 1
}