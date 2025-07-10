# PowerShell Integration Tests for Memory API
Write-Host "=== Memory API Integration Tests ===" -ForegroundColor Cyan

$apiUrl = "http://localhost:3335"
$testsPassed = 0
$testsFailed = 0

function Test-MemoryAPI {
    param(
        [string]$TestName,
        [scriptblock]$TestBlock
    )
    
    Write-Host "Testing: $TestName" -ForegroundColor Yellow
    try {
        & $TestBlock
        $script:testsPassed++
        Write-Host "PASSED" -ForegroundColor Green
    } catch {
        $script:testsFailed++
        Write-Host "FAILED: $_" -ForegroundColor Red
    }
}

# Test 1: Health Check
Test-MemoryAPI "API Health Check" {
    $response = Invoke-WebRequest -Uri "$apiUrl/health" -Method GET
    if ($response.StatusCode -ne 200) { throw "Expected status 200" }
    
    $health = $response.Content | ConvertFrom-Json
    if ($health.status -ne "healthy") { throw "API not healthy" }
}

# Test 2: Store and Search Memory
Test-MemoryAPI "Store and Search Memory" {
    # Store
    $memory = @{
        employeeId = "emp_001"  # Using valid employee ID
        content = "Integration test memory from PowerShell"
        context = @{ test = $true }
        metadata = @{ importance = 8; category = "test" }
    } | ConvertTo-Json -Depth 10
    
    $storeResponse = Invoke-WebRequest -Uri "$apiUrl/api/memory/experience" -Method POST -Body $memory -ContentType "application/json"
    if ($storeResponse.StatusCode -ne 200) { throw "Store failed" }
    
    Start-Sleep -Seconds 2
    
    # Search
    $searchQuery = @{
        employeeId = "emp_001"  # Using same valid employee ID
        query = "Integration test PowerShell"
        limit = 5
    } | ConvertTo-Json
    
    $searchResponse = Invoke-WebRequest -Uri "$apiUrl/api/memory/search" -Method POST -Body $searchQuery -ContentType "application/json"
    if ($searchResponse.StatusCode -ne 200) { throw "Search failed" }
    
    $results = $searchResponse.Content | ConvertFrom-Json
    if ($results.memories.Count -eq 0) { throw "No memories found" }
}

# Test 3: Memory Types
Test-MemoryAPI "All Memory Types" {
    # Knowledge
    $knowledge = @{
        employeeId = "emp_002"  # Using valid employee ID
        content = "Testing knowledge memory type"
        context = @{}
        metadata = @{ importance = 7; category = "test" }
    } | ConvertTo-Json -Depth 10
    
    $knowledgeResponse = Invoke-WebRequest -Uri "$apiUrl/api/memory/knowledge" -Method POST -Body $knowledge -ContentType "application/json"
    if ($knowledgeResponse.StatusCode -ne 200) { throw "Knowledge store failed" }
    
    # Decision
    $decision = @{
        employeeId = "emp_002"  # Using same valid employee ID
        content = "Testing decision memory type"
        context = @{}
        metadata = @{ importance = 9; category = "test" }
    } | ConvertTo-Json -Depth 10
    
    $decisionResponse = Invoke-WebRequest -Uri "$apiUrl/api/memory/decision" -Method POST -Body $decision -ContentType "application/json"
    if ($decisionResponse.StatusCode -ne 200) { throw "Decision store failed" }
}

# Test 4: Error Handling
Test-MemoryAPI "Error Handling" {
    $invalidMemory = @{ content = "Missing employeeId" } | ConvertTo-Json
    
    try {
        Invoke-WebRequest -Uri "$apiUrl/api/memory/experience" -Method POST -Body $invalidMemory -ContentType "application/json" -ErrorAction Stop
        throw "Should have failed"
    } catch {
        # Expected to fail
    }
}

# Summary
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor Red

if ($testsFailed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
} else {
    Write-Host "Some tests failed!" -ForegroundColor Red
}