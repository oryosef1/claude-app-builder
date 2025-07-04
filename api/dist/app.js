"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSocketService = exports.server = exports.app = void 0;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const websocket_service_1 = require("./services/websocket-service");
const workflow_1 = require("./routes/workflow");
const files_1 = require("./routes/files");
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
// Initialize WebSocket service
const webSocketService = new websocket_service_1.WebSocketService(server);
exports.webSocketService = webSocketService;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api/workflow', workflow_1.workflowRouter);
app.use('/api/files', files_1.filesRouter);
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
app.use((err, req, res, next) => {
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
workflow_1.workflowService.on('statusChange', (status) => {
    webSocketService.broadcastWorkflowStatus(status);
});
workflow_1.workflowService.on('logEntry', (logEntry) => {
    webSocketService.broadcastLogEntry(logEntry);
});
function createApp(workflowService, fileService, webSocketService) {
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
//# sourceMappingURL=app.js.map