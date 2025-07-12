import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import winston from 'winston';
import fetch from 'node-fetch';
import { ProcessManager } from './core/ProcessManager.js';
import { TaskQueue } from './core/TaskQueue.js';
import { AgentRegistry } from './core/AgentRegistry.js';
import { DashboardServer, createAPIRouter } from './api/server.js';
import { AIEmployee } from './types/index.js';
import { PersistenceService } from './core/PersistenceService.js';

dotenv.config();

// Environment variable validation
interface EnvironmentConfig {
  DASHBOARD_PORT: string;
  NODE_ENV: string;
  FRONTEND_URL: string;
  MEMORY_API_URL: string;
  API_BRIDGE_URL: string;
}

function validateEnvironment(): EnvironmentConfig {
  const requiredVars = ['DASHBOARD_PORT'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Set defaults for optional variables
  if (!process.env['NODE_ENV']) {
    process.env['NODE_ENV'] = 'development';
  }

  if (!process.env['FRONTEND_URL']) {
    process.env['FRONTEND_URL'] = 'http://localhost:3000';
  }

  if (!process.env['MEMORY_API_URL']) {
    process.env['MEMORY_API_URL'] = 'http://localhost:3333';
  }

  if (!process.env['API_BRIDGE_URL']) {
    process.env['API_BRIDGE_URL'] = 'http://localhost:3002';
  }

  return {
    DASHBOARD_PORT: process.env['DASHBOARD_PORT']!,
    NODE_ENV: process.env['NODE_ENV']!,
    FRONTEND_URL: process.env['FRONTEND_URL']!,
    MEMORY_API_URL: process.env['MEMORY_API_URL']!,
    API_BRIDGE_URL: process.env['API_BRIDGE_URL']!
  };
}

// Validate environment on startup
const envConfig = validateEnvironment();

const app = express();
const server = createServer(app);
const PORT = parseInt(envConfig.DASHBOARD_PORT) || 8080;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(helmet());
app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastCheck: Date;
}

interface SystemHealth {
  services: ServiceStatus[];
  dashboard: {
    status: 'healthy' | 'unhealthy';
    uptime: number;
    memory: NodeJS.MemoryUsage;
    timestamp: Date;
  };
}

async function checkServiceHealth(url: string): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number }> {
  try {
    const start = Date.now();
    const response = await fetch(url, { 
      method: 'GET'
    });
    const responseTime = Date.now() - start;
    
    if (response.ok) {
      return { status: 'healthy', responseTime };
    } else {
      return { status: 'unhealthy', responseTime };
    }
  } catch (error) {
    logger.error(`Health check failed for ${url}:`, error);
    return { status: 'unhealthy', responseTime: 0 };
  }
}

app.get('/health', async (_req, res) => {
  try {
    const memoryApiCheck = await checkServiceHealth(`${envConfig.MEMORY_API_URL}/health`);
    const apiBridgeCheck = await checkServiceHealth(`${envConfig.API_BRIDGE_URL}/health`);
    
    const systemHealth: SystemHealth = {
      services: [
        {
          name: 'Memory API',
          url: envConfig.MEMORY_API_URL,
          status: memoryApiCheck.status,
          responseTime: memoryApiCheck.responseTime,
          lastCheck: new Date()
        },
        {
          name: 'API Bridge',
          url: envConfig.API_BRIDGE_URL,
          status: apiBridgeCheck.status,
          responseTime: apiBridgeCheck.responseTime,
          lastCheck: new Date()
        }
      ],
      dashboard: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date()
      }
    };

    const allServicesHealthy = systemHealth.services.every(service => service.status === 'healthy');
    const statusCode = allServicesHealthy ? 200 : 503;

    res.status(statusCode).json(systemHealth);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/status', (_req, res) => {
  res.json({
    service: 'AI Dashboard Backend',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/employees', async (_req, res) => {
  try {
    const employees = agentRegistry.getAllEmployees();
    res.json({ success: true, data: employees });
  } catch (error) {
    logger.error('Failed to fetch employees:', error);
    res.status(500).json({
      error: 'Failed to fetch employees',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize core components
const processManager = new ProcessManager(logger);
const agentRegistry = new AgentRegistry();
const taskQueue = new TaskQueue(logger, agentRegistry);
processManager.setTaskQueue(taskQueue); // Set taskQueue reference
const dashboardServer = new DashboardServer(server, processManager, taskQueue, agentRegistry, logger);

// Load employees from Agent Registry
async function loadEmployees(): Promise<void> {
  try {
    const registryEmployees = agentRegistry.getAllEmployees();
    const aiEmployees: AIEmployee[] = registryEmployees.map(emp => ({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      skills: emp.skills,
      status: emp.status === 'active' ? 'available' : emp.status === 'busy' ? 'busy' : 'offline',
      performance: {
        tasksCompleted: emp.performance_metrics['tasks_completed'] || 0,
        averageResponseTime: emp.performance_metrics['average_response_time'] || 0,
        successRate: emp.performance_metrics['success_rate'] || 0
      },
      systemPrompt: emp.system_prompt_file,
      tools: [],
      createdAt: new Date(emp.hire_date),
      lastActive: new Date()
    }));
    await processManager.loadEmployees(aiEmployees);
    await taskQueue.loadEmployees(aiEmployees);
    logger.info(`Loaded ${aiEmployees.length} employees into system from Agent Registry`);
  } catch (error) {
    logger.error('Error loading employees:', error);
  }
}

// Import additional routes at the top
import { createAdditionalRoutes } from './api/routes.js';

// Setup API routes
const apiRouter = createAPIRouter(processManager, taskQueue, agentRegistry, logger);
app.use('/api', apiRouter);

// Add additional routes for E2E tests
const additionalRoutes = createAdditionalRoutes(agentRegistry);
app.use('/api', additionalRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env['NODE_ENV'] === 'development' ? error.message : 'Something went wrong'
  });
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  try {
    await dashboardServer.shutdown();
    await processManager.cleanup();
    await taskQueue.cleanup();
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, async () => {
  logger.info(`Dashboard backend server running on port ${PORT}`);
  logger.info(`Environment: ${process.env['NODE_ENV'] || 'development'}`);
  logger.info(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
  
  // Create a persistence service to load data
  const persistenceService = new PersistenceService(logger);
  await persistenceService.initialize();
  
  // Load persisted data
  const persistedTasks = await persistenceService.loadTasks();
  const persistedProcesses = await persistenceService.loadProcesses();
  
  if (persistedTasks.length > 0) {
    logger.info(`Loading ${persistedTasks.length} persisted tasks`);
    for (const task of persistedTasks) {
      await taskQueue.addTask(task);
    }
  }
  
  if (persistedProcesses.length > 0) {
    logger.info(`Loading ${persistedProcesses.length} persisted processes`);
    for (const process of persistedProcesses) {
      processManager.addPersistedProcess(process);
    }
  }
  
  // Load employees after server starts
  await loadEmployees();
  
  logger.info('Dashboard system fully initialized');
});

export default app;
export { server };