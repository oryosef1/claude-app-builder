"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const workflow_controller_1 = require("./controllers/workflow-controller");
function createApp(workflowService, fileService, webSocketService) {
    const app = (0, express_1.default)();
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
    // Initialize controllers
    const workflowController = new workflow_controller_1.WorkflowController(workflowService);
    // Workflow routes
    app.get('/api/workflow/status', (req, res) => workflowController.getStatus(req, res));
    app.post('/api/workflow/command', (req, res) => workflowController.executeCommand(req, res));
    app.get('/api/workflow/logs', (req, res) => workflowController.getLogs(req, res));
    app.delete('/api/workflow/logs', (req, res) => workflowController.clearLogs(req, res));
    // Todo routes
    app.get('/api/todos', async (req, res) => {
        try {
            const todos = await fileService.readTodos();
            res.json({
                success: true,
                data: todos,
                timestamp: new Date()
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            });
        }
    });
    app.post('/api/todos', async (req, res) => {
        try {
            const { content, priority, status } = req.body;
            if (!content || content.trim() === '') {
                res.status(400).json({
                    success: false,
                    error: 'Todo content is required',
                    timestamp: new Date()
                });
                return;
            }
            const todos = await fileService.readTodos();
            const newTodo = {
                id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                content: content.trim(),
                priority: priority || 'medium',
                status: status || 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            todos.push(newTodo);
            await fileService.writeTodos(todos);
            // Broadcast todo update
            webSocketService.broadcastTodoUpdate({
                action: 'created',
                todo: newTodo
            });
            res.status(201).json({
                success: true,
                data: newTodo,
                timestamp: new Date()
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            });
        }
    });
    app.put('/api/todos/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            const todos = await fileService.readTodos();
            const todoIndex = todos.findIndex(t => t.id === id);
            if (todoIndex === -1) {
                res.status(404).json({
                    success: false,
                    error: 'Todo not found',
                    timestamp: new Date()
                });
                return;
            }
            const updatedTodo = {
                ...todos[todoIndex],
                ...updates,
                updatedAt: new Date()
            };
            todos[todoIndex] = updatedTodo;
            await fileService.writeTodos(todos);
            res.json({
                success: true,
                data: updatedTodo,
                timestamp: new Date()
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            });
        }
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
    return app;
}
//# sourceMappingURL=app.js.map