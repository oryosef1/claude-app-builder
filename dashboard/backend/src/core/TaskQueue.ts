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
import { AgentRegistry } from './AgentRegistry.js';
import { PersistenceService } from './PersistenceService.js';

export class TaskQueue extends EventEmitter {
  private taskQueue: Queue | null = null;
  private logger: winston.Logger;
  private agentRegistry: AgentRegistry;
  private persistenceService: PersistenceService;
  private employees: Map<string, AIEmployee> = new Map();
  private activeTasks: Map<string, Task> = new Map();
  private taskHistory: Task[] = [];
  private readonly maxHistorySize: number = 1000;
  private redisAvailable: boolean = false;
  private readonly defaultJobOptions = {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  };

  constructor(logger: winston.Logger, agentRegistry: AgentRegistry, redisConfig?: any) {
    super();
    this.logger = logger;
    this.agentRegistry = agentRegistry;
    this.persistenceService = new PersistenceService(logger);
    this.persistenceService.initialize();
    
    // Try to initialize Redis-based queue with fallback
    this.initializeTaskQueue(redisConfig);
  }

  private async initializeTaskQueue(redisConfig?: any): Promise<void> {
    try {
      const queueOptions: QueueOptions = {
        redis: redisConfig || {
          host: process.env['REDIS_HOST'] || 'localhost',
          port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
          password: process.env['REDIS_PASSWORD'],
          db: parseInt(process.env['REDIS_DB'] || '0', 10),
          connectTimeout: 5000,  // 5 second timeout
          lazyConnect: true      // Don't connect immediately
        },
        settings: {
          stalledInterval: 30000,
          maxStalledCount: 3
        }
      };

      this.taskQueue = new Bull('ai-task-queue', queueOptions);
      
      // Test Redis connection
      await this.taskQueue.isReady();
      this.redisAvailable = true;
      this.logger.info('Redis task queue initialized successfully');
      
      this.setupQueueEvents();
      this.setupJobProcessor();
    } catch (error) {
      this.logger.warn('Redis not available, falling back to in-memory task processing:', error);
      this.redisAvailable = false;
      this.taskQueue = null;
      
      // Set up in-memory task processing
      this.setupInMemoryProcessing();
    }
  }

  private setupInMemoryProcessing(): void {
    this.logger.info('Setting up in-memory task processing (Redis unavailable)');
    // In-memory processing doesn't need queue events
    // Tasks will be processed immediately when assigned
  }

  private setupQueueEvents(): void {
    if (!this.taskQueue) return;
    
    this.taskQueue.on('ready', () => {
      this.logger.info('Task queue is ready');
    });

    this.taskQueue.on('error', (error) => {
      this.logger.error('Task queue error:', error);
      this.emit('queue_error', error);
      
      // If Redis fails during operation, switch to in-memory mode
      if (!this.redisAvailable) {
        this.logger.warn('Switching to in-memory task processing due to Redis errors');
        this.taskQueue = null;
        this.setupInMemoryProcessing();
      }
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
    if (!this.taskQueue) return;
    
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
      
      // Free up employee resources
      if (task.assignedTo) {
        this.releaseEmployeeResources(task.assignedTo, task);
      }
      
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
        // Free up employee resources on permanent failure
        if (task.assignedTo) {
          this.releaseEmployeeResources(task.assignedTo, task);
        }
        
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

  private releaseEmployeeResources(employeeId: string, task: Task): void {
    const employee = this.agentRegistry.getEmployeeById(employeeId);
    if (!employee) return;

    // Update employee status back to active
    this.agentRegistry.updateEmployeeStatus(employeeId, 'active');
    
    // Remove project assignment
    this.agentRegistry.removeProject(employeeId, task.id);
    
    // Reduce workload
    const workloadDecrease = this.calculateWorkloadIncrease(task.priority, task.estimatedDuration);
    const newWorkload = Math.max(0, employee.workload - workloadDecrease);
    this.agentRegistry.updateEmployeeWorkload(employeeId, newWorkload);
    
    // Update performance metrics
    if (task.status === 'completed') {
      this.updateEmployeePerformanceMetrics(employeeId, task, true);
    } else if (task.status === 'failed') {
      this.updateEmployeePerformanceMetrics(employeeId, task, false);
    }
    
    this.logger.info(`Released resources for employee ${employeeId} (workload: ${newWorkload}%)`);
  }

  private updateEmployeePerformanceMetrics(employeeId: string, task: Task, success: boolean): void {
    const employee = this.agentRegistry.getEmployeeById(employeeId);
    if (!employee) return;

    // Update role-specific performance metrics
    if (success) {
      switch (employee.role) {
        case 'Senior Developer':
          this.agentRegistry.updatePerformanceMetric(employeeId, 'features_delivered', 
            (employee.performance_metrics['features_delivered'] || 0) + 1);
          break;
        case 'Junior Developer':
          this.agentRegistry.updatePerformanceMetric(employeeId, 'tasks_completed', 
            (employee.performance_metrics['tasks_completed'] || 0) + 1);
          break;
        case 'QA Engineer':
          this.agentRegistry.updatePerformanceMetric(employeeId, 'quality_improvements', 
            (employee.performance_metrics['quality_improvements'] || 0) + 1);
          break;
        case 'DevOps Engineer':
          this.agentRegistry.updatePerformanceMetric(employeeId, 'deployment_success', 
            Math.min(100, (employee.performance_metrics['deployment_success'] || 0) + 1));
          break;
        case 'Project Manager':
          this.agentRegistry.updatePerformanceMetric(employeeId, 'projects_completed', 
            (employee.performance_metrics['projects_completed'] || 0) + 1);
          break;
      }
    } else {
      // Handle failure metrics
      if (employee.role === 'Senior Developer') {
        const currentBugRate = employee.performance_metrics['bug_rate'] || 0;
        this.agentRegistry.updatePerformanceMetric(employeeId, 'bug_rate', currentBugRate + 1);
      }
    }

    // Update general performance metrics
    const taskCompletionRate = task.actualDuration && task.estimatedDuration 
      ? (task.estimatedDuration / task.actualDuration) * 100 
      : 100;
    
    if (success && taskCompletionRate >= 90) {
      // Reward on-time completion
      const currentEfficiency = employee.performance_metrics['team_efficiency'] || 100;
      this.agentRegistry.updatePerformanceMetric(employeeId, 'team_efficiency', 
        Math.min(100, currentEfficiency + 1));
    }
  }

  private async saveTasks(): Promise<void> {
    const allTasks = [...Array.from(this.activeTasks.values()), ...this.taskHistory];
    await this.persistenceService.saveTasks(allTasks);
  }

  private moveToHistory(task: Task): void {
    // Create a lightweight copy without large properties to prevent memory issues
    const lightweightTask = {
      ...task,
      // Limit description length in history
      description: task.description.length > 500 ? 
        task.description.substring(0, 500) + '...' : task.description
    };
    
    this.taskHistory.push(lightweightTask);
    
    // More aggressive cleanup to prevent memory leaks
    if (this.taskHistory.length > this.maxHistorySize) {
      // Keep only the most recent 80% of tasks
      this.taskHistory = this.taskHistory.slice(-Math.floor(this.maxHistorySize * 0.8));
      this.logger.info(`Cleaned up task history, now contains ${this.taskHistory.length} tasks`);
    }
    
    // Periodic memory cleanup - run garbage collection hint
    if (this.taskHistory.length % 100 === 0) {
      if (global.gc) {
        global.gc();
        this.logger.debug('Performed garbage collection');
      }
    }
    
    // Save tasks after moving to history
    this.saveTasks().catch(error => {
      this.logger.warn('Failed to save tasks to persistence:', error);
    });
  }

  async updateTaskStatus(taskId: string, status: Task['status']): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.status = status;
      
      if (status === 'assigned') {
        task.assignedAt = new Date();
      }
      
      // Save tasks after status update
      await this.saveTasks();
      
      this.emit('task_status_updated', { taskId, status });
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'priority', 'skillsRequired', 'estimatedDuration', 'tags', 'metadata'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        (task as any)[key] = (updates as any)[key];
      }
    });

    // task.updatedAt = new Date(); // Remove updatedAt property that doesn't exist

    // Save tasks after update
    await this.saveTasks();

    this.logger.info(`Updated task ${taskId}`);
    this.emit('task_updated', { taskId, updates });

    return task;
  }

  async loadEmployees(employees: AIEmployee[]): Promise<void> {
    this.employees.clear();
    employees.forEach(employee => {
      this.employees.set(employee.id, employee);
    });
    this.logger.info(`Loaded ${employees.length} employees for task assignment`);
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<string> {
    // Validate input limits to prevent crashes
    this.validateTaskData(taskData);
    
    const taskId = generateId();
    
    const task: Task = {
      id: taskId,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      ...taskData,
      maxRetries: taskData.maxRetries || 3,
      comments: []
    };

    this.activeTasks.set(taskId, task);
    
    this.logger.info(`Created task ${taskId}: ${task.title}`);
    this.emit('task_created', { taskId, task });
    
    // Save tasks after creation with error handling
    try {
      await this.saveTasks();
    } catch (error) {
      this.logger.warn('Failed to save tasks to persistence, continuing anyway:', error);
    }
    
    return taskId;
  }

  private validateTaskData(taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'retryCount'>): void {
    const MAX_TITLE_LENGTH = 200;
    const MAX_DESCRIPTION_LENGTH = 10000;
    const MAX_SKILLS_COUNT = 20;
    const MAX_SKILL_LENGTH = 50;
    
    if (!taskData.title || taskData.title.trim().length === 0) {
      throw new Error('Task title is required');
    }
    
    if (taskData.title.length > MAX_TITLE_LENGTH) {
      throw new Error(`Task title too long (max ${MAX_TITLE_LENGTH} characters)`);
    }
    
    if (!taskData.description || taskData.description.trim().length === 0) {
      throw new Error('Task description is required');
    }
    
    if (taskData.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Task description too long (max ${MAX_DESCRIPTION_LENGTH} characters)`);
    }
    
    if (!Array.isArray(taskData.skillsRequired)) {
      throw new Error('skillsRequired must be an array');
    }
    
    if (taskData.skillsRequired.length > MAX_SKILLS_COUNT) {
      throw new Error(`Too many skills required (max ${MAX_SKILLS_COUNT})`);
    }
    
    for (const skill of taskData.skillsRequired) {
      if (typeof skill !== 'string' || skill.length > MAX_SKILL_LENGTH) {
        throw new Error(`Invalid skill: must be string under ${MAX_SKILL_LENGTH} characters`);
      }
    }
    
    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (taskData.priority && !validPriorities.includes(taskData.priority)) {
      throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }
    
    // Validate estimated duration (max 24 hours)
    if (taskData.estimatedDuration && (taskData.estimatedDuration < 0 || taskData.estimatedDuration > 24 * 60 * 60 * 1000)) {
      throw new Error('Invalid estimated duration (must be between 0 and 24 hours)');
    }
  }

  // Alias for createTask - accepts a full Task object and returns the task ID
  async addTask(task: Task): Promise<string> {
    // If task already has an ID, use it
    if (task.id && !this.activeTasks.has(task.id)) {
      // Ensure comments array exists for legacy tasks
      if (!task.comments) {
        task.comments = [];
      }
      
      this.activeTasks.set(task.id, task);
      this.logger.info(`Added task ${task.id}: ${task.title}`);
      this.emit('task_created', { taskId: task.id, task });
      
      // Save tasks after adding
      await this.saveTasks();
      
      return task.id;
    }
    
    // Otherwise create a new task
    const { id, createdAt, status, retryCount, ...taskData } = task;
    return this.createTask(taskData);
  }

  async assignTask(taskId: string, employeeId?: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'pending') {
      throw new Error(`Task ${taskId} is not in pending status`);
    }

    let targetEmployee: any = null;

    if (employeeId) {
      targetEmployee = this.agentRegistry.getEmployeeById(employeeId);
      if (!targetEmployee) {
        throw new Error(`Employee ${employeeId} not found`);
      }
    } else {
      // Use AgentRegistry for intelligent skill matching
      targetEmployee = this.agentRegistry.findBestEmployeeForTask(
        task.skillsRequired,
        task.priority as 'low' | 'medium' | 'high'
      );
    }

    if (!targetEmployee) {
      throw new Error('No available employees found for task assignment');
    }

    if (targetEmployee.status !== 'active') {
      throw new Error(`Employee ${targetEmployee.id} is not available`);
    }

    // Update task assignment
    task.assignedTo = targetEmployee.id;
    task.status = 'assigned';
    task.assignedAt = new Date();

    // Update employee status in AgentRegistry
    this.agentRegistry.updateEmployeeStatus(targetEmployee.id, 'busy');
    this.agentRegistry.assignProject(targetEmployee.id, taskId);

    // Update workload based on task priority
    const workloadIncrease = this.calculateWorkloadIncrease(task.priority, task.estimatedDuration);
    const newWorkload = Math.min(100, targetEmployee.workload + workloadIncrease);
    this.agentRegistry.updateEmployeeWorkload(targetEmployee.id, newWorkload);

    const jobData = {
      taskId,
      employeeId: targetEmployee.id,
      processId: `process_${taskId}`
    };

    if (this.redisAvailable && this.taskQueue) {
      // Use Redis-based task queue
      const priority = this.getPriorityValue(task.priority);
      
      try {
        await this.taskQueue.add('ai-task', jobData, {
          ...this.defaultJobOptions,
          priority,
          delay: 0
        });
      } catch (error) {
        this.logger.warn('Redis queue failed, falling back to in-memory processing:', error);
        this.redisAvailable = false;
        await this.processTaskInMemory(jobData);
      }
    } else {
      // Use in-memory processing
      await this.processTaskInMemory(jobData);
    }

    this.logger.info(`Assigned task ${taskId} to employee ${targetEmployee.id} (workload: ${newWorkload}%)`);
    this.emit('task_assigned', { taskId, employeeId: targetEmployee.id });
  }

  private async processTaskInMemory(jobData: { taskId: string; employeeId: string; processId: string }): Promise<void> {
    const { taskId, employeeId, processId } = jobData;
    
    this.logger.info(`Processing task ${taskId} in-memory with employee ${employeeId}`);
    
    try {
      // Simulate async task processing
      setTimeout(async () => {
        try {
          this.updateTaskStatus(taskId, 'in_progress');
          this.emit('task_started', { taskId, employeeId, processId });
          
          const result = await this.executeTask(taskId, employeeId, processId);
          this.handleJobCompletion({ data: jobData } as any, result);
        } catch (error) {
          this.handleJobFailure({ data: jobData } as any, error as Error);
        }
      }, 1000); // 1 second delay to simulate async processing
      
    } catch (error) {
      this.logger.error(`In-memory task processing failed for ${taskId}:`, error);
      throw error;
    }
  }

  private calculateWorkloadIncrease(priority: Task['priority'], estimatedDuration: number): number {
    // Base workload increase based on priority
    let baseIncrease = 0;
    switch (priority) {
      case 'urgent': baseIncrease = 30; break;
      case 'high': baseIncrease = 20; break;
      case 'medium': baseIncrease = 15; break;
      case 'low': baseIncrease = 10; break;
      default: baseIncrease = 15;
    }
    
    // Adjust based on estimated duration (longer tasks = more workload)
    const durationMultiplier = Math.min(2, estimatedDuration / (30 * 60 * 1000)); // 30 minutes as base
    return Math.ceil(baseIncrease * durationMultiplier);
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

    // Try to remove from Bull queue, but don't fail if it hangs
    if (this.taskQueue) {
      try {
        const jobs = await Promise.race([
          this.taskQueue.getJobs(['waiting', 'active', 'delayed']),
        new Promise<any[]>((_, reject) => 
          setTimeout(() => reject(new Error('Queue timeout')), 2000)
        )
      ]);
      
      const job = jobs.find(j => j.data.taskId === taskId);
      if (job) {
        await job.remove();
      }
    } catch (error) {
      this.logger.warn(`Could not remove job from queue: ${error}`);
      // Continue anyway - the important part is removing from activeTasks
    }

    // Free up employee resources using AgentRegistry
    if (task.assignedTo) {
      this.releaseEmployeeResources(task.assignedTo, task);
    }

    this.activeTasks.delete(taskId);
    this.logger.info(`Cancelled task ${taskId}`);
    this.emit('task_cancelled', { taskId });
    
    // Save tasks after cancellation
    await this.saveTasks();
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // For non-completed tasks, try to remove from Bull queue
    if (task.status !== 'completed' && task.status !== 'failed' && this.taskQueue) {
      try {
        const jobs = await Promise.race([
          this.taskQueue.getJobs(['waiting', 'active', 'delayed']),
          new Promise<any[]>((_, reject) => 
            setTimeout(() => reject(new Error('Queue timeout')), 2000)
          )
        ]);
        
        const job = jobs.find(j => j.data.taskId === taskId);
        if (job) {
          await job.remove();
        }
      } catch (error) {
        this.logger.warn(`Could not remove job from queue: ${error}`);
        // Continue anyway - the important part is removing from activeTasks
      }
    }

    // Free up employee resources using AgentRegistry
    if (task.assignedTo) {
      this.releaseEmployeeResources(task.assignedTo, task);
    }

    this.activeTasks.delete(taskId);
    this.logger.info(`Deleted task ${taskId}`);
    this.emit('task_deleted', { taskId });
    
    // Save tasks after deletion
    await this.saveTasks();
  }

  async resolveTask(taskId: string, comment?: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'completed') {
      throw new Error(`Cannot resolve task ${taskId} in status ${task.status}. Task must be completed first.`);
    }

    task.status = 'resolved';
    task.resolvedAt = new Date();
    
    if (comment) {
      const { generateId } = await import('../utils/index.js');
      task.comments.push({
        id: generateId(),
        text: comment,
        authorId: 'system',
        authorName: 'System',
        createdAt: new Date(),
        type: 'resolution'
      });
    }

    this.logger.info(`Resolved task ${taskId}`);
    this.emit('task_resolved', { taskId });
    
    // Save tasks after resolution
    await this.saveTasks();
  }

  async reopenTask(taskId: string, reason: string, assignTo?: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'completed' && task.status !== 'resolved') {
      throw new Error(`Cannot reopen task ${taskId} in status ${task.status}. Task must be completed or resolved.`);
    }

    task.status = 'pending';  // Set back to pending so it can be assigned again
    task.reopenedAt = new Date();
    task.retryCount += 1;
    
    if (assignTo) {
      task.assignedTo = assignTo;
    }

    const { generateId } = await import('../utils/index.js');
    task.comments.push({
      id: generateId(),
      text: reason,
      authorId: 'system',
      authorName: 'System',
      createdAt: new Date(),
      type: 'reopen_reason'
    });

    this.logger.info(`Reopened task ${taskId} with reason: ${reason}`);
    this.emit('task_reopened', { taskId });
    
    // Save tasks after reopening
    await this.saveTasks();
  }

  getTask(taskId: string): Task | null {
    return this.activeTasks.get(taskId) || null;
  }

  getAllTasks(): Task[] {
    return Array.from(this.activeTasks.values());
  }

  // Alias for getAllTasks to match expected API
  async getTasks(): Promise<Task[]> {
    return this.getAllTasks();
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
    if (!this.taskQueue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
    
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
    if (!this.taskQueue) {
      this.logger.warn('Cannot pause queue: Redis not available');
      return;
    }
    await this.taskQueue.pause();
    this.logger.info('Task queue paused');
  }

  async resumeQueue(): Promise<void> {
    if (!this.taskQueue) {
      this.logger.warn('Cannot resume queue: Redis not available');
      return;
    }
    await this.taskQueue.resume();
    this.logger.info('Task queue resumed');
  }

  // Advanced task distribution methods
  async assignTasksToTeam(taskIds: string[], teamRequirements: { 
    skills: string[], 
    teamSize: number, 
    department?: string 
  }): Promise<{ taskId: string; employeeId: string }[]> {
    const assignments: { taskId: string; employeeId: string }[] = [];
    
    // Get suitable team members
    const teamMembers = this.agentRegistry.findEmployeesForMultiAgentTask(
      teamRequirements.skills,
      teamRequirements.teamSize,
      { department: teamRequirements.department }
    );

    if (teamMembers.length === 0) {
      throw new Error('No suitable team members found for task assignment');
    }

    // Assign tasks to team members using round-robin with skill preference
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      if (!taskId) continue;
      const task = this.activeTasks.get(taskId);
      
      if (!task) {
        this.logger.warn(`Task ${taskId} not found, skipping assignment`);
        continue;
      }

      // Find best team member for this specific task
      const bestMember = teamMembers.reduce((best, member) => {
        const memberSkillMatch = task.skillsRequired.filter(skill => 
          member.skills.includes(skill)
        ).length;
        const bestSkillMatch = task.skillsRequired.filter(skill => 
          best.skills.includes(skill)
        ).length;
        
        if (memberSkillMatch > bestSkillMatch) return member;
        if (memberSkillMatch === bestSkillMatch && member.workload < best.workload) return member;
        return best;
      });

      try {
        await this.assignTask(taskId, bestMember.id);
        assignments.push({ taskId, employeeId: bestMember.id });
        this.logger.info(`Assigned task ${taskId} to team member ${bestMember.id}`);
      } catch (error) {
        this.logger.error(`Failed to assign task ${taskId} to ${bestMember.id}:`, error);
      }
    }

    return assignments;
  }

  async redistributeWorkload(): Promise<void> {
    const overloadedThreshold = 80;
    const underloadedThreshold = 20;
    
    const employees = this.agentRegistry.getAllEmployees();
    const overloadedEmployees = employees.filter(emp => emp.workload > overloadedThreshold);
    const underloadedEmployees = employees.filter(emp => emp.workload < underloadedThreshold);

    if (overloadedEmployees.length === 0 || underloadedEmployees.length === 0) {
      this.logger.info('No workload redistribution needed');
      return;
    }

    for (const overloadedEmployee of overloadedEmployees) {
      const pendingTasks = this.getTasksByEmployee(overloadedEmployee.id)
        .filter(task => task.status === 'pending');

      for (const task of pendingTasks) {
        // Find best underloaded employee for this task
        const bestCandidate = this.agentRegistry.findBestEmployeeForTask(
          task.skillsRequired,
          task.priority as 'low' | 'medium' | 'high'
        );

        if (bestCandidate && bestCandidate.workload < underloadedThreshold) {
          try {
            // Cancel current assignment
            await this.cancelTask(task.id);
            
            // Reassign to underloaded employee
            await this.assignTask(task.id, bestCandidate.id);
            
            this.logger.info(`Redistributed task ${task.id} from ${overloadedEmployee.id} to ${bestCandidate.id}`);
            break; // Only redistribute one task per overloaded employee per cycle
          } catch (error) {
            this.logger.error(`Failed to redistribute task ${task.id}:`, error);
          }
        }
      }
    }
  }

  async getTaskRecommendations(requiredSkills: string[], priority: 'low' | 'medium' | 'high' = 'medium'): Promise<{
    bestEmployee: any;
    alternativeEmployees: any[];
    estimatedWaitTime: number;
  }> {
    const bestEmployee = this.agentRegistry.findBestEmployeeForTask(requiredSkills, priority);
    const alternativeEmployees = requiredSkills[0] 
      ? this.agentRegistry.getEmployeesBySkill(requiredSkills[0])
          .filter(emp => emp.id !== bestEmployee?.id)
          .slice(0, 3)
      : [];

    // Calculate estimated wait time based on current workload
    const estimatedWaitTime = bestEmployee ? 
      Math.max(0, (bestEmployee.workload - 50) * 60000) : // 1 minute per workload point over 50%
      300000; // 5 minutes default

    return {
      bestEmployee,
      alternativeEmployees,
      estimatedWaitTime
    };
  }

  async cleanup(): Promise<void> {
    if (this.taskQueue) {
      await this.taskQueue.close();
    }
    this.logger.info('Task queue cleaned up');
  }
}