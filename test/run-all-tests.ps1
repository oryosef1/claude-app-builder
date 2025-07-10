# POE Helper System - Master Test Runner
# Runs all test suites and generates coverage report

param(
    [string]$TestType = "all",  # all, unit, integration, e2e
    [switch]$Coverage = $false,
    [switch]$Watch = $false
)

Write-Host "`n🧪 POE Helper Test Runner" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

$startTime = Get-Date
$testResults = @{
    Passed = 0
    Failed = 0
    Skipped = 0
}

# Ensure services are running for integration/e2e tests
if ($TestType -eq "all" -or $TestType -eq "integration" -or $TestType -eq "e2e") {
    Write-Host "`n📦 Starting required services..." -ForegroundColor Yellow
    & "$PSScriptRoot\start-services.ps1"
    Start-Sleep -Seconds 3
}

# Run Memory API Tests
if ($TestType -eq "all" -or $TestType -eq "unit") {
    Write-Host "`n🧠 Running Memory API Tests..." -ForegroundColor Magenta
    Push-Location "$PSScriptRoot\.."
    
    if (Test-Path "node_modules") {
        npm test -- test/unit
        if ($LASTEXITCODE -eq 0) { $testResults.Passed++ } else { $testResults.Failed++ }
    } else {
        Write-Host "  ⚠️  Node modules not installed" -ForegroundColor Yellow
        $testResults.Skipped++
    }
    
    Pop-Location
}

# Run Dashboard Backend Tests
if ($TestType -eq "all" -or $TestType -eq "unit") {
    Write-Host "`n🎯 Running Dashboard Backend Tests..." -ForegroundColor Magenta
    Push-Location "$PSScriptRoot\..\dashboard\backend"
    
    if (Test-Path "node_modules") {
        $cmd = "npm test"
        if ($Coverage) { $cmd += " -- --coverage" }
        if ($Watch) { $cmd += " -- --watch" }
        
        Invoke-Expression $cmd
        if ($LASTEXITCODE -eq 0) { $testResults.Passed++ } else { $testResults.Failed++ }
    } else {
        Write-Host "  ⚠️  Node modules not installed" -ForegroundColor Yellow
        $testResults.Skipped++
    }
    
    Pop-Location
}

# Run Dashboard Frontend Tests
if ($TestType -eq "all" -or $TestType -eq "unit") {
    Write-Host "`n🖼️  Running Dashboard Frontend Tests..." -ForegroundColor Magenta
    Push-Location "$PSScriptRoot\..\dashboard\frontend"
    
    if (Test-Path "node_modules") {
        $cmd = "npm run test:unit"
        if ($Coverage) { $cmd += " -- --coverage" }
        
        Invoke-Expression $cmd
        if ($LASTEXITCODE -eq 0) { $testResults.Passed++ } else { $testResults.Failed++ }
    } else {
        Write-Host "  ⚠️  Node modules not installed" -ForegroundColor Yellow
        $testResults.Skipped++
    }
    
    Pop-Location
}

# Run Integration Tests
if ($TestType -eq "all" -or $TestType -eq "integration") {
    Write-Host "`n🔗 Running Integration Tests..." -ForegroundColor Magenta
    
    # Memory API Integration
    if (Test-Path "$PSScriptRoot\integration\test-memory-api.ps1") {
        & "$PSScriptRoot\integration\test-memory-api.ps1"
        if ($LASTEXITCODE -eq 0) { $testResults.Passed++ } else { $testResults.Failed++ }
    }
    
    # API Bridge Integration
    if (Test-Path "$PSScriptRoot\integration\test-api-bridge.ps1") {
        & "$PSScriptRoot\integration\test-api-bridge.ps1"
        if ($LASTEXITCODE -eq 0) { $testResults.Passed++ } else { $testResults.Failed++ }
    }
}

# Run E2E Tests
if ($TestType -eq "all" -or $TestType -eq "e2e") {
    Write-Host "`n🌐 Running E2E Tests..." -ForegroundColor Magenta
    
    if (Test-Path "$PSScriptRoot\e2e-final.ps1") {
        & "$PSScriptRoot\e2e-final.ps1"
        if ($LASTEXITCODE -eq 0) { $testResults.Passed++ } else { $testResults.Failed++ }
    }
}

# Calculate duration
$duration = (Get-Date) - $startTime

# Display Summary
Write-Host "`n📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "✅ Passed:  $($testResults.Passed)" -ForegroundColor Green
Write-Host "❌ Failed:  $($testResults.Failed)" -ForegroundColor Red
Write-Host "⏭️  Skipped: $($testResults.Skipped)" -ForegroundColor Yellow
Write-Host "⏱️  Duration: $($duration.ToString('mm\:ss'))" -ForegroundColor Gray

$total = $testResults.Passed + $testResults.Failed + $testResults.Skipped
if ($total -gt 0) {
    $passRate = [math]::Round(($testResults.Passed / $total) * 100, 2)
    Write-Host "📈 Pass Rate: $passRate%" -ForegroundColor White
}

# Generate coverage report if requested
if ($Coverage -and $testResults.Passed -gt 0) {
    Write-Host "`n📄 Generating coverage report..." -ForegroundColor Yellow
    
    # Combine coverage reports
    if (Test-Path "$PSScriptRoot\..\coverage") {
        Write-Host "Coverage reports available in ./coverage directory" -ForegroundColor Green
    }
}

# Exit with appropriate code
if ($testResults.Failed -gt 0) {
    Write-Host "`n❌ Tests failed!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n✅ All tests passed!" -ForegroundColor Green
    exit 0
}