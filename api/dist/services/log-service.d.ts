import { EventEmitter } from 'events';
export interface LogEntry {
    id: string;
    timestamp: Date;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    source?: string;
    metadata?: Record<string, unknown>;
}
export declare class LogService extends EventEmitter {
    private logs;
    private logFile;
    constructor(logFile?: string);
    private ensureLogDirectory;
    log(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void>;
    info(message: string, metadata?: Record<string, unknown>): Promise<void>;
    warn(message: string, metadata?: Record<string, unknown>): Promise<void>;
    error(message: string, metadata?: Record<string, unknown>): Promise<void>;
    debug(message: string, metadata?: Record<string, unknown>): Promise<void>;
    getLogs(limit?: number, level?: string): LogEntry[];
    clearLogs(): void;
    private generateId;
    private writeToFile;
    loadLogsFromFile(): Promise<void>;
}
//# sourceMappingURL=log-service.d.ts.map