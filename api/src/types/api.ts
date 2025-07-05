import { WorkflowState, TaskItem } from './workflow';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface WorkflowControlRequest {
  action: 'start' | 'stop' | 'pause' | 'resume';
}

export interface TaskUpdateRequest {
  content?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
}

export interface TaskCreateRequest {
  content: string;
  priority: 'low' | 'medium' | 'high';
}

export interface MemoryUpdateRequest {
  content: string;
}

export interface WorkflowStatusResponse {
  state: WorkflowState;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
}

export interface TasksResponse {
  tasks: TaskItem[];
  total: number;
  pending: number;
  completed: number;
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  phase?: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
}