import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { WorkflowIntegration } from '../../src/services/WorkflowIntegration';

// Mock all external dependencies for integration testing
vi.mock('child_process');
vi.mock('chokidar');
vi.mock('fs/promises');

describe('API Integration Tests', () => {
  let app: Express;
  let workflowIntegration: WorkflowIntegration;

  beforeEach(async () => {
    workflowIntegration = new WorkflowIntegration();
    await workflowIntegration.initialize();
    app = createApp(workflowIntegration);
  });

  afterEach(async () => {
    await workflowIntegration.cleanup();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memory');
    });
  });

  describe('Workflow Control', () => {
    it('should start workflow', async () => {
      const response = await request(app)
        .post('/api/workflow/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('running');
    });

    it('should stop workflow', async () => {
      // Start workflow first
      await request(app).post('/api/workflow/start');
      
      const response = await request(app)
        .post('/api/workflow/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('stopped');
    });

    it('should pause workflow', async () => {
      // Start workflow first
      await request(app).post('/api/workflow/start');
      
      const response = await request(app)
        .post('/api/workflow/pause')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('paused');
    });

    it('should resume workflow', async () => {
      // Start and pause workflow first
      await request(app).post('/api/workflow/start');
      await request(app).post('/api/workflow/pause');
      
      const response = await request(app)
        .post('/api/workflow/resume')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('running');
    });

    it('should handle invalid workflow actions', async () => {
      const response = await request(app)
        .post('/api/workflow/invalid-action')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Workflow Status', () => {
    it('should get workflow status', async () => {
      const response = await request(app)
        .get('/api/workflow/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('state');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memoryUsage');
      expect(response.body.data.state).toHaveProperty('phase');
      expect(response.body.data.state).toHaveProperty('status');
    });
  });

  describe('Task Management', () => {
    it('should get tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('completed');
      expect(Array.isArray(response.body.data.tasks)).toBe(true);
    });

    it('should create task', async () => {
      const newTask = {
        content: 'Test task',
        priority: 'medium'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(newTask)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.content).toBe('Test task');
      expect(response.body.data.priority).toBe('medium');
      expect(response.body.data.status).toBe('pending');
    });

    it('should validate task creation', async () => {
      const invalidTask = {
        content: '', // Empty content should fail
        priority: 'invalid'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(invalidTask)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should update task', async () => {
      // Create a task first
      const newTask = {
        content: 'Test task',
        priority: 'low'
      };

      const createResponse = await request(app)
        .post('/api/tasks')
        .send(newTask);

      const taskId = createResponse.body.data.id;

      const updateData = {
        status: 'completed',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.priority).toBe('high');
    });

    it('should handle updating non-existent task', async () => {
      const response = await request(app)
        .put('/api/tasks/non-existent-id')
        .send({ status: 'completed' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Task not found');
    });

    it('should get specific task', async () => {
      // Create a task first
      const newTask = {
        content: 'Specific test task',
        priority: 'high'
      };

      const createResponse = await request(app)
        .post('/api/tasks')
        .send(newTask);

      const taskId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.content).toBe('Specific test task');
    });
  });

  describe('Memory Management', () => {
    it('should get memory content', async () => {
      const response = await request(app)
        .get('/api/memory')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content');
      expect(typeof response.body.data.content).toBe('string');
    });

    it('should update memory content', async () => {
      const newContent = 'Updated memory content for testing';

      const response = await request(app)
        .put('/api/memory')
        .send({ content: newContent })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Memory updated successfully');
    });

    it('should validate memory content', async () => {
      const response = await request(app)
        .put('/api/memory')
        .send({ content: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Route not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS and Security', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });
});