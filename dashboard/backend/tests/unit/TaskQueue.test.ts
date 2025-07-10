import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TaskQueue } from '../../src/core/SimpleTaskQueue';

describe('TaskQueue', () => {
  let taskQueue: TaskQueue;

  beforeEach(() => {
    taskQueue = new TaskQueue();
  });

  describe('Task Creation', () => {
    it('should create a new task with valid data', () => {
      const taskData = {
        title: 'Implement authentication',
        description: 'Add JWT authentication to the API',
        skillsRequired: ['Node.js', 'Security', 'JWT'],
        priority: 'high' as const,
        estimatedDuration: 4 * 60 * 60 * 1000 // 4 hours
      };

      const task = taskQueue.createTask(taskData);

      expect(task).toBeDefined();
      expect(task.id).toMatch(/^task_/);
      expect(task.title).toBe(taskData.title);
      expect(task.status).toBe('pending');
      expect(task.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique task IDs', () => {
      const task1 = taskQueue.createTask({
        title: 'Task 1',
        description: 'First task',
        skillsRequired: ['JavaScript'],
        priority: 'medium'
      });

      const task2 = taskQueue.createTask({
        title: 'Task 2',
        description: 'Second task',
        skillsRequired: ['TypeScript'],
        priority: 'medium'
      });

      expect(task1.id).not.toBe(task2.id);
    });

    it('should set default values for optional fields', () => {
      const task = taskQueue.createTask({
        title: 'Simple task',
        description: 'A simple task',
        skillsRequired: ['Testing']
      });

      expect(task.priority).toBe('medium');
      expect(task.estimatedDuration).toBeGreaterThan(0);
      expect(task.dependencies).toEqual([]);
      expect(task.maxRetries).toBe(3);
    });
  });

  describe('Task Queue Management', () => {
    it('should add task to queue', () => {
      const task = taskQueue.createTask({
        title: 'Test task',
        description: 'Test',
        skillsRequired: ['Testing']
      });

      taskQueue.addTask(task);
      const queueSize = taskQueue.getQueueSize();

      expect(queueSize).toBe(1);
    });

    it('should get pending tasks', () => {
      const task1 = taskQueue.createTask({
        title: 'Task 1',
        description: 'First',
        skillsRequired: ['JS']
      });

      const task2 = taskQueue.createTask({
        title: 'Task 2',
        description: 'Second',
        skillsRequired: ['TS']
      });

      taskQueue.addTask(task1);
      taskQueue.addTask(task2);

      const pendingTasks = taskQueue.getPendingTasks();
      expect(pendingTasks).toHaveLength(2);
      expect(pendingTasks[0].status).toBe('pending');
      expect(pendingTasks[1].status).toBe('pending');
    });

    it('should prioritize high priority tasks', () => {
      const lowTask = taskQueue.createTask({
        title: 'Low priority',
        description: 'Low',
        skillsRequired: ['Any'],
        priority: 'low'
      });

      const highTask = taskQueue.createTask({
        title: 'High priority',
        description: 'High',
        skillsRequired: ['Any'],
        priority: 'high'
      });

      taskQueue.addTask(lowTask);
      taskQueue.addTask(highTask);

      const nextTask = taskQueue.getNextTask();
      expect(nextTask?.id).toBe(highTask.id);
    });
  });

  describe('Task Assignment', () => {
    it('should assign task to employee', () => {
      const task = taskQueue.createTask({
        title: 'Assigned task',
        description: 'To be assigned',
        skillsRequired: ['TypeScript']
      });

      taskQueue.addTask(task);
      const assigned = taskQueue.assignTask(task.id, 'emp_004');

      expect(assigned).toBe(true);
      const updatedTask = taskQueue.getTaskById(task.id);
      expect(updatedTask?.assignedTo).toBe('emp_004');
      expect(updatedTask?.status).toBe('in_progress');
      expect(updatedTask?.startedAt).toBeInstanceOf(Date);
    });

    it('should not assign already assigned task', () => {
      const task = taskQueue.createTask({
        title: 'Already assigned',
        description: 'Test',
        skillsRequired: ['Any']
      });

      taskQueue.addTask(task);
      taskQueue.assignTask(task.id, 'emp_001');
      
      const reassigned = taskQueue.assignTask(task.id, 'emp_002');
      expect(reassigned).toBe(false);
      
      const updatedTask = taskQueue.getTaskById(task.id);
      expect(updatedTask?.assignedTo).toBe('emp_001');
    });

    it('should get tasks by assignee', () => {
      const task1 = taskQueue.createTask({
        title: 'Task for emp_004',
        description: 'First',
        skillsRequired: ['JS']
      });

      const task2 = taskQueue.createTask({
        title: 'Another for emp_004',
        description: 'Second',
        skillsRequired: ['TS']
      });

      const task3 = taskQueue.createTask({
        title: 'Task for emp_005',
        description: 'Third',
        skillsRequired: ['React']
      });

      taskQueue.addTask(task1);
      taskQueue.addTask(task2);
      taskQueue.addTask(task3);

      taskQueue.assignTask(task1.id, 'emp_004');
      taskQueue.assignTask(task2.id, 'emp_004');
      taskQueue.assignTask(task3.id, 'emp_005');

      const emp004Tasks = taskQueue.getTasksByAssignee('emp_004');
      expect(emp004Tasks).toHaveLength(2);
      expect(emp004Tasks[0].assignedTo).toBe('emp_004');
      expect(emp004Tasks[1].assignedTo).toBe('emp_004');
    });
  });

  describe('Task Completion', () => {
    it('should complete task successfully', () => {
      const task = taskQueue.createTask({
        title: 'Task to complete',
        description: 'Test',
        skillsRequired: ['Any']
      });

      taskQueue.addTask(task);
      taskQueue.assignTask(task.id, 'emp_001');
      
      const completed = taskQueue.completeTask(task.id, {
        output: 'Task completed successfully',
        artifactsCreated: ['file1.js', 'file2.js']
      });

      expect(completed).toBe(true);
      
      const updatedTask = taskQueue.getTaskById(task.id);
      expect(updatedTask?.status).toBe('completed');
      expect(updatedTask?.completedAt).toBeInstanceOf(Date);
      expect(updatedTask?.result).toEqual({
        output: 'Task completed successfully',
        artifactsCreated: ['file1.js', 'file2.js']
      });
    });

    it('should not complete unassigned task', () => {
      const task = taskQueue.createTask({
        title: 'Unassigned task',
        description: 'Test',
        skillsRequired: ['Any']
      });

      taskQueue.addTask(task);
      
      const completed = taskQueue.completeTask(task.id, {
        output: 'Should not work'
      });

      expect(completed).toBe(false);
      expect(taskQueue.getTaskById(task.id)?.status).toBe('pending');
    });

    it('should calculate task duration', () => {
      const task = taskQueue.createTask({
        title: 'Timed task',
        description: 'Test',
        skillsRequired: ['Any']
      });

      taskQueue.addTask(task);
      taskQueue.assignTask(task.id, 'emp_001');
      
      // Simulate some time passing
      const startTime = taskQueue.getTaskById(task.id)?.startedAt;
      
      taskQueue.completeTask(task.id, { output: 'Done' });
      
      const completedTask = taskQueue.getTaskById(task.id);
      expect(completedTask?.startedAt).toBeDefined();
      expect(completedTask?.completedAt).toBeDefined();
      expect(completedTask?.completedAt!.getTime()).toBeGreaterThan(
        completedTask?.startedAt!.getTime()
      );
    });
  });

  describe('Task Failure Handling', () => {
    it('should fail task with error', () => {
      const task = taskQueue.createTask({
        title: 'Task to fail',
        description: 'Test',
        skillsRequired: ['Any']
      });

      taskQueue.addTask(task);
      taskQueue.assignTask(task.id, 'emp_001');
      
      const failed = taskQueue.failTask(task.id, 'Database connection error');

      expect(failed).toBe(true);
      
      const updatedTask = taskQueue.getTaskById(task.id);
      expect(updatedTask?.status).toBe('failed');
      expect(updatedTask?.error).toBe('Database connection error');
      expect(updatedTask?.retryCount).toBe(1);
    });

    it('should retry failed task', () => {
      const task = taskQueue.createTask({
        title: 'Retry task',
        description: 'Test',
        skillsRequired: ['Any'],
        maxRetries: 3
      });

      taskQueue.addTask(task);
      taskQueue.assignTask(task.id, 'emp_001');
      taskQueue.failTask(task.id, 'First failure');
      
      const retried = taskQueue.retryTask(task.id);

      expect(retried).toBe(true);
      
      const updatedTask = taskQueue.getTaskById(task.id);
      expect(updatedTask?.status).toBe('pending');
      expect(updatedTask?.retryCount).toBe(1);
      expect(updatedTask?.assignedTo).toBeUndefined();
    });

    it('should not retry task beyond max retries', () => {
      const task = taskQueue.createTask({
        title: 'Max retry task',
        description: 'Test',
        skillsRequired: ['Any'],
        maxRetries: 2
      });

      taskQueue.addTask(task);
      
      // Fail twice
      taskQueue.assignTask(task.id, 'emp_001');
      taskQueue.failTask(task.id, 'First failure');
      taskQueue.retryTask(task.id);
      
      taskQueue.assignTask(task.id, 'emp_001');
      taskQueue.failTask(task.id, 'Second failure');
      taskQueue.retryTask(task.id);
      
      taskQueue.assignTask(task.id, 'emp_001');
      taskQueue.failTask(task.id, 'Third failure');
      
      const retried = taskQueue.retryTask(task.id);
      expect(retried).toBe(false);
      
      const updatedTask = taskQueue.getTaskById(task.id);
      expect(updatedTask?.status).toBe('failed');
      expect(updatedTask?.retryCount).toBe(3);
    });
  });

  describe('Task Dependencies', () => {
    it('should handle task dependencies', () => {
      const task1 = taskQueue.createTask({
        title: 'Prerequisite task',
        description: 'Must complete first',
        skillsRequired: ['Setup']
      });

      const task2 = taskQueue.createTask({
        title: 'Dependent task',
        description: 'Depends on task1',
        skillsRequired: ['Implementation'],
        dependencies: [task1.id]
      });

      taskQueue.addTask(task1);
      taskQueue.addTask(task2);

      // Task2 should not be available until task1 is complete
      const availableTasks = taskQueue.getAvailableTasks();
      expect(availableTasks).toHaveLength(1);
      expect(availableTasks[0].id).toBe(task1.id);

      // Complete task1
      taskQueue.assignTask(task1.id, 'emp_001');
      taskQueue.completeTask(task1.id, { output: 'Done' });

      // Now task2 should be available
      const newAvailableTasks = taskQueue.getAvailableTasks();
      expect(newAvailableTasks).toHaveLength(1);
      expect(newAvailableTasks[0].id).toBe(task2.id);
    });

    it('should check if dependencies are met', () => {
      const task1 = taskQueue.createTask({
        title: 'Task 1',
        description: 'First',
        skillsRequired: ['Any']
      });

      const task2 = taskQueue.createTask({
        title: 'Task 2',
        description: 'Second',
        skillsRequired: ['Any'],
        dependencies: [task1.id]
      });

      taskQueue.addTask(task1);
      taskQueue.addTask(task2);

      expect(taskQueue.areDependenciesMet(task2.id)).toBe(false);

      taskQueue.assignTask(task1.id, 'emp_001');
      taskQueue.completeTask(task1.id, { output: 'Done' });

      expect(taskQueue.areDependenciesMet(task2.id)).toBe(true);
    });
  });

  describe('Queue Statistics', () => {
    it('should provide queue statistics', () => {
      // Add various tasks
      const tasks = [
        { status: 'pending', priority: 'high' },
        { status: 'pending', priority: 'medium' },
        { status: 'in_progress', priority: 'high' },
        { status: 'completed', priority: 'low' },
        { status: 'failed', priority: 'medium' }
      ];

      tasks.forEach((taskConfig, index) => {
        const task = taskQueue.createTask({
          title: `Task ${index}`,
          description: 'Test',
          skillsRequired: ['Any'],
          priority: taskConfig.priority as any
        });
        
        taskQueue.addTask(task);
        
        if (taskConfig.status === 'in_progress') {
          taskQueue.assignTask(task.id, 'emp_001');
        } else if (taskConfig.status === 'completed') {
          taskQueue.assignTask(task.id, 'emp_001');
          taskQueue.completeTask(task.id, { output: 'Done' });
        } else if (taskConfig.status === 'failed') {
          taskQueue.assignTask(task.id, 'emp_001');
          taskQueue.failTask(task.id, 'Error');
        }
      });

      const stats = taskQueue.getStatistics();

      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(2);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.byPriority.high).toBe(2);
      expect(stats.byPriority.medium).toBe(2);
      expect(stats.byPriority.low).toBe(1);
    });

    it('should calculate average completion time', () => {
      const task1 = taskQueue.createTask({
        title: 'Fast task',
        description: 'Quick',
        skillsRequired: ['Any']
      });

      const task2 = taskQueue.createTask({
        title: 'Slow task',
        description: 'Slow',
        skillsRequired: ['Any']
      });

      taskQueue.addTask(task1);
      taskQueue.addTask(task2);

      taskQueue.assignTask(task1.id, 'emp_001');
      taskQueue.completeTask(task1.id, { output: 'Done' });

      taskQueue.assignTask(task2.id, 'emp_002');
      taskQueue.completeTask(task2.id, { output: 'Done' });

      const stats = taskQueue.getStatistics();
      expect(stats.averageCompletionTime).toBeGreaterThan(0);
    });
  });

  describe('Event Emitting', () => {
    it('should emit events on task creation', (done) => {
      taskQueue.on('taskCreated', (task) => {
        expect(task.title).toBe('Event test task');
        done();
      });

      taskQueue.createTask({
        title: 'Event test task',
        description: 'Test',
        skillsRequired: ['Any']
      });
    });

    it('should emit events on task assignment', (done) => {
      const task = taskQueue.createTask({
        title: 'Assignment event',
        description: 'Test',
        skillsRequired: ['Any']
      });

      taskQueue.addTask(task);

      taskQueue.on('taskAssigned', (data) => {
        expect(data.taskId).toBe(task.id);
        expect(data.employeeId).toBe('emp_001');
        done();
      });

      taskQueue.assignTask(task.id, 'emp_001');
    });

    it('should emit events on task completion', (done) => {
      const task = taskQueue.createTask({
        title: 'Completion event',
        description: 'Test',
        skillsRequired: ['Any']
      });

      taskQueue.addTask(task);
      taskQueue.assignTask(task.id, 'emp_001');

      taskQueue.on('taskCompleted', (data) => {
        expect(data.taskId).toBe(task.id);
        expect(data.result.output).toBe('Task done');
        done();
      });

      taskQueue.completeTask(task.id, { output: 'Task done' });
    });
  });

  describe('Task Filtering and Search', () => {
    it('should filter tasks by status', () => {
      // Create tasks with different statuses
      const pending = taskQueue.createTask({
        title: 'Pending',
        description: 'Test',
        skillsRequired: ['Any']
      });

      const inProgress = taskQueue.createTask({
        title: 'In Progress',
        description: 'Test',
        skillsRequired: ['Any']
      });

      const completed = taskQueue.createTask({
        title: 'Completed',
        description: 'Test',
        skillsRequired: ['Any']
      });

      taskQueue.addTask(pending);
      taskQueue.addTask(inProgress);
      taskQueue.addTask(completed);

      taskQueue.assignTask(inProgress.id, 'emp_001');
      
      taskQueue.assignTask(completed.id, 'emp_002');
      taskQueue.completeTask(completed.id, { output: 'Done' });

      const pendingTasks = taskQueue.getTasksByStatus('pending');
      const inProgressTasks = taskQueue.getTasksByStatus('in_progress');
      const completedTasks = taskQueue.getTasksByStatus('completed');

      expect(pendingTasks).toHaveLength(1);
      expect(inProgressTasks).toHaveLength(1);
      expect(completedTasks).toHaveLength(1);
    });

    it('should filter tasks by skill requirement', () => {
      const jsTask = taskQueue.createTask({
        title: 'JS Task',
        description: 'JavaScript',
        skillsRequired: ['JavaScript', 'Node.js']
      });

      const pythonTask = taskQueue.createTask({
        title: 'Python Task',
        description: 'Python',
        skillsRequired: ['Python', 'Django']
      });

      taskQueue.addTask(jsTask);
      taskQueue.addTask(pythonTask);

      const jsTasks = taskQueue.getTasksBySkill('JavaScript');
      const pythonTasks = taskQueue.getTasksBySkill('Python');

      expect(jsTasks).toHaveLength(1);
      expect(pythonTasks).toHaveLength(1);
      expect(jsTasks[0].title).toBe('JS Task');
      expect(pythonTasks[0].title).toBe('Python Task');
    });
  });
});