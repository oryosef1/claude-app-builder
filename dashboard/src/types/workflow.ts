export interface WorkflowState {
  id: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentPhase: 'test-writer' | 'test-reviewer' | 'developer' | 'code-reviewer' | 'coordinator' | null;
  startTime: Date | null;
  endTime: Date | null;
  output: string[];
  error: string | null;
}

export interface WorkflowManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  getState(): WorkflowState;
  getOutput(): string[];
  subscribe(callback: (state: WorkflowState) => void): () => void;
}

export interface TaskItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

export interface FileWatcherService {
  watchFile(filePath: string, callback: (content: string) => void): () => void;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
}