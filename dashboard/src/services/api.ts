// Real API service for the dashboard - connects to backend API

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
  createdAt?: Date;
  updatedAt?: Date;
}

class ApiService {
  private baseUrl = 'http://localhost:3001/api';

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Workflow API
  async startWorkflow(todoId?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.request<{ status: WorkflowStatus }>('/workflow/execute', {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'start',
          ...(todoId && { todoId })
        }),
      });
      return { success: true, message: 'Workflow started successfully' };
    } catch (error) {
      throw new Error(`Failed to start workflow: ${error}`);
    }
  }

  async stopWorkflow(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request('/workflow/execute', {
        method: 'POST',
        body: JSON.stringify({ action: 'stop' }),
      });
      return { success: true, message: 'Workflow stopped successfully' };
    } catch (error) {
      throw new Error(`Failed to stop workflow: ${error}`);
    }
  }

  async pauseWorkflow(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request('/workflow/execute', {
        method: 'POST',
        body: JSON.stringify({ action: 'pause' }),
      });
      return { success: true, message: 'Workflow paused successfully' };
    } catch (error) {
      throw new Error(`Failed to pause workflow: ${error}`);
    }
  }

  async resumeWorkflow(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request('/workflow/execute', {
        method: 'POST',
        body: JSON.stringify({ action: 'resume' }),
      });
      return { success: true, message: 'Workflow resumed successfully' };
    } catch (error) {
      throw new Error(`Failed to resume workflow: ${error}`);
    }
  }

  async getWorkflowStatus(): Promise<WorkflowStatus> {
    try {
      const response = await this.request<{ status: WorkflowStatus }>('/workflow/status');
      return response.status;
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      return {
        isRunning: false,
        status: 'error',
        currentRole: undefined,
        progress: 0
      };
    }
  }

  // Memory API
  async getMemoryContent(): Promise<string> {
    try {
      const response = await this.request<{ content: string }>('/files/memory');
      return response.content;
    } catch (error) {
      console.error('Failed to get memory content:', error);
      return '# Claude App Builder Memory\n\nError loading memory content.';
    }
  }

  async saveMemoryContent(content: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.request('/files/memory', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      return { success: true, message: 'Memory content saved successfully' };
    } catch (error) {
      throw new Error(`Failed to save memory content: ${error}`);
    }
  }

  // Todo API
  async getTodos(): Promise<TodoItem[]> {
    try {
      const response = await this.request<{ todos: TodoItem[] }>('/files/todos');
      return response.todos;
    } catch (error) {
      console.error('Failed to get todos:', error);
      return [];
    }
  }

  async saveTodos(todos: TodoItem[]): Promise<{ success: boolean; message: string }> {
    try {
      await this.request('/files/todos', {
        method: 'POST',
        body: JSON.stringify({ todos }),
      });
      return { success: true, message: 'Todos saved successfully' };
    } catch (error) {
      throw new Error(`Failed to save todos: ${error}`);
    }
  }

  async addTodo(content: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<TodoItem> {
    try {
      const response = await this.request<{ todo: TodoItem }>('/files/todos/add', {
        method: 'POST',
        body: JSON.stringify({ content, priority }),
      });
      return response.todo;
    } catch (error) {
      throw new Error(`Failed to add todo: ${error}`);
    }
  }

  async updateTodo(id: string, updates: Partial<TodoItem>): Promise<TodoItem> {
    try {
      const response = await this.request<{ todo: TodoItem }>(`/files/todos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return response.todo;
    } catch (error) {
      throw new Error(`Failed to update todo: ${error}`);
    }
  }

  async deleteTodo(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.request(`/files/todos/${id}`, {
        method: 'DELETE',
      });
      return { success: true, message: 'Todo deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete todo: ${error}`);
    }
  }

  // Logs API
  async getLogs(options?: { page?: number; limit?: number; level?: string }): Promise<LogEntry[]> {
    try {
      let endpoint = '/workflow/logs';
      if (options) {
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.level) params.append('level', options.level);
        endpoint += `?${params.toString()}`;
      }
      
      const response = await this.request<{ logs: LogEntry[] }>(endpoint);
      return response.logs;
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  async clearLogs(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request('/workflow/logs', {
        method: 'DELETE',
      });
      return { success: true, message: 'Logs cleared successfully' };
    } catch (error) {
      throw new Error(`Failed to clear logs: ${error}`);
    }
  }

  // Real-time connection with WebSocket
  private wsConnection: WebSocket | null = null;

  connectWebSocket(): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = this.baseUrl.replace('http', 'ws').replace('/api', '');
    this.wsConnection = new WebSocket(wsUrl);

    this.wsConnection.onopen = () => {
      console.log('WebSocket connected');
    };

    this.wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.wsConnection.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(), 5000);
    };
  }

  subscribeToLogs(callback: (log: LogEntry) => void): () => void {
    this.connectWebSocket();
    
    const messageHandler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'log_entry') {
          callback(message.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.wsConnection?.addEventListener('message', messageHandler);

    return () => {
      this.wsConnection?.removeEventListener('message', messageHandler);
    };
  }

  subscribeToWorkflowStatus(callback: (status: WorkflowStatus) => void): () => void {
    this.connectWebSocket();
    
    const messageHandler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'workflow_status') {
          callback(message.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.wsConnection?.addEventListener('message', messageHandler);

    return () => {
      this.wsConnection?.removeEventListener('message', messageHandler);
    };
  }

  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }
}

export const apiService = new ApiService();
export default ApiService;