"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowService = exports.workflowRouter = void 0;
const express_1 = require("express");
const workflow_controller_1 = require("../controllers/workflow-controller");
const workflow_service_1 = require("../services/workflow-service");
const router = (0, express_1.Router)();
exports.workflowRouter = router;
const workflowService = new workflow_service_1.WorkflowService();
exports.workflowService = workflowService;
const workflowController = new workflow_controller_1.WorkflowController(workflowService);
// GET /api/workflow/status - Get current workflow status
router.get('/status', (req, res) => workflowController.getStatus(req, res));
// POST /api/workflow/command - Execute workflow command
router.post('/command', (req, res) => workflowController.executeCommand(req, res));
// GET /api/workflow/logs - Get workflow logs with pagination
router.get('/logs', (req, res) => workflowController.getLogs(req, res));
// DELETE /api/workflow/logs - Clear workflow logs
router.delete('/logs', (req, res) => workflowController.clearLogs(req, res));
//# sourceMappingURL=workflow.js.map