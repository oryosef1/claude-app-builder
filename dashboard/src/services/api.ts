import axios, { AxiosInstance } from 'axios';
import { ApiResponse, WorkflowStatusResponse, TasksResponse, MemoryResponse } from '../types/api';
import { TaskItem } from '../types/workflow';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        throw error;
      }
    );
  }

  // Health check
  async checkHealth(): Promise<ApiResponse> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Workflow control
  async startWorkflow(): Promise<ApiResponse> {
    const response = await this.client.post('/workflow/start');
    return response.data;
  }

  async stopWorkflow(): Promise<ApiResponse> {
    const response = await this.client.post('/workflow/stop');
    return response.data;
  }

  async pauseWorkflow(): Promise<ApiResponse> {
    const response = await this.client.post('/workflow/pause');
    return response.data;
  }

  async resumeWorkflow(): Promise<ApiResponse> {
    const response = await this.client.post('/workflow/resume');
    return response.data;
  }

  // Status monitoring
  async getWorkflowStatus(): Promise<WorkflowStatusResponse> {
    const response = await this.client.get('/workflow/status');
    return response.data;
  }

  // Task management
  async getTasks(): Promise<TasksResponse> {
    const response = await this.client.get('/tasks');
    return response.data;
  }

  async createTask(task: Omit<TaskItem, 'id'>): Promise<ApiResponse<TaskItem>> {
    const response = await this.client.post('/tasks', task);
    return response.data;
  }

  async updateTask(id: string, updates: Partial<TaskItem>): Promise<ApiResponse<TaskItem>> {
    const response = await this.client.put(`/tasks/${id}`, updates);
    return response.data;
  }

  // Memory management
  async getMemory(): Promise<MemoryResponse> {
    const response = await this.client.get('/memory');
    return response.data;
  }

  async updateMemory(content: string): Promise<ApiResponse> {
    const response = await this.client.put('/memory', { content });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;