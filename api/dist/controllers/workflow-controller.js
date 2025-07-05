"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowController = void 0;
class WorkflowController {
    constructor(workflowService) {
        this.workflowService = workflowService;
    }
    async getStatus(req, res) {
        try {
            const status = await this.workflowService.getStatus();
            const response = {
                success: true,
                data: { status },
                timestamp: new Date()
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
            res.status(500).json(response);
        }
    }
    async executeCommand(req, res) {
        try {
            const command = req.body;
            // Check if command exists
            if (!command || !command.action) {
                const response = {
                    success: false,
                    error: 'Command is required',
                    timestamp: new Date()
                };
                res.status(400).json(response);
                return;
            }
            // Validate command action
            const validActions = ['start', 'stop', 'pause', 'resume'];
            if (!validActions.includes(command.action)) {
                const response = {
                    success: false,
                    error: 'Invalid command action',
                    timestamp: new Date()
                };
                res.status(400).json(response);
                return;
            }
            const status = await this.workflowService.executeCommand(command);
            const response = {
                success: true,
                data: { status },
                timestamp: new Date()
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
            res.status(500).json(response);
        }
    }
    async getLogs(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const level = req.query.level;
            // Validate pagination parameters
            if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1 || limit > 100) {
                const response = {
                    success: false,
                    error: 'Invalid pagination parameters',
                    timestamp: new Date()
                };
                res.status(400).json(response);
                return;
            }
            const logs = await this.workflowService.getLogs({
                page,
                limit,
                level: level
            });
            const response = {
                success: true,
                data: { logs },
                timestamp: new Date()
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
            res.status(500).json(response);
        }
    }
    async clearLogs(req, res) {
        try {
            await this.workflowService.clearLogs();
            const response = {
                success: true,
                data: { cleared: true },
                timestamp: new Date()
            };
            res.json(response);
        }
        catch (error) {
            const response = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
            res.status(500).json(response);
        }
    }
}
exports.WorkflowController = WorkflowController;
//# sourceMappingURL=workflow-controller.js.map