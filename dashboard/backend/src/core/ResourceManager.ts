import { EventEmitter } from 'events';
import winston from 'winston';
import os from 'os';
import { AgentRegistry } from './AgentRegistry.js';
import { ProcessManager } from './ProcessManager.js';
import { TaskQueue } from './TaskQueue.js';
import type { AIEmployee, Task, ClaudeProcess } from '../types/index.js';

export interface ResourceLimits {
  maxProcessesPerEmployee: number;
  maxTotalProcesses: number;
  maxMemoryPerProcess: number; // MB
  maxCpuPerProcess: number; // percentage
  maxTasksPerEmployee: number;
  minIdleTime: number; // seconds between tasks
}

export interface ResourceUsage {
  employeeId: string;
  processes: number;
  tasks: number;
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  lastTaskCompleted?: Date;
  efficiency: number; // 0-100
}

export interface SystemResources {
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  cpuUsage: number;
  loadAverage: number[];
  timestamp: Date;
}

export interface LoadBalancingStrategy {
  name: string;
  description: string;
  calculate: (employees: AIEmployee[], task: Task) => string | null;
}

export class ResourceManager extends EventEmitter {
  private resourceUsage: Map<string, ResourceUsage> = new Map();
  private systemMetricsInterval: NodeJS.Timeout | null = null;
  private lastSystemMetrics: SystemResources | null = null;
  
  private readonly defaultLimits: ResourceLimits = {
    maxProcessesPerEmployee: 3,
    maxTotalProcesses: 20,
    maxMemoryPerProcess: 512, // MB
    maxCpuPerProcess: 25, // 25% per process
    maxTasksPerEmployee: 5,
    minIdleTime: 30 // 30 seconds between tasks
  };

  private loadBalancingStrategies: Map<string, LoadBalancingStrategy> = new Map();
  private currentStrategy: string = 'round-robin';

  constructor(
    private registry: AgentRegistry,
    private processManager: ProcessManager,
    private taskQueue: TaskQueue,
    private logger: winston.Logger,
    private limits: ResourceLimits = {} as ResourceLimits
  ) {
    super();
    this.limits = { ...this.defaultLimits, ...limits };
    this.initializeStrategies();
    this.startMonitoring();
  }

  private initializeStrategies(): void {
    // Round Robin Strategy
    this.loadBalancingStrategies.set('round-robin', {
      name: 'Round Robin',
      description: 'Distribute tasks evenly across all available employees',
      calculate: (employees: AIEmployee[]) => {
        const available = employees.filter(e => this.canAssignTask(e.id));
        if (available.length === 0) return null;

        // Find employee with least tasks
        let selected = available[0];
        if (!selected) return null;
        let minTasks = this.resourceUsage.get(selected.id)?.tasks || 0;

        available.forEach(emp => {
          const tasks = this.resourceUsage.get(emp.id)?.tasks || 0;
          if (tasks < minTasks) {
            selected = emp;
            minTasks = tasks;
          }
        });

        return selected.id;
      }
    });

    // Least Loaded Strategy
    this.loadBalancingStrategies.set('least-loaded', {
      name: 'Least Loaded',
      description: 'Assign to employee with lowest resource usage',
      calculate: (employees: AIEmployee[]) => {
        const available = employees.filter(e => this.canAssignTask(e.id));
        if (available.length === 0) return null;

        let selected = available[0];
        if (!selected) return null;
        let minLoad = this.calculateLoad(selected.id);

        available.forEach(emp => {
          const load = this.calculateLoad(emp.id);
          if (load < minLoad) {
            selected = emp;
            minLoad = load;
          }
        });

        return selected.id;
      }
    });

    // Skill-Based Strategy
    this.loadBalancingStrategies.set('skill-based', {
      name: 'Skill Based',
      description: 'Prioritize employees with best skill match',
      calculate: (employees: AIEmployee[], task: Task) => {
        const available = employees.filter(e => this.canAssignTask(e.id));
        if (available.length === 0) return null;

        // Sort by skill match
        const scored = available.map(emp => {
          let score = 0;
          task.skillsRequired.forEach(skill => {
            if (emp.skills.includes(skill)) score += 10;
          });
          // Factor in current load
          score -= this.calculateLoad(emp.id) * 2;
          return { employee: emp, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.employee.id || null;
      }
    });

    // Efficiency-Based Strategy
    this.loadBalancingStrategies.set('efficiency-based', {
      name: 'Efficiency Based',
      description: 'Assign to most efficient employees',
      calculate: (employees: AIEmployee[]) => {
        const available = employees.filter(e => this.canAssignTask(e.id));
        if (available.length === 0) return null;

        let selected = available[0];
        if (!selected) return null;
        let maxEfficiency = this.resourceUsage.get(selected.id)?.efficiency || 50;

        available.forEach(emp => {
          const efficiency = this.resourceUsage.get(emp.id)?.efficiency || 50;
          if (efficiency > maxEfficiency) {
            selected = emp;
            maxEfficiency = efficiency;
          }
        });

        return selected.id;
      }
    });

    this.logger.info(`Initialized ${this.loadBalancingStrategies.size} load balancing strategies`);
  }

  private startMonitoring(): void {
    // Initialize resource usage for all employees
    const employees = this.registry.getAllEmployees();
    employees.forEach(emp => {
      this.resourceUsage.set(emp.id, {
        employeeId: emp.id,
        processes: 0,
        tasks: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        efficiency: 100
      });
    });

    // Monitor system resources
    this.systemMetricsInterval = setInterval(async () => {
      this.updateSystemMetrics();
      await this.updateResourceUsage();
      this.checkResourceLimits();
    }, 5000); // Every 5 seconds

    // Listen for process events
    this.processManager.on('process-started', (process: ClaudeProcess) => {
      this.handleProcessStarted(process);
    });

    this.processManager.on('process-stopped', (process: ClaudeProcess) => {
      this.handleProcessStopped(process);
    });

    // Listen for task events
    this.taskQueue.on('task-assigned', (task: Task) => {
      this.handleTaskAssigned(task);
    });

    this.taskQueue.on('task-completed', (task: Task) => {
      this.handleTaskCompleted(task);
    });
  }

  private updateSystemMetrics(): void {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    this.lastSystemMetrics = {
      totalMemory: totalMem / 1024 / 1024, // Convert to MB
      freeMemory: freeMem / 1024 / 1024,
      usedMemory: usedMem / 1024 / 1024,
      cpuUsage: this.getCpuUsage(),
      loadAverage: os.loadavg(),
      timestamp: new Date()
    };

    this.emit('system-metrics-updated', this.lastSystemMetrics);
  }

  private getCpuUsage(): number {
    // Simple CPU usage calculation
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return usage;
  }

  private async updateResourceUsage(): Promise<void> {
    const processes = this.processManager.getAllProcesses();
    
    // Reset counters
    this.resourceUsage.forEach(usage => {
      usage.processes = 0;
      usage.memoryUsage = 0;
      usage.cpuUsage = 0;
    });

    // Update from active processes
    processes.forEach(process => {
      const usage = this.resourceUsage.get(process.employeeId);
      if (usage) {
        usage.processes++;
        usage.memoryUsage += process.memoryUsage || 0;
        usage.cpuUsage += process.cpuUsage || 0;
      }
    });

    // Update task counts
    const tasks = await this.taskQueue.getTasks();
    tasks.forEach((task: any) => {
      if (task.assignedTo) {
        const usage = this.resourceUsage.get(task.assignedTo);
        if (usage) {
          usage.tasks++;
        }
      }
    });
  }

  private checkResourceLimits(): void {
    const totalProcesses = this.processManager.getAllProcesses().length;
    
    if (totalProcesses >= this.limits.maxTotalProcesses) {
      this.emit('resource-limit-reached', {
        type: 'total-processes',
        current: totalProcesses,
        limit: this.limits.maxTotalProcesses
      });
    }

    // Check system memory
    if (this.lastSystemMetrics && 
        this.lastSystemMetrics.freeMemory < 1024) { // Less than 1GB free
      this.emit('resource-warning', {
        type: 'low-memory',
        freeMemory: this.lastSystemMetrics.freeMemory
      });
    }
  }

  private handleProcessStarted(process: ClaudeProcess): void {
    const usage = this.resourceUsage.get(process.employeeId);
    if (usage) {
      usage.processes++;
    }
  }

  private handleProcessStopped(process: ClaudeProcess): void {
    const usage = this.resourceUsage.get(process.employeeId);
    if (usage && usage.processes > 0) {
      usage.processes--;
    }
  }

  private handleTaskAssigned(task: Task): void {
    if (task.assignedTo) {
      const usage = this.resourceUsage.get(task.assignedTo);
      if (usage) {
        usage.tasks++;
      }
    }
  }

  private handleTaskCompleted(task: Task): void {
    if (task.assignedTo) {
      const usage = this.resourceUsage.get(task.assignedTo);
      if (usage) {
        if (usage.tasks > 0) usage.tasks--;
        usage.lastTaskCompleted = new Date();
        
        // Update efficiency based on task completion time
        if (task.estimatedDuration && task.completedAt && task.createdAt) {
          const actualDuration = task.completedAt.getTime() - task.createdAt.getTime();
          const efficiency = Math.min(100, (task.estimatedDuration * 1000 / actualDuration) * 100);
          usage.efficiency = (usage.efficiency * 0.7) + (efficiency * 0.3); // Weighted average
        }
      }
    }
  }

  // Check if an employee can be assigned a new task
  canAssignTask(employeeId: string): boolean {
    const usage = this.resourceUsage.get(employeeId);
    if (!usage) return false;

    const employee = this.registry.getEmployeeById(employeeId);
    if (!employee || employee.status !== 'active') return false;

    // Check task limit
    if (usage.tasks >= this.limits.maxTasksPerEmployee) return false;

    // Check process limit
    if (usage.processes >= this.limits.maxProcessesPerEmployee) return false;

    // Check idle time
    if (usage.lastTaskCompleted) {
      const idleTime = (Date.now() - usage.lastTaskCompleted.getTime()) / 1000;
      if (idleTime < this.limits.minIdleTime) return false;
    }

    // Check system resources
    if (this.lastSystemMetrics && 
        this.lastSystemMetrics.freeMemory < 512) { // Less than 512MB free
      return false;
    }

    return true;
  }

  // Calculate load for an employee (0-100)
  private calculateLoad(employeeId: string): number {
    const usage = this.resourceUsage.get(employeeId);
    if (!usage) return 0;

    const taskLoad = (usage.tasks / this.limits.maxTasksPerEmployee) * 40;
    const processLoad = (usage.processes / this.limits.maxProcessesPerEmployee) * 30;
    const memoryLoad = (usage.memoryUsage / (this.limits.maxMemoryPerProcess * usage.processes || 1)) * 15;
    const cpuLoad = (usage.cpuUsage / (this.limits.maxCpuPerProcess * usage.processes || 1)) * 15;

    return Math.min(100, taskLoad + processLoad + memoryLoad + cpuLoad);
  }

  // Get best employee for a task using current strategy
  async getBestEmployee(task: Task): Promise<string | null> {
    const strategy = this.loadBalancingStrategies.get(this.currentStrategy);
    if (!strategy) {
      this.logger.error(`Strategy ${this.currentStrategy} not found`);
      return null;
    }

    const employees = this.registry.getEmployeesBySkill(task.skillsRequired[0] || '');
    return strategy.calculate(employees as unknown as AIEmployee[], task);
  }

  // Set load balancing strategy
  setStrategy(strategyName: string): void {
    if (this.loadBalancingStrategies.has(strategyName)) {
      this.currentStrategy = strategyName;
      this.logger.info(`Load balancing strategy changed to: ${strategyName}`);
      this.emit('strategy-changed', strategyName);
    }
  }

  // Get resource usage for an employee
  getResourceUsage(employeeId: string): ResourceUsage | undefined {
    return this.resourceUsage.get(employeeId);
  }

  // Get all resource usage
  getAllResourceUsage(): ResourceUsage[] {
    return Array.from(this.resourceUsage.values());
  }

  // Get system resources
  getSystemResources(): SystemResources | null {
    return this.lastSystemMetrics;
  }

  // Scale resources based on load
  async autoScale(): Promise<void> {
    const systemLoad = this.lastSystemMetrics?.cpuUsage || 0;
    const totalProcesses = this.processManager.getAllProcesses().length;

    if (systemLoad > 80 && totalProcesses > 10) {
      // High load - reduce concurrent processes
      this.logger.warn('High system load detected, reducing concurrent processes');
      this.limits.maxTotalProcesses = Math.max(10, totalProcesses - 2);
      this.emit('auto-scale', { action: 'reduce', reason: 'high-load' });
    } else if (systemLoad < 30 && totalProcesses < this.defaultLimits.maxTotalProcesses) {
      // Low load - increase capacity
      this.logger.info('Low system load detected, increasing capacity');
      this.limits.maxTotalProcesses = this.defaultLimits.maxTotalProcesses;
      this.emit('auto-scale', { action: 'increase', reason: 'low-load' });
    }
  }

  // Get resource metrics
  getMetrics(): {
    totalProcesses: number;
    totalTasks: number;
    averageLoad: number;
    averageEfficiency: number;
    systemLoad: number;
    strategyName: string;
  } {
    const usages = Array.from(this.resourceUsage.values());
    const totalProcesses = usages.reduce((sum, u) => sum + u.processes, 0);
    const totalTasks = usages.reduce((sum, u) => sum + u.tasks, 0);
    const averageLoad = usages.reduce((sum, u) => sum + this.calculateLoad(u.employeeId), 0) / usages.length;
    const averageEfficiency = usages.reduce((sum, u) => sum + u.efficiency, 0) / usages.length;

    return {
      totalProcesses,
      totalTasks,
      averageLoad,
      averageEfficiency,
      systemLoad: this.lastSystemMetrics?.cpuUsage || 0,
      strategyName: this.currentStrategy
    };
  }

  // Cleanup
  shutdown(): void {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
      this.systemMetricsInterval = null;
    }
  }
}