import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer, Server } from 'http';
import { ProcessManager } from '../../src/core/ProcessManager.js';
import { TaskQueue } from '../../src/core/TaskQueue.js';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';
import winston from 'winston';
import { createAPIRouter, DashboardServer } from '../../src/api/server.js';
import { createAdditionalRoutes } from '../../src/api/routes.js';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';

// Mock the index.js to prevent it from starting a real server
vi.mock('../../src/index.js', () => ({
  default: {},
  app: null,
  server: null
}));

describe('Dashboard Server Real Integration Tests', () => {
  let server: Server;
  let app: express.Application;
  let dashboardServer: DashboardServer;
  let socket: Socket;
  let processManager: ProcessManager;
  let taskQueue: TaskQueue;
  let agentRegistry: AgentRegistry;
  const baseUrl = 'http://localhost:8090';

  beforeAll(async () => {
    // Create test instances
    const logger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console()]
    });
    
    agentRegistry = new AgentRegistry();
    processManager = new ProcessManager(agentRegistry, logger);
    taskQueue = new TaskQueue(processManager, agentRegistry, logger);
    
    // Create Express app
    app = express();
    app.use(express.json({ limit: '10mb' }));
    
    // Health endpoint
    app.get('/health', (_req, res) => {
      res.json({ 
        status: 'healthy',
        service: 'dashboard-backend',
        timestamp: new Date().toISOString()
      });
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
    
    // Create HTTP server and start on port 8090
    server = createServer(app);
    
    // Create WebSocket server
    dashboardServer = new DashboardServer(server, processManager, taskQueue, agentRegistry, logger);
    
    await new Promise<void>((resolve) => {
      server.listen(8090, () => {
        resolve();
      });
    });
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000);

  afterAll(async () => {
    if (socket) {
      socket.close();
    }
    
    if (dashboardServer) {
      await dashboardServer.shutdown();
    }
    
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    
    // Cleanup
    if (processManager && typeof processManager.shutdown === 'function') {
      await processManager.shutdown();
    }
    if (taskQueue && typeof taskQueue.shutdown === 'function') {
      await taskQueue.shutdown();
    }
  });

  describe('HTTP API Tests', () => {
    test('GET /health returns healthy status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'dashboard-backend',
        timestamp: expect.any(String)
      });
    });

    test('GET /api/processes returns process list', async () => {
      const response = await request(app).get('/api/processes');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/processes creates new process', async () => {
      const response = await request(app)
        .post('/api/processes')
        .send({
          role: 'Developer',
          systemPrompt: 'You are a developer',
          task: 'Test task'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('processId');
    });

    test('GET /api/tasks returns task list', async () => {
      const response = await request(app).get('/api/tasks');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/tasks creates new task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Integration Test Task',
          description: 'Testing task creation',
          requiredSkills: ['testing'],
          priority: 3
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('taskId');
    });

    test('GET /api/agents returns all employees', async () => {
      const response = await request(app).get('/api/agents');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(13);
    });

    test('GET /api/agents/:id returns specific employee', async () => {
      const response = await request(app).get('/api/agents/emp_001');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'emp_001');
      expect(response.body).toHaveProperty('name', 'Alex Project Manager');
    });

    test('GET /api/metrics returns system metrics', async () => {
      const response = await request(app).get('/api/metrics');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('uptime');
    });

    test('POST /api/tasks/:id/assign assigns task to employee', async () => {
      // First create a task
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task to Assign',
          requiredSkills: ['testing']
        });
      
      const taskId = createResponse.body.data.taskId;
      
      const response = await request(app)
        .post(`/api/tasks/${taskId}/assign`)
        .send({ employeeId: 'emp_001' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('DELETE /api/processes/:id stops process', async () => {
      // This would normally stop a real process, but in test we just verify the endpoint
      const response = await request(app)
        .post('/api/processes/test-process-id/stop');
      
      // Should return error because process doesn't exist
      expect(response.status).toBe(500);
    });

    test('handles 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not found');
    });

    test('handles invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(response.status).toBe(400);
    });
  });

  describe('WebSocket Tests', () => {
    beforeEach(async () => {
      socket = io(baseUrl, {
        transports: ['websocket'],
        forceNew: true
      });
      
      await new Promise<void>((resolve) => {
        socket.on('connect', () => {
          resolve();
        });
      });
    });

    afterEach(() => {
      if (socket) {
        socket.close();
      }
    });

    test('should connect to WebSocket server', (done) => {
      expect(socket.connected).toBe(true);
      done();
    });

    test('should join and leave rooms', (done) => {
      socket.emit('join_room', 'test-room');
      
      setTimeout(() => {
        socket.emit('leave_room', 'test-room');
        done();
      }, 100);
    });

    test('should subscribe to process updates', (done) => {
      socket.emit('subscribe_process', 'proc_123');
      
      setTimeout(() => {
        done();
      }, 100);
    });

    test('should receive processes data on request', (done) => {
      socket.emit('request_processes');
      
      socket.once('processes_data', (data: any) => {
        expect(Array.isArray(data)).toBe(true);
        done();
      });
    });

    test('should receive tasks data on request', (done) => {
      socket.emit('request_tasks');
      
      socket.once('tasks_data', (data: any) => {
        expect(Array.isArray(data)).toBe(true);
        done();
      });
    });

    test('should receive metrics on request', (done) => {
      socket.emit('request_metrics');
      
      socket.once('system_metrics', (data: any) => {
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('processes');
        expect(data).toHaveProperty('tasks');
        done();
      });
    });

    test('should receive employee data on request', (done) => {
      socket.emit('request_employees');
      
      socket.once('employees_data', (data: any) => {
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(13);
        done();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles missing required fields in task creation', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          description: 'No title provided'
        });
      
      expect(response.status).toBe(400);
    });

    test('handles invalid employee ID', async () => {
      const response = await request(app).get('/api/employees/invalid-id');
      expect(response.status).toBe(404);
    });

    test('handles process not found', async () => {
      const response = await request(app).get('/api/processes/non-existent');
      expect(response.status).toBe(404);
    });

    test('limits request size', async () => {
      const largePayload = {
        title: 'Test',
        description: 'x'.repeat(11 * 1024 * 1024) // 11MB
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(largePayload);
      
      expect(response.status).toBe(413);
    });
  });

  describe('Performance and Load Tests', () => {
    test('handles concurrent requests', async () => {
      const requests = [];
      
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app).get('/api/agents')
        );
      }
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('responds within acceptable time', async () => {
      const start = Date.now();
      
      await request(app).get('/api/agents');
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200); // Should respond within 200ms
    });
  });
});