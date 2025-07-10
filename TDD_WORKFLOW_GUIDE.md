# Test-Driven Development (TDD) Workflow Guide

## Overview

The Claude AI Software Company now follows a strict Test-Driven Development (TDD) approach. This ensures higher quality code and better reliability by writing tests BEFORE implementation.

## Enhanced Workflow Phases

### 1. Planning Phase
- **Roles**: Project Manager, Technical Lead
- **Purpose**: Define requirements and project scope
- **Output**: Clear requirements that can be translated into tests

### 2. Architecture Phase
- **Roles**: Technical Lead, Senior Developer
- **Purpose**: Design system architecture
- **Output**: Technical design that guides test structure

### 3. 🆕 Test Writing Phase (NEW!)
- **Roles**: QA Engineer, Test Engineer, Senior Developer
- **Purpose**: Write comprehensive tests BEFORE any implementation
- **Key Requirements**:
  - Tests MUST be written before any implementation code
  - Tests MUST fail initially (since no implementation exists)
  - Include unit tests, integration tests, and e2e tests
  - Tests define the expected behavior of the system
  
**Example Test Structure**:
```javascript
// Unit Test Example
describe('UserService', () => {
  it('should create a new user with valid data', async () => {
    const userData = { name: 'John', email: 'john@example.com' };
    const user = await userService.create(userData);
    expect(user.id).toBeDefined();
    expect(user.name).toBe('John');
  });
});

// Integration Test Example
describe('API Endpoints', () => {
  it('POST /api/users should create user and return 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' });
    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
  });
});
```

### 4. Development Phase
- **Roles**: Senior Developer, Junior Developer
- **Purpose**: Implement code to make ALL tests pass
- **Critical Instructions**:
  - Run tests first to see what needs implementation
  - Implement features to make tests pass
  - DO NOT stop until ALL tests are green
  - Run tests after every change
  - Fix failures immediately
  
**Development Workflow**:
```bash
# 1. Run all tests (they should fail)
npm test

# 2. Implement feature
# ... write code ...

# 3. Run tests again
npm test

# 4. Fix any failures
# ... fix code ...

# 5. Repeat until all tests pass
npm test  # All green! ✅
```

### 5. Testing & QA Phase
- **Roles**: QA Engineer, Test Engineer
- **Purpose**: Run all tests and perform additional QA
- **Requirements**:
  - ALL automated tests must pass
  - Test coverage should be >80%
  - Perform manual testing beyond automated tests
  - Document any issues found

### 6. Quality Review Phase
- **Roles**: QA Director, Project Manager
- **Purpose**: Final quality assessment
- **Checks**:
  - Test coverage report review
  - All tests passing verification
  - TDD process compliance
  - Go/No-Go decision

## Benefits of TDD Workflow

1. **Better Design**: Writing tests first forces better API design
2. **Fewer Bugs**: Tests catch issues before deployment
3. **Confidence**: All code is tested and verified
4. **Documentation**: Tests serve as living documentation
5. **Refactoring Safety**: Tests ensure changes don't break functionality

## Running the Enhanced Workflow

```bash
# Run the corporate workflow with TDD
./corporate-workflow.sh run

# The workflow will automatically:
# 1. Route to test writing phase first
# 2. Ensure tests are written before code
# 3. Verify all tests pass before proceeding
```

## Test Standards

### Unit Tests
- Test individual functions/methods
- Mock external dependencies
- Fast execution (<100ms per test)
- High coverage (>90%)

### Integration Tests
- Test component interactions
- Use real implementations where possible
- Test API endpoints, database operations
- Medium execution time

### End-to-End Tests
- Test complete user workflows
- Simulate real user interactions
- Test the full stack
- Longer execution time acceptable

## Common Test Frameworks

- **JavaScript/TypeScript**: Jest, Mocha, Vitest
- **Python**: PyTest, unittest
- **Go**: testing package, testify
- **Java**: JUnit, TestNG
- **Ruby**: RSpec, Minitest

## Best Practices

1. **Write Tests First**: Always write tests before implementation
2. **Keep Tests Simple**: Each test should test one thing
3. **Use Descriptive Names**: Test names should explain what they test
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Don't Test Implementation**: Test behavior, not internal details
6. **Keep Tests Fast**: Fast tests encourage frequent running
7. **Maintain Tests**: Update tests when requirements change

## Example Task Flow

1. **Task**: "Implement user authentication"

2. **Test Writing Phase Output**:
   - `auth.test.js` - Authentication unit tests
   - `auth-api.test.js` - API integration tests
   - `login-flow.e2e.test.js` - End-to-end login tests

3. **Development Phase**:
   - Developer runs tests (all fail ❌)
   - Implements authentication logic
   - Runs tests again (some pass ✅)
   - Fixes remaining issues
   - All tests pass ✅✅✅

4. **QA Phase**:
   - Runs all test suites
   - Checks coverage (85% ✅)
   - Performs manual security testing
   - Documents findings

5. **Quality Review**:
   - Reviews test results
   - Confirms TDD process followed
   - Approves for deployment ✅

## Monitoring TDD Compliance

The workflow automatically tracks:
- Whether tests were written before code
- Test coverage percentages
- Test execution results
- Time taken for tests to pass

This data is stored in the AI employee's memory for continuous improvement.

---

**Remember**: In TDD, if the tests don't exist or don't pass, the feature isn't complete!