"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
class WorkflowService extends events_1.EventEmitter {
    constructor(processManager, fileService, logService) {
        super();
        this.currentProcess = null;
        this.status = {
            isRunning: false,
            currentPhase: 'idle',
            progress: 0
        };
        this.logs = [];
        this.processInfo = null;
        this.processManager = processManager;
        this.fileService = fileService;
        this.logService = logService;
        this.setupEventListeners();
    }
    setupEventListeners() {
        this.on('statusChange', (newStatus) => {
            this.status = { ...this.status, ...newStatus };
        });
        this.on('logEntry', (entry) => {
            this.logs.push(entry);
            // Keep only last 1000 logs to prevent memory issues
            if (this.logs.length > 1000) {
                this.logs = this.logs.slice(-1000);
            }
        });
    }
    async getStatus() {
        const runningProcesses = this.processManager.getRunningProcesses();
        return {
            isRunning: runningProcesses.length > 0,
            currentPhase: runningProcesses.length > 0 ? 'running' : 'stopped',
            progress: 0
        };
    }
    async executeCommand(command) {
        switch (command.action) {
            case 'start':
                return this.startWorkflow(command.todoId);
            case 'stop':
                return this.stopWorkflow();
            case 'pause':
                return this.pauseWorkflow();
            case 'resume':
                return this.resumeWorkflow();
            default:
                throw new Error(`Unknown command: ${command.action}`);
        }
    }
    async startWorkflow(todoId) {
        const runningProcesses = this.processManager.getRunningProcesses();
        if (runningProcesses.length > 0) {
            throw new Error('Workflow is already running');
        }
        // If todoId is provided, validate it exists
        if (todoId) {
            const todos = await this.fileService.readTodos();
            const todo = todos.find(t => t.id === todoId);
            if (!todo) {
                throw new Error(`Todo not found: ${todoId}`);
            }
        }
        // Execute the workflow process
        const result = await this.processManager.executeProcess();
        return {
            isRunning: true,
            currentPhase: 'running',
            progress: 0
        };
    }
    async stopWorkflow() {
        const runningProcesses = this.processManager.getRunningProcesses();
        if (runningProcesses.length === 0) {
            throw new Error('Workflow is not running');
        }
        // Kill all running processes
        for (const pid of runningProcesses) {
            this.processManager.killProcess(pid);
        }
        return {
            isRunning: false,
            currentPhase: 'stopped',
            progress: 0
        };
    }
    async pauseWorkflow() {
        const runningProcesses = this.processManager.getRunningProcesses();
        if (runningProcesses.length === 0) {
            throw new Error('No workflow is currently running');
        }
        // Kill processes for pause
        for (const pid of runningProcesses) {
            this.processManager.killProcess(pid);
        }
        return {
            isRunning: false,
            currentPhase: 'paused',
            progress: 0
        };
    }
    async resumeWorkflow() {
        // Execute a new process for resume
        const result = await this.processManager.executeProcess();
        return {
            isRunning: true,
            currentPhase: 'running',
            progress: 0
        };
    }
    setupProcessHandlers() {
        if (!this.currentProcess)
            return;
        this.currentProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            this.parseWorkflowOutput(output);
            this.addLog('debug', `Workflow output: ${output.trim()}`, this.status.currentPhase);
        });
        this.currentProcess.stderr?.on('data', (data) => {
            const error = data.toString();
            this.addLog('error', `Workflow error: ${error.trim()}`, this.status.currentPhase);
        });
        this.currentProcess.on('exit', (code) => {
            this.addLog('info', `Workflow process exited with code: ${code}`, 'shutdown');
            const newStatus = {
                isRunning: false,
                currentPhase: code === 0 ? 'completed' : 'error',
                progress: code === 0 ? 100 : this.status.progress,
                endTime: new Date(),
                error: code !== 0 ? `Process exited with code ${code}` : undefined
            };
            this.emit('statusChange', newStatus);
            this.currentProcess = null;
            this.processInfo = null;
        });
        this.currentProcess.on('error', (error) => {
            this.addLog('error', `Process error: ${error.message}`, 'error');
            const newStatus = {
                isRunning: false,
                currentPhase: 'error',
                progress: this.status.progress,
                endTime: new Date(),
                error: error.message
            };
            this.emit('statusChange', newStatus);
            this.currentProcess = null;
            this.processInfo = null;
        });
    }
    parseWorkflowOutput(output) {
        // Parse workflow output to extract phase information
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('Starting Test Writer')) {
                this.emit('statusChange', { currentPhase: 'test-writer', progress: 20 });
            }
            else if (line.includes('Starting Test Reviewer')) {
                this.emit('statusChange', { currentPhase: 'test-reviewer', progress: 40 });
            }
            else if (line.includes('Starting Developer')) {
                this.emit('statusChange', { currentPhase: 'developer', progress: 60 });
            }
            else if (line.includes('Starting Code Reviewer')) {
                this.emit('statusChange', { currentPhase: 'code-reviewer', progress: 80 });
            }
            else if (line.includes('Starting Coordinator')) {
                this.emit('statusChange', { currentPhase: 'coordinator', progress: 90 });
            }
            else if (line.includes('Workflow completed')) {
                this.emit('statusChange', { currentPhase: 'completed', progress: 100 });
            }
        }
    }
    async getLogs(options) {
        return this.logService.getLogs(options || {});
    }
    async clearLogs() {
        return this.logService.clearLogs();
    }
    addLog(level, message, phase) {
        const logEntry = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            level,
            message,
            phase
        };
        this.emit('logEntry', logEntry);
    }
    getProcessInfo() {
        return this.processInfo ? { ...this.processInfo } : null;
    }
}
exports.WorkflowService = WorkflowService;
//# sourceMappingURL=workflow-service.js.map