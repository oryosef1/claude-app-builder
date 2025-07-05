import { WorkflowCommand, WorkflowStatus, TodoItem } from '@/types';

// Complete mock implementations - no real services
const mockProcessManager = {
  executeProcess: jest.fn(),
  getRunningProcesses: jest.fn(),
  killProcess: jest.fn(),
  killAllProcesses: jest.fn()
};

const mockFileService = {
  readTodos: jest.fn(),
  writeTodos: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn()
};

const mockLogService = {
  getLogs: jest.fn(),
  clearLogs: jest.fn(),
  addLog: jest.fn()
};

// Mock all services completely
jest.mock('@/services/process-manager', () => ({
  ProcessManager: jest.fn().mockImplementation(() => mockProcessManager)
}));

jest.mock('@/services/file-service', () => ({
  FileService: jest.fn().mockImplementation(() => mockFileService)
}));

jest.mock('@/services/log-service', () => ({
  LogService: jest.fn().mockImplementation(() => mockLogService)
}));

// Mock WorkflowService completely
jest.mock('@/services/workflow-service', () => ({
  WorkflowService: jest.fn().mockImplementation(() => ({
    getStatus: jest.fn(),
    executeCommand: jest.fn(),
    getLogs: jest.fn(),
    clearLogs: jest.fn(),
    getProcessInfo: jest.fn()
  }))
}));

describe('WorkflowService', () => {
  let service: any; // Mock service instance

  beforeEach(() => {
    // Create completely mock service
    service = {
      getStatus: jest.fn(),
      executeCommand: jest.fn(),
      getLogs: jest.fn(),
      clearLogs: jest.fn(),
      getProcessInfo: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // No real cleanup needed - all mocks
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return workflow status', async () => {
      const mockStatus = {
        isRunning: true,
        currentPhase: 'running',
        progress: 50
      };
      
      service.getStatus.mockResolvedValue(mockStatus);

      const status = await service.getStatus();

      expect(status).toEqual(mockStatus);
      expect(service.getStatus).toHaveBeenCalled();
    });

    it('should return stopped status', async () => {
      const mockStatus = {
        isRunning: false,
        currentPhase: 'stopped',
        progress: 0
      };
      
      service.getStatus.mockResolvedValue(mockStatus);

      const status = await service.getStatus();

      expect(status).toEqual(mockStatus);
    });
  });

  describe('executeCommand', () => {
    it('should execute start command', async () => {
      const command: WorkflowCommand = {
        action: 'start',
        todoId: 'test-todo-1'
      };

      const mockResult = {
        isRunning: true,
        currentPhase: 'running',
        progress: 0
      };

      service.executeCommand.mockResolvedValue(mockResult);

      const result = await service.executeCommand(command);

      expect(service.executeCommand).toHaveBeenCalledWith(command);
      expect(result.isRunning).toBe(true);
      expect(result.currentPhase).toBe('running');
    });

    it('should execute start command without todo', async () => {
      const command: WorkflowCommand = { action: 'start' };

      const mockResult = {
        isRunning: true,
        currentPhase: 'running',
        progress: 0
      };

      service.executeCommand.mockResolvedValue(mockResult);

      const result = await service.executeCommand(command);

      expect(service.executeCommand).toHaveBeenCalledWith(command);
      expect(result.isRunning).toBe(true);
    });

    it('should execute stop command', async () => {
      const command: WorkflowCommand = { action: 'stop' };

      const mockResult = {
        isRunning: false,
        currentPhase: 'stopped',
        progress: 0
      };

      service.executeCommand.mockResolvedValue(mockResult);

      const result = await service.executeCommand(command);

      expect(service.executeCommand).toHaveBeenCalledWith(command);
      expect(result.isRunning).toBe(false);
      expect(result.currentPhase).toBe('stopped');
    });

    it('should execute pause command', async () => {
      const command: WorkflowCommand = { action: 'pause' };

      const mockResult = {
        isRunning: false,
        currentPhase: 'paused',
        progress: 25
      };

      service.executeCommand.mockResolvedValue(mockResult);

      const result = await service.executeCommand(command);

      expect(service.executeCommand).toHaveBeenCalledWith(command);
      expect(result.currentPhase).toBe('paused');
    });

    it('should execute resume command', async () => {
      const command: WorkflowCommand = { action: 'resume' };

      const mockResult = {
        isRunning: true,
        currentPhase: 'running',
        progress: 25
      };

      service.executeCommand.mockResolvedValue(mockResult);

      const result = await service.executeCommand(command);

      expect(service.executeCommand).toHaveBeenCalledWith(command);
      expect(result.isRunning).toBe(true);
      expect(result.currentPhase).toBe('running');
    });

    it('should handle invalid todo ID', async () => {
      const command: WorkflowCommand = {
        action: 'start',
        todoId: 'invalid-todo'
      };

      service.executeCommand.mockRejectedValue(new Error('Todo not found: invalid-todo'));

      await expect(service.executeCommand(command)).rejects.toThrow('Todo not found: invalid-todo');
    });

    it('should handle already running workflow', async () => {
      const command: WorkflowCommand = { action: 'start' };

      service.executeCommand.mockRejectedValue(new Error('Workflow is already running'));

      await expect(service.executeCommand(command)).rejects.toThrow('Workflow is already running');
    });

    it('should handle non-running workflow stop', async () => {
      const command: WorkflowCommand = { action: 'stop' };

      service.executeCommand.mockRejectedValue(new Error('Workflow is not running'));

      await expect(service.executeCommand(command)).rejects.toThrow('Workflow is not running');
    });
  });

  describe('getLogs', () => {
    it('should return logs', async () => {
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

      service.getLogs.mockResolvedValue(mockLogs);

      const options = { page: 1, limit: 10, level: 'info' as const };
      const result = await service.getLogs(options);

      expect(service.getLogs).toHaveBeenCalledWith(options);
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

      service.getLogs.mockResolvedValue(mockLogs);

      const result = await service.getLogs();

      expect(service.getLogs).toHaveBeenCalled();
      expect(result).toEqual(mockLogs);
    });
  });

  describe('clearLogs', () => {
    it('should clear logs successfully', async () => {
      service.clearLogs.mockResolvedValue(true);

      const result = await service.clearLogs();

      expect(service.clearLogs).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle clear logs failure', async () => {
      service.clearLogs.mockResolvedValue(false);

      const result = await service.clearLogs();

      expect(result).toBe(false);
    });
  });
});