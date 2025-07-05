import { WorkflowService } from '../services/workflow-service';
import { WebSocketService } from '../services/websocket-service';
declare const router: import("express-serve-static-core").Router;
declare const workflowService: WorkflowService;
export declare function setWebSocketService(wsService: WebSocketService): void;
export { router as workflowRouter, workflowService };
//# sourceMappingURL=workflow.d.ts.map