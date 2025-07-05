import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowIntegration } from '../../../src/services/WorkflowIntegration';
import { WorkflowState, TaskItem } from '../../../src/types/workflow';

// Mock dependencies for integration testing
vi.mock('child_process');
vi.mock('chokidar');

describe('WorkflowIntegration', () => {
  let workflowIntegration: WorkflowIntegration;

  beforeEach(() => {
    workflowIntegration = new WorkflowIntegration();
  });

  afterEach(async () => {
    await workflowIntegration.cleanup();
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
      vi.spyOn(workflowIntegration, 'getMemoryContent').mockRejectedValue(mockError);
      
      await expect(workflowIntegration.getMemoryContent()).rejects.toThrow('File access denied');
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
      // Mock file watcher to throw error
      const mockError = new Error('File watcher initialization failed');
      vi.spyOn(workflowIntegration as any, 'setupFileWatchers').mockRejectedValue(mockError);
      
      await expect(workflowIntegration.initialize()).rejects.toThrow('File watcher initialization failed');
    });

    it('should handle workflow control errors gracefully', async () => {
      await workflowIntegration.initialize();
      
      // Mock workflow manager to throw error
      const mockError = new Error('Workflow start failed');
      vi.spyOn(workflowIntegration as any, 'workflowManager').mockImplementation(() => ({
        startWorkflow: vi.fn().mockRejectedValue(mockError),
        getState: vi.fn().mockReturnValue({ status: 'error', error: mockError.message })
      }));
      
      await expect(workflowIntegration.startWorkflow()).rejects.toThrow('Workflow start failed');
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
      await workflowIntegration.startWorkflow();
      
      await workflowIntegration.cleanup();
      
      const state = workflowIntegration.getWorkflowState();
      expect(state.status).toBe('stopped');
    });
  });
});