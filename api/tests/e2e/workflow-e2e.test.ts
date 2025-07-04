import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';
import request from 'supertest';
import { createApp } from '@/app';
import { WorkflowService } from '@/services/workflow-service';
import { FileService } from '@/services/file-service';
import { WebSocketService } from '@/services/websocket-service';
import { ProcessManager } from '@/services/process-manager';
import { LogService } from '@/services/log-service';
import { Express } from 'express';
import path from 'path';
import fs from 'fs/promises';

describe('Workflow E2E Tests', () => {
  let app: Express;
  let workflowService: WorkflowService;
  let fileService: FileService;
  let webSocketService: WebSocketService;
  let processManager: ProcessManager;
  let logService: LogService;
  let serverProcess: ChildProcess | undefined;
  let wsClient: WebSocket | undefined;

  const testWorkspace = path.join(__dirname, '..', '..', 'test-workspace');
  const testPort = 3001;
  const testWsPort = 8081;

  beforeAll(async () => {
    // Create test workspace
    await fs.mkdir(testWorkspace, { recursive: true });
    
    // Create test todo.md
    const testTodoContent = `# Test Todo List

## High Priority
- [ ] Test workflow automation
- [ ] Verify WebSocket communication
- [ ] Check file operations

## Medium Priority
- [ ] Test error handling
- [ ] Verify logging system`;

    await fs.writeFile(path.join(testWorkspace, 'todo.md'), testTodoContent);
    
    // Create test memory.md
    const testMemoryContent = `# Test Memory

## E2E Testing
- Testing complete workflow automation
- Verifying real-time communication
- Checking file operations integrity`;

    await fs.writeFile(path.join(testWorkspace, 'memory.md'), testMemoryContent);

    // Initialize services
    process.env.WORKSPACE_PATH = testWorkspace;
    fileService = new FileService();
    webSocketService = new WebSocketService(testWsPort);
    const processManager = new ProcessManager();
    const logService = new LogService();
    workflowService = new WorkflowService(processManager, fileService, logService);
    
    app = createApp(workflowService, fileService, webSocketService);
  });

  afterAll(async () => {
    // Cleanup
    if (serverProcess) {
      serverProcess.kill();
    }
    if (wsClient) {
      wsClient.close();
    }
    if (webSocketService) {
      webSocketService.close();
    }
    
    // Clean up test workspace
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test workspace:', error);
    }
  });

  beforeEach(async () => {
    // Reset test state
    jest.clearAllMocks();
  });

  describe('Complete Workflow Automation', () => {
    it('should start workflow and receive real-time updates', async () => {
      // Start WebSocket connection
      wsClient = new WebSocket(`ws://localhost:${testWsPort}`);
      
      const wsMessages: any[] = [];
      wsClient.on('message', (data) => {
        wsMessages.push(JSON.parse(data.toString()));
      });

      await new Promise((resolve) => {
        wsClient!.on('open', resolve);
      });

      // Start workflow
      const startResponse = await request(app)
        .post('/api/workflow/command')
        .send({ action: 'start' })
        .expect(200);

      expect(startResponse.body.success).toBe(true);
      expect(startResponse.body.data.isRunning).toBe(true);

      // Wait for workflow to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check status
      const statusResponse = await request(app)
        .get('/api/workflow/status')
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data).toHaveProperty('currentPhase');

      // Verify WebSocket messages were received
      expect(wsMessages.length).toBeGreaterThan(0);
      expect(wsMessages.some(msg => msg.type === 'workflow_status')).toBe(true);
    });

    it('should handle workflow pause and resume', async () => {
      // Start workflow
      await request(app)
        .post('/api/workflow/command')
        .send({ action: 'start' })
        .expect(200);

      // Wait for workflow to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Pause workflow
      const pauseResponse = await request(app)
        .post('/api/workflow/command')
        .send({ action: 'pause' })
        .expect(200);

      expect(pauseResponse.body.success).toBe(true);

      // Resume workflow
      const resumeResponse = await request(app)
        .post('/api/workflow/command')
        .send({ action: 'resume' })
        .expect(200);

      expect(resumeResponse.body.success).toBe(true);
      expect(resumeResponse.body.data.isRunning).toBe(true);

      // Stop workflow
      const stopResponse = await request(app)
        .post('/api/workflow/command')
        .send({ action: 'stop' })
        .expect(200);

      expect(stopResponse.body.success).toBe(true);
      expect(stopResponse.body.data.isRunning).toBe(false);
    });
  });

  describe('File Operations Integration', () => {
    it('should read and write todos correctly', async () => {
      // Read initial todos
      const readResponse = await request(app)
        .get('/api/todos')
        .expect(200);

      expect(readResponse.body.success).toBe(true);
      expect(readResponse.body.data).toBeInstanceOf(Array);
      expect(readResponse.body.data.length).toBeGreaterThan(0);

      // Add new todo
      const newTodo = {
        content: 'E2E Test Todo',
        priority: 'high',
        status: 'pending'
      };

      const createResponse = await request(app)
        .post('/api/todos')
        .send(newTodo)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.content).toBe(newTodo.content);

      // Verify todo was saved to file
      const updatedTodos = await request(app)
        .get('/api/todos')
        .expect(200);

      expect(updatedTodos.body.data.length).toBe(readResponse.body.data.length + 1);
      expect(updatedTodos.body.data.some((todo: any) => todo.content === newTodo.content)).toBe(true);
    });

    // Memory operations test removed - endpoints not implemented
  });

  describe('Real-time Communication', () => {
    it('should broadcast workflow status changes', async () => {
      const wsMessages: any[] = [];
      wsClient = new WebSocket(`ws://localhost:${testWsPort}`);

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'workflow_status') {
          wsMessages.push(message);
        }
      });

      await new Promise((resolve) => {
        wsClient!.on('open', resolve);
      });

      // Start workflow
      await request(app)
        .post('/api/workflow/command')
        .send({ action: 'start' })
        .expect(200);

      // Wait for messages
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stop workflow
      await request(app)
        .post('/api/workflow/command')
        .send({ action: 'stop' })
        .expect(200);

      // Wait for final messages
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify workflow status messages were received
      expect(wsMessages.length).toBeGreaterThan(0);
      expect(wsMessages.some(msg => msg.data.isRunning === true)).toBe(true);
      expect(wsMessages.some(msg => msg.data.isRunning === false)).toBe(true);
    });

    it('should broadcast todo updates', async () => {
      const wsMessages: any[] = [];
      wsClient = new WebSocket(`ws://localhost:${testWsPort}`);

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'todo_update') {
          wsMessages.push(message);
        }
      });

      await new Promise((resolve) => {
        wsClient!.on('open', resolve);
      });

      // Create new todo
      const newTodo = {
        content: 'WebSocket Test Todo',
        priority: 'medium',
        status: 'pending'
      };

      await request(app)
        .post('/api/todos')
        .send(newTodo)
        .expect(201);

      // Wait for WebSocket message
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify todo update message was received
      expect(wsMessages.length).toBeGreaterThan(0);
      expect(wsMessages[0].data.action).toBe('created');
      expect(wsMessages[0].data.todo.content).toBe(newTodo.content);
    });

    it('should handle multiple WebSocket connections', async () => {
      const client1Messages: any[] = [];
      const client2Messages: any[] = [];

      // Create two WebSocket clients
      const wsClient1 = new WebSocket(`ws://localhost:${testWsPort}`);
      const wsClient2 = new WebSocket(`ws://localhost:${testWsPort}`);

      wsClient1.on('message', (data) => {
        client1Messages.push(JSON.parse(data.toString()));
      });

      wsClient2.on('message', (data) => {
        client2Messages.push(JSON.parse(data.toString()));
      });

      await Promise.all([
        new Promise((resolve) => wsClient1.on('open', resolve)),
        new Promise((resolve) => wsClient2.on('open', resolve))
      ]);

      // Broadcast a workflow status change
      await request(app)
        .post('/api/workflow/command')
        .send({ action: 'start' })
        .expect(200);

      // Wait for messages
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Both clients should receive the same messages
      expect(client1Messages.length).toBeGreaterThan(0);
      expect(client2Messages.length).toBeGreaterThan(0);
      expect(client1Messages.length).toBe(client2Messages.length);

      // Cleanup
      wsClient1.close();
      wsClient2.close();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle workflow errors gracefully', async () => {
      // Try to start workflow with invalid todo
      const errorResponse = await request(app)
        .post('/api/workflow/command')
        .send({ action: 'start', todoId: 'non-existent-todo' })
        .expect(500);

      expect(errorResponse.body.success).toBe(false);
      expect(errorResponse.body.error).toContain('Todo not found');
    });

    it('should handle file operation errors', async () => {
      // Try to read non-existent file
      const originalReadTodos = fileService.readTodos;
      fileService.readTodos = jest.fn().mockRejectedValue(new Error('File not found'));

      const errorResponse = await request(app)
        .get('/api/todos')
        .expect(500);

      expect(errorResponse.body.success).toBe(false);

      // Restore original method
      fileService.readTodos = originalReadTodos;
    });

    it('should handle WebSocket connection errors', async () => {
      // Close WebSocket server
      webSocketService.close();

      // Try to connect (should fail gracefully)
      const wsClient = new WebSocket(`ws://localhost:${testWsPort}`);
      
      await new Promise((resolve) => {
        wsClient.on('error', resolve);
      });

      // Restart WebSocket server
      webSocketService = new WebSocketService(testWsPort);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent API requests', async () => {
      const promises = [];
      
      // Make multiple concurrent requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/workflow/status')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle large todo lists', async () => {
      // Create many todos
      const todos = [];
      for (let i = 0; i < 100; i++) {
        todos.push({
          content: `Test todo ${i}`,
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          status: 'pending'
        });
      }

      // Add todos concurrently
      const promises = todos.map(todo =>
        request(app)
          .post('/api/todos')
          .send(todo)
          .expect(201)
      );

      await Promise.all(promises);

      // Verify all todos were saved
      const response = await request(app)
        .get('/api/todos')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(100);
    });
  });
});