# Technical Standards and Coding Patterns

## Overview

This document establishes the technical standards, coding patterns, and best practices for the Claude AI Software Company's Multi-Agent Dashboard System development. All team members must follow these standards to ensure code quality, maintainability, and consistency.

## 1. Code Style and Formatting

### 1.1 TypeScript/JavaScript Standards

**General Principles:**
- Use TypeScript for all new code
- Enable strict mode in tsconfig.json
- Follow explicit typing over `any` type
- Use meaningful variable and function names

**Naming Conventions:**
```typescript
// Variables and functions: camelCase
const processManager = new ProcessManager();
const handleTaskAssignment = async (task: Task) => {};

// Classes: PascalCase
class ProcessManager {}
class TaskDistributor {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_CONCURRENT_PROCESSES = 20;
const DEFAULT_TIMEOUT = 30000;

// Interfaces: PascalCase with 'I' prefix (optional)
interface ProcessConfig {}
interface ITaskQueue {}

// Types: PascalCase
type ProcessStatus = 'running' | 'stopped' | 'error';
type TaskPriority = 'high' | 'medium' | 'low';
```

**Code Formatting:**
```typescript
// Use 2 spaces for indentation
const config = {
  processId: 'emp_001',
  systemPrompt: 'You are a senior developer',
  workingDirectory: '/workspace',
  allowedTools: ['Read', 'Write', 'Bash']
};

// Use trailing commas in objects and arrays
const employees = [
  'Alex Project Manager',
  'Taylor Technical Lead',
  'Sam Senior Developer',
];

// Use template literals for string interpolation
const message = `Process ${processId} started successfully`;

// Use async/await over Promises
const result = await processManager.spawnProcess(config);
```

### 1.2 ESLint Configuration

**Required ESLint Rules:**
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"]
  }
}
```

### 1.3 Prettier Configuration

**Prettier Settings:**
```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

## 2. Architecture Patterns

### 2.1 Dependency Injection Pattern

**Service Registration:**
```typescript
// core/ServiceContainer.ts
export class ServiceContainer {
  private services: Map<string, any> = new Map();

  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service as T;
  }
}

// Usage
const container = new ServiceContainer();
container.register('processManager', new ProcessManager());
container.register('taskQueue', new TaskQueue());
```

### 2.2 Repository Pattern

**Data Access Layer:**
```typescript
// repositories/ProcessRepository.ts
export interface IProcessRepository {
  create(process: Process): Promise<void>;
  findById(id: string): Promise<Process | null>;
  update(id: string, updates: Partial<Process>): Promise<void>;
  delete(id: string): Promise<void>;
  findByStatus(status: ProcessStatus): Promise<Process[]>;
}

export class ProcessRepository implements IProcessRepository {
  constructor(private db: Database) {}

  async create(process: Process): Promise<void> {
    const query = `
      INSERT INTO processes (id, name, employee_id, status, config)
      VALUES (?, ?, ?, ?, ?)
    `;
    await this.db.run(query, [
      process.id,
      process.name,
      process.employeeId,
      process.status,
      JSON.stringify(process.config)
    ]);
  }

  async findById(id: string): Promise<Process | null> {
    const query = 'SELECT * FROM processes WHERE id = ?';
    const row = await this.db.get(query, [id]);
    return row ? this.mapRowToProcess(row) : null;
  }

  private mapRowToProcess(row: any): Process {
    return {
      id: row.id,
      name: row.name,
      employeeId: row.employee_id,
      status: row.status,
      config: JSON.parse(row.config),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
```

### 2.3 Observer Pattern

**Event System:**
```typescript
// core/EventEmitter.ts
export class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }
}

// Usage
class ProcessManager extends EventEmitter {
  async spawnProcess(config: ProcessConfig): Promise<void> {
    // Process spawning logic
    this.emit('process-spawned', { processId: config.id });
  }
}
```

## 3. Error Handling Standards

### 3.1 Custom Error Classes

**Error Hierarchy:**
```typescript
// errors/BaseError.ts
export abstract class BaseError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// errors/ProcessError.ts
export class ProcessError extends BaseError {
  readonly statusCode = 500;
  readonly isOperational = true;

  constructor(message: string, public readonly processId: string) {
    super(message, { processId });
  }
}

// errors/ValidationError.ts
export class ValidationError extends BaseError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(message: string, public readonly field: string) {
    super(message, { field });
  }
}
```

### 3.2 Error Handling Middleware

**Express Error Handler:**
```typescript
// middleware/errorHandler.ts
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof BaseError) {
    logger.error(error.message, {
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack
    });

    res.status(error.statusCode).json({
      error: {
        message: error.message,
        statusCode: error.statusCode,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    });
  } else {
    logger.error('Unexpected error', {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: {
        message: 'Internal Server Error',
        statusCode: 500
      }
    });
  }
};
```

### 3.3 Async Error Handling

**Async Wrapper:**
```typescript
// utils/asyncHandler.ts
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage
app.post('/api/processes', asyncHandler(async (req: Request, res: Response) => {
  const process = await processManager.spawnProcess(req.body);
  res.json({ success: true, processId: process.id });
}));
```

## 4. Testing Standards

### 4.1 Unit Testing

**Test Structure:**
```typescript
// tests/unit/ProcessManager.test.ts
import { ProcessManager } from '../../src/core/ProcessManager';
import { ProcessConfig } from '../../src/types/Process';

describe('ProcessManager', () => {
  let processManager: ProcessManager;
  let mockSpawn: jest.Mock;

  beforeEach(() => {
    mockSpawn = jest.fn();
    processManager = new ProcessManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('spawnProcess', () => {
    it('should spawn process with correct configuration', async () => {
      // Arrange
      const config: ProcessConfig = {
        id: 'test-process',
        name: 'Test Process',
        systemPrompt: 'Test prompt',
        workingDirectory: '/test',
        allowedTools: ['Read', 'Write']
      };

      // Act
      await processManager.spawnProcess(config);

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith('claude', [
        '--system-prompt', 'Test prompt',
        '--cwd', '/test',
        '--allowedTools', 'Read,Write'
      ]);
    });

    it('should throw error for invalid configuration', async () => {
      // Arrange
      const invalidConfig = {} as ProcessConfig;

      // Act & Assert
      await expect(processManager.spawnProcess(invalidConfig))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

### 4.2 Integration Testing

**API Integration Tests:**
```typescript
// tests/integration/api.test.ts
import request from 'supertest';
import { app } from '../../src/app';

describe('Process API', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/processes', () => {
    it('should create new process', async () => {
      // Arrange
      const processConfig = {
        id: 'test-process',
        name: 'Test Process',
        systemPrompt: 'Test prompt',
        workingDirectory: '/test'
      };

      // Act
      const response = await request(app)
        .post('/api/processes')
        .send(processConfig)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        success: true,
        processId: 'test-process'
      });
    });
  });
});
```

### 4.3 End-to-End Testing

**E2E Test Structure:**
```typescript
// tests/e2e/dashboard.test.ts
import { chromium, Browser, Page } from 'playwright';

describe('Dashboard E2E', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
  });

  afterEach(async () => {
    await page.close();
  });

  it('should display process dashboard', async () => {
    // Assert
    await expect(page.locator('h1')).toContainText('Process Dashboard');
    await expect(page.locator('.process-grid')).toBeVisible();
  });

  it('should spawn new process', async () => {
    // Act
    await page.selectOption('select[name="role"]', 'api_developer');
    await page.fill('input[name="workingDirectory"]', '/workspace');
    await page.click('button[type="submit"]');

    // Assert
    await expect(page.locator('.process-card')).toBeVisible();
  });
});
```

## 5. Security Standards

### 5.1 Input Validation

**Validation Schemas:**
```typescript
// validators/processSchema.ts
import Joi from 'joi';

export const processConfigSchema = Joi.object({
  id: Joi.string().required().min(3).max(50),
  name: Joi.string().required().min(3).max(100),
  systemPrompt: Joi.string().required().min(10).max(1000),
  workingDirectory: Joi.string().required().regex(/^\/[a-zA-Z0-9/_-]+$/),
  allowedTools: Joi.array().items(Joi.string().valid(
    'Read', 'Write', 'Bash', 'Edit', 'Grep', 'Glob', 'LS'
  )),
  maxTurns: Joi.number().integer().min(1).max(50)
});

// Usage
export const validateProcessConfig = (config: any): ProcessConfig => {
  const { error, value } = processConfigSchema.validate(config);
  if (error) {
    throw new ValidationError(error.details[0].message, error.details[0].path[0]);
  }
  return value;
};
```

### 5.2 Rate Limiting

**API Rate Limiting:**
```typescript
// middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const createRateLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests, please try again later',
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Usage
const processSpawnLimiter = createRateLimiter(15 * 60 * 1000, 10); // 10 requests per 15 minutes
app.post('/api/processes', processSpawnLimiter, processController.create);
```

### 5.3 Authentication and Authorization

**JWT Authentication:**
```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  role: string;
  permissions: string[];
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userPermissions = req.user?.permissions || [];
    const hasPermission = permissions.some(p => userPermissions.includes(p));
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

## 6. Performance Standards

### 6.1 Caching Strategy

**Redis Caching:**
```typescript
// services/CacheService.ts
import { createClient } from 'redis';

export class CacheService {
  private client = createClient({
    url: process.env.REDIS_URL
  });

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await this.client.setEx(key, ttl, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }
}

// Usage with decorator
export const cached = (ttl: number = 3600) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      await cacheService.set(cacheKey, result, ttl);
      return result;
    };

    return descriptor;
  };
};
```

### 6.2 Database Optimization

**Query Optimization:**
```typescript
// repositories/OptimizedProcessRepository.ts
export class OptimizedProcessRepository {
  // Use connection pooling
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }

  // Use prepared statements
  async findActiveProcesses(): Promise<Process[]> {
    const query = `
      SELECT p.*, e.name as employee_name, e.skills
      FROM processes p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.status = 'running'
      ORDER BY p.created_at DESC
    `;
    
    const result = await this.pool.query(query);
    return result.rows.map(this.mapRowToProcess);
  }

  // Use batch operations
  async createMultipleProcesses(processes: Process[]): Promise<void> {
    const values = processes.map(p => [p.id, p.name, p.employeeId, p.status]);
    const query = `
      INSERT INTO processes (id, name, employee_id, status)
      VALUES ${values.map(() => '(?, ?, ?, ?)').join(', ')}
    `;
    
    await this.pool.query(query, values.flat());
  }
}
```

## 7. Logging and Monitoring

### 7.1 Structured Logging

**Logger Configuration:**
```typescript
// utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'dashboard-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

export default logger;

// Usage
logger.info('Process spawned successfully', {
  processId: 'emp_001',
  employeeId: 'emp_001',
  timestamp: new Date().toISOString()
});

logger.error('Failed to spawn process', {
  processId: 'emp_001',
  error: error.message,
  stack: error.stack
});
```

### 7.2 Performance Monitoring

**Metrics Collection:**
```typescript
// utils/metrics.ts
export class MetricsCollector {
  private metrics: Map<string, number> = new Map();

  increment(metric: string, value: number = 1): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  gauge(metric: string, value: number): void {
    this.metrics.set(metric, value);
  }

  timing(metric: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.metrics.set(metric, duration);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}

// Usage with decorator
export const timed = (metricName: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        metricsCollector.timing(`${metricName}.success`, startTime);
        return result;
      } catch (error) {
        metricsCollector.timing(`${metricName}.error`, startTime);
        metricsCollector.increment(`${metricName}.error_count`);
        throw error;
      }
    };

    return descriptor;
  };
};
```

## 8. Code Review Standards

### 8.1 Pull Request Guidelines

**PR Requirements:**
- Maximum 400 lines of code changes
- Descriptive title and description
- Link to relevant tickets or issues
- Self-review checklist completed
- All tests passing
- No merge conflicts

**Review Checklist:**
- [ ] Code follows established patterns and conventions
- [ ] Proper error handling implemented
- [ ] Security considerations addressed
- [ ] Performance impact assessed
- [ ] Tests provide adequate coverage
- [ ] Documentation updated if needed
- [ ] No hardcoded values or secrets

### 8.2 Code Quality Gates

**Automated Checks:**
```yaml
# .github/workflows/quality.yml
name: Code Quality

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linting
        run: npm run lint
        
      - name: Run type checking
        run: npm run type-check
        
      - name: Run tests
        run: npm run test:coverage
        
      - name: Check test coverage
        run: npm run test:coverage:check
```

## 9. Documentation Standards

### 9.1 Code Documentation

**JSDoc Standards:**
```typescript
/**
 * Manages Claude Code process lifecycle including spawning, monitoring, and termination
 * @class ProcessManager
 * @extends EventEmitter
 */
export class ProcessManager extends EventEmitter {
  /**
   * Spawns a new Claude Code process with the specified configuration
   * @param {ProcessConfig} config - Process configuration object
   * @returns {Promise<string>} The process ID of the spawned process
   * @throws {ValidationError} When configuration is invalid
   * @throws {ProcessError} When process spawning fails
   * @example
   * ```typescript
   * const processManager = new ProcessManager();
   * const processId = await processManager.spawnProcess({
   *   id: 'dev-001',
   *   name: 'API Developer',
   *   systemPrompt: 'You are an API developer',
   *   workingDirectory: '/workspace'
   * });
   * ```
   */
  async spawnProcess(config: ProcessConfig): Promise<string> {
    // Implementation
  }
}
```

### 9.2 API Documentation

**OpenAPI Specification:**
```yaml
# docs/api.yml
openapi: 3.0.0
info:
  title: Dashboard API
  version: 1.0.0
  description: Multi-Agent Dashboard System API

paths:
  /api/processes:
    post:
      summary: Create new process
      description: Spawns a new Claude Code process with specified configuration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProcessConfig'
      responses:
        '201':
          description: Process created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  processId:
                    type: string
        '400':
          description: Invalid configuration
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

components:
  schemas:
    ProcessConfig:
      type: object
      required:
        - id
        - name
        - systemPrompt
        - workingDirectory
      properties:
        id:
          type: string
          minLength: 3
          maxLength: 50
        name:
          type: string
          minLength: 3
          maxLength: 100
        systemPrompt:
          type: string
          minLength: 10
          maxLength: 1000
        workingDirectory:
          type: string
          pattern: '^\/[a-zA-Z0-9\/_-]+$'
```

## 10. Continuous Integration/Deployment

### 10.1 CI/CD Pipeline

**Pipeline Stages:**
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        
  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Build Docker image
        run: docker build -t dashboard:${{ github.sha }} .
        
      - name: Push to registry
        run: docker push dashboard:${{ github.sha }}
        
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to production
        run: |
          # Deployment script
          kubectl set image deployment/dashboard-backend dashboard-backend=dashboard:${{ github.sha }}
```

## Conclusion

These technical standards provide a comprehensive framework for developing high-quality, maintainable, and secure software. All team members must follow these guidelines to ensure consistency and reliability across the Multi-Agent Dashboard System.

Regular reviews and updates of these standards will be conducted to incorporate new best practices and lessons learned from the development process.

---

**Document Version**: 1.0  
**Last Updated**: 2025-07-08  
**Author**: Taylor Technical Lead  
**Review Schedule**: Monthly