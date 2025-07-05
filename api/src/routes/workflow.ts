import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow-controller';
import { WorkflowService } from '../services/workflow-service';
import { ProcessManager } from '../services/process-manager';
import { FileService } from '../services/file-service';
import { LogService } from '../services/log-service';
import { WebSocketService } from '../services/websocket-service';

const router = Router();

// Create service instances
const processManager = new ProcessManager();
const fileService = new FileService();
const logService = new LogService();

// Create workflow service with dependencies
const workflowService = new WorkflowService(processManager, fileService, logService);

// Set up WebSocket broadcasting for workflow events
let webSocketService: WebSocketService | null = null;

export function setWebSocketService(wsService: WebSocketService) {
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

const workflowController = new WorkflowController(workflowService);

// GET /api/workflow/status - Get current workflow status
router.get('/status', (req, res) => workflowController.getStatus(req, res));

// POST /api/workflow/execute - Execute workflow command (matches dashboard API calls)
router.post('/execute', (req, res) => workflowController.executeCommand(req, res));

// GET /api/workflow/logs - Get workflow logs with pagination
router.get('/logs', (req, res) => workflowController.getLogs(req, res));

// DELETE /api/workflow/logs - Clear workflow logs
router.delete('/logs', (req, res) => workflowController.clearLogs(req, res));

export { router as workflowRouter, workflowService };