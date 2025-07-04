export interface WorkflowStatus {
  isRunning: boolean;
  currentPhase: string;
  progress: number;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface WorkflowCommand {
  action: 'start' | 'stop' | 'pause' | 'resume';
  todoId?: string;
}

export interface TodoItem {
  id: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  phase?: string;
  data?: any;
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete';
  path: string;
  content?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface WorkflowConfig {
  maxIterations: number;
  timeout: number;
  retryAttempts: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ProcessInfo {
  pid: number;
  status: 'running' | 'stopped' | 'error';
  startTime: Date;
  command: string;
}

export interface WebSocketMessage {
  type: 'workflow_status' | 'log_entry' | 'todo_update' | 'file_change';
  data: any;
  timestamp: Date;
}