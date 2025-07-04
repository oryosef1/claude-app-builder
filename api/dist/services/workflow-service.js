"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
const uuid_1 = require("uuid");
const process_manager_1 = require("./process-manager");
const file_service_1 = require("./file-service");
const log_service_1 = require("./log-service");
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
        this.processManager = processManager || new process_manager_1.ProcessManager();
        this.fileService = fileService || new file_service_1.FileService();
        this.logService = logService || new log_service_1.LogService();
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
        return { ...this.status };
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
        if (this.status.isRunning) {
            throw new Error('Workflow is already running');
        }
        this.addLog('info', 'Starting workflow...', 'startup');
        try {
            // Spawn the automated workflow script
            const scriptPath = '../automated-workflow.sh';
            const args = todoId ? [todoId] : [];
            this.currentProcess = (0, child_process_1.spawn)('bash', [scriptPath, ...args], {
                cwd: '/mnt/c/Users/בית/Downloads/poe helper',
                stdio: ['pipe', 'pipe', 'pipe']
            });
            this.processInfo = {
                pid: this.currentProcess.pid,
                status: 'running',
                startTime: new Date(),
                command: `bash ${scriptPath} ${args.join(' ')}`
            };
            this.setupProcessHandlers();
            const newStatus = {
                isRunning: true,
                currentPhase: 'test-writer',
                progress: 0,
                startTime: new Date()
            };
            this.emit('statusChange', newStatus);
            this.addLog('info', `Workflow started with PID: ${this.processInfo.pid}`, 'startup');
            return newStatus;
        }
        catch (error) {
            this.addLog('error', `Failed to start workflow: ${error}`, 'startup');
            throw error;
        }
    }
    async stopWorkflow() {
        if (!this.status.isRunning || !this.currentProcess) {
            throw new Error('No workflow is currently running');
        }
        this.addLog('info', 'Stopping workflow...', 'shutdown');
        try {
            this.currentProcess.kill('SIGTERM');
            // Wait for process to terminate gracefully
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    if (this.currentProcess) {
                        this.currentProcess.kill('SIGKILL');
                    }
                    resolve();
                }, 5000);
                this.currentProcess.on('exit', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            const newStatus = {
                isRunning: false,
                currentPhase: 'stopped',
                progress: 0,
                endTime: new Date()
            };
            this.emit('statusChange', newStatus);
            this.addLog('info', 'Workflow stopped successfully', 'shutdown');
            this.currentProcess = null;
            this.processInfo = null;
            return newStatus;
        }
        catch (error) {
            this.addLog('error', `Failed to stop workflow: ${error}`, 'shutdown');
            throw error;
        }
    }
    async pauseWorkflow() {
        if (!this.status.isRunning || !this.currentProcess) {
            throw new Error('No workflow is currently running');
        }
        this.addLog('info', 'Pausing workflow...', 'control');
        try {
            this.currentProcess.kill('SIGSTOP');
            const newStatus = {
                isRunning: false,
                currentPhase: 'paused',
                progress: this.status.progress
            };
            this.emit('statusChange', newStatus);
            this.addLog('info', 'Workflow paused', 'control');
            return newStatus;
        }
        catch (error) {
            this.addLog('error', `Failed to pause workflow: ${error}`, 'control');
            throw error;
        }
    }
    async resumeWorkflow() {
        if (this.status.isRunning || !this.currentProcess) {
            throw new Error('No paused workflow to resume');
        }
        this.addLog('info', 'Resuming workflow...', 'control');
        try {
            this.currentProcess.kill('SIGCONT');
            const newStatus = {
                isRunning: true,
                currentPhase: this.status.currentPhase === 'paused' ? 'test-writer' : this.status.currentPhase,
                progress: this.status.progress
            };
            this.emit('statusChange', newStatus);
            this.addLog('info', 'Workflow resumed', 'control');
            return newStatus;
        }
        catch (error) {
            this.addLog('error', `Failed to resume workflow: ${error}`, 'control');
            throw error;
        }
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
    async getLogs(filter) {
        let filteredLogs = this.logs;
        // Apply level filter
        if (filter.level) {
            filteredLogs = filteredLogs.filter(log => log.level === filter.level);
        }
        // Apply pagination
        const start = (filter.page - 1) * filter.limit;
        const end = start + filter.limit;
        return filteredLogs.slice(start, end);
    }
    async clearLogs() {
        this.logs = [];
        this.addLog('info', 'Logs cleared', 'system');
        return true;
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