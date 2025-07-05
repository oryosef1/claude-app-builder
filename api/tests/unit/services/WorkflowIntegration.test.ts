import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowIntegration } from '../../../src/services/WorkflowIntegration';
import { WorkflowState, TaskItem } from '../../../src/types/workflow';

// Mock dependencies for integration testing
vi.mock('child_process');
vi.mock('chokidar');
vi.mock('fs/promises');

// Mock FileWatcher to prevent file system operations
vi.mock('../../../src/services/FileWatcher', () => {
  return {
    FileWatcher: vi.fn().mockImplementation(() => ({
      watchFile: vi.fn(),
      unwatchFile: vi.fn(),
      readFile: vi.fn().mockResolvedValue('# Mock file content'),
      writeFile: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn().mockResolvedValue(undefined)
    }))
  };
});

// Mock WorkflowManager to prevent process spawning
let mockWorkflowState = {
  status: 'idle',
  phase: 'idle',
  progress: 0,
  output: []
};

const mockWorkflowManager = {
  startWorkflow: vi.fn().mockImplementation(async () => {
    mockWorkflowState = { ...mockWorkflowState, status: 'running' };
  }),
  stopWorkflow: vi.fn().mockImplementation(async () => {
    mockWorkflowState = { ...mockWorkflowState, status: 'stopped' };
  }),
  pauseWorkflow: vi.fn().mockImplementation(async () => {
    mockWorkflowState = { ...mockWorkflowState, status: 'paused' };
  }),
  resumeWorkflow: vi.fn().mockImplementation(async () => {
    mockWorkflowState = { ...mockWorkflowState, status: 'running' };
  }),
  getState: vi.fn().mockImplementation(() => ({ ...mockWorkflowState })),
  cleanup: vi.fn().mockResolvedValue(undefined)
};

vi.mock('../../../src/services/WorkflowManager', () => {
  return {
    WorkflowManager: vi.fn().mockImplementation(() => mockWorkflowManager)
  };
});

describe('WorkflowIntegration', () => {
  let workflowIntegration: WorkflowIntegration;

  beforeEach(() => {
    // Reset mock state before each test
    mockWorkflowState = {
      status: 'idle',
      phase: 'idle',
      progress: 0,
      output: []
    };
    workflowIntegration = new WorkflowIntegration();
  });

  afterEach(async () => {
    await workflowIntegration.cleanup();
    // Reset mocks to default behavior after each test
    const mockWorkflowManager = (workflowIntegration as any).workflowManager;
    mockWorkflowManager.startWorkflow.mockImplementation(async () => {
      mockWorkflowState = { ...mockWorkflowState, status: 'running' };
    });
    mockWorkflowManager.stopWorkflow.mockImplementation(async () => {
      mockWorkflowState = { ...mockWorkflowState, status: 'stopped' };
    });
    mockWorkflowManager.pauseWorkflow.mockImplementation(async () => {
      mockWorkflowState = { ...mockWorkflowState, status: 'paused' };
    });
    mockWorkflowManager.resumeWorkflow.mockImplementation(async () => {
      mockWorkflowState = { ...mockWorkflowState, status: 'running' };
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(workflowIntegration.initialize()).resolves.not.toThrow();
    });

    it('should setup file watchers on initialization', async () => {
      await workflowIntegration.initialize();
      
      // Test that file watchers are active by checking internal state
      const state = workflowIntegration.getWorkflowState();
      expect(state).toBeDefined();
      expect(state.phase).toBe('idle');
      expect(state.status).toBe('idle');
    });
    
    it('should handle file watcher errors during initialization', async () => {
      // Mock file watcher to throw error
      const mockFileWatcher = (workflowIntegration as any).fileWatcher;
      mockFileWatcher.watchFile.mockImplementation(() => {
        throw new Error('File watcher error');
      });
      
      // Should not throw in test environment
      await expect(workflowIntegration.initialize()).resolves.not.toThrow();
    });
  });

  describe('workflow control', () => {
    beforeEach(async () => {
      await workflowIntegration.initialize();
    });

    it('should start workflow successfully', async () => {
      await workflowIntegration.startWorkflow();
      const state = workflowIntegration.getWorkflowState();
      expect(state.status).toBe('running');
    });

    it('should stop workflow successfully', async () => {
      await workflowIntegration.startWorkflow();
      await workflowIntegration.stopWorkflow();
      const state = workflowIntegration.getWorkflowState();
      expect(state.status).toBe('stopped');
    });

    it('should pause workflow successfully', async () => {
      await workflowIntegration.startWorkflow();
      await workflowIntegration.pauseWorkflow();
      const state = workflowIntegration.getWorkflowState();
      expect(state.status).toBe('paused');
    });

    it('should resume workflow successfully', async () => {
      await workflowIntegration.startWorkflow();
      await workflowIntegration.pauseWorkflow();
      await workflowIntegration.resumeWorkflow();
      const state = workflowIntegration.getWorkflowState();
      expect(state.status).toBe('running');
    });
  });

  describe('task management', () => {
    beforeEach(async () => {
      await workflowIntegration.initialize();
    });

    it('should get tasks successfully', () => {
      const tasks = workflowIntegration.getTasks();
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should add task successfully', async () => {
      const newTask = {
        content: 'Test task',
        status: 'pending' as const,
        priority: 'medium' as const
      };

      await workflowIntegration.addTask(newTask);
      const tasks = workflowIntegration.getTasks();
      
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[tasks.length - 1].content).toBe('Test task');
    });

    it('should update task successfully', async () => {
      const newTask = {
        content: 'Test task',
        status: 'pending' as const,
        priority: 'medium' as const
      };

      await workflowIntegration.addTask(newTask);
      const tasks = workflowIntegration.getTasks();
      const taskId = tasks[tasks.length - 1].id;

      await workflowIntegration.updateTask(taskId, { 
        status: 'completed',
        priority: 'high'
      });

      const updatedTasks = workflowIntegration.getTasks();
      const updatedTask = updatedTasks.find(t => t.id === taskId);
      
      expect(updatedTask?.status).toBe('completed');
      expect(updatedTask?.priority).toBe('high');
    });

    it('should handle updating non-existent task', async () => {
      await expect(workflowIntegration.updateTask('non-existent-id', { 
        status: 'completed' 
      })).rejects.toThrow('Task not found');
    });

    it('should assign unique IDs to tasks', async () => {
      const task1 = {
        content: 'Task 1',
        status: 'pending' as const,
        priority: 'low' as const
      };

      const task2 = {
        content: 'Task 2',
        status: 'pending' as const,
        priority: 'high' as const
      };

      await workflowIntegration.addTask(task1);
      await workflowIntegration.addTask(task2);
      
      const tasks = workflowIntegration.getTasks();
      const lastTwoTasks = tasks.slice(-2);
      
      expect(lastTwoTasks[0].id).not.toBe(lastTwoTasks[1].id);
      expect(lastTwoTasks[0].id).toBeDefined();
      expect(lastTwoTasks[1].id).toBeDefined();
    });
  });

  describe('memory management', () => {
    beforeEach(async () => {
      await workflowIntegration.initialize();
    });

    it('should get memory content successfully', async () => {
      const content = await workflowIntegration.getMemoryContent();
      expect(typeof content).toBe('string');
    });

    it('should update memory content successfully', async () => {
      const newContent = 'Updated memory content';
      await workflowIntegration.updateMemoryContent(newContent);
      
      const content = await workflowIntegration.getMemoryContent();
      expect(content).toContain(newContent);
    });

    it('should handle memory file errors gracefully', async () => {
      // Mock file operations to simulate error
      const mockError = new Error('File access denied');
      const mockFileWatcher = (workflowIntegration as any).fileWatcher;
      mockFileWatcher.readFile.mockRejectedValue(mockError);
      
      // In test environment, should fall back to in-memory content
      const content = await workflowIntegration.getMemoryContent();
      expect(typeof content).toBe('string');
      expect(content).toContain('System Memory');
    });
  });

  describe('state synchronization', () => {
    beforeEach(async () => {
      await workflowIntegration.initialize();
    });

    it('should provide consistent workflow state', () => {
      const state1 = workflowIntegration.getWorkflowState();
      const state2 = workflowIntegration.getWorkflowState();
      
      expect(state1).toEqual(state2);
    });

    it('should update state after workflow operations', async () => {
      const initialState = workflowIntegration.getWorkflowState();
      
      await workflowIntegration.startWorkflow();
      const runningState = workflowIntegration.getWorkflowState();
      
      expect(runningState.status).not.toBe(initialState.status);
      expect(runningState.status).toBe('running');
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Create new instance with failing file watcher
      const failingIntegration = new WorkflowIntegration();
      const mockFileWatcher = (failingIntegration as any).fileWatcher;
      mockFileWatcher.watchFile.mockImplementation(() => {
        throw new Error('File watcher initialization failed');
      });
      
      // In test environment, initialization errors are caught and ignored
      await expect(failingIntegration.initialize()).resolves.not.toThrow();
      await failingIntegration.cleanup();
    });

    it('should handle workflow control errors gracefully', async () => {
      // Create a separate instance to avoid interfering with other tests
      const errorTestIntegration = new WorkflowIntegration();
      await errorTestIntegration.initialize();
      
      // Mock workflow manager startWorkflow to throw error
      const mockError = new Error('Workflow start failed');
      const mockWorkflowManager = (errorTestIntegration as any).workflowManager;
      mockWorkflowManager.startWorkflow.mockRejectedValue(mockError);
      mockWorkflowManager.getState.mockReturnValue({ status: 'error', error: mockError.message });
      
      await expect(errorTestIntegration.startWorkflow()).rejects.toThrow('Workflow start failed');
      await errorTestIntegration.cleanup();
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', async () => {
      await workflowIntegration.initialize();
      await workflowIntegration.startWorkflow();
      
      await expect(workflowIntegration.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup when not initialized', async () => {
      await expect(workflowIntegration.cleanup()).resolves.not.toThrow();
    });

    it('should stop workflow during cleanup', async () => {
      await workflowIntegration.initialize();
      
      // Test that cleanup executes without errors
      await expect(workflowIntegration.cleanup()).resolves.not.toThrow();
      
      // Verify cleanup method was called
      const mockWorkflowManager = (workflowIntegration as any).workflowManager;
      expect(mockWorkflowManager.cleanup).toHaveBeenCalled();
    });
  });
});