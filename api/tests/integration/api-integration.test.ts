import request from 'supertest';
import { createApp } from '@/app';
import { WorkflowService } from '@/services/workflow-service';
import { FileService } from '@/services/file-service';
import { WebSocketService } from '@/services/websocket-service';
import { Express } from 'express';

jest.mock('@/services/workflow-service');
jest.mock('@/services/file-service');
jest.mock('@/services/websocket-service');

describe('API Integration Tests', () => {
  let app: Express;
  let mockWorkflowService: jest.Mocked<WorkflowService>;
  let mockFileService: jest.Mocked<FileService>;
  let mockWebSocketService: jest.Mocked<WebSocketService>;

  beforeEach(() => {
    mockWorkflowService = {
      getStatus: jest.fn(),
      executeCommand: jest.fn(),
      getLogs: jest.fn(),
      clearLogs: jest.fn()
    } as any;

    mockFileService = {
      readTodos: jest.fn(),
      writeTodos: jest.fn(),
      readMemory: jest.fn(),
      writeMemory: jest.fn(),
      fileExists: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn()
    } as any;

    mockWebSocketService = {
      broadcast: jest.fn(),
      broadcastWorkflowStatus: jest.fn(),
      broadcastLogEntry: jest.fn(),
      broadcastTodoUpdate: jest.fn(),
      getClientCount: jest.fn(),
      close: jest.fn()
    } as any;

    app = createApp(mockWorkflowService, mockFileService, mockWebSocketService);
  });

  describe('GET /api/workflow/status', () => {
    it('should return workflow status', async () => {
      const mockStatus = {
        isRunning: true,
        currentPhase: 'test-writer',
        progress: 25,
        startTime: new Date()
      };

      mockWorkflowService.getStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/workflow/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          isRunning: true,
          currentPhase: 'test-writer',
          progress: 25
        }),
        timestamp: expect.any(String)
      });
    });

    it('should handle workflow service errors', async () => {
      mockWorkflowService.getStatus.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/workflow/status')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Service error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('POST /api/workflow/command', () => {
    it('should execute workflow start command', async () => {
      const command = { action: 'start', todoId: 'test-todo-1' };
      const mockStatus = {
        isRunning: true,
        currentPhase: 'test-writer',
        progress: 0,
        startTime: new Date()
      };

      mockWorkflowService.executeCommand.mockResolvedValue(mockStatus);

      const response = await request(app)
        .post('/api/workflow/command')
        .send(command)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          isRunning: true,
          currentPhase: 'test-writer'
        }),
        timestamp: expect.any(String)
      });
    });

    it('should validate command format', async () => {
      const invalidCommand = { action: 'invalid' };

      const response = await request(app)
        .post('/api/workflow/command')
        .send(invalidCommand)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid command action',
        timestamp: expect.any(String)
      });
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/workflow/command')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Command is required',
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/workflow/logs', () => {
    it('should return workflow logs with pagination', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          timestamp: new Date(),
          level: 'info' as const,
          message: 'Workflow started',
          phase: 'test-writer'
        },
        {
          id: 'log-2',
          timestamp: new Date(),
          level: 'debug' as const,
          message: 'Test created',
          phase: 'test-writer'
        }
      ];

      mockWorkflowService.getLogs.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/workflow/logs')
        .query({ page: 1, limit: 10, level: 'info' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'log-1',
            level: 'info',
            message: 'Workflow started'
          })
        ]),
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/workflow/logs')
        .query({ page: 'invalid' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid pagination parameters',
        timestamp: expect.any(String)
      });
    });
  });

  describe('DELETE /api/workflow/logs', () => {
    it('should clear workflow logs', async () => {
      mockWorkflowService.clearLogs.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/workflow/logs')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { cleared: true },
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/todos', () => {
    it('should return todos list', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          content: 'Test todo',
          priority: 'high' as const,
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockFileService.readTodos.mockResolvedValue(mockTodos);

      const response = await request(app)
        .get('/api/todos')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'todo-1',
            content: 'Test todo',
            priority: 'high',
            status: 'pending'
          })
        ]),
        timestamp: expect.any(String)
      });
    });
  });

  describe('POST /api/todos', () => {
    it('should create new todo', async () => {
      const newTodo = {
        content: 'New todo item',
        priority: 'high' as const,
        status: 'pending' as const
      };

      mockFileService.readTodos.mockResolvedValue([]);
      mockFileService.writeTodos.mockResolvedValue();

      const response = await request(app)
        .post('/api/todos')
        .send(newTodo)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          content: 'New todo item',
          priority: 'high',
          status: 'pending'
        }),
        timestamp: expect.any(String)
      });
    });

    it('should validate todo data', async () => {
      const invalidTodo = {
        content: '',
        priority: 'invalid'
      };

      const response = await request(app)
        .post('/api/todos')
        .send(invalidTodo)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Todo content is required',
        timestamp: expect.any(String)
      });
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update existing todo', async () => {
      const existingTodo = {
        id: 'todo-1',
        content: 'Original todo',
        priority: 'medium' as const,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updateData = {
        content: 'Updated todo',
        priority: 'high' as const,
        status: 'completed' as const
      };

      mockFileService.readTodos.mockResolvedValue([existingTodo]);
      mockFileService.writeTodos.mockResolvedValue();

      const response = await request(app)
        .put('/api/todos/todo-1')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 'todo-1',
          content: 'Updated todo',
          priority: 'high',
          status: 'completed'
        }),
        timestamp: expect.any(String)
      });
    });

    it('should handle non-existent todo', async () => {
      mockFileService.readTodos.mockResolvedValue([]);

      const response = await request(app)
        .put('/api/todos/non-existent')
        .send({ content: 'Updated' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Todo not found',
        timestamp: expect.any(String)
      });
    });
  });

  // DELETE /api/todos/:id endpoint not implemented yet

  // GET /api/memory endpoint not implemented yet

  // PUT /api/memory endpoint not implemented yet

  // GET /api/health endpoint not implemented yet

  describe('Error Handling', () => {
    it('should handle 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Endpoint not found',
        timestamp: expect.any(String)
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send('{"invalid": json}')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid JSON',
        timestamp: expect.any(String)
      });
    });
  });
});