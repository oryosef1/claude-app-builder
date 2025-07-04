# Code Review Feedback - Still Needs Work

## Critical Issues Found

### 1. TypeScript Compilation Errors
- **E2E Tests**: `tests/e2e/workflow-e2e.test.ts:56:43` - WorkflowService constructor signature doesn't match usage
- **E2E Tests**: Multiple null pointer issues with `wsClient` variable

### 2. Test Failures (Multiple Services)

#### FileService Tests
- **readTodos()** - Returns empty array instead of expected todos
- **writeTodos()** - Mock `writeFile` never called, breaking all write operations
- **Error handling** - Promises resolve instead of reject on errors

#### WebSocketService Tests
- **Timestamp mismatch** - Tests expect `{inverse: false}` but get actual timestamps
- **Broadcast methods** - All broadcast tests fail due to timestamp format issues

#### WorkflowController Tests
- **Pagination validation** - Response status/json methods never called
- **Error handling** - Controller doesn't properly validate or respond to errors

### 3. Service Integration Issues
- **WorkflowService constructor** - Expects ProcessManager but receiving WebSocketService
- **Missing dependency injection** - Services not properly wired together

## Required Fixes

### 1. Fix WorkflowService Constructor
```typescript
// tests/e2e/workflow-e2e.test.ts:56 needs:
workflowService = new WorkflowService(processManager, fileService, logService);
// Not:
workflowService = new WorkflowService(webSocketService);
```

### 2. Fix FileService Implementation
- Make `readTodos()` actually read and parse todo.md
- Make `writeTodos()` actually call fs.writeFile
- Add proper error handling with reject/throw

### 3. Fix WebSocketService Timestamps
- Tests expect `{inverse: false}` but code generates real timestamps
- Either fix tests or change implementation to match

### 4. Fix WorkflowController Responses
- Make error responses actually call `res.status()` and `res.json()`
- Add proper validation and error handling

### 5. Fix Null Safety
- Add proper null checks for `wsClient` in E2E tests
- Add proper error handling for undefined objects

## Test Results Summary
- **E2E Tests**: Failed to compile due to TypeScript errors
- **Unit Tests**: 15+ test failures across multiple services
- **Integration**: Services not properly connected

The implementation needs significant fixes before it can pass code review.