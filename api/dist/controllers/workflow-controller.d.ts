import { Request, Response } from 'express';
import { WorkflowService } from '../services/workflow-service';
export declare class WorkflowController {
    private workflowService;
    constructor(workflowService: WorkflowService);
    getStatus(req: Request, res: Response): Promise<void>;
    executeCommand(req: Request, res: Response): Promise<void>;
    getLogs(req: Request, res: Response): Promise<void>;
    clearLogs(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=workflow-controller.d.ts.map