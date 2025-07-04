"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogService = void 0;
const events_1 = require("events");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
class LogService extends events_1.EventEmitter {
    constructor(logFile = 'app.log') {
        super();
        this.logs = [];
        this.logFile = logFile;
        this.ensureLogDirectory();
    }
    async ensureLogDirectory() {
        const logDir = path_1.default.dirname(this.logFile);
        try {
            await (0, promises_1.mkdir)(logDir, { recursive: true });
        }
        catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }
    async log(entry) {
        const logEntry = {
            id: this.generateId(),
            timestamp: new Date(),
            ...entry
        };
        this.logs.push(logEntry);
        this.emit('logEntry', logEntry);
        try {
            await this.writeToFile(logEntry);
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    async info(message, metadata) {
        await this.log({ level: 'info', message, metadata });
    }
    async warn(message, metadata) {
        await this.log({ level: 'warn', message, metadata });
    }
    async error(message, metadata) {
        await this.log({ level: 'error', message, metadata });
    }
    async debug(message, metadata) {
        await this.log({ level: 'debug', message, metadata });
    }
    getLogs(limit, level) {
        let filteredLogs = this.logs;
        if (level) {
            filteredLogs = filteredLogs.filter(log => log.level === level);
        }
        if (limit) {
            filteredLogs = filteredLogs.slice(-limit);
        }
        return filteredLogs;
    }
    clearLogs() {
        this.logs = [];
        this.emit('logsCleared');
    }
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    async writeToFile(entry) {
        const logLine = `${entry.timestamp.toISOString()} [${entry.level.toUpperCase()}] ${entry.message}`;
        const logData = entry.metadata ? `${logLine} ${JSON.stringify(entry.metadata)}` : logLine;
        try {
            await (0, promises_1.writeFile)(this.logFile, logData + '\n', { flag: 'a' });
        }
        catch (error) {
            console.error('Failed to write log to file:', error);
        }
    }
    async loadLogsFromFile() {
        try {
            const data = await (0, promises_1.readFile)(this.logFile, 'utf8');
            const lines = data.split('\n').filter(line => line.trim());
            for (const line of lines) {
                const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \[(\w+)\] (.+)$/);
                if (match) {
                    const [, timestamp, level, message] = match;
                    const logEntry = {
                        id: this.generateId(),
                        timestamp: new Date(timestamp),
                        level: level.toLowerCase(),
                        message
                    };
                    this.logs.push(logEntry);
                }
            }
        }
        catch (error) {
            console.error('Failed to load logs from file:', error);
        }
    }
}
exports.LogService = LogService;
//# sourceMappingURL=log-service.js.map