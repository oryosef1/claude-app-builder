// Mock API service for the dashboard
// In a real implementation, this would connect to a backend API

export interface WorkflowStatus {
  isRunning: boolean;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentRole?: string;
  progress?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  role?: string;
}

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

class ApiService {

  // Workflow API
  async startWorkflow(): Promise<{ success: boolean; message: string }> {
    // Mock implementation - would call automated-workflow.sh
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Workflow started successfully' });
      }, 1000);
    });
  }

  async stopWorkflow(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Workflow stopped successfully' });
      }, 500);
    });
  }

  async pauseWorkflow(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Workflow paused successfully' });
      }, 500);
    });
  }

  async resumeWorkflow(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Workflow resumed successfully' });
      }, 500);
    });
  }

  async getWorkflowStatus(): Promise<WorkflowStatus> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          isRunning: false,
          status: 'idle',
          currentRole: undefined,
          progress: 0
        });
      }, 200);
    });
  }

  // Memory API
  async getMemoryContent(): Promise<string> {
    // Mock implementation - would read memory.md file
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`# Claude App Builder Memory

## System Purpose
An automated application builder that uses Claude Code CLI to create any type of software through Test-Driven Development (TDD).

## Current Project: Dashboard
Building a web dashboard to control the Claude App Builder system:
- Visual interface for workflow management
- Real-time status monitoring
- Todo and memory file editing
- Project template selection
- Workflow logs and metrics

## Implementation Status
- ✅ Core system implemented
- ✅ Dashboard UI completed
- 🔄 API integration in progress
- ⏳ Real-time updates pending`);
      }, 500);
    });
  }

  async saveMemoryContent(): Promise<{ success: boolean; message: string }> {
    // Mock implementation - would write to memory.md file
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Memory content saved successfully' });
      }, 1000);
    });
  }

  // Todo API
  async getTodos(): Promise<TodoItem[]> {
    // Mock implementation - would read todo.md file
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            content: 'Initialize web dashboard project with React and TypeScript',
            status: 'completed',
            priority: 'high'
          },
          {
            id: '2',
            content: 'Create main dashboard layout with sidebar navigation',
            status: 'completed',
            priority: 'high'
          },
          {
            id: '3',
            content: 'Build workflow control panel (start/stop/pause workflow)',
            status: 'in_progress',
            priority: 'high'
          }
        ]);
      }, 300);
    });
  }

  async saveTodos(): Promise<{ success: boolean; message: string }> {
    // Mock implementation - would write to todo.md file
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Todos saved successfully' });
      }, 800);
    });
  }

  // Logs API
  async getLogs(): Promise<LogEntry[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
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
          }
        ]);
      }, 200);
    });
  }

  // Real-time connection simulation
  subscribeToLogs(callback: (log: LogEntry) => void): () => void {
    const interval = setInterval(() => {
      const mockLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: Math.random() > 0.8 ? 'warning' : 'info',
        message: `Mock log entry at ${new Date().toLocaleTimeString()}`,
        role: ['test-writer', 'developer', 'code-reviewer', 'coordinator'][Math.floor(Math.random() * 4)]
      };
      callback(mockLog);
    }, 5000);

    return () => clearInterval(interval);
  }

  subscribeToWorkflowStatus(callback: (status: WorkflowStatus) => void): () => void {
    let currentStatus: WorkflowStatus = {
      isRunning: false,
      status: 'idle',
      progress: 0
    };

    const interval = setInterval(() => {
      // Simulate status changes
      if (Math.random() > 0.9) {
        currentStatus = {
          ...currentStatus,
          status: currentStatus.status === 'idle' ? 'running' : 'idle',
          isRunning: currentStatus.status !== 'idle'
        };
        callback(currentStatus);
      }
    }, 2000);

    return () => clearInterval(interval);
  }
}

export const apiService = new ApiService();
export default ApiService;