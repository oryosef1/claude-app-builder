import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WorkflowService } from './services/workflow-service';
import { FileService } from './services/file-service';
import { WebSocketService } from './services/websocket-service';
import { WorkflowController } from './controllers/workflow-controller';
import { TodoItem } from './types';

export function createApp(
  workflowService: WorkflowService,
  fileService: FileService,
  webSocketService: WebSocketService
): Express {
  const app = express();
  
  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Initialize controllers
  const workflowController = new WorkflowController(workflowService);

  // Workflow routes
  app.get('/api/workflow/status', (req, res) => workflowController.getStatus(req, res));
  app.post('/api/workflow/command', (req, res) => workflowController.executeCommand(req, res));
  app.get('/api/workflow/logs', (req, res) => workflowController.getLogs(req, res));
  app.delete('/api/workflow/logs', (req, res) => workflowController.clearLogs(req, res));

  // Todo routes
  app.get('/api/todos', async (req: Request, res: Response) => {
    try {
      const todos = await fileService.readTodos();
      res.json({
        success: true,
        data: todos,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  app.post('/api/todos', async (req: Request, res: Response) => {
    try {
      const { content, priority, status } = req.body;
      
      if (!content || content.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'Todo content is required',
          timestamp: new Date()
        });
        return;
      }

      const todos = await fileService.readTodos();
      const newTodo: TodoItem = {
        id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: content.trim(),
        priority: priority || 'medium',
        status: status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      todos.push(newTodo);
      await fileService.writeTodos(todos);

      // Broadcast todo update
      webSocketService.broadcastTodoUpdate({
        action: 'created',
        todo: newTodo
      });

      res.status(201).json({
        success: true,
        data: newTodo,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  app.put('/api/todos/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const todos = await fileService.readTodos();
      const todoIndex = todos.findIndex(t => t.id === id);

      if (todoIndex === -1) {
        res.status(404).json({
          success: false,
          error: 'Todo not found',
          timestamp: new Date()
        });
        return;
      }

      const updatedTodo = {
        ...todos[todoIndex],
        ...updates,
        updatedAt: new Date()
      };

      todos[todoIndex] = updatedTodo;
      await fileService.writeTodos(todos);

      res.json({
        success: true,
        data: updatedTodo,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  // JSON parse error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        success: false,
        error: 'Invalid JSON',
        timestamp: new Date()
      });
      return;
    }
    next(err);
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date()
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      timestamp: new Date()
    });
  });

  return app;
}