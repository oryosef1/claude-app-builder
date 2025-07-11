import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TaskQueue } from '../../src/core/SimpleTaskQueue.js';

describe('SimpleTaskQueue - Comprehensive Tests', () => {
  let taskQueue: TaskQueue;

  beforeEach(() => {
    taskQueue = new TaskQueue();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with empty task map', () => {
      expect(taskQueue.getQueueSize()).toBe(0);
    });

    test('should be an EventEmitter', () => {
      expect(taskQueue.on).toBeDefined();
      expect(taskQueue.emit).toBeDefined();
    });
  });

  describe('Task Creation', () => {
    test('should create task with all provided data', () => {
      const eventSpy = vi.fn();
      taskQueue.on('taskCreated', eventSpy);

      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        skillsRequired: ['testing', 'automation'],
        priority: 'high' as const,
        estimatedDuration: 7200000,
        dependencies: ['task_1'],
        maxRetries: 5
      };

      const task = taskQueue.createTask(taskData);

      expect(task.id).toMatch(/^task_\d+_\d+$/);
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test description');
      expect(task.skillsRequired).toEqual(['testing', 'automation']);
      expect(task.priority).toBe('high');
      expect(task.estimatedDuration).toBe(7200000);
      expect(task.dependencies).toEqual(['task_1']);
      expect(task.maxRetries).toBe(5);
      expect(task.status).toBe('pending');
      expect(task.retryCount).toBe(0);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(eventSpy).toHaveBeenCalledWith(task);
    });

    test('should create task with default values', () => {
      const task = taskQueue.createTask({
        title: 'Minimal Task',
        description: 'Minimal description',
        skillsRequired: ['general']
      });

      expect(task.priority).toBe('medium');
      expect(task.estimatedDuration).toBe(3600000); // 1 hour
      expect(task.dependencies).toEqual([]);
      expect(task.maxRetries).toBe(3);
    });

    test('should generate unique task IDs', () => {
      const task1 = taskQueue.createTask({
        title: 'Task 1',
        description: 'Description 1',
        skillsRequired: ['skill1']
      });

      const task2 = taskQueue.createTask({
        title: 'Task 2',
        description: 'Description 2',
        skillsRequired: ['skill2']
      });

      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe('Task Management', () => {
    let task1: any;
    let task2: any;

    beforeEach(() => {
      task1 = taskQueue.createTask({
        title: 'Task 1',
        description: 'Description 1',
        skillsRequired: ['skill1'],
        priority: 'high'
      });

      task2 = taskQueue.createTask({
        title: 'Task 2',
        description: 'Description 2',
        skillsRequired: ['skill2'],
        priority: 'low'
      });

      taskQueue.addTask(task1);
      taskQueue.addTask(task2);
    });

    test('should add tasks to queue', () => {
      expect(taskQueue.getQueueSize()).toBe(2);
    });

    test('should get task by ID', () => {
      const retrievedTask = taskQueue.getTaskById(task1.id);
      expect(retrievedTask).toEqual(task1);
    });

    test('should return undefined for non-existent task', () => {
      const retrievedTask = taskQueue.getTaskById('non-existent');
      expect(retrievedTask).toBeUndefined();
    });

    test('should get pending tasks', () => {
      const pendingTasks = taskQueue.getPendingTasks();
      expect(pendingTasks).toHaveLength(2);
      expect(pendingTasks).toContain(task1);
      expect(pendingTasks).toContain(task2);
    });

    test('should get next task by priority', () => {
      const nextTask = taskQueue.getNextTask();
      expect(nextTask).toEqual(task1); // high priority
    });

    test('should get tasks by status', () => {
      const pendingTasks = taskQueue.getTasksByStatus('pending');
      expect(pendingTasks).toHaveLength(2);

      const inProgressTasks = taskQueue.getTasksByStatus('in_progress');
      expect(inProgressTasks).toHaveLength(0);
    });

    test('should get tasks by skill', () => {
      const skill1Tasks = taskQueue.getTasksBySkill('skill1');
      expect(skill1Tasks).toHaveLength(1);
      expect(skill1Tasks[0]).toEqual(task1);
    });

    test('should get available tasks (no dependencies)', () => {
      const availableTasks = taskQueue.getAvailableTasks();
      expect(availableTasks).toHaveLength(2);
    });
  });

  describe('Task Assignment', () => {
    let task: any;

    beforeEach(() => {
      task = taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        skillsRequired: ['testing']
      });
      taskQueue.addTask(task);
    });

    test('should assign task to employee', () => {
      const eventSpy = vi.fn();
      taskQueue.on('taskAssigned', eventSpy);

      const result = taskQueue.assignTask(task.id, 'emp_001');

      expect(result).toBe(true);
      expect(task.assignedTo).toBe('emp_001');
      expect(task.status).toBe('in_progress');
      expect(task.startedAt).toBeInstanceOf(Date);
      expect(eventSpy).toHaveBeenCalledWith({
        taskId: task.id,
        employeeId: 'emp_001'
      });
    });

    test('should not assign non-existent task', () => {
      const result = taskQueue.assignTask('non-existent', 'emp_001');
      expect(result).toBe(false);
    });

    test('should not assign non-pending task', () => {
      taskQueue.assignTask(task.id, 'emp_001');
      const result = taskQueue.assignTask(task.id, 'emp_002');
      expect(result).toBe(false);
    });

    test('should not reassign already assigned task', () => {
      taskQueue.assignTask(task.id, 'emp_001');
      task.status = 'pending'; // Reset status but keep assignedTo
      
      const result = taskQueue.assignTask(task.id, 'emp_002');
      expect(result).toBe(false);
    });

    test('should get tasks by assignee', () => {
      taskQueue.assignTask(task.id, 'emp_001');
      
      const assigneeTasks = taskQueue.getTasksByAssignee('emp_001');
      expect(assigneeTasks).toHaveLength(1);
      expect(assigneeTasks[0]).toEqual(task);
    });
  });

  describe('Task Completion', () => {
    let task: any;

    beforeEach(() => {
      task = taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        skillsRequired: ['testing']
      });
      taskQueue.addTask(task);
      taskQueue.assignTask(task.id, 'emp_001');
    });

    test('should complete task successfully', () => {
      const eventSpy = vi.fn();
      taskQueue.on('taskCompleted', eventSpy);

      const result = { output: 'Task completed successfully' };
      const success = taskQueue.completeTask(task.id, result);

      expect(success).toBe(true);
      expect(task.status).toBe('completed');
      expect(task.completedAt).toBeInstanceOf(Date);
      expect(task.result).toEqual(result);
      expect(eventSpy).toHaveBeenCalledWith({
        taskId: task.id,
        result
      });
    });

    test('should not complete non-existent task', () => {
      const success = taskQueue.completeTask('non-existent', {});
      expect(success).toBe(false);
    });

    test('should not complete non-in-progress task', () => {
      task.status = 'pending';
      const success = taskQueue.completeTask(task.id, {});
      expect(success).toBe(false);
    });
  });

  describe('Task Failure', () => {
    let task: any;

    beforeEach(() => {
      task = taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        skillsRequired: ['testing']
      });
      taskQueue.addTask(task);
      taskQueue.assignTask(task.id, 'emp_001');
    });

    test('should fail task with error', () => {
      const eventSpy = vi.fn();
      taskQueue.on('taskFailed', eventSpy);

      const error = 'Task execution failed';
      const success = taskQueue.failTask(task.id, error);

      expect(success).toBe(true);
      expect(task.status).toBe('failed');
      expect(task.error).toBe(error);
      expect(task.retryCount).toBe(1);
      expect(eventSpy).toHaveBeenCalledWith({
        taskId: task.id,
        error
      });
    });

    test('should not fail non-existent task', () => {
      const success = taskQueue.failTask('non-existent', 'error');
      expect(success).toBe(false);
    });

    test('should not fail non-in-progress task', () => {
      task.status = 'completed';
      const success = taskQueue.failTask(task.id, 'error');
      expect(success).toBe(false);
    });
  });

  describe('Task Retry', () => {
    let task: any;

    beforeEach(() => {
      task = taskQueue.createTask({
        title: 'Test Task',
        description: 'Test description',
        skillsRequired: ['testing'],
        maxRetries: 3
      });
      taskQueue.addTask(task);
      taskQueue.assignTask(task.id, 'emp_001');
      taskQueue.failTask(task.id, 'First failure');
    });

    test('should retry failed task', () => {
      const eventSpy = vi.fn();
      taskQueue.on('taskRetried', eventSpy);

      const success = taskQueue.retryTask(task.id);

      expect(success).toBe(true);
      expect(task.status).toBe('pending');
      expect(task.assignedTo).toBeUndefined();
      expect(task.startedAt).toBeUndefined();
      expect(task.error).toBeUndefined();
      expect(eventSpy).toHaveBeenCalledWith({
        taskId: task.id,
        retryCount: 1
      });
    });

    test('should not retry non-existent task', () => {
      const success = taskQueue.retryTask('non-existent');
      expect(success).toBe(false);
    });

    test('should not retry non-failed task', () => {
      task.status = 'completed';
      const success = taskQueue.retryTask(task.id);
      expect(success).toBe(false);
    });

    test('should not retry task exceeding max retries', () => {
      task.retryCount = 3; // Already at max
      const success = taskQueue.retryTask(task.id);
      expect(success).toBe(false);
    });
  });

  describe('Task Dependencies', () => {
    let task1: any;
    let task2: any;
    let task3: any;

    beforeEach(() => {
      task1 = taskQueue.createTask({
        title: 'Task 1',
        description: 'First task',
        skillsRequired: ['skill1']
      });

      task2 = taskQueue.createTask({
        title: 'Task 2',
        description: 'Depends on task 1',
        skillsRequired: ['skill2'],
        dependencies: [task1.id]
      });

      task3 = taskQueue.createTask({
        title: 'Task 3',
        description: 'Depends on task 1 and 2',
        skillsRequired: ['skill3'],
        dependencies: [task1.id, task2.id]
      });

      taskQueue.addTask(task1);
      taskQueue.addTask(task2);
      taskQueue.addTask(task3);
    });

    test('should check dependencies are met', () => {
      expect(taskQueue.areDependenciesMet(task1.id)).toBe(true);
      expect(taskQueue.areDependenciesMet(task2.id)).toBe(false);
      expect(taskQueue.areDependenciesMet(task3.id)).toBe(false);
    });

    test('should update dependencies when tasks complete', () => {
      // Complete task1
      taskQueue.assignTask(task1.id, 'emp_001');
      taskQueue.completeTask(task1.id, {});

      expect(taskQueue.areDependenciesMet(task2.id)).toBe(true);
      expect(taskQueue.areDependenciesMet(task3.id)).toBe(false);

      // Complete task2
      taskQueue.assignTask(task2.id, 'emp_002');
      taskQueue.completeTask(task2.id, {});

      expect(taskQueue.areDependenciesMet(task3.id)).toBe(true);
    });

    test('should get only available tasks with met dependencies', () => {
      let availableTasks = taskQueue.getAvailableTasks();
      expect(availableTasks).toHaveLength(1);
      expect(availableTasks[0]).toEqual(task1);

      // Complete task1
      taskQueue.assignTask(task1.id, 'emp_001');
      taskQueue.completeTask(task1.id, {});

      availableTasks = taskQueue.getAvailableTasks();
      expect(availableTasks).toHaveLength(1);
      expect(availableTasks[0]).toEqual(task2);
    });

    test('should handle non-existent dependencies', () => {
      const task4 = taskQueue.createTask({
        title: 'Task 4',
        description: 'Has non-existent dependency',
        skillsRequired: ['skill4'],
        dependencies: ['non-existent-task']
      });
      taskQueue.addTask(task4);

      expect(taskQueue.areDependenciesMet(task4.id)).toBe(false);
    });
  });

  describe('Priority Handling', () => {
    let highTask: any;
    let mediumTask: any;
    let lowTask: any;

    beforeEach(() => {
      highTask = taskQueue.createTask({
        title: 'High Priority',
        description: 'High priority task',
        skillsRequired: ['skill1'],
        priority: 'high'
      });

      mediumTask = taskQueue.createTask({
        title: 'Medium Priority',
        description: 'Medium priority task',
        skillsRequired: ['skill2'],
        priority: 'medium'
      });

      lowTask = taskQueue.createTask({
        title: 'Low Priority',
        description: 'Low priority task',
        skillsRequired: ['skill3'],
        priority: 'low'
      });

      // Add in random order
      taskQueue.addTask(lowTask);
      taskQueue.addTask(highTask);
      taskQueue.addTask(mediumTask);
    });

    test('should get next task respecting priority order', () => {
      let nextTask = taskQueue.getNextTask();
      expect(nextTask).toEqual(highTask);

      taskQueue.assignTask(highTask.id, 'emp_001');
      nextTask = taskQueue.getNextTask();
      expect(nextTask).toEqual(mediumTask);

      taskQueue.assignTask(mediumTask.id, 'emp_002');
      nextTask = taskQueue.getNextTask();
      expect(nextTask).toEqual(lowTask);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Create various tasks in different states
      const task1 = taskQueue.createTask({
        title: 'Completed Task',
        description: 'A completed task',
        skillsRequired: ['skill1'],
        priority: 'high'
      });
      taskQueue.addTask(task1);
      taskQueue.assignTask(task1.id, 'emp_001');
      
      // Simulate time passing
      const startTime = new Date().getTime() - 3600000; // 1 hour ago
      task1.startedAt = new Date(startTime);
      taskQueue.completeTask(task1.id, {});

      const task2 = taskQueue.createTask({
        title: 'In Progress Task',
        description: 'An in-progress task',
        skillsRequired: ['skill2'],
        priority: 'medium'
      });
      taskQueue.addTask(task2);
      taskQueue.assignTask(task2.id, 'emp_002');

      const task3 = taskQueue.createTask({
        title: 'Failed Task',
        description: 'A failed task',
        skillsRequired: ['skill3'],
        priority: 'low'
      });
      taskQueue.addTask(task3);
      taskQueue.assignTask(task3.id, 'emp_003');
      taskQueue.failTask(task3.id, 'Task failed');

      const task4 = taskQueue.createTask({
        title: 'Pending Task',
        description: 'A pending task',
        skillsRequired: ['skill4'],
        priority: 'high'
      });
      taskQueue.addTask(task4);
    });

    test('should calculate correct statistics', () => {
      const stats = taskQueue.getStatistics();

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.byPriority.high).toBe(2);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.averageCompletionTime).toBeGreaterThan(0);
    });

    test('should handle empty queue statistics', () => {
      const emptyQueue = new TaskQueue();
      const stats = emptyQueue.getStatistics();

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.inProgress).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.averageCompletionTime).toBe(0);
    });

    test('should calculate average completion time correctly', () => {
      const queue = new TaskQueue();
      
      // Create two completed tasks with known durations
      const task1 = queue.createTask({
        title: 'Task 1',
        description: 'First task',
        skillsRequired: ['skill1']
      });
      queue.addTask(task1);
      queue.assignTask(task1.id, 'emp_001');
      
      const start1 = new Date().getTime() - 2000; // 2 seconds ago
      task1.startedAt = new Date(start1);
      task1.completedAt = new Date(start1 + 1000); // 1 second duration
      task1.status = 'completed';

      const task2 = queue.createTask({
        title: 'Task 2',
        description: 'Second task',
        skillsRequired: ['skill2']
      });
      queue.addTask(task2);
      queue.assignTask(task2.id, 'emp_002');
      
      const start2 = new Date().getTime() - 4000; // 4 seconds ago
      task2.startedAt = new Date(start2);
      task2.completedAt = new Date(start2 + 3000); // 3 second duration
      task2.status = 'completed';

      const stats = queue.getStatistics();
      expect(stats.averageCompletionTime).toBe(2000); // (1000 + 3000) / 2
    });
  });

  describe('Edge Cases', () => {
    test('should handle task with no dependencies check', () => {
      const task = taskQueue.createTask({
        title: 'No Deps Task',
        description: 'Task without dependencies',
        skillsRequired: ['skill1']
      });
      taskQueue.addTask(task);

      expect(taskQueue.areDependenciesMet(task.id)).toBe(true);
    });

    test('should handle non-existent task in dependencies check', () => {
      expect(taskQueue.areDependenciesMet('non-existent')).toBe(true);
    });

    test('should return undefined when no pending tasks', () => {
      const nextTask = taskQueue.getNextTask();
      expect(nextTask).toBeUndefined();
    });

    test('should handle multiple tasks with same priority', () => {
      const task1 = taskQueue.createTask({
        title: 'High Priority 1',
        description: 'First high priority',
        skillsRequired: ['skill1'],
        priority: 'high'
      });

      const task2 = taskQueue.createTask({
        title: 'High Priority 2',
        description: 'Second high priority',
        skillsRequired: ['skill2'],
        priority: 'high'
      });

      taskQueue.addTask(task1);
      taskQueue.addTask(task2);

      const nextTask = taskQueue.getNextTask();
      expect(nextTask).toBeDefined();
      expect(nextTask?.priority).toBe('high');
    });
  });
});