import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { workflowRouter } from './routes/workflow';
import { filesRouter } from './routes/files';

export function createApp(): { app: Express; server: any } {
  const app = express();
  const server = createServer(app);
  
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

  // API Routes
  app.use('/api/workflow', workflowRouter);
  app.use('/api/files', filesRouter);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime()
      }
    });
  });

  // JSON parse error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        success: false,
        error: 'Invalid JSON',
        timestamp: new Date()
      });
      return;
    }
    next(err);
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date()
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      timestamp: new Date()
    });
  });

  return { app, server };
}