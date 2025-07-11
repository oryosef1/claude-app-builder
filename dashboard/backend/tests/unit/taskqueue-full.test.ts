import { describe, test, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import Bull from 'bull';
import { TaskQueue } from '../../src/core/TaskQueue.js';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';
import { EventEmitter } from 'events';
import winston from 'winston';

// Mock Bull
vi.mock('bull', () => {
  const MockQueue = vi.fn();
  MockQueue.prototype = {
    on: vi.fn(),
    process: vi.fn(),
    add: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    close: vi.fn(),
    getJobs: vi.fn(),
    getWaiting: vi.fn(() => Promise.resolve([])),
    getActive: vi.fn(() => Promise.resolve([])),
    getCompleted: vi.fn(() => Promise.resolve([])),
    getFailed: vi.fn(() => Promise.resolve([])),
    getDelayed: vi.fn(() => Promise.resolve([]))
  };
  return { default: MockQueue };
});

// Mock utils
vi.mock('../../src/utils/index.js', () => ({
  generateId: vi.fn(() => 'test-task-123'),
  findBestEmployee: vi.fn(),
  delay: vi.fn(() => Promise.resolve())
}));

// Create mock logger
const createMockLogger = (): winston.Logger => {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
    silly: vi.fn(),
    log: vi.fn()
  } as any;
};

// Create mock AgentRegistry
const createMockAgentRegistry = () => {
  return {
    getEmployeeById: vi.fn(),
    updateEmployeeStatus: vi.fn(),
    updateEmployeeWorkload: vi.fn(),
    assignProject: vi.fn(),
    removeProject: vi.fn(),
    findBestEmployeeForTask: vi.fn(),
    updatePerformanceMetric: vi.fn(),
    getAllEmployees: vi.fn(() => []),
    getEmployeesBySkill: vi.fn(() => []),
    findEmployeesForMultiAgentTask: vi.fn(() => [])
  } as any;
};

describe('TaskQueue - Comprehensive Tests', () => {
  let taskQueue: TaskQueue;
  let mockLogger: winston.Logger;
  let mockAgentRegistry: AgentRegistry;
  let mockBullQueue: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockAgentRegistry = createMockAgentRegistry();
    taskQueue = new TaskQueue(mockLogger, mockAgentRegistry);
    
    // Get the mock Bull queue instance
    mockBullQueue = (Bull as any).mock.results[0].value;
  });

  afterEach(async () => {
    await taskQueue.cleanup();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with Bull queue', () => {
      expect(Bull).toHaveBeenCalledWith('ai-task-queue', expect.any(Object));
    });

    test('should setup queue events', () => {
      expect(mockBullQueue.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockBullQueue.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockBullQueue.on).toHaveBeenCalledWith('waiting', expect.any(Function));
      expect(mockBullQueue.on).toHaveBeenCalledWith('active', expect.any(Function));
      expect(mockBullQueue.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockBullQueue.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockBullQueue.on).toHaveBeenCalledWith('stalled', expect.any(Function));
    });

    test('should setup job processor', () => {
      expect(mockBullQueue.process).toHaveBeenCalledWith('ai-task', expect.any(Function));
    });

    test('should use custom Redis config if provided', () => {
      const customRedisConfig = { host: 'custom-host', port: 6380 };
      new TaskQueue(mockLogger, mockAgentRegistry, customRedisConfig);
      
      expect(Bull).toHaveBeenCalledWith('ai-task-queue', expect.objectContaining({
        redis: customRedisConfig
      }));
    });

    test('should be an EventEmitter', () => {
      expect(taskQueue).toBeInstanceOf(EventEmitter);
    });
  });

  describe('Task Creation', () => {
    test('should create a task successfully', async () => {
      const eventSpy = vi.fn();
      taskQueue.on('task_created', eventSpy);

      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'high' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000
      };

      const taskId = await taskQueue.createTask(taskData);

      expect(taskId).toBe('test-task-123');
      expect(eventSpy).toHaveBeenCalledWith({
        taskId,
        task: expect.objectContaining({
          id: taskId,
          status: 'pending',
          ...taskData
        })
      });
    });

    test('should set default max retries', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000
      };

      const taskId = await taskQueue.createTask(taskData);
      const task = taskQueue.getTask(taskId);

      expect(task?.maxRetries).toBe(3);
    });

    test('should use provided max retries', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000,
        maxRetries: 5
      };

      const taskId = await taskQueue.createTask(taskData);
      const task = taskQueue.getTask(taskId);

      expect(task?.maxRetries).toBe(5);
    });
  });

  describe('Task Assignment', () => {
    let taskId: string;

    beforeEach(async () => {
      taskId = await taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'high' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000
      });
    });

    test('should assign task to specific employee', async () => {
      const mockEmployee = {
        id: 'emp_001',
        name: 'Test Employee',
        status: 'active',
        workload: 50,
        skills: ['testing']
      };

      mockAgentRegistry.getEmployeeById.mockReturnValue(mockEmployee);
      mockBullQueue.add.mockResolvedValue({});

      const eventSpy = vi.fn();
      taskQueue.on('task_assigned', eventSpy);

      await taskQueue.assignTask(taskId, 'emp_001');

      expect(mockAgentRegistry.updateEmployeeStatus).toHaveBeenCalledWith('emp_001', 'busy');
      expect(mockAgentRegistry.assignProject).toHaveBeenCalledWith('emp_001', taskId);
      expect(mockBullQueue.add).toHaveBeenCalledWith('ai-task', expect.objectContaining({
        taskId,
        employeeId: 'emp_001'
      }), expect.any(Object));
      expect(eventSpy).toHaveBeenCalledWith({ taskId, employeeId: 'emp_001' });
    });

    test('should auto-assign task to best employee', async () => {
      const mockEmployee = {
        id: 'emp_002',
        name: 'Best Employee',
        status: 'active',
        workload: 30,
        skills: ['testing', 'automation']
      };

      mockAgentRegistry.findBestEmployeeForTask.mockReturnValue(mockEmployee);
      mockBullQueue.add.mockResolvedValue({});

      await taskQueue.assignTask(taskId);

      expect(mockAgentRegistry.findBestEmployeeForTask).toHaveBeenCalledWith(['testing'], 'high');
      expect(mockAgentRegistry.updateEmployeeStatus).toHaveBeenCalledWith('emp_002', 'busy');
    });

    test('should throw error if task not found', async () => {
      await expect(taskQueue.assignTask('invalid-id')).rejects.toThrow('Task invalid-id not found');
    });

    test('should throw error if employee not found', async () => {
      mockAgentRegistry.getEmployeeById.mockReturnValue(null);

      await expect(taskQueue.assignTask(taskId, 'emp_999')).rejects.toThrow('Employee emp_999 not found');
    });

    test('should throw error if no employees available', async () => {
      mockAgentRegistry.findBestEmployeeForTask.mockReturnValue(null);

      await expect(taskQueue.assignTask(taskId)).rejects.toThrow('No available employees found');
    });

    test('should throw error if employee not active', async () => {
      const busyEmployee = {
        id: 'emp_001',
        name: 'Busy Employee',
        status: 'busy',
        workload: 80
      };

      mockAgentRegistry.getEmployeeById.mockReturnValue(busyEmployee);

      await expect(taskQueue.assignTask(taskId, 'emp_001')).rejects.toThrow('Employee emp_001 is not available');
    });

    test('should calculate workload increase based on priority', async () => {
      const mockEmployee = {
        id: 'emp_001',
        name: 'Test Employee',
        status: 'active',
        workload: 50,
        skills: ['testing']
      };

      mockAgentRegistry.getEmployeeById.mockReturnValue(mockEmployee);
      mockBullQueue.add.mockResolvedValue({});

      await taskQueue.assignTask(taskId, 'emp_001');

      // High priority = 20 base increase
      expect(mockAgentRegistry.updateEmployeeWorkload).toHaveBeenCalledWith('emp_001', expect.any(Number));
    });
  });

  describe('Task Execution', () => {
    test('should handle job completion', async () => {
      const taskId = await taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000
      });

      const mockEmployee = {
        id: 'emp_001',
        name: 'Test Employee',
        status: 'active',
        workload: 50,
        skills: ['testing'],
        performance_metrics: {
          team_efficiency: 95
        }
      };

      mockAgentRegistry.getEmployeeById.mockReturnValue(mockEmployee);
      mockAgentRegistry.findBestEmployeeForTask.mockReturnValue(mockEmployee);
      mockBullQueue.add.mockResolvedValue({});

      await taskQueue.assignTask(taskId);

      const eventSpy = vi.fn();
      taskQueue.on('task_completed', eventSpy);

      // Simulate job completion
      const completedHandler = mockBullQueue.on.mock.calls.find(
        (call: any[]) => call[0] === 'completed'
      )?.[1];

      const mockJob = { id: 'job-1', data: { taskId } };
      const mockResult = { success: true, output: 'Task completed' };

      completedHandler?.(mockJob, mockResult);

      expect(eventSpy).toHaveBeenCalledWith({ taskId, result: mockResult });
      expect(mockAgentRegistry.updateEmployeeStatus).toHaveBeenCalledWith('emp_001', 'active');
    });

    test('should handle job failure', async () => {
      const taskId = await taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000
      });

      const eventSpy = vi.fn();
      taskQueue.on('task_retry', eventSpy);

      // Simulate job failure
      const failedHandler = mockBullQueue.on.mock.calls.find(
        (call: any[]) => call[0] === 'failed'
      )?.[1];

      const mockJob = { id: 'job-1', data: { taskId } };
      const mockError = new Error('Task failed');

      failedHandler?.(mockJob, mockError);

      expect(eventSpy).toHaveBeenCalledWith({ 
        taskId, 
        retryCount: 1, 
        error: mockError 
      });
    });

    test('should handle permanent failure after max retries', async () => {
      const taskId = await taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000,
        maxRetries: 2
      });

      const task = taskQueue.getTask(taskId);
      if (task) {
        task.retryCount = 2; // Already at max retries
      }

      const eventSpy = vi.fn();
      taskQueue.on('task_failed', eventSpy);

      // Simulate job failure
      const failedHandler = mockBullQueue.on.mock.calls.find(
        (call: any[]) => call[0] === 'failed'
      )?.[1];

      const mockJob = { id: 'job-1', data: { taskId } };
      const mockError = new Error('Task failed permanently');

      failedHandler?.(mockJob, mockError);

      expect(eventSpy).toHaveBeenCalledWith({ taskId, error: mockError });
    });
  });

  describe('Task Cancellation', () => {
    test('should cancel pending task', async () => {
      const taskId = await taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000
      });

      const mockJob = { 
        data: { taskId },
        remove: vi.fn()
      };

      mockBullQueue.getJobs.mockResolvedValue([mockJob]);

      const eventSpy = vi.fn();
      taskQueue.on('task_cancelled', eventSpy);

      await taskQueue.cancelTask(taskId);

      expect(mockJob.remove).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith({ taskId });
      expect(taskQueue.getTask(taskId)).toBeNull();
    });

    test('should throw error if task not found', async () => {
      await expect(taskQueue.cancelTask('invalid-id')).rejects.toThrow('Task invalid-id not found');
    });

    test('should throw error if task already completed', async () => {
      const taskId = await taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000
      });

      const task = taskQueue.getTask(taskId);
      if (task) {
        task.status = 'completed';
      }

      await expect(taskQueue.cancelTask(taskId)).rejects.toThrow(
        `Cannot cancel task ${taskId} in status completed`
      );
    });

    test('should release employee resources on cancel', async () => {
      const taskId = await taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000
      });

      const mockEmployee = {
        id: 'emp_001',
        name: 'Test Employee',
        status: 'active',
        workload: 50,
        skills: ['testing']
      };

      mockAgentRegistry.getEmployeeById.mockReturnValue(mockEmployee);
      mockAgentRegistry.findBestEmployeeForTask.mockReturnValue(mockEmployee);
      mockBullQueue.add.mockResolvedValue({});

      await taskQueue.assignTask(taskId);

      mockBullQueue.getJobs.mockResolvedValue([]);

      await taskQueue.cancelTask(taskId);

      expect(mockAgentRegistry.updateEmployeeStatus).toHaveBeenCalledWith('emp_001', 'active');
      expect(mockAgentRegistry.removeProject).toHaveBeenCalledWith('emp_001', taskId);
    });
  });

  describe('Task Queries', () => {
    beforeEach(async () => {
      // Mock generateId to return different IDs for each task
      const utils = await import('../../src/utils/index.js');
      let callCount = 0;
      vi.mocked(utils.generateId).mockImplementation(() => {
        callCount++;
        return `test-task-${callCount}`;
      });
      
      // Create multiple tasks
      await taskQueue.createTask({
        title: 'Task 1',
        description: 'Description 1',
        priority: 'high' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000
      });

      await taskQueue.createTask({
        title: 'Task 2',
        description: 'Description 2',
        priority: 'medium' as const,
        skillsRequired: ['development'],
        estimatedDuration: 7200000
      });

      await taskQueue.createTask({
        title: 'Task 3',
        description: 'Description 3',
        priority: 'low' as const,
        skillsRequired: ['documentation'],
        estimatedDuration: 1800000
      });
    });

    test('should get task by ID', () => {
      const task = taskQueue.getTask('test-task-1');
      expect(task).toBeDefined();
      expect(task?.title).toBe('Task 1');
    });

    test('should return null for non-existent task', () => {
      const task = taskQueue.getTask('invalid-id');
      expect(task).toBeNull();
    });

    test('should get all tasks', () => {
      const tasks = taskQueue.getAllTasks();
      expect(tasks).toHaveLength(3);
    });

    test('should get tasks by status', () => {
      const pendingTasks = taskQueue.getTasksByStatus('pending');
      expect(pendingTasks).toHaveLength(3);
      expect(pendingTasks.every(t => t.status === 'pending')).toBe(true);
    });

    test('should get tasks by employee', async () => {
      const taskId = 'test-task-1'; // Use the first created task
      const mockEmployee = {
        id: 'emp_001',
        name: 'Test Employee',
        status: 'active',
        workload: 50,
        skills: ['testing']
      };

      mockAgentRegistry.getEmployeeById.mockReturnValue(mockEmployee);
      mockBullQueue.add.mockResolvedValue({});

      await taskQueue.assignTask(taskId, 'emp_001');

      const employeeTasks = taskQueue.getTasksByEmployee('emp_001');
      expect(employeeTasks).toHaveLength(1);
      expect(employeeTasks[0]?.assignedTo).toBe('emp_001');
    });

    test('should get task history', () => {
      const history = taskQueue.getTaskHistory();
      expect(history).toEqual([]);
    });

    test('should get task stats', () => {
      const stats = taskQueue.getTaskStats();
      
      expect(stats).toEqual({
        pending: 3,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        failed: 0
      });
    });
  });

  describe('Queue Management', () => {
    test('should pause queue', async () => {
      await taskQueue.pauseQueue();
      
      expect(mockBullQueue.pause).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Task queue paused');
    });

    test('should resume queue', async () => {
      await taskQueue.resumeQueue();
      
      expect(mockBullQueue.resume).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Task queue resumed');
    });

    test('should get queue stats', async () => {
      mockBullQueue.getWaiting.mockResolvedValue([{}, {}]);
      mockBullQueue.getActive.mockResolvedValue([{}]);
      mockBullQueue.getCompleted.mockResolvedValue([{}, {}, {}]);
      mockBullQueue.getFailed.mockResolvedValue([]);
      mockBullQueue.getDelayed.mockResolvedValue([{}]);

      const stats = await taskQueue.getQueueStats();

      expect(stats).toEqual({
        waiting: 2,
        active: 1,
        completed: 3,
        failed: 0,
        delayed: 1
      });
    });
  });

  describe('Team Assignment', () => {
    test('should assign tasks to team', async () => {
      const taskIds = ['task-1', 'task-2'];
      
      // Create tasks
      taskIds.forEach((id, index) => {
        taskQueue['activeTasks'].set(id, {
          id,
          title: `Task ${index + 1}`,
          description: `Description ${index + 1}`,
          priority: 'medium',
          skillsRequired: ['testing'],
          estimatedDuration: 3600000,
          status: 'pending',
          createdAt: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
      });

      const mockTeamMembers = [
        {
          id: 'emp_001',
          name: 'Employee 1',
          status: 'active',
          workload: 30,
          skills: ['testing', 'development']
        },
        {
          id: 'emp_002',
          name: 'Employee 2',
          status: 'active',
          workload: 40,
          skills: ['testing']
        }
      ];

      mockAgentRegistry.findEmployeesForMultiAgentTask.mockReturnValue(mockTeamMembers);
      mockAgentRegistry.getEmployeeById.mockImplementation((id) => 
        mockTeamMembers.find(emp => emp.id === id)
      );
      mockBullQueue.add.mockResolvedValue({});

      const assignments = await taskQueue.assignTasksToTeam(taskIds, {
        skills: ['testing'],
        teamSize: 2,
        department: 'Development'
      });

      expect(assignments).toHaveLength(2);
      expect(mockAgentRegistry.findEmployeesForMultiAgentTask).toHaveBeenCalledWith(
        ['testing'],
        2,
        { department: 'Development' }
      );
    });

    test('should throw error if no team members found', async () => {
      mockAgentRegistry.findEmployeesForMultiAgentTask.mockReturnValue([]);

      await expect(taskQueue.assignTasksToTeam(['task-1'], {
        skills: ['rare-skill'],
        teamSize: 5
      })).rejects.toThrow('No suitable team members found');
    });

    test('should skip non-existent tasks', async () => {
      const mockTeamMembers = [{
        id: 'emp_001',
        name: 'Employee 1',
        status: 'active',
        workload: 30,
        skills: ['testing']
      }];

      mockAgentRegistry.findEmployeesForMultiAgentTask.mockReturnValue(mockTeamMembers);

      const assignments = await taskQueue.assignTasksToTeam(['non-existent'], {
        skills: ['testing'],
        teamSize: 1
      });

      expect(assignments).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Task non-existent not found, skipping assignment'
      );
    });
  });

  describe('Workload Redistribution', () => {
    test('should redistribute workload from overloaded employees', async () => {
      const overloadedEmployee = {
        id: 'emp_001',
        name: 'Overloaded Employee',
        status: 'busy',
        workload: 90,
        skills: ['testing']
      };

      const underloadedEmployee = {
        id: 'emp_002',
        name: 'Underloaded Employee',
        status: 'active',
        workload: 15,
        skills: ['testing']
      };

      mockAgentRegistry.getAllEmployees.mockReturnValue([
        overloadedEmployee,
        underloadedEmployee
      ]);

      // Create a pending task for the overloaded employee
      const taskId = 'task-overload';
      taskQueue['activeTasks'].set(taskId, {
        id: taskId,
        title: 'Overloaded Task',
        description: 'Task to redistribute',
        priority: 'medium',
        skillsRequired: ['testing'],
        estimatedDuration: 3600000,
        status: 'pending',
        assignedTo: 'emp_001',
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3
      });

      mockAgentRegistry.findBestEmployeeForTask.mockReturnValue(underloadedEmployee);
      mockBullQueue.getJobs.mockResolvedValue([]);
      mockBullQueue.add.mockResolvedValue({});

      await taskQueue.redistributeWorkload();

      // The task should be cancelled first, then reassigned
      expect(mockLogger.info).toHaveBeenCalledWith('Cancelled task task-overload');
    });

    test('should skip redistribution if no overloaded employees', async () => {
      mockAgentRegistry.getAllEmployees.mockReturnValue([
        {
          id: 'emp_001',
          name: 'Normal Employee',
          status: 'active',
          workload: 50,
          skills: ['testing']
        }
      ]);

      await taskQueue.redistributeWorkload();

      expect(mockLogger.info).toHaveBeenCalledWith('No workload redistribution needed');
    });
  });

  describe('Task Recommendations', () => {
    test('should get task recommendations', async () => {
      const bestEmployee = {
        id: 'emp_001',
        name: 'Best Employee',
        status: 'active',
        workload: 30,
        skills: ['testing', 'automation']
      };

      const alternativeEmployees = [
        {
          id: 'emp_002',
          name: 'Alternative 1',
          status: 'active',
          workload: 40,
          skills: ['testing']
        }
      ];

      mockAgentRegistry.findBestEmployeeForTask.mockReturnValue(bestEmployee);
      mockAgentRegistry.getEmployeesBySkill.mockReturnValue([
        bestEmployee,
        ...alternativeEmployees
      ]);

      const recommendations = await taskQueue.getTaskRecommendations(['testing'], 'high');

      expect(recommendations).toEqual({
        bestEmployee,
        alternativeEmployees,
        estimatedWaitTime: 0 // Workload 30 < 50
      });
    });

    test('should calculate wait time for busy employees', async () => {
      const busyEmployee = {
        id: 'emp_001',
        name: 'Busy Employee',
        status: 'active',
        workload: 80,
        skills: ['testing']
      };

      mockAgentRegistry.findBestEmployeeForTask.mockReturnValue(busyEmployee);
      mockAgentRegistry.getEmployeesBySkill.mockReturnValue([busyEmployee]);

      const recommendations = await taskQueue.getTaskRecommendations(['testing']);

      // 80 - 50 = 30 * 60000 = 1,800,000ms (30 minutes)
      expect(recommendations.estimatedWaitTime).toBe(1800000);
    });
  });

  describe('Event System', () => {
    test('should emit queue error event', () => {
      const eventSpy = vi.fn();
      taskQueue.on('queue_error', eventSpy);

      const errorHandler = mockBullQueue.on.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];

      const mockError = new Error('Queue error');
      errorHandler?.(mockError);

      expect(eventSpy).toHaveBeenCalledWith(mockError);
    });

    test('should emit task status updated event', async () => {
      const taskId = await taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000
      });

      const eventSpy = vi.fn();
      taskQueue.on('task_status_updated', eventSpy);

      // Simulate active job
      const activeHandler = mockBullQueue.on.mock.calls.find(
        (call: any[]) => call[0] === 'active'
      )?.[1];

      const mockJob = { id: 'job-1', data: { taskId } };
      activeHandler?.(mockJob);

      expect(eventSpy).toHaveBeenCalledWith({
        taskId,
        status: 'in_progress'
      });
    });
  });

  describe('Performance Metrics', () => {
    test('should update employee performance metrics on success', async () => {
      const taskId = await taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000
      });

      const mockEmployee = {
        id: 'emp_001',
        name: 'Senior Developer',
        role: 'Senior Developer',
        status: 'active',
        workload: 50,
        skills: ['testing'],
        performance_metrics: {
          features_delivered: 5,
          team_efficiency: 95
        }
      };

      mockAgentRegistry.getEmployeeById.mockReturnValue(mockEmployee);
      mockAgentRegistry.findBestEmployeeForTask.mockReturnValue(mockEmployee);
      mockBullQueue.add.mockResolvedValue({});

      await taskQueue.assignTask(taskId);

      // Simulate job completion
      const completedHandler = mockBullQueue.on.mock.calls.find(
        (call: any[]) => call[0] === 'completed'
      )?.[1];

      const mockJob = { id: 'job-1', data: { taskId } };
      const mockResult = { success: true };

      completedHandler?.(mockJob, mockResult);

      expect(mockAgentRegistry.updatePerformanceMetric).toHaveBeenCalledWith(
        'emp_001',
        'features_delivered',
        6
      );
    });

    test('should update failure metrics', async () => {
      const taskId = await taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium' as const,
        skillsRequired: ['testing'],
        estimatedDuration: 3600000,
        maxRetries: 1
      });

      const mockEmployee = {
        id: 'emp_001',
        name: 'Senior Developer',
        role: 'Senior Developer',
        status: 'active',
        workload: 50,
        skills: ['testing'],
        performance_metrics: {
          bug_rate: 2
        }
      };

      mockAgentRegistry.getEmployeeById.mockReturnValue(mockEmployee);
      
      const task = taskQueue.getTask(taskId);
      if (task) {
        task.assignedTo = 'emp_001';
        task.retryCount = 1; // At max retries
      }

      // Simulate permanent failure
      const failedHandler = mockBullQueue.on.mock.calls.find(
        (call: any[]) => call[0] === 'failed'
      )?.[1];

      const mockJob = { id: 'job-1', data: { taskId } };
      const mockError = new Error('Task failed');

      failedHandler?.(mockJob, mockError);

      expect(mockAgentRegistry.updatePerformanceMetric).toHaveBeenCalledWith(
        'emp_001',
        'bug_rate',
        3
      );
    });
  });

  describe('Cleanup', () => {
    test('should close Bull queue on cleanup', async () => {
      await taskQueue.cleanup();
      
      expect(mockBullQueue.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Task queue cleaned up');
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing task in execute', async () => {
      // Access private method through type assertion
      const executeTask = (taskQueue as any).executeTask.bind(taskQueue);
      
      await expect(executeTask('non-existent', 'emp_001', 'process_001'))
        .rejects.toThrow('Task non-existent not found');
    });

    test('should handle task history limit', async () => {
      // Access private properties
      const taskHistory = (taskQueue as any).taskHistory;
      const maxHistorySize = (taskQueue as any).maxHistorySize;

      // Fill history beyond limit
      for (let i = 0; i < maxHistorySize + 100; i++) {
        taskHistory.push({
          id: `task-${i}`,
          status: 'completed'
        });
      }

      // Access private method to trigger cleanup
      const taskQueuePrivate = taskQueue as any;
      taskQueuePrivate.taskHistory = taskHistory;
      
      // Trigger history cleanup
      const moveToHistory = taskQueuePrivate.moveToHistory.bind(taskQueue);
      moveToHistory({ id: 'new-task', status: 'completed' });

      expect(taskQueuePrivate.taskHistory.length).toBeLessThanOrEqual(maxHistorySize);
    });

    test('should handle priority mapping', () => {
      const getPriorityValue = (taskQueue as any).getPriorityValue.bind(taskQueue);
      
      expect(getPriorityValue('urgent')).toBe(10);
      expect(getPriorityValue('high')).toBe(5);
      expect(getPriorityValue('medium')).toBe(0);
      expect(getPriorityValue('low')).toBe(-5);
      expect(getPriorityValue('unknown')).toBe(0);
    });
  });
});