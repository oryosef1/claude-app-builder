# POE Helper Testing Suite

## Overview
Comprehensive testing infrastructure for the POE Helper AI Software Company system.

## Test Structure

```
test/
├── unit/                    # Unit tests for individual components
├── integration/             # Integration tests between services
├── e2e/                     # End-to-end system tests
├── fixtures/                # Test data and mocks
├── run-all-tests.ps1        # Master test runner
├── start-services.ps1       # Service startup helper
├── check-ports.ps1          # Port availability checker
├── restart-services.ps1     # Service restart utility
└── e2e-final.ps1           # Main E2E test suite
```

## Quick Start

### Run All Tests
```powershell
./test/run-all-tests.ps1
```

### Run Specific Test Types
```powershell
# Unit tests only
./test/run-all-tests.ps1 -TestType unit

# Integration tests
./test/run-all-tests.ps1 -TestType integration

# E2E tests
./test/run-all-tests.ps1 -TestType e2e

# With coverage
./test/run-all-tests.ps1 -Coverage

# Watch mode (unit tests)
./test/run-all-tests.ps1 -TestType unit -Watch
```

### Start Services for Testing
```powershell
./test/start-services.ps1
```

### Check Service Health
```powershell
./test/check-ports.ps1
```

## Test Categories

### Unit Tests
- **Memory API**: Service logic, validation, utilities
- **Dashboard Backend**: ProcessManager, TaskQueue, AgentRegistry
- **Dashboard Frontend**: Vue components, stores, utilities
- **Coverage Target**: 95%

### Integration Tests
- **Service Communication**: API calls between services
- **Database Operations**: Vector DB, Redis caching
- **WebSocket Events**: Real-time communication
- **Coverage Target**: 90%

### E2E Tests
- **System Health**: All services running and healthy
- **User Workflows**: Complete task lifecycle
- **Data Persistence**: Memory storage and retrieval
- **Coverage Target**: Key user journeys

## Current Coverage

| Component | Unit | Integration | E2E | Overall |
|-----------|------|-------------|-----|---------|
| Memory API | 40% | 60% | 80% | ~60% |
| Dashboard Backend | 50% | 70% | 90% | ~70% |
| API Bridge | 30% | 50% | 80% | ~53% |
| Dashboard Frontend | 20% | 10% | 0% | ~10% |
| **System Total** | **35%** | **48%** | **63%** | **~48%** |

## Testing Best Practices

### 1. Test Naming
```javascript
describe('ComponentName', () => {
  it('should handle success case when valid input provided', () => {});
  it('should throw error when invalid input provided', () => {});
});
```

### 2. Test Isolation
- Each test should be independent
- Clean up after tests
- Use fresh test data

### 3. Mocking Strategy
- Mock external services (Pinecone, Redis)
- Use real implementations where possible
- Maintain mock synchronization

### 4. Continuous Testing
- Run tests before commits
- Automated CI/CD pipeline
- Coverage never decreases

## Troubleshooting

### Services Not Starting
```powershell
# Check ports
./test/check-ports.ps1

# Restart all services
./test/restart-services.ps1
```

### Test Failures
1. Check service logs in respective directories
2. Ensure .env file has required keys
3. Verify Node.js dependencies installed
4. Check for port conflicts

### Coverage Issues
1. Run with -Coverage flag
2. Check coverage/ directories
3. Review uncovered code paths
4. Add missing test cases

## Next Steps

See `docs/TEST_PLAN_100_COVERAGE.md` for the comprehensive plan to achieve 100% test coverage.

## Contributing

1. Write tests for new features
2. Maintain or improve coverage
3. Update this README with changes
4. Follow testing conventions

---

**Last Updated**: 2025-07-10  
**Target Coverage**: 100%  
**Current Coverage**: ~48%