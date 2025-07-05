"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowService = exports.workflowRouter = void 0;
exports.setWebSocketService = setWebSocketService;
const express_1 = require("express");
const workflow_controller_1 = require("../controllers/workflow-controller");
const workflow_service_1 = require("../services/workflow-service");
const process_manager_1 = require("../services/process-manager");
const file_service_1 = require("../services/file-service");
const log_service_1 = require("../services/log-service");
const router = (0, express_1.Router)();
exports.workflowRouter = router;
// Create service instances
const processManager = new process_manager_1.ProcessManager();
const fileService = new file_service_1.FileService();
const logService = new log_service_1.LogService();
// Create workflow service with dependencies
const workflowService = new workflow_service_1.WorkflowService(processManager, fileService, logService);
exports.workflowService = workflowService;
// Set up WebSocket broadcasting for workflow events
let webSocketService = null;
function setWebSocketService(wsService) {
    webSocketService = wsService;
    // Listen for workflow events and broadcast them
    workflowService.on('statusChange', (status) => {
        if (webSocketService) {
            webSocketService.broadcastWorkflowStatus(status);
        }
    });
    workflowService.on('logEntry', (logEntry) => {
        if (webSocketService) {
            webSocketService.broadcastLogEntry(logEntry);
        }
    });
}
const workflowController = new workflow_controller_1.WorkflowController(workflowService);
// GET /api/workflow/status - Get current workflow status
router.get('/status', (req, res) => workflowController.getStatus(req, res));
// POST /api/workflow/execute - Execute workflow command (matches dashboard API calls)
router.post('/execute', (req, res) => workflowController.executeCommand(req, res));
// GET /api/workflow/logs - Get workflow logs with pagination
router.get('/logs', (req, res) => workflowController.getLogs(req, res));
// DELETE /api/workflow/logs - Clear workflow logs
router.delete('/logs', (req, res) => workflowController.clearLogs(req, res));
//# sourceMappingURL=workflow.js.map