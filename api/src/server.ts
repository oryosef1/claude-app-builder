import { createApp } from './app';
import { WebSocketService } from './services/websocket-service';
import { setWebSocketService } from './routes/workflow';

const PORT = process.env.PORT || 3001;

// Create app and server
const { app, server } = createApp();

// Initialize WebSocket service with HTTP server
const webSocketService = new WebSocketService(server);

// Connect WebSocket service to workflow routes for real-time updates
setWebSocketService(webSocketService);

server.listen(PORT, () => {
  console.log(`🚀 Claude App Builder API server started on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API endpoints: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  webSocketService.close(() => {
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  webSocketService.close(() => {
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });
});

export { server, webSocketService };