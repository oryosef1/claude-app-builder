import * as fs from 'fs/promises';
import * as path from 'path';
import winston from 'winston';

export interface PersistenceData {
  tasks: any[];
  processes: any[];
  timestamp: Date;
}

export class PersistenceService {
  private dataPath: string;
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.dataPath = path.join(process.cwd(), 'data');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      this.logger.info('Persistence service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize persistence:', error);
    }
  }

  async saveTasks(tasks: any[]): Promise<void> {
    try {
      const filePath = path.join(this.dataPath, 'tasks.json');
      await fs.writeFile(filePath, JSON.stringify(tasks, null, 2));
      this.logger.debug(`Saved ${tasks.length} tasks to disk`);
    } catch (error) {
      this.logger.error('Failed to save tasks:', error);
    }
  }

  async loadTasks(): Promise<any[]> {
    try {
      const filePath = path.join(this.dataPath, 'tasks.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const tasks = JSON.parse(data);
      this.logger.info(`Loaded ${tasks.length} tasks from disk`);
      return tasks;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.logger.info('No tasks file found, starting fresh');
        return [];
      }
      this.logger.error('Failed to load tasks:', error);
      return [];
    }
  }

  async saveProcesses(processes: any[]): Promise<void> {
    try {
      const filePath = path.join(this.dataPath, 'processes.json');
      await fs.writeFile(filePath, JSON.stringify(processes, null, 2));
      this.logger.debug(`Saved ${processes.length} processes to disk`);
    } catch (error) {
      this.logger.error('Failed to save processes:', error);
    }
  }

  async loadProcesses(): Promise<any[]> {
    try {
      const filePath = path.join(this.dataPath, 'processes.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const processes = JSON.parse(data);
      this.logger.info(`Loaded ${processes.length} processes from disk`);
      return processes;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.logger.info('No processes file found, starting fresh');
        return [];
      }
      this.logger.error('Failed to load processes:', error);
      return [];
    }
  }

  async saveAll(data: PersistenceData): Promise<void> {
    try {
      const filePath = path.join(this.dataPath, 'dashboard-data.json');
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      this.logger.info('Saved all dashboard data to disk');
    } catch (error) {
      this.logger.error('Failed to save dashboard data:', error);
    }
  }

  async loadAll(): Promise<PersistenceData | null> {
    try {
      const filePath = path.join(this.dataPath, 'dashboard-data.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.logger.info('Loaded dashboard data from disk');
      return parsed;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.logger.info('No dashboard data file found, starting fresh');
        return null;
      }
      this.logger.error('Failed to load dashboard data:', error);
      return null;
    }
  }
}