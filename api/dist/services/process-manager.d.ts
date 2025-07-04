import { EventEmitter } from 'events';
export interface ProcessOptions {
    command: string;
    args?: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}
export interface ProcessResult {
    pid: number;
    exitCode: number | null;
    stdout: string;
    stderr: string;
}
export declare class ProcessManager extends EventEmitter {
    private processes;
    executeProcess(options: ProcessOptions): Promise<ProcessResult>;
    killProcess(pid: number): boolean;
    getRunningProcesses(): number[];
    killAllProcesses(): void;
}
//# sourceMappingURL=process-manager.d.ts.map