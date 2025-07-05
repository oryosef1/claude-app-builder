import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { WorkflowIntegration } from '../../src/services/WorkflowIntegration';

// Mock external dependencies for E2E testing
vi.mock('child_process');
vi.mock('chokidar');
vi.mock('fs/promises');

describe('E2E Workflow Tests', () => {
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

  describe('Complete Workflow Scenario', () => {
    it('should handle complete workflow lifecycle', async () => {
      // 1. Check initial status
      const initialStatus = await request(app)
        .get('/api/workflow/status')
        .expect(200);

      expect(initialStatus.body.data.state.status).toBe('stopped');

      // 2. Start workflow
      const startResponse = await request(app)
        .post('/api/workflow/start')
        .expect(200);

      expect(startResponse.body.data.status).toBe('running');

      // 3. Check running status
      const runningStatus = await request(app)
        .get('/api/workflow/status')
        .expect(200);

      expect(runningStatus.body.data.state.status).toBe('running');

      // 4. Pause workflow
      const pauseResponse = await request(app)
        .post('/api/workflow/pause')
        .expect(200);

      expect(pauseResponse.body.data.status).toBe('paused');

      // 5. Resume workflow
      const resumeResponse = await request(app)
        .post('/api/workflow/resume')
        .expect(200);

      expect(resumeResponse.body.data.status).toBe('running');

      // 6. Stop workflow
      const stopResponse = await request(app)
        .post('/api/workflow/stop')
        .expect(200);

      expect(stopResponse.body.data.status).toBe('stopped');

      // 7. Final status check
      const finalStatus = await request(app)
        .get('/api/workflow/status')
        .expect(200);

      expect(finalStatus.body.data.state.status).toBe('stopped');
    });

    it('should handle workflow with task management', async () => {
      // 1. Create initial tasks
      const task1 = await request(app)
        .post('/api/tasks')
        .send({
          content: 'Write comprehensive tests',
          priority: 'high'
        })
        .expect(201);

      const task2 = await request(app)
        .post('/api/tasks')
        .send({
          content: 'Implement API endpoints',
          priority: 'medium'
        })
        .expect(201);

      // 2. Check task list
      const taskList = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(taskList.body.data.tasks.length).toBeGreaterThanOrEqual(2);
      expect(taskList.body.data.pending).toBeGreaterThanOrEqual(2);

      // 3. Start workflow
      await request(app)
        .post('/api/workflow/start')
        .expect(200);

      // 4. Update task status (simulate workflow progress)
      await request(app)
        .put(`/api/tasks/${task1.body.data.id}`)
        .send({
          status: 'in_progress'
        })
        .expect(200);

      // 5. Check updated task
      const updatedTask = await request(app)
        .get(`/api/tasks/${task1.body.data.id}`)
        .expect(200);

      expect(updatedTask.body.data.status).toBe('in_progress');

      // 6. Complete task
      await request(app)
        .put(`/api/tasks/${task1.body.data.id}`)
        .send({
          status: 'completed'
        })
        .expect(200);

      // 7. Check final task list
      const finalTaskList = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(finalTaskList.body.data.completed).toBeGreaterThanOrEqual(1);

      // 8. Stop workflow
      await request(app)
        .post('/api/workflow/stop')
        .expect(200);
    });

    it('should handle memory operations during workflow', async () => {
      // 1. Get initial memory content
      const initialMemory = await request(app)
        .get('/api/memory')
        .expect(200);

      const originalContent = initialMemory.body.data.content || '# Initial Memory';

      // 2. Update memory content
      const newContent = `${originalContent}\n\n## Test Session\nRunning E2E tests for workflow integration`;

      await request(app)
        .put('/api/memory')
        .send({ content: newContent })
        .expect(200);

      // 3. Verify memory update
      const updatedMemory = await request(app)
        .get('/api/memory')
        .expect(200);

      expect(updatedMemory.body.data.content).toBeDefined();
      expect(updatedMemory.body.data.content).toContain('Test Session');

      // 4. Start workflow with updated memory
      await request(app)
        .post('/api/workflow/start')
        .expect(200);

      // 5. Check workflow status
      const status = await request(app)
        .get('/api/workflow/status')
        .expect(200);

      expect(status.body.data.state.status).toBe('running');

      // 6. Stop workflow
      await request(app)
        .post('/api/workflow/stop')
        .expect(200);

      // 7. Restore original memory content
      await request(app)
        .put('/api/memory')
        .send({ content: originalContent })
        .expect(200);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle workflow errors gracefully', async () => {
      // 1. Start workflow
      await request(app)
        .post('/api/workflow/start')
        .expect(200);

      // 2. Attempt to start again (should fail)
      const doubleStartResponse = await request(app)
        .post('/api/workflow/start')
        .expect(400);

      expect(doubleStartResponse.body.success).toBe(false);
      expect(doubleStartResponse.body.error).toBeDefined();

      // 3. Stop workflow
      await request(app)
        .post('/api/workflow/stop')
        .expect(200);

      // 4. Attempt to stop again (should fail)
      const doubleStopResponse = await request(app)
        .post('/api/workflow/stop')
        .expect(400);

      expect(doubleStopResponse.body.success).toBe(false);
      expect(doubleStopResponse.body.error).toBeDefined();
    });

    it('should handle invalid task operations', async () => {
      // 1. Try to get non-existent task
      const nonExistentTask = await request(app)
        .get('/api/tasks/invalid-id')
        .expect(404);

      expect(nonExistentTask.body.success).toBe(false);

      // 2. Try to update non-existent task
      const updateNonExistent = await request(app)
        .put('/api/tasks/invalid-id')
        .send({ status: 'completed' })
        .expect(404);

      expect(updateNonExistent.body.success).toBe(false);

      // 3. Try to create task with invalid data
      const invalidTask = await request(app)
        .post('/api/tasks')
        .send({
          content: '',
          priority: 'invalid-priority'
        })
        .expect(400);

      expect(invalidTask.body.success).toBe(false);
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = [];

      // Create multiple tasks concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/tasks')
            .send({
              content: `Concurrent task ${i}`,
              priority: 'medium'
            })
        );
      }

      const results = await Promise.all(promises);
      
      // All requests should succeed
      results.forEach((result: any) => {
        expect(result.status).toBe(201);
        expect(result.body.success).toBe(true);
      });

      // Check that all tasks were created
      const taskList = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(taskList.body.data.tasks.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle rapid workflow state changes', async () => {
      // Rapid start/stop cycles
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/workflow/start')
          .expect(200);

        await request(app)
          .post('/api/workflow/stop')
          .expect(200);
      }

      // Final state should be stopped
      const finalStatus = await request(app)
        .get('/api/workflow/status')
        .expect(200);

      expect(finalStatus.body.data.state.status).toBe('stopped');
    });
  });

  describe('Health and Monitoring', () => {
    it('should provide consistent health checks during workflow', async () => {
      // Check health before workflow
      const healthBefore = await request(app)
        .get('/api/health')
        .expect(200);

      expect(healthBefore.body.data.status).toBe('healthy');

      // Start workflow
      await request(app)
        .post('/api/workflow/start')
        .expect(200);

      // Check health during workflow
      const healthDuring = await request(app)
        .get('/api/health')
        .expect(200);

      expect(healthDuring.body.data.status).toBe('healthy');

      // Stop workflow
      await request(app)
        .post('/api/workflow/stop')
        .expect(200);

      // Check health after workflow
      const healthAfter = await request(app)
        .get('/api/health')
        .expect(200);

      expect(healthAfter.body.data.status).toBe('healthy');
    });

    it('should track memory usage over time', async () => {
      const memoryReadings = [];

      // Take multiple memory readings
      for (let i = 0; i < 3; i++) {
        const status = await request(app)
          .get('/api/workflow/status')
          .expect(200);

        memoryReadings.push(status.body.data.memoryUsage);
        
        // Create some tasks to use memory
        await request(app)
          .post('/api/tasks')
          .send({
            content: `Memory test task ${i}`,
            priority: 'low'
          });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Memory readings should be consistent and reasonable
      memoryReadings.forEach(reading => {
        expect(reading).toHaveProperty('heapUsed');
        expect(reading).toHaveProperty('heapTotal');
        expect(reading).toHaveProperty('external');
        expect(reading).toHaveProperty('arrayBuffers');
        expect(typeof reading.heapUsed).toBe('number');
        expect(reading.heapUsed).toBeGreaterThan(0);
      });
    });
  });
});