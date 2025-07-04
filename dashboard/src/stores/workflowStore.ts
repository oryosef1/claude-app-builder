import { create } from 'zustand';
import { apiService } from '../services/api';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  role?: string;
}

interface WorkflowState {
  isRunning: boolean;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  logs: LogEntry[];
  currentRole?: string;
  
  // Actions
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setStatus: (status: WorkflowState['status']) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  reset: () => void;
}

const useWorkflowStore = create<WorkflowState>((set) => ({
  isRunning: false,
  status: 'idle',
  logs: [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Dashboard initialized successfully',
      role: 'system'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'info',
      message: 'Test writer completed successfully',
      role: 'test-writer'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      level: 'warning',
      message: 'Code review found minor issues',
      role: 'code-reviewer'
    }
  ],
  currentRole: undefined,
  
  start: async () => {
    set({ isRunning: true, status: 'running' });
    try {
      const result = await apiService.startWorkflow();
      set((state) => ({
        logs: [...state.logs, {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'info' as const,
          message: result.message,
          role: 'system'
        }]
      }));
    } catch (error) {
      set({ isRunning: false, status: 'error' });
      set((state) => ({
        logs: [...state.logs, {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'error' as const,
          message: 'Failed to start workflow',
          role: 'system'
        }]
      }));
    }
  },
  stop: async () => {
    set({ isRunning: false, status: 'idle' });
    try {
      const result = await apiService.stopWorkflow();
      set((state) => ({
        logs: [...state.logs, {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'info' as const,
          message: result.message,
          role: 'system'
        }]
      }));
    } catch (error) {
      set((state) => ({
        logs: [...state.logs, {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'error' as const,
          message: 'Failed to stop workflow',
          role: 'system'
        }]
      }));
    }
  },
  pause: async () => {
    set({ isRunning: false, status: 'paused' });
    try {
      const result = await apiService.pauseWorkflow();
      set((state) => ({
        logs: [...state.logs, {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'info' as const,
          message: result.message,
          role: 'system'
        }]
      }));
    } catch (error) {
      set((state) => ({
        logs: [...state.logs, {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'error' as const,
          message: 'Failed to pause workflow',
          role: 'system'
        }]
      }));
    }
  },
  resume: async () => {
    set({ isRunning: true, status: 'running' });
    try {
      const result = await apiService.resumeWorkflow();
      set((state) => ({
        logs: [...state.logs, {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'info' as const,
          message: result.message,
          role: 'system'
        }]
      }));
    } catch (error) {
      set({ isRunning: false, status: 'error' });
      set((state) => ({
        logs: [...state.logs, {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'error' as const,
          message: 'Failed to resume workflow',
          role: 'system'
        }]
      }));
    }
  },
  setStatus: (status) => set({ status }),
  addLog: (log) => set((state) => ({
    logs: [...state.logs, {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    }]
  })),
  clearLogs: () => set({ logs: [] }),
  reset: () => set({ isRunning: false, status: 'idle', logs: [], currentRole: undefined })
}));

export default useWorkflowStore;
