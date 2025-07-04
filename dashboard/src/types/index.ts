// Type definitions for the Claude App Builder Dashboard

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  role?: string;
}

export interface WorkflowStatus {
  isRunning: boolean;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentRole?: string;
  progress?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: 'web' | 'api' | 'cli' | 'mobile' | 'desktop';
  technologies: string[];
  structure: ProjectFile[];
}

export interface ProjectFile {
  path: string;
  type: 'file' | 'directory';
  content?: string;
  template?: boolean;
}

export interface WorkflowPhase {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  logs: LogEntry[];
}

export interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  successRate: number;
  averageCompletionTime: number;
  recentActivity: LogEntry[];
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  autoSave: boolean;
  realTimeUpdates: boolean;
  logLevel: 'info' | 'warning' | 'error';
  notifications: boolean;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  lastHealthCheck: string;
}