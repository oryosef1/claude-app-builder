import { Request, Response } from 'express';
import { FileService } from '../services/file-service';
import { ApiResponse, TodoItem } from '../types';

export class FileController {
  constructor(private fileService: FileService) {}

  async getTodos(req: Request, res: Response): Promise<void> {
    try {
      const todos = await this.fileService.readTodoFile();
      const response: ApiResponse<{ todos: TodoItem[] }> = {
        success: true,
        data: { todos },
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  async saveTodos(req: Request, res: Response): Promise<void> {
    try {
      const { todos } = req.body;
      
      if (!Array.isArray(todos)) {
        const response: ApiResponse = {
          success: false,
          error: 'Todos must be an array',
          timestamp: new Date()
        };
        res.status(400).json(response);
        return;
      }

      await this.fileService.writeTodoFile(todos);
      const response: ApiResponse<{ saved: boolean }> = {
        success: true,
        data: { saved: true },
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  async addTodo(req: Request, res: Response): Promise<void> {
    try {
      const { content, priority } = req.body;
      
      if (!content || typeof content !== 'string') {
        const response: ApiResponse = {
          success: false,
          error: 'Content is required and must be a string',
          timestamp: new Date()
        };
        res.status(400).json(response);
        return;
      }

      const todo = await this.fileService.addTodo(content, priority);
      const response: ApiResponse<{ todo: TodoItem }> = {
        success: true,
        data: { todo },
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  async updateTodo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const todo = await this.fileService.updateTodo(id, updates);
      const response: ApiResponse<{ todo: TodoItem }> = {
        success: true,
        data: { todo },
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      res.status(404).json(response);
    }
  }

  async deleteTodo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await this.fileService.deleteTodo(id);
      const response: ApiResponse<{ deleted: boolean }> = {
        success: true,
        data: { deleted: true },
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      res.status(404).json(response);
    }
  }

  async getMemory(req: Request, res: Response): Promise<void> {
    try {
      const content = await this.fileService.readMemoryFile();
      const response: ApiResponse<{ content: string }> = {
        success: true,
        data: { content },
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  async updateMemory(req: Request, res: Response): Promise<void> {
    try {
      const { content } = req.body;
      
      if (typeof content !== 'string') {
        const response: ApiResponse = {
          success: false,
          error: 'Content must be a string',
          timestamp: new Date()
        };
        res.status(400).json(response);
        return;
      }

      await this.fileService.writeMemoryFile(content);
      const response: ApiResponse<{ updated: boolean }> = {
        success: true,
        data: { updated: true },
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }

  async backupFiles(req: Request, res: Response): Promise<void> {
    try {
      const backupInfo = await this.fileService.backupFiles();
      const response: ApiResponse<typeof backupInfo> = {
        success: true,
        data: backupInfo,
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      res.status(500).json(response);
    }
  }
}