import { WorkflowService } from '@/services/workflow-service';
import { ProcessManager } from '@/services/process-manager';
import { FileService } from '@/services/file-service';
import { LogService } from '@/services/log-service';
import { WorkflowCommand, WorkflowStatus } from '@/types';

jest.mock('@/services/process-manager');
jest.mock('@/services/file-service');
jest.mock('@/services/log-service');

describe('WorkflowService', () => {
  let service: WorkflowService;
  let mockProcessManager: jest.Mocked<ProcessManager>;
  let mockFileService: jest.Mocked<FileService>;
  let mockLogService: jest.Mocked<LogService>;

  beforeEach(() => {
    mockProcessManager = new ProcessManager() as jest.Mocked<ProcessManager>;
    mockFileService = new FileService() as jest.Mocked<FileService>;
    mockLogService = new LogService() as jest.Mocked<LogService>;
    
    service = new WorkflowService(mockProcessManager, mockFileService, mockLogService);
  });

  describe('getStatus', () => {
    it('should return workflow status when process is running', async () => {
      mockProcessManager.isRunning.mockReturnValue(true);
      mockProcessManager.getCurrentPhase.mockReturnValue('test-writer');
      mockProcessManager.getProgress.mockReturnValue(25);
      mockProcessManager.getStartTime.mockReturnValue(new Date('2023-01-01'));

      const status = await service.getStatus();

      expect(status).toEqual({
        isRunning: true,
        currentPhase: 'test-writer',
        progress: 25,
        startTime: new Date('2023-01-01')
      });
    });

    it('should return stopped status when process is not running', async () => {
      mockProcessManager.isRunning.mockReturnValue(false);
      mockProcessManager.getCurrentPhase.mockReturnValue('stopped');
      mockProcessManager.getProgress.mockReturnValue(0);

      const status = await service.getStatus();

      expect(status).toEqual({
        isRunning: false,
        currentPhase: 'stopped',
        progress: 0
      });
    });

    it('should include error in status when process has error', async () => {
      const error = new Error('Process crashed');
      mockProcessManager.isRunning.mockReturnValue(false);
      mockProcessManager.getCurrentPhase.mockReturnValue('error');
      mockProcessManager.getProgress.mockReturnValue(0);
      mockProcessManager.getLastError.mockReturnValue(error);

      const status = await service.getStatus();

      expect(status).toEqual({
        isRunning: false,
        currentPhase: 'error',
        progress: 0,
        error: 'Process crashed'
      });
    });
  });

  describe('executeCommand', () => {
    it('should start workflow with valid todo', async () => {
      const command: WorkflowCommand = {
        action: 'start',
        todoId: 'test-todo-1'
      };

      const mockTodos = [
        { id: 'test-todo-1', content: 'Test task', status: 'pending' }
      ];

      mockFileService.readTodos.mockResolvedValue(mockTodos);
      mockProcessManager.start.mockResolvedValue(true);
      mockProcessManager.isRunning.mockReturnValue(true);
      mockProcessManager.getCurrentPhase.mockReturnValue('test-writer');
      mockProcessManager.getProgress.mockReturnValue(0);
      mockProcessManager.getStartTime.mockReturnValue(new Date());

      const result = await service.executeCommand(command);

      expect(mockProcessManager.start).toHaveBeenCalledWith('test-todo-1');
      expect(result.isRunning).toBe(true);
      expect(result.currentPhase).toBe('test-writer');
    });

    it('should start workflow without specific todo', async () => {
      const command: WorkflowCommand = { action: 'start' };

      mockProcessManager.start.mockResolvedValue(true);
      mockProcessManager.isRunning.mockReturnValue(true);
      mockProcessManager.getCurrentPhase.mockReturnValue('test-writer');
      mockProcessManager.getProgress.mockReturnValue(0);
      mockProcessManager.getStartTime.mockReturnValue(new Date());

      const result = await service.executeCommand(command);

      expect(mockProcessManager.start).toHaveBeenCalledWith(undefined);
      expect(result.isRunning).toBe(true);
    });

    it('should stop running workflow', async () => {
      const command: WorkflowCommand = { action: 'stop' };

      mockProcessManager.isRunning.mockReturnValue(true);
      mockProcessManager.stop.mockResolvedValue(true);
      mockProcessManager.getCurrentPhase.mockReturnValue('stopped');
      mockProcessManager.getProgress.mockReturnValue(0);
      mockProcessManager.getEndTime.mockReturnValue(new Date());

      const result = await service.executeCommand(command);

      expect(mockProcessManager.stop).toHaveBeenCalled();
      expect(result.isRunning).toBe(false);
      expect(result.currentPhase).toBe('stopped');
    });

    it('should pause running workflow', async () => {
      const command: WorkflowCommand = { action: 'pause' };

      mockProcessManager.isRunning.mockReturnValue(true);
      mockProcessManager.pause.mockResolvedValue(true);
      mockProcessManager.getCurrentPhase.mockReturnValue('paused');
      mockProcessManager.getProgress.mockReturnValue(50);

      const result = await service.executeCommand(command);

      expect(mockProcessManager.pause).toHaveBeenCalled();
      expect(result.currentPhase).toBe('paused');
    });

    it('should resume paused workflow', async () => {
      const command: WorkflowCommand = { action: 'resume' };

      mockProcessManager.isPaused.mockReturnValue(true);
      mockProcessManager.resume.mockResolvedValue(true);
      mockProcessManager.isRunning.mockReturnValue(true);
      mockProcessManager.getCurrentPhase.mockReturnValue('test-writer');
      mockProcessManager.getProgress.mockReturnValue(50);

      const result = await service.executeCommand(command);

      expect(mockProcessManager.resume).toHaveBeenCalled();
      expect(result.isRunning).toBe(true);
      expect(result.currentPhase).toBe('test-writer');
    });

    it('should throw error for invalid todo ID', async () => {
      const command: WorkflowCommand = {
        action: 'start',
        todoId: 'invalid-todo'
      };

      mockFileService.readTodos.mockResolvedValue([]);

      await expect(service.executeCommand(command)).rejects.toThrow('Todo not found: invalid-todo');
    });

    it('should throw error when trying to start already running workflow', async () => {
      const command: WorkflowCommand = { action: 'start' };

      mockProcessManager.isRunning.mockReturnValue(true);

      await expect(service.executeCommand(command)).rejects.toThrow('Workflow is already running');
    });

    it('should throw error when trying to stop non-running workflow', async () => {
      const command: WorkflowCommand = { action: 'stop' };

      mockProcessManager.isRunning.mockReturnValue(false);

      await expect(service.executeCommand(command)).rejects.toThrow('Workflow is not running');
    });
  });

  describe('getLogs', () => {
    it('should return paginated logs', async () => {
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

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      const options = { page: 1, limit: 10, level: 'info' as const };
      const result = await service.getLogs(options);

      expect(mockLogService.getLogs).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockLogs);
    });

    it('should return logs with default options', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          timestamp: new Date(),
          level: 'info' as const,
          message: 'Workflow started'
        }
      ];

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      const result = await service.getLogs();

      expect(mockLogService.getLogs).toHaveBeenCalledWith({});
      expect(result).toEqual(mockLogs);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs successfully', async () => {
      mockLogService.clearLogs.mockResolvedValue(true);

      const result = await service.clearLogs();

      expect(mockLogService.clearLogs).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle clear logs failure', async () => {
      mockLogService.clearLogs.mockResolvedValue(false);

      const result = await service.clearLogs();

      expect(result).toBe(false);
    });
  });
});