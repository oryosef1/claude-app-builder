"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSocketService = exports.server = void 0;
const app_1 = require("./app");
const websocket_service_1 = require("./services/websocket-service");
const workflow_1 = require("./routes/workflow");
const PORT = process.env.PORT || 3001;
// Create app and server
const { app, server } = (0, app_1.createApp)();
exports.server = server;
// Initialize WebSocket service with HTTP server
const webSocketService = new websocket_service_1.WebSocketService(server);
exports.webSocketService = webSocketService;
// Connect WebSocket service to workflow routes for real-time updates
(0, workflow_1.setWebSocketService)(webSocketService);
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
//# sourceMappingURL=server.js.map