import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import WebSocket from 'ws';
import http from 'http';
import net from 'net';
import { writeFileSync } from 'fs';

// Import route handlers
import employeeRoutes from './routes/employees.js';
import workflowRoutes from './routes/workflows.js';
import memoryRoutes from './routes/memory.js';
import performanceRoutes from './routes/performance.js';
import systemRoutes from './routes/system.js';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-bridge' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Rate limiting - Increased for dashboard usage
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
// CORS configuration - environment-aware and secure
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
  : [
      'http://localhost:3000',   // Default frontend
      'http://localhost:5173',   // Vite dev server
      'http://localhost:8200',   // Dashboard
      'http://localhost:8100',   // Additional dashboard port
      'http://localhost:8105',   // Additional dashboard port
      'http://localhost:8080'    // Backend dashboard
    ];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(limiter);
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Corporate Infrastructure API Bridge',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/system', systemRoutes);

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  logger.info('New WebSocket connection established');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.info('WebSocket message received:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'subscribe':
          ws.subscriptions = data.channels || [];
          ws.send(JSON.stringify({ type: 'subscribed', channels: ws.subscriptions }));
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        default:
          logger.warn('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString(),
    message: 'Connected to Corporate Infrastructure API Bridge'
  }));
});

// Broadcast function for real-time updates
function broadcast(channel, data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && 
        client.subscriptions && 
        client.subscriptions.includes(channel)) {
      client.send(JSON.stringify({
        type: 'update',
        channel,
        data,
        timestamp: new Date().toISOString()
      }));
    }
  });
}

// Make broadcast function available to routes
app.locals.broadcast = broadcast;

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('API Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404,
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
});

// Port configuration with dynamic allocation
const preferredPort = parseInt(process.env.API_BRIDGE_PORT) || 3001;
const fallbackPorts = [3002, 3003, 3004, 3005, 3006];

// Check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Find an available port
async function findAvailablePort() {
  if (await isPortAvailable(preferredPort)) {
    return preferredPort;
  }
  
  logger.warn(`Preferred port ${preferredPort} is in use, trying fallback ports...`);
  
  for (const port of fallbackPorts) {
    if (await isPortAvailable(port)) {
      logger.info(`Using fallback port ${port}`);
      return port;
    }
  }
  
  throw new Error(`No available ports found. Tried: ${preferredPort}, ${fallbackPorts.join(', ')}`);
}

// Start server with dynamic port allocation
async function startServer() {
  try {
    const PORT = await findAvailablePort();
    
    server.listen(PORT, () => {
      logger.info(`Corporate Infrastructure API Bridge started on port ${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
      logger.info(`WebSocket server started for real-time updates`);
      
      // Save port information for other services to discover
      const portInfo = {
        port: PORT,
        service: 'Corporate Infrastructure API Bridge',
        timestamp: new Date().toISOString(),
        pid: process.pid
      };
      
      try {
        writeFileSync('.api-bridge-port', JSON.stringify(portInfo, null, 2));
        logger.info('Port information saved to .api-bridge-port file');
      } catch (error) {
        logger.warn('Failed to save port information:', error.message);
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export { app, server, broadcast };