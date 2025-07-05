import { WorkflowService } from '@/services/workflow-service';
import { ProcessManager } from '@/services/process-manager';
import { FileService } from '@/services/file-service';
import { LogService } from '@/services/log-service';
import { WorkflowCommand, WorkflowStatus, TodoItem } from '@/types';

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

  afterEach(() => {
    // Clean up any hanging processes or resources
    if (service) {
      service.removeAllListeners();
    }
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return workflow status based on process manager state', async () => {
      const mockProcesses = [12345];
      mockProcessManager.getRunningProcesses.mockReturnValue(mockProcesses);

      const status = await service.getStatus();

      expect(status).toEqual({
        isRunning: mockProcesses.length > 0,
        currentPhase: mockProcesses.length > 0 ? 'running' : 'stopped',
        progress: 0
      });
    });

    it('should return stopped status when no processes running', async () => {
      mockProcessManager.getRunningProcesses.mockReturnValue([]);

      const status = await service.getStatus();

      expect(status).toEqual({
        isRunning: false,
        currentPhase: 'stopped',
        progress: 0
      });
    });
  });

  describe('executeCommand', () => {
    it('should start workflow with valid todo', async () => {
      const command: WorkflowCommand = {
        action: 'start',
        todoId: 'test-todo-1'
      };

      const mockTodos: TodoItem[] = [
        { 
          id: 'test-todo-1', 
          content: 'Test task', 
          status: 'pending' as const,
          priority: 'high' as const,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        }
      ];

      mockFileService.readTodos.mockResolvedValue(mockTodos);
      const mockResult = { pid: 12345, exitCode: null, stdout: '', stderr: '' };
      mockProcessManager.executeProcess.mockResolvedValue(mockResult);
      mockProcessManager.getRunningProcesses.mockReturnValue([12345]);

      const result = await service.executeCommand(command);

      expect(mockProcessManager.executeProcess).toHaveBeenCalled();
      expect(result.isRunning).toBe(true);
      expect(result.currentPhase).toBe('running');
    });

    it('should start workflow without specific todo', async () => {
      const command: WorkflowCommand = { action: 'start' };

      const mockResult = { pid: 12345, exitCode: null, stdout: '', stderr: '' };
      mockProcessManager.executeProcess.mockResolvedValue(mockResult);
      mockProcessManager.getRunningProcesses.mockReturnValue([12345]);

      const result = await service.executeCommand(command);

      expect(mockProcessManager.executeProcess).toHaveBeenCalled();
      expect(result.isRunning).toBe(true);
    });

    it('should stop running workflow', async () => {
      const command: WorkflowCommand = { action: 'stop' };

      mockProcessManager.getRunningProcesses.mockReturnValue([12345]);
      mockProcessManager.killProcess.mockReturnValue(true);

      const result = await service.executeCommand(command);

      expect(mockProcessManager.killProcess).toHaveBeenCalledWith(12345);
      expect(result.isRunning).toBe(false);
      expect(result.currentPhase).toBe('stopped');
    });

    it('should pause running workflow', async () => {
      const command: WorkflowCommand = { action: 'pause' };

      mockProcessManager.getRunningProcesses.mockReturnValue([12345]);
      mockProcessManager.killProcess.mockReturnValue(true);

      const result = await service.executeCommand(command);

      expect(mockProcessManager.killProcess).toHaveBeenCalledWith(12345);
      expect(result.currentPhase).toBe('paused');
    });

    it('should resume paused workflow', async () => {
      const command: WorkflowCommand = { action: 'resume' };

      const mockResult = { pid: 12345, exitCode: null, stdout: '', stderr: '' };
      mockProcessManager.executeProcess.mockResolvedValue(mockResult);
      mockProcessManager.getRunningProcesses.mockReturnValue([12345]);

      const result = await service.executeCommand(command);

      expect(mockProcessManager.executeProcess).toHaveBeenCalled();
      expect(result.isRunning).toBe(true);
      expect(result.currentPhase).toBe('running');
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

      mockProcessManager.getRunningProcesses.mockReturnValue([12345]);

      await expect(service.executeCommand(command)).rejects.toThrow('Workflow is already running');
    });

    it('should throw error when trying to stop non-running workflow', async () => {
      const command: WorkflowCommand = { action: 'stop' };

      mockProcessManager.getRunningProcesses.mockReturnValue([]);

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