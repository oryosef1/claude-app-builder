import { Request, Response } from 'express';
import { WorkflowService } from '../services/workflow-service';
import { WorkflowCommand, ApiResponse, WorkflowStatus, LogEntry } from '../types';

export class WorkflowController {
  constructor(private workflowService: WorkflowService) {}

  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.workflowService.getStatus();
      const response: ApiResponse<WorkflowStatus> = {
        success: true,
        data: status,
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

  async executeCommand(req: Request, res: Response): Promise<void> {
    try {
      const command = req.body as WorkflowCommand;
      
      // Validate command action
      const validActions = ['start', 'stop', 'pause', 'resume'];
      if (!validActions.includes(command.action)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid command action',
          timestamp: new Date()
        };
        res.status(400).json(response);
        return;
      }

      const status = await this.workflowService.executeCommand(command);
      const response: ApiResponse<WorkflowStatus> = {
        success: true,
        data: status,
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

  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const level = req.query.level as string;

      // Validate pagination parameters
      if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid pagination parameters',
          timestamp: new Date()
        };
        res.status(400).json(response);
        return;
      }

      const logs = await this.workflowService.getLogs({
        page,
        limit,
        level: level as 'info' | 'warn' | 'error' | 'debug'
      });

      const response: ApiResponse<LogEntry[]> = {
        success: true,
        data: logs,
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

  async clearLogs(req: Request, res: Response): Promise<void> {
    try {
      await this.workflowService.clearLogs();
      const response: ApiResponse<{ cleared: boolean }> = {
        success: true,
        data: { cleared: true },
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