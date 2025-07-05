export interface WorkflowState {
  phase: 'idle' | 'test-writer' | 'test-reviewer' | 'developer' | 'code-reviewer' | 'coordinator' | 'complete' | 'error';
  status: 'stopped' | 'running' | 'paused' | 'error';
  progress: number;
  output: string[];
  currentTask?: string;
  error?: string;
}

export interface TaskItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  created?: Date;
  updated?: Date;
}

export interface ProcessInfo {
  pid?: number;
  command?: string;
  startTime?: Date;
  uptime?: number;
}