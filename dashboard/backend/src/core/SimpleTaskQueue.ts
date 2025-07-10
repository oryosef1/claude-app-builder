import { EventEmitter } from 'events';

interface Task {
  id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  priority: 'low' | 'medium' | 'high';
  estimatedDuration?: number;
  dependencies?: string[];
  maxRetries?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  assignedTo?: string;
  retryCount: number;
  result?: any;
  error?: string;
}

export class TaskQueue extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private taskIdCounter = 0;

  createTask(taskData: {
    title: string;
    description: string;
    skillsRequired: string[];
    priority?: 'low' | 'medium' | 'high';
    estimatedDuration?: number;
    dependencies?: string[];
    maxRetries?: number;
  }): Task {
    const task: Task = {
      id: `task_${++this.taskIdCounter}_${Date.now()}`,
      title: taskData.title,
      description: taskData.description,
      skillsRequired: taskData.skillsRequired,
      priority: taskData.priority || 'medium',
      estimatedDuration: taskData.estimatedDuration || 3600000, // 1 hour default
      dependencies: taskData.dependencies || [],
      maxRetries: taskData.maxRetries || 3,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0
    };

    this.emit('taskCreated', task);
    return task;
  }

  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  getTaskById(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getQueueSize(): number {
    return this.tasks.size;
  }

  getPendingTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.status === 'pending');
  }

  getNextTask(): Task | undefined {
    const pendingTasks = this.getPendingTasks()
      .filter(task => this.areDependenciesMet(task.id));
    
    // Sort by priority (high > medium > low)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    pendingTasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    
    return pendingTasks[0];
  }

  assignTask(taskId: string, employeeId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending' || task.assignedTo) {
      return false;
    }

    task.assignedTo = employeeId;
    task.status = 'in_progress';
    task.startedAt = new Date();

    this.emit('taskAssigned', { taskId, employeeId });
    return true;
  }

  getTasksByAssignee(employeeId: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.assignedTo === employeeId);
  }

  completeTask(taskId: string, result: any): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'in_progress') {
      return false;
    }

    task.status = 'completed';
    task.completedAt = new Date();
    task.result = result;

    this.emit('taskCompleted', { taskId, result });
    return true;
  }

  failTask(taskId: string, error: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'in_progress') {
      return false;
    }

    task.status = 'failed';
    task.error = error;
    task.retryCount++;

    this.emit('taskFailed', { taskId, error });
    return true;
  }

  retryTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'failed' || task.retryCount >= task.maxRetries!) {
      return false;
    }

    task.status = 'pending';
    task.assignedTo = undefined;
    task.startedAt = undefined;
    task.error = undefined;

    this.emit('taskRetried', { taskId, retryCount: task.retryCount });
    return true;
  }

  areDependenciesMet(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every(depId => {
      const depTask = this.tasks.get(depId);
      return depTask && depTask.status === 'completed';
    });
  }

  getAvailableTasks(): Task[] {
    return this.getPendingTasks().filter(task => this.areDependenciesMet(task.id));
  }

  getTasksByStatus(status: Task['status']): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  getTasksBySkill(skill: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => 
      task.skillsRequired.includes(skill)
    );
  }

  getStatistics(): {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    byPriority: Record<string, number>;
    averageCompletionTime: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    let totalCompletionTime = 0;
    completedTasks.forEach(task => {
      if (task.startedAt && task.completedAt) {
        totalCompletionTime += task.completedAt.getTime() - task.startedAt.getTime();
      }
    });

    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: completedTasks.length,
      failed: tasks.filter(t => t.status === 'failed').length,
      byPriority: {
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length
      },
      averageCompletionTime: completedTasks.length > 0 
        ? totalCompletionTime / completedTasks.length 
        : 0
    };
  }
}