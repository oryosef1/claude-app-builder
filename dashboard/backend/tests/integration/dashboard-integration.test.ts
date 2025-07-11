import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Server } from 'http';
import { io as ioClient, Socket } from 'socket.io-client';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('Dashboard Backend Integration Tests', () => {
  let server: Server;
  let app: any;
  let apiProcess: ChildProcess;
  const PORT = 8081; // Different port to avoid conflicts
  
  beforeAll(async () => {
    // Start the dashboard backend
    process.env['PORT'] = PORT.toString();
    
    // Import and start the server
    const serverModule = await import('../../src/index');
    app = serverModule.default;
    server = serverModule.server;
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Close server
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    
    // Kill any spawned processes
    if (apiProcess) {
      apiProcess.kill();
    }
  });

  describe('API Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        uptime: expect.any(Number),
        services: expect.any(Object)
      });
    });

    it('should return system metrics', async () => {
      const response = await request(app).get('/api/metrics');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        cpu: expect.any(Number),
        memory: expect.any(Object),
        uptime: expect.any(Number)
      });
    });

    it('should list all agents', async () => {
      const response = await request(app).get('/api/agents');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(13); // 13 AI employees
      expect(response.body[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        role: expect.any(String),
        department: expect.any(String)
      });
    });

    it('should get specific agent details', async () => {
      const response = await request(app).get('/api/agents/emp_001');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'emp_001',
        name: expect.any(String),
        skills: expect.any(Array)
      });
    });

    it('should handle non-existent agent', async () => {
      const response = await request(app).get('/api/agents/emp_999');
      expect(response.status).toBe(404);
    });
  });

  describe('Process Management', () => {
    it('should spawn a new process', async () => {
      const response = await request(app)
        .post('/api/processes/spawn')
        .send({
          role: 'developer',
          systemPrompt: 'Test system prompt',
          task: 'Test task'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        role: 'developer',
        status: 'running'
      });
      
      // Clean up - stop the process
      const processId = response.body.id;
      await request(app).post(`/api/processes/${processId}/stop`);
    });

    it('should list running processes', async () => {
      const response = await request(app).get('/api/processes');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should handle process errors gracefully', async () => {
      const response = await request(app)
        .post('/api/processes/spawn')
        .send({
          role: 'invalid_role',
          systemPrompt: '',
          task: ''
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Task Queue Integration', () => {
    it('should add task to queue', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Integration Test Task',
          description: 'Test task for integration testing',
          priority: 5,
          requiredSkills: ['testing', 'javascript']
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        title: 'Integration Test Task',
        status: 'pending'
      });
    });

    it('should get task status', async () => {
      // First create a task
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Status Test Task',
          description: 'Test task status',
          priority: 3
        });
      
      const taskId = createResponse.body.id;
      
      // Get task status
      const statusResponse = await request(app).get(`/api/tasks/${taskId}`);
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body).toMatchObject({
        id: taskId,
        status: expect.any(String)
      });
    });

    it('should assign task to best agent', async () => {
      const response = await request(app)
        .post('/api/tasks/assign')
        .send({
          title: 'Coding Task',
          description: 'Implement new feature',
          requiredSkills: ['javascript', 'typescript']
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        task: expect.any(Object),
        assignedTo: expect.any(String),
        reason: expect.any(String)
      });
    });
  });

  describe('WebSocket Integration', () => {
    let socket: Socket;
    
    beforeAll((done) => {
      socket = ioClient(`http://localhost:${PORT}`);
      socket.on('connect', done);
    });

    afterAll(() => {
      if (socket) socket.disconnect();
    });

    it('should receive system metrics via WebSocket', (done) => {
      socket.on('metrics', (data: any) => {
        expect(data).toMatchObject({
          cpu: expect.any(Number),
          memory: expect.any(Object),
          timestamp: expect.any(Number)
        });
        done();
      });
      
      // Request metrics
      socket.emit('request-metrics');
    });

    it('should receive process updates', (done) => {
      socket.on('process-update', (data: any) => {
        expect(data).toMatchObject({
          id: expect.any(String),
          status: expect.any(String)
        });
        done();
      });
      
      // Spawn a process to trigger update
      request(app)
        .post('/api/processes/spawn')
        .send({
          role: 'developer',
          systemPrompt: 'Test',
          task: 'WebSocket test'
        })
        .then((res: any) => {
          // Stop process after test
          setTimeout(() => {
            request(app).post(`/api/processes/${res.body.id}/stop`).send();
          }, 1000);
        });
    });

    it('should handle room subscriptions', (done) => {
      const testRoom = 'test-room';
      
      socket.emit('join-room', testRoom);
      
      socket.on('room-joined', (room: string) => {
        expect(room).toBe(testRoom);
        done();
      });
    });
  });

  describe('Error Handling and Validation', () => {
    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          // Missing required fields
          priority: 5
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle server errors gracefully', async () => {
      // Force an error by sending invalid data
      const response = await request(app)
        .post('/api/processes/spawn')
        .send({
          role: null,
          systemPrompt: null
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should enforce rate limiting', async () => {
      // Make many requests quickly
      const promises = Array(20).fill(null).map(() => 
        request(app).get('/api/metrics')
      );
      
      const responses = await Promise.all(promises);
      const rateLimited = responses.some((r: any) => r.status === 429);
      
      // Should have some rate limited responses
      expect(rateLimited).toBe(true);
    });
  });

  describe('Integration with External Services', () => {
    it('should check Memory API connectivity', async () => {
      const response = await request(app).get('/api/services/memory/health');
      
      // It's OK if it fails - we're testing the integration endpoint exists
      expect([200, 503]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('status');
      } else {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should check API Bridge connectivity', async () => {
      const response = await request(app).get('/api/services/api-bridge/health');
      
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const startTime = Date.now();
      
      // Make 10 concurrent requests
      const promises = Array(10).fill(null).map(() => 
        request(app).get('/api/agents')
      );
      
      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // All should succeed
      responses.forEach((r: any) => expect(r.status).toBe(200));
      
      // Should complete in reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000);
    });

    it('should handle large payload', async () => {
      const largeTask = {
        title: 'Large Task',
        description: 'x'.repeat(10000), // 10KB description
        priority: 5,
        metadata: Array(100).fill({ key: 'value' })
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(largeTask);
      
      // Should handle gracefully (either accept or reject with proper error)
      expect([201, 400, 413]).toContain(response.status);
    });
  });
});