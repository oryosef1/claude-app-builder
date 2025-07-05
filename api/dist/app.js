"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const workflow_1 = require("./routes/workflow");
const files_1 = require("./routes/files");
function createApp() {
    const app = (0, express_1.default)();
    const server = (0, http_1.createServer)(app);
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
    // API Routes
    app.use('/api/workflow', workflow_1.workflowRouter);
    app.use('/api/files', files_1.filesRouter);
    // Health check
    app.get('/health', (req, res) => {
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
    app.use((err, req, res, next) => {
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
    return { app, server };
}
//# sourceMappingURL=app.js.map