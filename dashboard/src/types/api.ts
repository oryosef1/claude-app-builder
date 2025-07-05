import { WorkflowState, TaskItem } from './workflow';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WorkflowStatusResponse {
  state: WorkflowState;
  processInfo: {
    pid?: number;
    command?: string;
    startTime?: Date;
    uptime?: number;
  };
  systemInfo: {
    platform: string;
    uptime: number;
    memory: {
      total: number;
      free: number;
      used: number;
    };
  };
}

export interface TasksResponse {
  tasks: TaskItem[];
  total: number;
}

export interface MemoryResponse {
  content: string;
  lastModified: Date;
  size: number;
}