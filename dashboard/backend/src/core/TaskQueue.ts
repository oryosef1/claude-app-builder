import Bull, { Queue, Job, QueueOptions } from 'bull';
import { EventEmitter } from 'events';
import winston from 'winston';
import { 
  Task, 
  TaskResult, 
  AIEmployee
} from '../types/index.js';
import { 
  generateId, 
  findBestEmployee, 
  delay
} from '../utils/index.js';

export class TaskQueue extends EventEmitter {
  private taskQueue: Queue;
  private logger: winston.Logger;
  private employees: Map<string, AIEmployee> = new Map();
  private activeTasks: Map<string, Task> = new Map();
  private taskHistory: Task[] = [];
  private readonly maxHistorySize: number = 1000;
  private readonly defaultJobOptions = {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  };

  constructor(logger: winston.Logger, redisConfig?: any) {
    super();
    this.logger = logger;
    
    const queueOptions: QueueOptions = {
      redis: redisConfig || {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
        password: process.env['REDIS_PASSWORD'],
        db: parseInt(process.env['REDIS_DB'] || '0', 10)
      },
      settings: {
        stalledInterval: 30000,
        maxStalledCount: 3
      }
    };

    this.taskQueue = new Bull('ai-task-queue', queueOptions);
    this.setupQueueEvents();
    this.setupJobProcessor();
  }

  private setupQueueEvents(): void {
    this.taskQueue.on('ready', () => {
      this.logger.info('Task queue is ready');
    });

    this.taskQueue.on('error', (error) => {
      this.logger.error('Task queue error:', error);
      this.emit('queue_error', error);
    });

    this.taskQueue.on('waiting', (jobId) => {
      this.logger.info(`Job ${jobId} is waiting`);
    });

    this.taskQueue.on('active', (job) => {
      this.logger.info(`Job ${job.id} started processing`);
      this.updateTaskStatus(job.data.taskId, 'in_progress');
    });

    this.taskQueue.on('completed', (job, result) => {
      this.logger.info(`Job ${job.id} completed`);
      this.handleJobCompletion(job, result);
    });

    this.taskQueue.on('failed', (job, error) => {
      this.logger.error(`Job ${job.id} failed:`, error);
      this.handleJobFailure(job, error);
    });

    this.taskQueue.on('stalled', (job) => {
      this.logger.warn(`Job ${job.id} stalled`);
    });
  }

  private setupJobProcessor(): void {
    this.taskQueue.process('ai-task', async (job: Job) => {
      const { taskId, employeeId, processId } = job.data;
      
      this.logger.info(`Processing task ${taskId} with employee ${employeeId}`);
      
      try {
        const result = await this.executeTask(taskId, employeeId, processId);
        return result;
      } catch (error) {
        this.logger.error(`Task ${taskId} execution failed:`, error);
        throw error;
      }
    });
  }

  private async executeTask(taskId: string, employeeId: string, processId: string): Promise<TaskResult> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const startTime = Date.now();
    
    try {
      task.processId = processId;
      task.startedAt = new Date();
      
      this.emit('task_started', { taskId, employeeId, processId });
      
      const result = await this.processTaskWithTimeout(task, employeeId, processId);
      
      const endTime = Date.now();
      task.actualDuration = endTime - startTime;
      task.completedAt = new Date();
      task.result = result;
      
      return result;
      
    } catch (error) {
      const endTime = Date.now();
      task.actualDuration = endTime - startTime;
      
      const result: TaskResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          executionTime: endTime - startTime,
          memoryUsed: process.memoryUsage().heapUsed,
          apiCalls: 0
        }
      };
      
      task.result = result;
      throw error;
    }
  }

  private async processTaskWithTimeout(task: Task, employeeId: string, _processId: string): Promise<TaskResult> {
    const timeout = task.estimatedDuration * 2; // 2x estimated duration as timeout
    
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${timeout}ms`));
      }, timeout);

      try {
        await delay(1000);
        
        const result: TaskResult = {
          success: true,
          output: `Task "${task.title}" completed successfully by ${employeeId}`,
          metrics: {
            executionTime: Date.now() - task.startedAt!.getTime(),
            memoryUsed: process.memoryUsage().heapUsed,
            apiCalls: 1
          }
        };
        
        clearTimeout(timeoutId);
        resolve(result);
        
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private handleJobCompletion(job: Job, result: TaskResult): void {
    const taskId = job.data.taskId;
    const task = this.activeTasks.get(taskId);
    
    if (task) {
      task.status = 'completed';
      task.result = result;
      
      this.moveToHistory(task);
      this.activeTasks.delete(taskId);
      
      this.emit('task_completed', { taskId, result });
      this.logger.info(`Task ${taskId} completed successfully`);
    }
  }

  private handleJobFailure(job: Job, error: Error): void {
    const taskId = job.data.taskId;
    const task = this.activeTasks.get(taskId);
    
    if (task) {
      task.status = 'failed';
      task.retryCount++;
      
      if (task.retryCount >= task.maxRetries) {
        this.moveToHistory(task);
        this.activeTasks.delete(taskId);
        
        this.emit('task_failed', { taskId, error });
        this.logger.error(`Task ${taskId} failed permanently after ${task.retryCount} attempts`);
      } else {
        this.logger.warn(`Task ${taskId} failed, retry ${task.retryCount}/${task.maxRetries}`);
        this.emit('task_retry', { taskId, retryCount: task.retryCount, error });
      }
    }
  }

  private moveToHistory(task: Task): void {
    this.taskHistory.push({ ...task });
    
    if (this.taskHistory.length > this.maxHistorySize) {
      this.taskHistory = this.taskHistory.slice(-Math.floor(this.maxHistorySize * 0.8));
    }
  }

  private updateTaskStatus(taskId: string, status: Task['status']): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.status = status;
      
      if (status === 'assigned') {
        task.assignedAt = new Date();
      }
      
      this.emit('task_status_updated', { taskId, status });
    }
  }

  async loadEmployees(employees: AIEmployee[]): Promise<void> {
    this.employees.clear();
    employees.forEach(employee => {
      this.employees.set(employee.id, employee);
    });
    this.logger.info(`Loaded ${employees.length} employees for task assignment`);
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<string> {
    const taskId = generateId();
    
    const task: Task = {
      id: taskId,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      ...taskData,
      maxRetries: taskData.maxRetries || 3
    };

    this.activeTasks.set(taskId, task);
    
    this.logger.info(`Created task ${taskId}: ${task.title}`);
    this.emit('task_created', { taskId, task });
    
    return taskId;
  }

  async assignTask(taskId: string, employeeId?: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'pending') {
      throw new Error(`Task ${taskId} is not in pending status`);
    }

    let targetEmployee: AIEmployee | null = null;

    if (employeeId) {
      targetEmployee = this.employees.get(employeeId) || null;
      if (!targetEmployee) {
        throw new Error(`Employee ${employeeId} not found`);
      }
    } else {
      targetEmployee = findBestEmployee(
        Array.from(this.employees.values()),
        task.skillsRequired
      );
    }

    if (!targetEmployee) {
      throw new Error('No available employees found for task assignment');
    }

    if (targetEmployee.status !== 'available') {
      throw new Error(`Employee ${targetEmployee.id} is not available`);
    }

    task.assignedTo = targetEmployee.id;
    task.status = 'assigned';
    task.assignedAt = new Date();

    targetEmployee.status = 'busy';
    targetEmployee.currentTask = taskId;

    const jobData = {
      taskId,
      employeeId: targetEmployee.id,
      processId: `process_${taskId}`
    };

    const priority = this.getPriorityValue(task.priority);
    
    await this.taskQueue.add('ai-task', jobData, {
      ...this.defaultJobOptions,
      priority,
      delay: 0
    });

    this.logger.info(`Assigned task ${taskId} to employee ${targetEmployee.id}`);
    this.emit('task_assigned', { taskId, employeeId: targetEmployee.id });
  }

  private getPriorityValue(priority: Task['priority']): number {
    switch (priority) {
      case 'urgent': return 10;
      case 'high': return 5;
      case 'medium': return 0;
      case 'low': return -5;
      default: return 0;
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === 'completed' || task.status === 'failed') {
      throw new Error(`Cannot cancel task ${taskId} in status ${task.status}`);
    }

    const jobs = await this.taskQueue.getJobs(['waiting', 'active', 'delayed']);
    const job = jobs.find(j => j.data.taskId === taskId);
    
    if (job) {
      await job.remove();
    }

    if (task.assignedTo) {
      const employee = this.employees.get(task.assignedTo);
      if (employee && employee.currentTask) {
        employee.status = 'available';
        delete employee.currentTask;
      }
    }

    this.activeTasks.delete(taskId);
    this.logger.info(`Cancelled task ${taskId}`);
    this.emit('task_cancelled', { taskId });
  }

  getTask(taskId: string): Task | null {
    return this.activeTasks.get(taskId) || null;
  }

  getAllTasks(): Task[] {
    return Array.from(this.activeTasks.values());
  }

  getTaskHistory(limit: number = 100): Task[] {
    return this.taskHistory.slice(-limit);
  }

  getTasksByStatus(status: Task['status']): Task[] {
    return this.getAllTasks().filter(task => task.status === status);
  }

  getTasksByEmployee(employeeId: string): Task[] {
    return this.getAllTasks().filter(task => task.assignedTo === employeeId);
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.taskQueue.getWaiting(),
      this.taskQueue.getActive(),
      this.taskQueue.getCompleted(),
      this.taskQueue.getFailed(),
      this.taskQueue.getDelayed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    };
  }

  getTaskStats(): {
    pending: number;
    assigned: number;
    inProgress: number;
    completed: number;
    failed: number;
  } {
    const tasks = this.getAllTasks();
    
    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      assigned: tasks.filter(t => t.status === 'assigned').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: this.taskHistory.filter(t => t.status === 'completed').length,
      failed: this.taskHistory.filter(t => t.status === 'failed').length
    };
  }

  async pauseQueue(): Promise<void> {
    await this.taskQueue.pause();
    this.logger.info('Task queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.taskQueue.resume();
    this.logger.info('Task queue resumed');
  }

  async cleanup(): Promise<void> {
    await this.taskQueue.close();
    this.logger.info('Task queue cleaned up');
  }
}