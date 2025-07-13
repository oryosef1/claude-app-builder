import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
import winston from 'winston';
import { 
  ClaudeProcess, 
  AIEmployee, 
  ProcessConfig, 
  LogEntry,
  Task
} from '../types/index.js';
import { 
  generateId, 
  buildClaudeCommand, 
  delay
} from '../utils/index.js';
import { PersistenceService } from './PersistenceService.js';

export class ProcessManager extends EventEmitter {
  private processes: Map<string, ProcessInfo> = new Map();
  private employees: Map<string, AIEmployee> = new Map();
  private logger: winston.Logger;
  private persistenceService: PersistenceService;
  private taskQueue: any; // Will be set after initialization
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly maxProcesses: number = 20;
  private readonly processTimeout: number = 300000; // 5 minutes
  private readonly heartbeatInterval: number = 30000; // 30 seconds

  constructor(logger: winston.Logger) {
    super();
    this.logger = logger;
    this.persistenceService = new PersistenceService(logger);
    this.persistenceService.initialize();
    this.startHealthChecks();
  }

  setTaskQueue(taskQueue: any): void {
    this.taskQueue = taskQueue;
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkProcessHealth();
    }, this.heartbeatInterval);
  }

  private async saveProcesses(): Promise<void> {
    const processes = Array.from(this.processes.values()).map(info => info.process);
    await this.persistenceService.saveProcesses(processes);
  }

  private async checkProcessHealth(): Promise<void> {
    const now = Date.now();
    
    for (const [processId, processInfo] of this.processes) {
      const { process: claudeProcess, childProcess } = processInfo;
      
      if (claudeProcess.status === 'running' && childProcess) {
        try {
          const memoryUsage = await this.getProcessMemoryUsage(childProcess.pid!);
          
          // If memory usage is 0, the process likely doesn't exist anymore
          if (memoryUsage === 0) {
            this.logger.info(`Process ${processId} (PID ${childProcess.pid}) no longer exists, marking as stopped`);
            claudeProcess.status = 'stopped';
            claudeProcess.stoppedAt = new Date();
            this.emit('process_stopped', { processId, claudeProcess, code: null, signal: null });
            await this.saveProcesses();
          } else {
            claudeProcess.memoryUsage = memoryUsage;
            claudeProcess.lastHeartbeat = new Date();
            
            if (now - claudeProcess.lastHeartbeat.getTime() > this.processTimeout) {
              this.logger.warn(`Process ${processId} timed out, restarting...`);
              await this.restartProcess(processId);
            }
          }
        } catch (error) {
          this.logger.error(`Health check failed for process ${processId}:`, error);
        }
      }
    }
  }

  private async getProcessMemoryUsage(pid: number): Promise<number> {
    return new Promise((resolve, reject) => {
      // Use Windows-compatible process checking via PowerShell
      const ps = spawn('powershell.exe', [
        '-Command', 
        `Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty WorkingSet64`
      ]);
      let output = '';
      
      ps.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ps.on('close', (code) => {
        if (code === 0 && output.trim()) {
          const memory = parseInt(output.trim()) || 0; // Already in bytes
          resolve(memory);
        } else {
          // Process doesn't exist, return 0
          resolve(0);
        }
      });
      
      ps.on('error', (error) => {
        // If PowerShell fails, just return 0 instead of rejecting
        this.logger.warn(`PowerShell process check failed for PID ${pid}:`, error);
        resolve(0);
      });
    });
  }

  async loadEmployees(employees: AIEmployee[]): Promise<void> {
    this.employees.clear();
    employees.forEach(employee => {
      this.employees.set(employee.id, employee);
    });
    this.logger.info(`Loaded ${employees.length} employees`);
  }

  addPersistedProcess(process: ClaudeProcess): void {
    // Add a persisted process back to the manager (but don't spawn it)
    // Mark it as stopped since we can't reconnect to the child process
    process.status = 'stopped';
    process.stoppedAt = process.stoppedAt || new Date();
    
    this.processes.set(process.id, {
      process,
      childProcess: null,
      config: {} as ProcessConfig, // Empty config for persisted processes
      logs: []
    });
    
    this.emit('process_updated', process);
    this.logger.info(`Added persisted process ${process.id} with status: ${process.status}`);
  }

  async createProcess(config: ProcessConfig): Promise<string> {
    if (this.processes.size >= this.maxProcesses) {
      throw new Error(`Maximum number of processes (${this.maxProcesses}) reached`);
    }

    const employee = this.employees.get(config.employeeId);
    if (!employee) {
      throw new Error(`Employee ${config.employeeId} not found`);
    }

    const processId = generateId();
    let command: string;
    let args: string[];
    
    if (config.task) {
      // If we have a task, build the full prompt and use bash to pipe it to Claude
      const fullPrompt = this.buildFullPrompt(employee, config, config.task);
      const escapedPrompt = fullPrompt.replace(/'/g, "'\"'\"'");
      
      command = 'wsl.exe';
      args = [
        'bash', 
        '-c', 
        `echo '${escapedPrompt}' | claude --print --dangerously-skip-permissions --model sonnet --allowedTools "${(config.tools || employee.tools || []).join(',') || 'Bash,Edit,Write,Read,TodoRead,TodoWrite'}"`
      ];
    } else {
      // Regular process without task
      const claudeCmd = buildClaudeCommand({
        ...config,
        systemPrompt: config.systemPrompt || employee.systemPrompt,
        tools: config.tools || employee.tools
      });
      command = claudeCmd.command;
      args = claudeCmd.args;
    }

    const claudeProcess: ClaudeProcess = {
      id: processId,
      name: config.task?.title || employee.name,
      role: employee.role,
      employeeId: config.employeeId,
      pid: 0,
      status: 'starting',
      command,
      args,
      createdAt: new Date(),
      restarts: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      taskId: config.task?.id,
      errorCount: 0
    };

    this.processes.set(processId, {
      process: claudeProcess,
      childProcess: null,
      config,
      logs: []
    });

    try {
      await this.startProcess(processId);
      this.logger.info(`Created process ${processId} for employee ${config.employeeId}`);
      
      // Save to persistence
      await this.saveProcesses();
      
      return processId;
    } catch (error) {
      this.processes.delete(processId);
      throw error;
    }
  }

  private async startProcess(processId: string): Promise<void> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      throw new Error(`Process ${processId} not found`);
    }

    const { process: claudeProcess, config } = processInfo;
    
    return new Promise((resolve, reject) => {
      const childProcess = spawn(claudeProcess.command, claudeProcess.args, {
        cwd: config.workingDirectory || 'C:\\Users\\Projects\\ai-agency',
        env: {
          ...process.env,
          ...config.environmentVariables,
          PATH: `${process.env['PATH']};C:\\WINDOWS\\system32`
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      claudeProcess.pid = childProcess.pid || 0;
      claudeProcess.status = 'running';
      claudeProcess.startedAt = new Date();
      claudeProcess.lastHeartbeat = new Date();

      processInfo.childProcess = childProcess;

      // Prompt is now passed via bash pipe in the command, no need for stdin

      childProcess.stdout?.on('data', (data) => {
        this.handleProcessOutput(processId, 'stdout', data.toString());
      });

      childProcess.stderr?.on('data', (data) => {
        this.handleProcessOutput(processId, 'stderr', data.toString());
      });

      childProcess.on('error', (error) => {
        this.logger.error(`Process ${processId} error:`, error);
        claudeProcess.status = 'error';
        this.emit('process_error', { processId, error });
        reject(error);
      });

      childProcess.on('exit', (code, signal) => {
        this.handleProcessExit(processId, code, signal);
      });

      this.emit('process_started', { processId, claudeProcess });
      this.logger.info(`Started process ${processId} with PID ${claudeProcess.pid}`);
      resolve();
    });
  }

  private handleProcessOutput(processId: string, stream: 'stdout' | 'stderr', data: string): void {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return;

    const logEntry: LogEntry = {
      level: stream === 'stderr' ? 'error' : 'info',
      message: data.trim(),
      timestamp: new Date(),
      source: 'claude-process',
      processId,
      employeeId: processInfo.process.employeeId
    };

    processInfo.logs.push(logEntry);
    
    if (processInfo.logs.length > 1000) {
      processInfo.logs = processInfo.logs.slice(-500);
    }

    this.emit('process_output', { processId, logEntry });
    this.logger.info(`Process ${processId} ${stream}: ${data.trim()}`);
  }

  private handleProcessExit(processId: string, code: number | null, signal: string | null): void {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return;

    const { process: claudeProcess } = processInfo;
    
    claudeProcess.status = 'stopped';
    claudeProcess.stoppedAt = new Date();
    
    this.logger.info(`Process ${processId} exited with code ${code}, signal ${signal}`);
    
    this.emit('process_stopped', { processId, claudeProcess, code, signal });
    
    // Update associated task status if process completed successfully
    if (code === 0 && claudeProcess.taskId && this.taskQueue) {
      const task = this.taskQueue.getTask(claudeProcess.taskId);
      if (task && task.status === 'in_progress') {
        task.status = 'completed';
        task.completedAt = new Date();
        task.progress = 100;
        this.taskQueue.updateTaskStatus(task.id, 'completed');
        this.logger.info(`Task ${task.id} completed successfully`);
      }
    }
    
    // Save to persistence
    this.saveProcesses();

    if (code !== 0 && claudeProcess.restarts < 3) {
      this.logger.warn(`Process ${processId} crashed, attempting restart...`);
      setTimeout(() => this.restartProcess(processId), 5000);
    }
  }

  async stopProcess(processId: string): Promise<void> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      throw new Error(`Process ${processId} not found`);
    }

    const { process: claudeProcess, childProcess } = processInfo;
    
    if (claudeProcess.status === 'stopped') {
      return;
    }

    claudeProcess.status = 'stopping';
    
    if (childProcess) {
      childProcess.kill('SIGTERM');
      
      await delay(5000);
      
      if (!childProcess.killed) {
        childProcess.kill('SIGKILL');
      }
    }

    this.logger.info(`Stopped process ${processId}`);
  }

  async restartProcess(processId: string): Promise<void> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      throw new Error(`Process ${processId} not found`);
    }

    const { process: claudeProcess } = processInfo;
    
    await this.stopProcess(processId);
    claudeProcess.restarts++;
    
    await delay(2000);
    
    await this.startProcess(processId);
    
    this.logger.info(`Restarted process ${processId} (restart #${claudeProcess.restarts})`);
  }

  async sendInput(processId: string, input: string): Promise<void> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      throw new Error(`Process ${processId} not found`);
    }

    const { childProcess } = processInfo;
    
    if (!childProcess || !childProcess.stdin) {
      throw new Error(`Process ${processId} is not running or stdin is not available`);
    }

    childProcess.stdin.write(input + '\n');
    this.logger.info(`Sent input to process ${processId}: ${input}`);
  }

  getProcess(processId: string): ClaudeProcess | null {
    const processInfo = this.processes.get(processId);
    return processInfo ? processInfo.process : null;
  }

  getAllProcesses(): ClaudeProcess[] {
    return Array.from(this.processes.values()).map(info => info.process);
  }

  getProcessesByEmployee(employeeId: string): ClaudeProcess[] {
    return this.getAllProcesses().filter(p => p.employeeId === employeeId);
  }

  getProcessLogs(processId: string, limit: number = 100): LogEntry[] {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      return [];
    }

    return processInfo.logs.slice(-limit);
  }

  getProcessStats(): { total: number; running: number; stopped: number; errored: number } {
    const processes = this.getAllProcesses();
    
    return {
      total: processes.length,
      running: processes.filter(p => p.status === 'running').length,
      stopped: processes.filter(p => p.status === 'stopped').length,
      errored: processes.filter(p => p.status === 'error').length
    };
  }

  async deleteProcess(processId: string): Promise<void> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      throw new Error(`Process ${processId} not found`);
    }

    // Stop the process if it's running
    if (processInfo.process.status === 'running') {
      await this.stopProcess(processId);
    }

    // Remove from memory
    this.processes.delete(processId);
    
    // Update persistence
    await this.saveProcesses();
    
    this.logger.info(`Deleted process ${processId}`);
    this.emit('process_deleted', { processId });
  }

  async cleanup(): Promise<void> {
    if (this.healthCheckInterval) {
      clearTimeout(this.healthCheckInterval);
    }

    const stopPromises = Array.from(this.processes.keys()).map(processId => 
      this.stopProcess(processId).catch(error => 
        this.logger.error(`Error stopping process ${processId}:`, error)
      )
    );

    await Promise.all(stopPromises);
    
    this.processes.clear();
    this.logger.info('ProcessManager cleaned up');
  }


  sendToProcess(processId: string, data: any): void {
    const processInfo = this.processes.get(processId);
    if (!processInfo || !processInfo.childProcess) {
      throw new Error(`Process ${processId} not found or not running`);
    }

    const message = JSON.stringify(data) + '\n';
    processInfo.childProcess.stdin?.write(message);
    
    this.logger.info(`Sent message to process ${processId}:`, data);
  }

  private buildFullPrompt(employee: AIEmployee, config: ProcessConfig, task: Task): string {
    // Load system prompt content from file if provided
    let systemPromptContent = '';
    if (config.systemPrompt) {
      try {
        // Use Windows paths when running on Windows
        const systemPromptPath = config.systemPrompt.startsWith('/') 
          ? config.systemPrompt 
          : `C:\\Users\\Projects\\ai-agency\\${config.systemPrompt}`;
        
        systemPromptContent = readFileSync(systemPromptPath, 'utf8');
      } catch (error) {
        this.logger.error(`Failed to read system prompt file: ${config.systemPrompt}`, error);
        systemPromptContent = employee.systemPrompt || '';
      }
    } else {
      systemPromptContent = employee.systemPrompt || '';
    }

    // Build a simplified prompt to avoid command line length issues
    const fullPrompt = `CORPORATE CONTEXT:
You are ${employee.name}, a ${employee.role} at Claude AI Software Company.

TASK: ${task.title}
DESCRIPTION: ${task.description}
PRIORITY: ${task.priority}

INSTRUCTIONS:
- Follow company coding standards
- Create working, production-ready code
- Work in the current directory: /mnt/c/Users/Projects/ai-agency

USER REQUEST:
${task.description}`;

    return fullPrompt;
  }
}

interface ProcessInfo {
  process: ClaudeProcess;
  childProcess: ChildProcess | null;
  config: ProcessConfig;
  logs: LogEntry[];
}