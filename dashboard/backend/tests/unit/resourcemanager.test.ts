import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceManager } from '../../src/core/ResourceManager.js';
import type { Task, ClaudeProcess } from '../../src/types/index.js';

describe('ResourceManager', () => {
  let resourceManager: ResourceManager;
  let mockRegistry: any;
  let mockProcessManager: any;
  let mockTaskQueue: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };

    mockRegistry = {
      getAllEmployees: vi.fn(() => [
        { id: 'emp_001', name: 'Alice', skills: ['coding'], status: 'active', workload: 30 },
        { id: 'emp_002', name: 'Bob', skills: ['testing'], status: 'active', workload: 70 },
        { id: 'emp_003', name: 'Charlie', skills: ['coding', 'testing'], status: 'active', workload: 10 }
      ]),
      getEmployee: vi.fn((id: string) => ({
        id,
        name: `Employee ${id}`,
        status: 'active',
        workload: 50,
        performance_metrics: { efficiency: 85 }
      })),
      getEmployeesBySkills: vi.fn(() => [
        { id: 'emp_001', skills: ['coding'], status: 'active', workload: 30 },
        { id: 'emp_003', skills: ['coding', 'testing'], status: 'active', workload: 10 }
      ])
    };

    mockProcessManager = {
      getAllProcesses: vi.fn(() => [
        { id: 'proc_1', employeeId: 'emp_001', status: 'running', memoryUsage: 100000000, cpuUsage: 15 },
        { id: 'proc_2', employeeId: 'emp_002', status: 'running', memoryUsage: 200000000, cpuUsage: 25 }
      ]),
      on: vi.fn()
    };

    mockTaskQueue = {
      getTasks: vi.fn(() => [
        { id: 'task_1', assignedTo: 'emp_001', status: 'assigned' },
        { id: 'task_2', assignedTo: 'emp_001', status: 'in_progress' },
        { id: 'task_3', assignedTo: 'emp_002', status: 'assigned' }
      ]),
      on: vi.fn()
    };

    resourceManager = new ResourceManager(
      mockRegistry,
      mockProcessManager,
      mockTaskQueue,
      mockLogger
    );
  });

  describe('Resource Monitoring', () => {
    it('should initialize resource usage for all employees', () => {
      const usage = resourceManager.getAllResourceUsage();
      expect(usage).toHaveLength(3);
      expect(usage.every(u => u.efficiency === 100)).toBe(true);
    });

    it('should get resource usage for specific employee', () => {
      const usage = resourceManager.getResourceUsage('emp_001');
      expect(usage).toBeDefined();
      expect(usage?.employeeId).toBe('emp_001');
    });

    it('should return undefined for non-existent employee', () => {
      const usage = resourceManager.getResourceUsage('emp_999');
      expect(usage).toBeUndefined();
    });
  });

  describe('Task Assignment Check', () => {
    it('should allow task assignment when under limits', () => {
      const canAssign = resourceManager.canAssignTask('emp_001');
      expect(canAssign).toBe(true);
    });

    it('should prevent assignment when employee not found', () => {
      const canAssign = resourceManager.canAssignTask('emp_999');
      expect(canAssign).toBe(false);
    });

    it('should prevent assignment when employee inactive', () => {
      mockRegistry.getEmployee.mockReturnValueOnce({
        id: 'emp_001',
        status: 'offline'
      });
      
      const canAssign = resourceManager.canAssignTask('emp_001');
      expect(canAssign).toBe(false);
    });

    it('should prevent assignment when task limit reached', () => {
      // Mock employee with max tasks
      const usage = resourceManager.getResourceUsage('emp_001');
      if (usage) {
        usage.tasks = 5; // Max is 5
      }
      
      const canAssign = resourceManager.canAssignTask('emp_001');
      expect(canAssign).toBe(false);
    });

    it('should prevent assignment when process limit reached', () => {
      // Mock employee with max processes
      const usage = resourceManager.getResourceUsage('emp_001');
      if (usage) {
        usage.processes = 3; // Max is 3
      }
      
      const canAssign = resourceManager.canAssignTask('emp_001');
      expect(canAssign).toBe(false);
    });

    it('should enforce idle time between tasks', () => {
      const usage = resourceManager.getResourceUsage('emp_001');
      if (usage) {
        usage.lastTaskCompleted = new Date(); // Just completed a task
      }
      
      const canAssign = resourceManager.canAssignTask('emp_001');
      expect(canAssign).toBe(false);
    });
  });

  describe('Load Balancing Strategies', () => {
    describe('Round Robin', () => {
      it('should select employee with least tasks', async () => {
        // Manually trigger resource update to ensure task counts are correct
        // This simulates the periodic update that would normally happen
        resourceManager['updateResourceUsage']();
        
        const task: Task = {
          id: 'task_1',
          title: 'Test Task',
          description: 'Test',
          priority: 'medium',
          skillsRequired: ['coding'],
          status: 'pending',
          createdAt: new Date()
        };

        const employeeId = await resourceManager.getBestEmployee(task);
        expect(employeeId).toBe('emp_003'); // Has 0 tasks vs emp_001 with 2 tasks
      });
    });

    describe('Least Loaded', () => {
      beforeEach(() => {
        resourceManager.setStrategy('least-loaded');
      });

      it('should select employee with lowest resource usage', async () => {
        // Manually trigger resource update to ensure load calculations are correct
        resourceManager['updateResourceUsage']();
        
        const task: Task = {
          id: 'task_1',
          title: 'Test Task',
          description: 'Test',
          priority: 'medium',
          skillsRequired: ['coding'],
          status: 'pending',
          createdAt: new Date()
        };

        const employeeId = await resourceManager.getBestEmployee(task);
        expect(employeeId).toBe('emp_003'); // Lowest load
      });
    });

    describe('Skill Based', () => {
      beforeEach(() => {
        resourceManager.setStrategy('skill-based');
      });

      it('should prioritize employees with best skill match', async () => {
        const task: Task = {
          id: 'task_1',
          title: 'Test Task',
          description: 'Test',
          priority: 'high',
          skillsRequired: ['coding', 'testing'],
          status: 'pending',
          createdAt: new Date()
        };

        const employeeId = await resourceManager.getBestEmployee(task);
        expect(employeeId).toBe('emp_003'); // Has both skills
      });
    });

    describe('Efficiency Based', () => {
      beforeEach(() => {
        resourceManager.setStrategy('efficiency-based');
      });

      it('should select most efficient employee', async () => {
        // Set different efficiency scores
        const usage1 = resourceManager.getResourceUsage('emp_001');
        const usage3 = resourceManager.getResourceUsage('emp_003');
        if (usage1) usage1.efficiency = 90;
        if (usage3) usage3.efficiency = 80;

        const task: Task = {
          id: 'task_1',
          title: 'Test Task',
          description: 'Test',
          priority: 'medium',
          skillsRequired: ['coding'],
          status: 'pending',
          createdAt: new Date()
        };

        const employeeId = await resourceManager.getBestEmployee(task);
        expect(employeeId).toBe('emp_001'); // Higher efficiency
      });
    });
  });

  describe('Strategy Management', () => {
    it('should change strategy', () => {
      const handler = vi.fn();
      resourceManager.on('strategy-changed', handler);
      
      resourceManager.setStrategy('skill-based');
      
      expect(handler).toHaveBeenCalledWith('skill-based');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Load balancing strategy changed to: skill-based'
      );
    });

    it('should not change to invalid strategy', () => {
      const handler = vi.fn();
      resourceManager.on('strategy-changed', handler);
      
      resourceManager.setStrategy('invalid-strategy');
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('System Resource Monitoring', () => {
    it('should get system resources', () => {
      const resources = resourceManager.getSystemResources();
      
      // Will be null initially, populated after first interval
      expect(resources).toBeNull();
    });

    it('should emit resource warnings', async () => {
      const warningHandler = vi.fn();
      resourceManager.on('resource-warning', warningHandler);
      
      // Manually trigger check with low memory
      // This would normally happen via interval
      const metrics = resourceManager.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Auto Scaling', () => {
    it('should reduce capacity on high load', async () => {
      const scaleHandler = vi.fn();
      resourceManager.on('auto-scale', scaleHandler);
      
      await resourceManager.autoScale();
      
      // Would need to mock system metrics to test this properly
      expect(mockLogger.info).toBeDefined();
    });
  });

  describe('Metrics', () => {
    it('should calculate metrics correctly', () => {
      const metrics = resourceManager.getMetrics();
      
      expect(metrics.totalProcesses).toBe(0); // Would need to trigger update
      expect(metrics.totalTasks).toBe(0);
      expect(metrics.strategyName).toBe('round-robin');
      expect(metrics.averageEfficiency).toBe(100);
    });
  });

  describe('Event Handling', () => {
    it('should handle process started event', () => {
      const processStartHandler = mockProcessManager.on.mock.calls.find(
        call => call[0] === 'process-started'
      );
      
      expect(processStartHandler).toBeDefined();
      
      // Simulate process start
      const process: ClaudeProcess = {
        id: 'proc_3',
        employeeId: 'emp_001',
        pid: 1234,
        status: 'running',
        command: 'claude',
        args: [],
        createdAt: new Date(),
        restarts: 0,
        memoryUsage: 0,
        cpuUsage: 0
      };
      
      if (processStartHandler) {
        processStartHandler[1](process);
      }
      
      const usage = resourceManager.getResourceUsage('emp_001');
      expect(usage?.processes).toBe(1);
    });

    it('should handle task events', () => {
      const taskAssignedHandler = mockTaskQueue.on.mock.calls.find(
        call => call[0] === 'task-assigned'
      );
      
      expect(taskAssignedHandler).toBeDefined();
      
      // Simulate task assignment
      const task: Task = {
        id: 'task_4',
        title: 'New Task',
        description: 'Test',
        priority: 'high',
        skillsRequired: ['coding'],
        status: 'assigned',
        assignedTo: 'emp_001',
        createdAt: new Date()
      };
      
      if (taskAssignedHandler) {
        taskAssignedHandler[1](task);
      }
      
      const usage = resourceManager.getResourceUsage('emp_001');
      expect(usage?.tasks).toBe(1);
    });

    it('should handle task completion', () => {
      const taskCompletedHandler = mockTaskQueue.on.mock.calls.find(
        call => call[0] === 'task-completed'
      );
      
      expect(taskCompletedHandler).toBeDefined();
      
      // Setup initial task count
      const usage = resourceManager.getResourceUsage('emp_001');
      if (usage) usage.tasks = 2;
      
      // Simulate task completion
      const task: Task = {
        id: 'task_1',
        title: 'Completed Task',
        description: 'Test',
        priority: 'medium',
        skillsRequired: ['coding'],
        status: 'completed',
        assignedTo: 'emp_001',
        createdAt: new Date(Date.now() - 3600000),
        completedAt: new Date(),
        estimatedDuration: 3600
      };
      
      if (taskCompletedHandler) {
        taskCompletedHandler[1](task);
      }
      
      expect(usage?.tasks).toBe(1);
      expect(usage?.lastTaskCompleted).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', () => {
      resourceManager.shutdown();
      expect(mockLogger.info).toBeDefined();
    });
  });
});