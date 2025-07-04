import { EventEmitter } from 'events';
import { WorkflowStatus, WorkflowCommand, LogEntry, ProcessInfo } from '../types';
import { ProcessManager } from './process-manager';
import { FileService } from './file-service';
import { LogService } from './log-service';
export declare class WorkflowService extends EventEmitter {
    private currentProcess;
    private status;
    private logs;
    private processInfo;
    private processManager;
    private fileService;
    private logService;
    constructor(processManager: ProcessManager, fileService: FileService, logService: LogService);
    private setupEventListeners;
    getStatus(): Promise<WorkflowStatus>;
    executeCommand(command: WorkflowCommand): Promise<WorkflowStatus>;
    private startWorkflow;
    private stopWorkflow;
    private pauseWorkflow;
    private resumeWorkflow;
    private setupProcessHandlers;
    private parseWorkflowOutput;
    getLogs(options?: any): Promise<LogEntry[]>;
    clearLogs(): Promise<boolean>;
    private addLog;
    getProcessInfo(): ProcessInfo | null;
}
//# sourceMappingURL=workflow-service.d.ts.map