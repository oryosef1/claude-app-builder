"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessManager = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
class ProcessManager extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.processes = new Map();
    }
    async executeProcess(command, args, options) {
        // Handle both parameter styles from tests
        const actualCommand = command || './automated-workflow.sh';
        const actualArgs = args || [];
        return new Promise((resolve, reject) => {
            const childProcess = (0, child_process_1.spawn)(actualCommand, actualArgs, {
                cwd: options?.cwd,
                env: { ...process.env, ...options?.env },
                stdio: ['pipe', 'pipe', 'pipe']
            });
            if (childProcess.pid) {
                this.processes.set(childProcess.pid, childProcess);
            }
            let stdout = '';
            let stderr = '';
            childProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            childProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            childProcess.on('close', (code) => {
                if (childProcess.pid) {
                    this.processes.delete(childProcess.pid);
                }
                resolve({
                    pid: childProcess.pid || -1,
                    exitCode: code,
                    stdout,
                    stderr
                });
            });
            childProcess.on('error', (error) => {
                if (childProcess.pid) {
                    this.processes.delete(childProcess.pid);
                }
                reject(error);
            });
        });
    }
    killProcess(pid) {
        const process = this.processes.get(pid);
        if (process) {
            process.kill();
            this.processes.delete(pid);
            return true;
        }
        return false;
    }
    getRunningProcesses() {
        return Array.from(this.processes.keys());
    }
    killAllProcesses() {
        for (const [pid, process] of this.processes) {
            process.kill();
        }
        this.processes.clear();
    }
}
exports.ProcessManager = ProcessManager;
//# sourceMappingURL=process-manager.js.map