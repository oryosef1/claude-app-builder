export interface AIEmployee {
  id: string;
  name: string;
  role: string;
  department: string;
  skills: string[];
  status: 'available' | 'busy' | 'offline';
  currentTask?: string;
  performance: {
    tasksCompleted: number;
    averageResponseTime: number;
    successRate: number;
  };
  systemPrompt: string;
  tools: string[];
  createdAt: Date;
  lastActive: Date;
}

export interface ClaudeProcess {
  id: string;
  name?: string;
  role?: string;
  employeeId: string;
  pid: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  port?: number;
  command: string;
  args: string[];
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
  restarts: number;
  memoryUsage: number;
  cpuUsage: number;
  lastHeartbeat?: Date;
  taskId?: string;
  errorCount?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'resolved' | 'reopened';
  assignedTo?: string;
  processId?: string;
  skillsRequired: string[];
  createdAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  resolvedAt?: Date;
  reopenedAt?: Date;
  estimatedDuration: number;
  actualDuration?: number;
  result?: TaskResult;
  retryCount: number;
  maxRetries: number;
  comments: TaskComment[];
}

export interface TaskComment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  type: 'general' | 'reopen_reason' | 'resolution';
}

export interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
  artifacts?: string[];
  metrics?: {
    executionTime: number;
    memoryUsed: number;
    apiCalls: number;
  };
}

export interface SystemMetrics {
  timestamp: Date;
  processes: {
    total: number;
    running: number;
    stopped: number;
    errored: number;
  };
  tasks: {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  system: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
    uptime: number;
  };
  employees: {
    total: number;
    available: number;
    busy: number;
    offline: number;
  };
}

export interface WebSocketMessage {
  type: 'process_update' | 'task_update' | 'system_metrics' | 'log_stream' | 'error';
  data: any;
  timestamp: Date;
  source: string;
}

export interface ProcessConfig {
  employeeId: string;
  systemPrompt?: string;
  tools?: string[];
  maxTurns?: number;
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
  resourceLimits?: {
    memory?: number;
    cpu?: number;
    timeout?: number;
  };
  task?: Task;  // Optional task to assign to the process
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  source: string;
  processId?: string;
  employeeId?: string;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}