export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  error?: string;
}

export interface WorkflowControlRequest {
  action: 'start' | 'stop' | 'pause' | 'resume';
}

export interface WorkflowStatusResponse {
  workflow: {
    id: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
    currentPhase: string | null;
    startTime: string | null;
    endTime: string | null;
    output: string[];
    error: string | null;
  };
}

export interface TaskUpdateRequest {
  id: string;
  content?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  uptime: number;
  processCount: number;
}