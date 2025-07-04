import { WorkflowController } from '@/controllers/workflow-controller';
import { WorkflowService } from '@/services/workflow-service';
import { WorkflowStatus, WorkflowCommand } from '@/types';

jest.mock('@/services/workflow-service');

describe('WorkflowController', () => {
  let controller: WorkflowController;
  let mockWorkflowService: jest.Mocked<WorkflowService>;

  beforeEach(() => {
    mockWorkflowService = new WorkflowService() as jest.Mocked<WorkflowService>;
    controller = new WorkflowController(mockWorkflowService);
  });

  describe('getStatus', () => {
    it('should return current workflow status', async () => {
      const mockStatus: WorkflowStatus = {
        isRunning: true,
        currentPhase: 'test-writer',
        progress: 25,
        startTime: new Date()
      };

      mockWorkflowService.getStatus.mockResolvedValue(mockStatus);

      const req = {} as any;
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.getStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus,
        timestamp: expect.any(Date)
      });
    });

    it('should handle workflow service errors', async () => {
      const error = new Error('Service unavailable');
      mockWorkflowService.getStatus.mockRejectedValue(error);

      const req = {} as any;
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.getStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Service unavailable',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('executeCommand', () => {
    it('should start workflow with valid command', async () => {
      const command: WorkflowCommand = {
        action: 'start',
        todoId: 'test-todo-1'
      };

      const mockStatus: WorkflowStatus = {
        isRunning: true,
        currentPhase: 'test-writer',
        progress: 0,
        startTime: new Date()
      };

      mockWorkflowService.executeCommand.mockResolvedValue(mockStatus);

      const req = { body: command } as any;
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.executeCommand(req, res);

      expect(mockWorkflowService.executeCommand).toHaveBeenCalledWith(command);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus,
        timestamp: expect.any(Date)
      });
    });

    it('should stop workflow successfully', async () => {
      const command: WorkflowCommand = { action: 'stop' };

      const mockStatus: WorkflowStatus = {
        isRunning: false,
        currentPhase: 'stopped',
        progress: 0,
        endTime: new Date()
      };

      mockWorkflowService.executeCommand.mockResolvedValue(mockStatus);

      const req = { body: command } as any;
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.executeCommand(req, res);

      expect(mockWorkflowService.executeCommand).toHaveBeenCalledWith(command);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus,
        timestamp: expect.any(Date)
      });
    });

    it('should validate command format', async () => {
      const invalidCommand = { action: 'invalid' };

      const req = { body: invalidCommand } as any;
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.executeCommand(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid command action',
        timestamp: expect.any(Date)
      });
    });

    it('should handle workflow execution errors', async () => {
      const command: WorkflowCommand = { action: 'start' };
      const error = new Error('Workflow failed to start');

      mockWorkflowService.executeCommand.mockRejectedValue(error);

      const req = { body: command } as any;
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.executeCommand(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Workflow failed to start',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('getLogs', () => {
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
          message: 'Test file created',
          phase: 'test-writer'
        }
      ];

      mockWorkflowService.getLogs.mockResolvedValue(mockLogs);

      const req = {
        query: { page: '1', limit: '10', level: 'info' }
      } as any;
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.getLogs(req, res);

      expect(mockWorkflowService.getLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        level: 'info'
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockLogs,
        timestamp: expect.any(Date)
      });
    });

    it('should handle invalid pagination parameters', async () => {
      const req = {
        query: { page: 'invalid', limit: '10' }
      } as any;
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.getLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid pagination parameters',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('clearLogs', () => {
    it('should clear workflow logs successfully', async () => {
      mockWorkflowService.clearLogs.mockResolvedValue(true);

      const req = {} as any;
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.clearLogs(req, res);

      expect(mockWorkflowService.clearLogs).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { cleared: true },
        timestamp: expect.any(Date)
      });
    });

    it('should handle clear logs errors', async () => {
      const error = new Error('Failed to clear logs');
      mockWorkflowService.clearLogs.mockRejectedValue(error);

      const req = {} as any;
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      } as any;

      await controller.clearLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to clear logs',
        timestamp: expect.any(Date)
      });
    });
  });
});