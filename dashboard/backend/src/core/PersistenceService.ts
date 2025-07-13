import * as fs from 'fs/promises';
import * as path from 'path';
import winston from 'winston';
import { createClient, RedisClientType } from 'redis';

export interface PersistenceData {
  tasks: any[];
  processes: any[];
  timestamp: Date;
}

export class PersistenceService {
  private dataPath: string;
  private logger: winston.Logger;
  private redisClient: RedisClientType | null = null;
  private redisAvailable: boolean = false;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.dataPath = path.join(process.cwd(), 'data');
  }

  async initialize(): Promise<void> {
    try {
      // Initialize file system storage
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // Initialize Redis connection
      await this.initializeRedis();
      
      this.logger.info(`Persistence service initialized - Redis: ${this.redisAvailable ? 'Available' : 'Fallback to files'}`);
    } catch (error) {
      this.logger.error('Failed to initialize persistence:', error);
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        socket: {
          host: process.env['REDIS_HOST'] || 'localhost',
          port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
          connectTimeout: 5000
        },
        password: process.env['REDIS_PASSWORD'],
        database: parseInt(process.env['REDIS_DB'] || '0', 10)
      });

      this.redisClient.on('error', (error) => {
        this.logger.warn('Redis connection error, falling back to files:', error);
        this.redisAvailable = false;
      });

      await this.redisClient.connect();
      this.redisAvailable = true;
      this.logger.info('Redis connected for persistence');
    } catch (error) {
      this.logger.warn('Redis not available for persistence, using files only:', error);
      this.redisAvailable = false;
      this.redisClient = null;
    }
  }

  async saveTasks(tasks: any[]): Promise<void> {
    const tasksData = {
      data: tasks,
      timestamp: new Date().toISOString(),
      count: tasks.length
    };

    // Try Redis first
    if (this.redisAvailable && this.redisClient) {
      try {
        await this.redisClient.set('dashboard:tasks', JSON.stringify(tasksData));
        this.logger.debug(`Saved ${tasks.length} tasks to Redis`);
      } catch (error) {
        this.logger.warn('Failed to save tasks to Redis, falling back to file:', error);
        this.redisAvailable = false;
      }
    }

    // Always save to file as backup
    try {
      const filePath = path.join(this.dataPath, 'tasks.json');
      await fs.writeFile(filePath, JSON.stringify(tasks, null, 2));
      this.logger.debug(`Saved ${tasks.length} tasks to file (${this.redisAvailable ? 'backup' : 'primary'})`);
    } catch (error) {
      this.logger.error('Failed to save tasks to file:', error);
    }
  }

  async loadTasks(): Promise<any[]> {
    // Try Redis first
    if (this.redisAvailable && this.redisClient) {
      try {
        const redisData = await this.redisClient.get('dashboard:tasks');
        if (redisData) {
          const parsed = JSON.parse(redisData);
          const tasks = parsed.data || [];
          this.logger.info(`Loaded ${tasks.length} tasks from Redis`);
          return tasks;
        }
      } catch (error) {
        this.logger.warn('Failed to load tasks from Redis, falling back to file:', error);
        this.redisAvailable = false;
      }
    }

    // Fall back to file
    try {
      const filePath = path.join(this.dataPath, 'tasks.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const tasks = JSON.parse(data);
      this.logger.info(`Loaded ${tasks.length} tasks from file (${this.redisAvailable ? 'fallback' : 'primary'})`);
      
      // If Redis is available, migrate data to Redis
      if (this.redisAvailable && this.redisClient && tasks.length > 0) {
        try {
          const tasksData = {
            data: tasks,
            timestamp: new Date().toISOString(),
            count: tasks.length
          };
          await this.redisClient.set('dashboard:tasks', JSON.stringify(tasksData));
          this.logger.info(`Migrated ${tasks.length} tasks from file to Redis`);
        } catch (error) {
          this.logger.warn('Failed to migrate tasks to Redis:', error);
        }
      }
      
      return tasks;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.logger.info('No tasks found, starting fresh');
        return [];
      }
      this.logger.error('Failed to load tasks:', error);
      return [];
    }
  }

  async saveProcesses(processes: any[]): Promise<void> {
    const processesData = {
      data: processes,
      timestamp: new Date().toISOString(),
      count: processes.length
    };

    // Try Redis first
    if (this.redisAvailable && this.redisClient) {
      try {
        await this.redisClient.set('dashboard:processes', JSON.stringify(processesData));
        this.logger.debug(`Saved ${processes.length} processes to Redis`);
      } catch (error) {
        this.logger.warn('Failed to save processes to Redis, falling back to file:', error);
        this.redisAvailable = false;
      }
    }

    // Always save to file as backup
    try {
      const filePath = path.join(this.dataPath, 'processes.json');
      await fs.writeFile(filePath, JSON.stringify(processes, null, 2));
      this.logger.debug(`Saved ${processes.length} processes to file (${this.redisAvailable ? 'backup' : 'primary'})`);
    } catch (error) {
      this.logger.error('Failed to save processes to file:', error);
    }
  }

  async loadProcesses(): Promise<any[]> {
    // Try Redis first
    if (this.redisAvailable && this.redisClient) {
      try {
        const redisData = await this.redisClient.get('dashboard:processes');
        if (redisData) {
          const parsed = JSON.parse(redisData);
          const processes = parsed.data || [];
          this.logger.info(`Loaded ${processes.length} processes from Redis`);
          return processes;
        }
      } catch (error) {
        this.logger.warn('Failed to load processes from Redis, falling back to file:', error);
        this.redisAvailable = false;
      }
    }

    // Fall back to file
    try {
      const filePath = path.join(this.dataPath, 'processes.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const processes = JSON.parse(data);
      this.logger.info(`Loaded ${processes.length} processes from file (${this.redisAvailable ? 'fallback' : 'primary'})`);
      
      // If Redis is available, migrate data to Redis
      if (this.redisAvailable && this.redisClient && processes.length > 0) {
        try {
          const processesData = {
            data: processes,
            timestamp: new Date().toISOString(),
            count: processes.length
          };
          await this.redisClient.set('dashboard:processes', JSON.stringify(processesData));
          this.logger.info(`Migrated ${processes.length} processes from file to Redis`);
        } catch (error) {
          this.logger.warn('Failed to migrate processes to Redis:', error);
        }
      }
      
      return processes;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.logger.info('No processes found, starting fresh');
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

  async cleanup(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        this.logger.info('Redis connection closed');
      } catch (error) {
        this.logger.warn('Error closing Redis connection:', error);
      }
    }
  }
}