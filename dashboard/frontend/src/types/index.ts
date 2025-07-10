export interface ProcessInfo {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'error' | 'pending';
  pid?: number;
  uptime: number;
  cpu: number;
  memory: number;
  role: string;
  employeeId: string;
  lastActivity: Date;
  errorCount: number;
}

export interface TaskInfo {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedDuration?: number;
  completedAt?: Date;
  progress: number;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  role: string;
  department: string;
  skills: string[];
  availability: 'available' | 'busy' | 'offline';
  currentTasks: number;
  maxTasks: number;
  performanceScore: number;
}

export interface SystemHealth {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    load: number[];
  };
  processes: {
    total: number;
    running: number;
    idle: number;
    error: number;
  };
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  processId?: string;
  employeeId?: string;
  context?: Record<string, any>;
}

export interface DashboardState {
  processes: ProcessInfo[];
  tasks: TaskInfo[];
  employees: EmployeeInfo[];
  systemHealth: SystemHealth;
  logs: LogEntry[];
  connected: boolean;
  lastUpdated: Date;
}