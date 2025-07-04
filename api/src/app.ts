import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketService } from './services/websocket-service';
import { workflowRouter, workflowService } from './routes/workflow';
import { filesRouter, fileService } from './routes/files';

const app = express();
const server = createServer(app);

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/workflow', workflowRouter);
app.use('/api/files', filesRouter);

// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
  res.json({
    success: true,
    data: {
      connectedClients: webSocketService.getClientCount(),
      clients: webSocketService.getConnectedClients()
    },
    timestamp: new Date()
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: new Date()
  });
});

// Set up event listeners for real-time updates
workflowService.on('statusChange', (status) => {
  webSocketService.broadcastWorkflowStatus(status);
});

workflowService.on('logEntry', (logEntry) => {
  webSocketService.broadcastLogEntry(logEntry);
});

export function createApp(workflowService?: any, fileService?: any, webSocketService?: any) {
  // For testing - override services
  if (workflowService) {
    // Replace the workflow service in routes
  }
  if (fileService) {
    // Replace the file service in routes
  }
  if (webSocketService) {
    // Replace the websocket service
  }
  return app;
}

export { app, server, webSocketService };