import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Server } from 'http';

describe('Dashboard API Integration Tests', () => {
  let server: Server;
  let app: any;

  beforeAll(async () => {
    // Import and start server
    const { app: application } = await import('../../src/api/server');
    app = application;
    server = app.listen(0); // Random port
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'AI Dashboard Backend');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Employee Endpoints', () => {
    it('should get all employees', async () => {
      const response = await request(app).get('/api/employees');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(13);
    });

    it('should get employee by ID', async () => {
      const response = await request(app).get('/api/employees/emp_001');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 'emp_001');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('role');
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app).get('/api/employees/invalid_id');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should get employees by department', async () => {
      const response = await request(app).get('/api/employees/department/Development');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((emp: any) => {
        expect(emp.department).toBe('Development');
      });
    });

    it('should get available employees', async () => {
      const response = await request(app).get('/api/employees/available');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((emp: any) => {
        expect(emp.status).toBe('active');
        expect(emp.workload).toBeLessThan(80);
      });
    });

    it('should update employee status', async () => {
      const response = await request(app)
        .put('/api/employees/emp_002/status')
        .send({ status: 'busy' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should reject invalid status update', async () => {
      const response = await request(app)
        .put('/api/employees/emp_002/status')
        .send({ status: 'invalid_status' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Task Endpoints', () => {
    let taskId: string;

    it('should create a new task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          description: 'A test task',
          skillsRequired: ['JavaScript', 'Testing'],
          priority: 'medium',
          estimatedDuration: 3600000
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('status', 'pending');
      
      taskId = response.body.data.id;
    });

    it('should get all tasks', async () => {
      const response = await request(app).get('/api/tasks');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should get task by ID', async () => {
      const response = await request(app).get(`/api/tasks/${taskId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', taskId);
    });

    it('should assign task to employee', async () => {
      const response = await request(app)
        .post(`/api/tasks/${taskId}/assign`)
        .send({ employeeId: 'emp_004' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('assigned');
    });

    it('should get tasks by status', async () => {
      const response = await request(app).get('/api/tasks/status/pending');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should get task statistics', async () => {
      const response = await request(app).get('/api/tasks/stats');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('completed');
    });
  });

  describe('Department Endpoints', () => {
    it('should get all departments', async () => {
      const response = await request(app).get('/api/departments');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toContain('Executive');
      expect(response.body.data).toContain('Development');
    });

    it('should get department statistics', async () => {
      const response = await request(app).get('/api/departments/stats');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('Executive');
      expect(response.body.data).toHaveProperty('Development');
      expect(response.body.data.Development).toHaveProperty('avgWorkload');
      expect(response.body.data.Development).toHaveProperty('totalEmployees');
    });
  });

  describe('WebSocket Events', () => {
    it('should support WebSocket connections', async () => {
      const response = await request(app).get('/socket.io/');
      
      // Socket.io returns HTML/JS for polling fallback
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown');
      
      expect(response.status).toBe(404);
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ 
          // Missing required fields
          description: 'Invalid task'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send('{ invalid json');
      
      expect(response.status).toBe(400);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/employees')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');
      
      expect(response.status).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      // Make many requests quickly
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(request(app).get('/api/health'));
      }
      
      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);
      
      expect(rateLimited).toBe(true);
    }, 10000); // Increase timeout for this test
  });

  describe('Memory API Integration', () => {
    it('should get memory context for employee', async () => {
      const response = await request(app)
        .post('/api/memory/context')
        .send({
          employeeId: 'emp_004',
          query: 'How to implement authentication',
          options: { topK: 5 }
        });
      
      // This would fail if Memory API is not running
      // For now, we just check the endpoint exists
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Performance Metrics', () => {
    it('should get employee performance metrics', async () => {
      const response = await request(app).get('/api/employees/emp_001/metrics');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tasksCompleted');
      expect(response.body.data).toHaveProperty('currentWorkload');
    });
  });

  describe('Batch Operations', () => {
    it('should assign multiple tasks to a team', async () => {
      // First create some tasks
      const task1 = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Team Task 1',
          description: 'First team task',
          skillsRequired: ['JavaScript'],
          priority: 'high'
        });
      
      const task2 = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Team Task 2',
          description: 'Second team task',
          skillsRequired: ['TypeScript'],
          priority: 'medium'
        });
      
      const response = await request(app)
        .post('/api/tasks/assign-team')
        .send({
          taskIds: [task1.body.data.id, task2.body.data.id],
          teamRequirements: {
            skills: ['JavaScript', 'TypeScript'],
            teamSize: 2
          }
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });
});