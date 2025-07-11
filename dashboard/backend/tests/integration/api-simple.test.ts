import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer, Server } from 'http';
import { ProcessManager } from '../../src/core/ProcessManager.js';
import { TaskQueue } from '../../src/core/TaskQueue.js';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';
import winston from 'winston';
import { createAPIRouter } from '../../src/api/server.js';
import { createAdditionalRoutes } from '../../src/api/routes.js';

// Mock the index.js to prevent it from starting a real server
vi.mock('../../src/index.js', () => ({
  default: {},
  app: null,
  server: null
}));

describe('API Integration Tests', () => {
  let server: Server;
  let app: express.Application;
  let processManager: ProcessManager;
  let taskQueue: TaskQueue;
  let agentRegistry: AgentRegistry;

  beforeAll(async () => {
    // Create test instances
    const logger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console()],
      format: winston.format.simple()
    });
    
    // Initialize AgentRegistry and load employees
    agentRegistry = new AgentRegistry();
    
    // Create ProcessManager and TaskQueue with correct parameters
    processManager = new ProcessManager(logger);
    taskQueue = new TaskQueue(logger, agentRegistry);
    
    // Load employees from registry into the system
    const registryEmployees = agentRegistry.getAllEmployees();
    const aiEmployees = registryEmployees.map(emp => ({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      skills: emp.skills,
      status: emp.status === 'active' ? 'available' : emp.status === 'busy' ? 'busy' : 'offline',
      performance: {
        tasksCompleted: emp.performance_metrics?.tasks_completed || 0,
        averageResponseTime: emp.performance_metrics?.average_response_time || 0,
        successRate: emp.performance_metrics?.success_rate || 0,
        lastUpdated: new Date()
      },
      systemPrompt: '',
      tools: [],
      workload: emp.workload || 0,
      lastAssigned: new Date()
    }));
    
    await processManager.loadEmployees(aiEmployees);
    await taskQueue.loadEmployees(aiEmployees);
    
    // Create Express app
    app = express();
    app.use(express.json());
    
    // Health endpoint
    app.get('/health', (_req, res) => {
      res.json({ status: 'healthy' });
    });
    
    // API routes
    const apiRouter = createAPIRouter(processManager, taskQueue, agentRegistry, logger);
    const additionalRouter = createAdditionalRoutes(agentRegistry);
    
    app.use('/api', apiRouter);
    app.use('/api', additionalRouter);
    
    // 404 handler
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
    
    // Error handler
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(400).json({ error: 'Invalid request' });
    });
    
    // Create HTTP server
    server = createServer(app);
  }, 10000);

  afterAll(async () => {
    // Cleanup
    if (processManager && typeof processManager.shutdown === 'function') {
      await processManager.shutdown();
    }
    if (taskQueue && typeof taskQueue.shutdown === 'function') {
      await taskQueue.shutdown();
    }
  });

  describe('Health Endpoints', () => {
    test('GET /health should return 200', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('Process Endpoints', () => {
    test('GET /api/processes should return process list', async () => {
      const response = await request(app).get('/api/processes');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/processes should create new process', async () => {
      const response = await request(app)
        .post('/api/processes')
        .send({
          employeeId: 'emp_001',
          systemPrompt: 'You are a developer',
          maxTurns: 20
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('processId');
    });
  });

  describe('Task Endpoints', () => {
    test('GET /api/tasks should return task list', async () => {
      const response = await request(app).get('/api/tasks');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/tasks should create new task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          description: 'Test Description',
          requiredSkills: ['testing'],
          priority: 3
        });
      
      expect(response.status).toBe(201);
      
      // The endpoint from routes.ts returns the task directly
      // The endpoint from server.ts returns { success: true, data: { taskId } }
      if (response.body.success) {
        // server.ts format
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('taskId');
      } else {
        // routes.ts format
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('title', 'Test Task');
      }
    });
  });

  describe('Agent Endpoints', () => {
    test('GET /api/agents should return agent list', async () => {
      const response = await request(app).get('/api/agents');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(13); // We have 13 AI employees
    });

    test('GET /api/agents/:id should return specific agent', async () => {
      const response = await request(app).get('/api/agents/emp_001');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'emp_001');
      expect(response.body).toHaveProperty('name');
    });
  });

  describe('Metrics Endpoint', () => {
    test('GET /api/metrics should return system metrics', async () => {
      const response = await request(app).get('/api/metrics');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('memory');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown');
      expect(response.status).toBe(404);
    });

    test('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(response.status).toBe(400);
    });
  });
});