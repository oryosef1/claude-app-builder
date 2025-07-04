import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowStatus, WorkflowCommand, LogEntry, ProcessInfo } from '../types';
import { ProcessManager } from './process-manager';
import { FileService } from './file-service';
import { LogService } from './log-service';

interface LogFilter {
  page: number;
  limit: number;
  level?: 'info' | 'warn' | 'error' | 'debug';
}

export class WorkflowService extends EventEmitter {
  private currentProcess: ChildProcess | null = null;
  private status: WorkflowStatus = {
    isRunning: false,
    currentPhase: 'idle',
    progress: 0
  };
  private logs: LogEntry[] = [];
  private processInfo: ProcessInfo | null = null;
  private processManager: ProcessManager;
  private fileService: FileService;
  private logService: LogService;

  constructor(processManager: ProcessManager, fileService: FileService, logService: LogService) {
    super();
    this.processManager = processManager;
    this.fileService = fileService;
    this.logService = logService;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.on('statusChange', (newStatus: WorkflowStatus) => {
      this.status = { ...this.status, ...newStatus };
    });

    this.on('logEntry', (entry: LogEntry) => {
      this.logs.push(entry);
      // Keep only last 1000 logs to prevent memory issues
      if (this.logs.length > 1000) {
        this.logs = this.logs.slice(-1000);
      }
    });
  }

  async getStatus(): Promise<WorkflowStatus> {
    const runningProcesses = this.processManager.getRunningProcesses();
    return {
      isRunning: runningProcesses.length > 0,
      currentPhase: runningProcesses.length > 0 ? 'running' : 'stopped',
      progress: 0
    };
  }

  async executeCommand(command: WorkflowCommand): Promise<WorkflowStatus> {
    switch (command.action) {
      case 'start':
        return this.startWorkflow(command.todoId);
      case 'stop':
        return this.stopWorkflow();
      case 'pause':
        return this.pauseWorkflow();
      case 'resume':
        return this.resumeWorkflow();
      default:
        throw new Error(`Unknown command: ${command.action}`);
    }
  }

  private async startWorkflow(todoId?: string): Promise<WorkflowStatus> {
    const runningProcesses = this.processManager.getRunningProcesses();
    if (runningProcesses.length > 0) {
      throw new Error('Workflow is already running');
    }

    // If todoId is provided, validate it exists
    if (todoId) {
      const todos = await this.fileService.readTodos();
      const todo = todos.find(t => t.id === todoId);
      if (!todo) {
        throw new Error(`Todo not found: ${todoId}`);
      }
    }

    // Execute the workflow process
    const result = await this.processManager.executeProcess();
    
    return {
      isRunning: true,
      currentPhase: 'running',
      progress: 0
    };
  }

  private async stopWorkflow(): Promise<WorkflowStatus> {
    const runningProcesses = this.processManager.getRunningProcesses();
    if (runningProcesses.length === 0) {
      throw new Error('Workflow is not running');
    }

    // Kill all running processes
    for (const pid of runningProcesses) {
      this.processManager.killProcess(pid);
    }

    return {
      isRunning: false,
      currentPhase: 'stopped',
      progress: 0
    };
  }

  private async pauseWorkflow(): Promise<WorkflowStatus> {
    const runningProcesses = this.processManager.getRunningProcesses();
    if (runningProcesses.length === 0) {
      throw new Error('No workflow is currently running');
    }

    // Kill processes for pause
    for (const pid of runningProcesses) {
      this.processManager.killProcess(pid);
    }

    return {
      isRunning: false,
      currentPhase: 'paused',
      progress: 0
    };
  }

  private async resumeWorkflow(): Promise<WorkflowStatus> {
    // Execute a new process for resume
    const result = await this.processManager.executeProcess();

    return {
      isRunning: true,
      currentPhase: 'running',
      progress: 0
    };
  }

  private setupProcessHandlers(): void {
    if (!this.currentProcess) return;

    this.currentProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      this.parseWorkflowOutput(output);
      this.addLog('debug', `Workflow output: ${output.trim()}`, this.status.currentPhase);
    });

    this.currentProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      this.addLog('error', `Workflow error: ${error.trim()}`, this.status.currentPhase);
    });

    this.currentProcess.on('exit', (code) => {
      this.addLog('info', `Workflow process exited with code: ${code}`, 'shutdown');
      
      const newStatus: WorkflowStatus = {
        isRunning: false,
        currentPhase: code === 0 ? 'completed' : 'error',
        progress: code === 0 ? 100 : this.status.progress,
        endTime: new Date(),
        error: code !== 0 ? `Process exited with code ${code}` : undefined
      };

      this.emit('statusChange', newStatus);
      this.currentProcess = null;
      this.processInfo = null;
    });

    this.currentProcess.on('error', (error) => {
      this.addLog('error', `Process error: ${error.message}`, 'error');
      
      const newStatus: WorkflowStatus = {
        isRunning: false,
        currentPhase: 'error',
        progress: this.status.progress,
        endTime: new Date(),
        error: error.message
      };

      this.emit('statusChange', newStatus);
      this.currentProcess = null;
      this.processInfo = null;
    });
  }

  private parseWorkflowOutput(output: string): void {
    // Parse workflow output to extract phase information
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('Starting Test Writer')) {
        this.emit('statusChange', { currentPhase: 'test-writer', progress: 20 });
      } else if (line.includes('Starting Test Reviewer')) {
        this.emit('statusChange', { currentPhase: 'test-reviewer', progress: 40 });
      } else if (line.includes('Starting Developer')) {
        this.emit('statusChange', { currentPhase: 'developer', progress: 60 });
      } else if (line.includes('Starting Code Reviewer')) {
        this.emit('statusChange', { currentPhase: 'code-reviewer', progress: 80 });
      } else if (line.includes('Starting Coordinator')) {
        this.emit('statusChange', { currentPhase: 'coordinator', progress: 90 });
      } else if (line.includes('Workflow completed')) {
        this.emit('statusChange', { currentPhase: 'completed', progress: 100 });
      }
    }
  }

  async getLogs(options?: any): Promise<LogEntry[]> {
    return this.logService.getLogs(options || {});
  }

  async clearLogs(): Promise<boolean> {
    return this.logService.clearLogs();
  }

  private addLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, phase?: string): void {
    const logEntry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      message,
      phase
    };

    this.emit('logEntry', logEntry);
  }

  getProcessInfo(): ProcessInfo | null {
    return this.processInfo ? { ...this.processInfo } : null;
  }
}