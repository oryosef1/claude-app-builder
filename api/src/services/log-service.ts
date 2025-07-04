import { EventEmitter } from 'events';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export class LogService extends EventEmitter {
  private logs: LogEntry[] = [];
  private logFile: string;

  constructor(logFile: string = 'app.log') {
    super();
    this.logFile = logFile;
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory(): Promise<void> {
    const logDir = path.dirname(this.logFile);
    try {
      await mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  async log(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      ...entry
    };

    this.logs.push(logEntry);
    this.emit('logEntry', logEntry);

    try {
      await this.writeToFile(logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async info(message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({ level: 'info', message, metadata });
  }

  async warn(message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({ level: 'warn', message, metadata });
  }

  async error(message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({ level: 'error', message, metadata });
  }

  async debug(message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({ level: 'debug', message, metadata });
  }

  async getLogs(options: any = {}): Promise<LogEntry[]> {
    let filteredLogs = [...this.logs];
    
    if (options.level) {
      filteredLogs = filteredLogs.filter(log => log.level === options.level);
    }
    
    if (options.page && options.limit) {
      const start = (options.page - 1) * options.limit;
      const end = start + options.limit;
      filteredLogs = filteredLogs.slice(start, end);
    } else if (options.limit) {
      filteredLogs = filteredLogs.slice(-options.limit);
    }
    
    return filteredLogs;
  }

  async clearLogs(): Promise<boolean> {
    try {
      this.logs = [];
      this.emit('logsCleared');
      return true;
    } catch (error) {
      return false;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    const logLine = `${entry.timestamp.toISOString()} [${entry.level.toUpperCase()}] ${entry.message}`;
    const logData = entry.metadata ? `${logLine} ${JSON.stringify(entry.metadata)}` : logLine;
    
    try {
      await writeFile(this.logFile, logData + '\n', { flag: 'a' });
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  async loadLogsFromFile(): Promise<void> {
    try {
      const data = await readFile(this.logFile, 'utf8');
      const lines = data.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \[(\w+)\] (.+)$/);
        if (match) {
          const [, timestamp, level, message] = match;
          const logEntry: LogEntry = {
            id: this.generateId(),
            timestamp: new Date(timestamp),
            level: level.toLowerCase() as LogEntry['level'],
            message
          };
          this.logs.push(logEntry);
        }
      }
    } catch (error) {
      console.error('Failed to load logs from file:', error);
    }
  }
}