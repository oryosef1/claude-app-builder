import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import winston from 'winston';
import { 
  ClaudeProcess, 
  AIEmployee, 
  ProcessConfig, 
  LogEntry
} from '../types/index.js';
import { 
  generateId, 
  buildClaudeCommand, 
  delay
} from '../utils/index.js';

export class ProcessManager extends EventEmitter {
  private processes: Map<string, ProcessInfo> = new Map();
  private employees: Map<string, AIEmployee> = new Map();
  private logger: winston.Logger;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly maxProcesses: number = 20;
  private readonly processTimeout: number = 300000; // 5 minutes
  private readonly heartbeatInterval: number = 30000; // 30 seconds

  constructor(logger: winston.Logger) {
    super();
    this.logger = logger;
    this.startHealthChecks();
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkProcessHealth();
    }, this.heartbeatInterval);
  }

  private async checkProcessHealth(): Promise<void> {
    const now = Date.now();
    
    for (const [processId, processInfo] of this.processes) {
      const { process: claudeProcess, childProcess } = processInfo;
      
      if (claudeProcess.status === 'running' && childProcess) {
        try {
          const memoryUsage = await this.getProcessMemoryUsage(childProcess.pid!);
          
          claudeProcess.memoryUsage = memoryUsage;
          claudeProcess.lastHeartbeat = new Date();
          
          if (now - claudeProcess.lastHeartbeat.getTime() > this.processTimeout) {
            this.logger.warn(`Process ${processId} timed out, restarting...`);
            await this.restartProcess(processId);
          }
        } catch (error) {
          this.logger.error(`Health check failed for process ${processId}:`, error);
        }
      }
    }
  }

  private async getProcessMemoryUsage(pid: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const ps = spawn('ps', ['-p', pid.toString(), '-o', 'rss=']);
      let output = '';
      
      ps.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ps.on('close', (code) => {
        if (code === 0) {
          const memory = parseInt(output.trim()) * 1024; // Convert KB to bytes
          resolve(memory || 0);
        } else {
          reject(new Error(`ps command failed with code ${code}`));
        }
      });
      
      ps.on('error', reject);
    });
  }

  async loadEmployees(employees: AIEmployee[]): Promise<void> {
    this.employees.clear();
    employees.forEach(employee => {
      this.employees.set(employee.id, employee);
    });
    this.logger.info(`Loaded ${employees.length} employees`);
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
    const { command, args } = buildClaudeCommand({
      ...config,
      systemPrompt: config.systemPrompt || employee.systemPrompt,
      tools: config.tools || employee.tools
    });

    const claudeProcess: ClaudeProcess = {
      id: processId,
      employeeId: config.employeeId,
      pid: 0,
      status: 'starting',
      command,
      args,
      createdAt: new Date(),
      restarts: 0,
      memoryUsage: 0,
      cpuUsage: 0
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
        cwd: config.workingDirectory || process.cwd(),
        env: {
          ...process.env,
          ...config.environmentVariables
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      claudeProcess.pid = childProcess.pid || 0;
      claudeProcess.status = 'running';
      claudeProcess.startedAt = new Date();
      claudeProcess.lastHeartbeat = new Date();

      processInfo.childProcess = childProcess;

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
}

interface ProcessInfo {
  process: ClaudeProcess;
  childProcess: ChildProcess | null;
  config: ProcessConfig;
  logs: LogEntry[];
}