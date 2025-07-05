export interface WorkflowState {
  phase: 'idle' | 'test-writer' | 'test-reviewer' | 'developer' | 'code-reviewer' | 'coordinator';
  status: 'stopped' | 'running' | 'paused' | 'completed' | 'error';
  progress: number;
  currentTask?: string;
  startTime?: Date;
  endTime?: Date;
  output: string[];
  error?: string;
}

export interface TaskItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  completedAt?: Date;
}

export interface WorkflowManagerInterface {
  startWorkflow(): Promise<void>;
  stopWorkflow(): Promise<void>;
  pauseWorkflow(): Promise<void>;
  resumeWorkflow(): Promise<void>;
  getState(): WorkflowState;
  cleanup(): Promise<void>;
  subscribe(callback: (state: WorkflowState) => void): () => void;
}

export interface FileWatcherInterface {
  watchFile(filePath: string, callback: (content: string) => void): void;
  unwatchFile(filePath: string): void;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  cleanup(): Promise<void>;
}

export interface WorkflowIntegrationInterface {
  initialize(): Promise<void>;
  startWorkflow(): Promise<void>;
  stopWorkflow(): Promise<void>;
  pauseWorkflow(): Promise<void>;
  resumeWorkflow(): Promise<void>;
  getWorkflowState(): WorkflowState;
  getTasks(): TaskItem[];
  updateTask(id: string, updates: Partial<TaskItem>): Promise<void>;
  addTask(task: Omit<TaskItem, 'id' | 'createdAt'>): Promise<void>;
  getMemoryContent(): Promise<string>;
  updateMemoryContent(content: string): Promise<void>;
  cleanup(): Promise<void>;
}