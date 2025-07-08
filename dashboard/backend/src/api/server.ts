import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Router } from 'express';
import winston from 'winston';
import { ProcessManager } from '../core/ProcessManager.js';
import { TaskQueue } from '../core/TaskQueue.js';
import { 
  WebSocketMessage, 
  SystemMetrics, 
  ProcessConfig 
} from '../types/index.js';
import { generateId } from '../utils/index.js';

export class DashboardServer {
  private io: SocketIOServer;
  private processManager: ProcessManager;
  private taskQueue: TaskQueue;
  private logger: winston.Logger;
  private connectedClients: Map<string, ClientInfo> = new Map();
  private metricsInterval: NodeJS.Timeout | null = null;
  private readonly metricsIntervalMs: number = 5000; // 5 seconds

  constructor(
    httpServer: HTTPServer,
    processManager: ProcessManager,
    taskQueue: TaskQueue,
    logger: winston.Logger
  ) {
    this.processManager = processManager;
    this.taskQueue = taskQueue;
    this.logger = logger;

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupSocketHandlers();
    this.setupProcessManagerListeners();
    this.setupTaskQueueListeners();
    this.startMetricsBroadcast();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      const clientId = generateId();
      const clientInfo: ClientInfo = {
        id: clientId,
        socket,
        connectedAt: new Date(),
        subscriptions: new Set()
      };

      this.connectedClients.set(clientId, clientInfo);
      this.logger.info(`Client ${clientId} connected`);

      socket.on('join_room', (room: string) => {
        socket.join(room);
        clientInfo.subscriptions.add(room);
        this.logger.info(`Client ${clientId} joined room ${room}`);
      });

      socket.on('leave_room', (room: string) => {
        socket.leave(room);
        clientInfo.subscriptions.delete(room);
        this.logger.info(`Client ${clientId} left room ${room}`);
      });

      socket.on('subscribe_process', (processId: string) => {
        socket.join(`process_${processId}`);
        clientInfo.subscriptions.add(`process_${processId}`);
        this.logger.info(`Client ${clientId} subscribed to process ${processId}`);
      });

      socket.on('subscribe_employee', (employeeId: string) => {
        socket.join(`employee_${employeeId}`);
        clientInfo.subscriptions.add(`employee_${employeeId}`);
        this.logger.info(`Client ${clientId} subscribed to employee ${employeeId}`);
      });

      socket.on('request_processes', () => {
        const processes = this.processManager.getAllProcesses();
        socket.emit('processes_data', processes);
      });

      socket.on('request_tasks', () => {
        const tasks = this.taskQueue.getAllTasks();
        socket.emit('tasks_data', tasks);
      });

      socket.on('request_metrics', () => {
        this.sendSystemMetrics(socket);
      });

      socket.on('process_command', async (data: { processId: string; command: string }) => {
        try {
          const { processId, command } = data;
          await this.processManager.sendInput(processId, command);
          socket.emit('command_sent', { processId, command });
        } catch (error) {
          socket.emit('command_error', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });

      socket.on('disconnect', () => {
        this.connectedClients.delete(clientId);
        this.logger.info(`Client ${clientId} disconnected`);
      });
    });
  }

  private setupProcessManagerListeners(): void {
    this.processManager.on('process_started', (data) => {
      this.broadcastMessage('process_update', {
        type: 'started',
        process: data.claudeProcess
      });
    });

    this.processManager.on('process_stopped', (data) => {
      this.broadcastMessage('process_update', {
        type: 'stopped',
        process: data.claudeProcess,
        exitCode: data.code,
        signal: data.signal
      });
    });

    this.processManager.on('process_error', (data) => {
      this.broadcastMessage('process_update', {
        type: 'error',
        processId: data.processId,
        error: data.error.message
      });
    });

    this.processManager.on('process_output', (data) => {
      this.broadcastToRoom(`process_${data.processId}`, 'log_stream', {
        processId: data.processId,
        logEntry: data.logEntry
      });
    });
  }

  private setupTaskQueueListeners(): void {
    this.taskQueue.on('task_created', (data) => {
      this.broadcastMessage('task_update', {
        type: 'created',
        task: data.task
      });
    });

    this.taskQueue.on('task_assigned', (data) => {
      this.broadcastMessage('task_update', {
        type: 'assigned',
        taskId: data.taskId,
        employeeId: data.employeeId
      });
    });

    this.taskQueue.on('task_started', (data) => {
      this.broadcastMessage('task_update', {
        type: 'started',
        taskId: data.taskId,
        employeeId: data.employeeId,
        processId: data.processId
      });
    });

    this.taskQueue.on('task_completed', (data) => {
      this.broadcastMessage('task_update', {
        type: 'completed',
        taskId: data.taskId,
        result: data.result
      });
    });

    this.taskQueue.on('task_failed', (data) => {
      this.broadcastMessage('task_update', {
        type: 'failed',
        taskId: data.taskId,
        error: data.error.message
      });
    });

    this.taskQueue.on('task_status_updated', (data) => {
      this.broadcastMessage('task_update', {
        type: 'status_updated',
        taskId: data.taskId,
        status: data.status
      });
    });
  }

  private startMetricsBroadcast(): void {
    this.metricsInterval = setInterval(() => {
      this.broadcastSystemMetrics();
    }, this.metricsIntervalMs);
  }

  private async broadcastSystemMetrics(): Promise<void> {
    const metrics = await this.collectSystemMetrics();
    this.broadcastMessage('system_metrics', metrics);
  }

  private async sendSystemMetrics(socket: any): Promise<void> {
    const metrics = await this.collectSystemMetrics();
    socket.emit('system_metrics', metrics);
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const processStats = this.processManager.getProcessStats();
    const taskStats = this.taskQueue.getTaskStats();

    return {
      timestamp: new Date(),
      processes: {
        total: processStats.total,
        running: processStats.running,
        stopped: processStats.stopped,
        errored: processStats.errored
      },
      tasks: {
        pending: taskStats.pending,
        inProgress: taskStats.inProgress,
        completed: taskStats.completed,
        failed: taskStats.failed
      },
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage().system,
        uptime: process.uptime()
      },
      employees: {
        total: 0, // Will be populated when employees are loaded
        available: 0,
        busy: 0,
        offline: 0
      }
    };
  }

  private broadcastMessage(type: string, data: any): void {
    const message: WebSocketMessage = {
      type: type as any,
      data,
      timestamp: new Date(),
      source: 'dashboard-server'
    };

    this.io.emit(type, message);
  }

  private broadcastToRoom(room: string, type: string, data: any): void {
    const message: WebSocketMessage = {
      type: type as any,
      data,
      timestamp: new Date(),
      source: 'dashboard-server'
    };

    this.io.to(room).emit(type, message);
  }

  getConnectedClients(): number {
    return this.connectedClients.size;
  }

  getClientInfo(): ClientInfo[] {
    return Array.from(this.connectedClients.values());
  }

  async shutdown(): Promise<void> {
    if (this.metricsInterval) {
      clearTimeout(this.metricsInterval);
    }

    this.io.close();
    this.logger.info('Dashboard server shut down');
  }
}

export function createAPIRouter(
  processManager: ProcessManager,
  taskQueue: TaskQueue,
  logger: winston.Logger
): Router {
  const router = Router();

  // Process management endpoints
  router.get('/processes', (_req, res) => {
    try {
      const processes = processManager.getAllProcesses();
      res.json({ success: true, data: processes });
    } catch (error) {
      logger.error('Error getting processes:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.get('/processes/:id', (req, res) => {
    try {
      const process = processManager.getProcess(req.params.id);
      if (!process) {
        res.status(404).json({ success: false, error: 'Process not found' });
        return;
      }
      res.json({ success: true, data: process });
    } catch (error) {
      logger.error('Error getting process:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.post('/processes', async (req, res) => {
    try {
      const config: ProcessConfig = req.body;
      const processId = await processManager.createProcess(config);
      res.status(201).json({ success: true, data: { processId } });
    } catch (error) {
      logger.error('Error creating process:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.post('/processes/:id/stop', async (req, res) => {
    try {
      await processManager.stopProcess(req.params.id);
      res.json({ success: true, message: 'Process stopped' });
    } catch (error) {
      logger.error('Error stopping process:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.post('/processes/:id/restart', async (req, res) => {
    try {
      await processManager.restartProcess(req.params.id);
      res.json({ success: true, message: 'Process restarted' });
    } catch (error) {
      logger.error('Error restarting process:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.get('/processes/:id/logs', (req, res) => {
    try {
      const limit = parseInt((req.query['limit'] as string) || '100');
      const logs = processManager.getProcessLogs(req.params.id, limit);
      res.json({ success: true, data: logs });
    } catch (error) {
      logger.error('Error getting process logs:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Task management endpoints
  router.get('/tasks', (_req, res) => {
    try {
      const tasks = taskQueue.getAllTasks();
      res.json({ success: true, data: tasks });
    } catch (error) {
      logger.error('Error getting tasks:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.get('/tasks/:id', (req, res) => {
    try {
      const task = taskQueue.getTask(req.params.id);
      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }
      res.json({ success: true, data: task });
    } catch (error) {
      logger.error('Error getting task:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.post('/tasks', async (req, res) => {
    try {
      const taskData = req.body;
      const taskId = await taskQueue.createTask(taskData);
      res.status(201).json({ success: true, data: { taskId } });
    } catch (error) {
      logger.error('Error creating task:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.post('/tasks/:id/assign', async (req, res) => {
    try {
      const { employeeId } = req.body;
      await taskQueue.assignTask(req.params.id, employeeId);
      res.json({ success: true, message: 'Task assigned' });
    } catch (error) {
      logger.error('Error assigning task:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.delete('/tasks/:id', async (req, res) => {
    try {
      await taskQueue.cancelTask(req.params.id);
      res.json({ success: true, message: 'Task cancelled' });
    } catch (error) {
      logger.error('Error cancelling task:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Statistics endpoints
  router.get('/stats/processes', (_req, res) => {
    try {
      const stats = processManager.getProcessStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Error getting process stats:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.get('/stats/tasks', (_req, res) => {
    try {
      const stats = taskQueue.getTaskStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Error getting task stats:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  router.get('/stats/queue', async (_req, res) => {
    try {
      const stats = await taskQueue.getQueueStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  return router;
}

interface ClientInfo {
  id: string;
  socket: any;
  connectedAt: Date;
  subscriptions: Set<string>;
}