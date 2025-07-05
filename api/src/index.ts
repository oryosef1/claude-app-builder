import { createApp } from './app';
import { WorkflowIntegration } from './services/WorkflowIntegration';
import { logger } from './utils/logger';

const PORT = Number(process.env.PORT) || 3001;

async function startServer() {
  try {
    // Initialize workflow integration
    const workflowIntegration = new WorkflowIntegration();
    await workflowIntegration.initialize();
    
    // Create and start the Express app
    const app = createApp(workflowIntegration);
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Claude App Builder API server running on http://0.0.0.0:${PORT}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await workflowIntegration.cleanup();
        process.exit(0);
      });
    });
    
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await workflowIntegration.cleanup();
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();