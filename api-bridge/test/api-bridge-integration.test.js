import request from 'supertest';
import { describe, it, before, after } from 'node:test';
import assert from 'assert';
import { app } from '../server.js';

describe('API Bridge Integration Tests', () => {
  // Note: The server auto-starts when importing from server.js
  // We'll use the running instance on port 3002 or configured port
  
  describe('Health and Status Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.status, 'healthy');
      assert.ok(response.body.timestamp);
      assert.strictEqual(response.body.service, 'Corporate API Bridge');
    });
    
    it('should return system information', async () => {
      const response = await request(app).get('/system');
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.company);
      assert.ok(response.body.employees);
      assert.ok(response.body.departments);
      assert.ok(response.body.capacity);
    });
  });
  
  describe('Employee Management', () => {
    it('should return all 13 employees', async () => {
      const response = await request(app).get('/employees');
      
      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(response.body));
      assert.strictEqual(response.body.length, 13);
      
      // Verify employee structure
      const employee = response.body[0];
      assert.ok(employee.id);
      assert.ok(employee.name);
      assert.ok(employee.role);
      assert.ok(employee.department);
      assert.ok(Array.isArray(employee.skills));
    });
    
    it('should get specific employee by ID', async () => {
      const response = await request(app).get('/employees/emp_001');
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.id, 'emp_001');
      assert.strictEqual(response.body.name, 'Alex Project Manager');
    });
    
    it('should return 404 for non-existent employee', async () => {
      const response = await request(app).get('/employees/emp_999');
      
      assert.strictEqual(response.status, 404);
      assert.ok(response.body.error);
    });
    
    it('should filter employees by department', async () => {
      const response = await request(app).get('/employees?department=Development');
      
      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(response.body));
      response.body.forEach(emp => {
        assert.strictEqual(emp.department, 'Development');
      });
    });
    
    it('should filter employees by skill', async () => {
      const response = await request(app).get('/employees?skill=javascript');
      
      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(response.body));
      response.body.forEach(emp => {
        assert.ok(emp.skills.includes('javascript'));
      });
    });
  });
  
  describe('Performance Tracking', () => {
    it('should return performance metrics', async () => {
      const response = await request(app).get('/performance');
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.overall_metrics);
      assert.ok(response.body.department_metrics);
      assert.ok(response.body.employee_metrics);
    });
    
    it('should get individual employee performance', async () => {
      const response = await request(app).get('/performance/emp_001');
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.employee_id);
      assert.ok(response.body.metrics);
      assert.ok(response.body.recent_tasks);
    });
    
    it('should update performance metrics', async () => {
      const performanceUpdate = {
        task_id: 'test_task_123',
        employee_id: 'emp_001',
        score: 85,
        completion_time: 3600,
        complexity: 3
      };
      
      const response = await request(app)
        .post('/performance/update')
        .send(performanceUpdate);
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.success);
    });
  });
  
  describe('Task Management', () => {
    it('should create a new task', async () => {
      const newTask = {
        title: 'Integration Test Task',
        description: 'Test task for API Bridge integration',
        skills_required: ['testing', 'javascript'],
        priority: 'high'
      };
      
      const response = await request(app)
        .post('/tasks')
        .send(newTask);
      
      assert.strictEqual(response.status, 201);
      assert.ok(response.body.task_id);
      assert.strictEqual(response.body.status, 'created');
    });
    
    it('should assign task to employee', async () => {
      const assignment = {
        task_id: 'test_task_456',
        employee_id: 'emp_004',
        priority: 5
      };
      
      const response = await request(app)
        .post('/tasks/assign')
        .send(assignment);
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.assigned);
    });
    
    it('should get employee workload', async () => {
      const response = await request(app).get('/tasks/workload/emp_001');
      
      assert.strictEqual(response.status, 200);
      assert.ok(typeof response.body.current_tasks === 'number');
      assert.ok(typeof response.body.capacity === 'number');
      assert.ok(typeof response.body.utilization === 'number');
    });
  });
  
  describe('Workflow Integration', () => {
    it('should get available workflows', async () => {
      const response = await request(app).get('/workflows');
      
      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(response.body));
      assert.ok(response.body.length > 0);
      
      const workflow = response.body[0];
      assert.ok(workflow.name);
      assert.ok(workflow.description);
      assert.ok(Array.isArray(workflow.phases));
    });
    
    it('should route task to appropriate workflow', async () => {
      const task = {
        type: 'feature',
        complexity: 'high',
        description: 'Implement new dashboard feature'
      };
      
      const response = await request(app)
        .post('/workflows/route')
        .send(task);
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.workflow);
      assert.ok(response.body.assigned_employees);
    });
  });
  
  describe('Memory API Integration', () => {
    it('should check memory service health', async () => {
      const response = await request(app).get('/memory/health');
      
      // May fail if Memory API is not running
      assert.ok([200, 503].includes(response.status));
      
      if (response.status === 200) {
        assert.ok(response.body.status);
      } else {
        assert.ok(response.body.error);
      }
    });
    
    it('should proxy memory storage request', async () => {
      const memory = {
        employee_id: 'emp_001',
        content: 'API Bridge integration test memory',
        type: 'experience'
      };
      
      const response = await request(app)
        .post('/memory/store')
        .send(memory);
      
      // May fail if Memory API is not running or Pinecone issues
      assert.ok([200, 500, 503].includes(response.status));
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/tasks')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      assert.strictEqual(response.status, 400);
      assert.ok(response.body.error);
    });
    
    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ description: 'Missing title' });
      
      assert.strictEqual(response.status, 400);
      assert.ok(response.body.error);
    });
    
    it('should handle method not allowed', async () => {
      const response = await request(app).delete('/employees');
      
      assert.strictEqual(response.status, 405);
    });
  });
  
  describe('CORS and Security', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:8080');
      
      assert.ok(response.headers['access-control-allow-origin']);
      assert.ok(response.headers['access-control-allow-credentials']);
    });
    
    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/employees')
        .set('Origin', 'http://localhost:8080')
        .set('Access-Control-Request-Method', 'POST');
      
      assert.strictEqual(response.status, 204);
      assert.ok(response.headers['access-control-allow-methods']);
    });
  });
  
  describe('Performance and Load', () => {
    it('should handle concurrent requests', async () => {
      const promises = [];
      
      // Make 20 concurrent requests
      for (let i = 0; i < 20; i++) {
        promises.push(request(app).get('/employees'));
      }
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // All should succeed
      responses.forEach(res => {
        assert.strictEqual(res.status, 200);
      });
      
      // Should complete quickly (< 2 seconds for 20 requests)
      assert.ok(duration < 2000, `Took ${duration}ms`);
    });
    
    it('should cache employee data efficiently', async () => {
      // First request
      const start1 = Date.now();
      await request(app).get('/employees');
      const time1 = Date.now() - start1;
      
      // Second request (should be cached)
      const start2 = Date.now();
      await request(app).get('/employees');
      const time2 = Date.now() - start2;
      
      // Cached request should be significantly faster
      assert.ok(time2 < time1 / 2, `Cache not effective: ${time1}ms vs ${time2}ms`);
    });
  });
});