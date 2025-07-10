# Quick Start: Adding Tests to POE Helper

## Immediate Actions - Start Testing Now!

### 1. Memory API Tests (Start Here!)

#### Create Test Directory Structure
```bash
cd /mnt/c/Users/בית/Downloads/poe helper
mkdir -p test/unit test/integration test/fixtures
```

#### Create First Test File
```bash
# Create a simple test for MemoryManagementService
cat > test/unit/MemoryManagementService.test.js << 'EOF'
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'assert';

describe('MemoryManagementService', () => {
  it('should be tested', () => {
    // TODO: Import actual service and test
    assert.strictEqual(1 + 1, 2);
  });
});
EOF
```

#### Run Tests
```bash
npm test
```

### 2. Dashboard Backend Tests (TypeScript)

#### Create Test Structure
```bash
cd dashboard/backend
mkdir -p tests/unit tests/integration tests/mocks
```

#### Create Jest Config
```bash
cat > jest.config.js << 'EOF'
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ]
};
EOF
```

#### Create First Test
```bash
cat > tests/unit/AgentRegistry.test.ts << 'EOF'
import { AgentRegistry } from '../../src/core/AgentRegistry';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  test('should load all 13 employees', () => {
    const employees = registry.getAllEmployees();
    expect(employees).toHaveLength(13);
  });

  test('should find employees by skill', () => {
    const developers = registry.getEmployeesBySkill('TypeScript');
    expect(developers.length).toBeGreaterThan(0);
  });
});
EOF
```

#### Run Tests
```bash
npm test
```

### 3. API Bridge Tests

#### Install Test Dependencies
```bash
cd api-bridge
npm install --save-dev jest supertest
```

#### Create Test File
```bash
mkdir -p test
cat > test/api.test.js << 'EOF'
import request from 'supertest';

describe('API Bridge', () => {
  test('health check', async () => {
    // TODO: Import app and test
    expect(true).toBe(true);
  });
});
EOF
```

### 4. Frontend Tests Setup

#### Install Testing Dependencies
```bash
cd dashboard/frontend
npm install --save-dev vitest @vue/test-utils happy-dom @testing-library/vue
```

#### Update package.json Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

#### Create Vitest Config
```bash
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './tests/setup.ts'
  }
});
EOF
```

## Test Templates to Copy & Use

### Unit Test Template
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('ComponentName', () => {
  let component;

  beforeEach(() => {
    // Setup
    component = new Component();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = component.method(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    it('should handle error case', () => {
      // Test error scenarios
      expect(() => component.method(null)).toThrow();
    });
  });
});
```

### Integration Test Template
```javascript
describe('API Integration', () => {
  let server;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should integrate with external service', async () => {
    const response = await fetch('/api/endpoint');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
  });
});
```

### E2E Test Template
```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature E2E', () => {
  test('complete user flow', async ({ page }) => {
    // Navigate
    await page.goto('http://localhost:3000');
    
    // Interact
    await page.click('button[data-test="action"]');
    await page.fill('input[name="field"]', 'value');
    
    // Assert
    await expect(page.locator('.result')).toBeVisible();
    await expect(page.locator('.result')).toContainText('Success');
  });
});
```

## Common Test Patterns

### 1. Testing Async Functions
```javascript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### 2. Testing Error Handling
```javascript
it('should throw on invalid input', async () => {
  await expect(async () => {
    await functionThatThrows();
  }).rejects.toThrow('Expected error message');
});
```

### 3. Testing Event Emitters
```javascript
it('should emit events', (done) => {
  emitter.on('event', (data) => {
    expect(data).toBe('expected');
    done();
  });
  
  emitter.trigger();
});
```

### 4. Testing with Mocks
```javascript
import { vi } from 'vitest';

it('should call dependency', () => {
  const mockFn = vi.fn();
  component.setDependency(mockFn);
  
  component.action();
  
  expect(mockFn).toHaveBeenCalledWith('expected args');
});
```

## Run Tests in Different Modes

### Watch Mode (Development)
```bash
npm test -- --watch
```

### Coverage Mode
```bash
npm test -- --coverage
```

### Specific File
```bash
npm test -- AgentRegistry.test.ts
```

### Debug Mode
```bash
node --inspect npm test
```

## Quick Wins - Tests You Can Write NOW

1. **Health Check Tests** - All services have /health endpoints
2. **Configuration Tests** - Test environment variable loading
3. **Data Structure Tests** - Test employee registry loading
4. **API Response Tests** - Test endpoint response formats
5. **Component Render Tests** - Test Vue components render without errors

## Next Steps After Quick Start

1. **Pick a service** (Memory API recommended)
2. **Write 5 simple tests** using templates above
3. **Run tests** and fix any issues
4. **Add more complex tests** gradually
5. **Aim for 50% coverage** initially, then improve

Remember: **Any test is better than no test!** Start simple and build up.

---

Use this guide to start adding tests TODAY. Don't wait for perfect test infrastructure - begin with simple tests and iterate!