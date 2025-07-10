import axios from 'axios'
import type { ProcessInfo, TaskInfo, EmployeeInfo, SystemHealth } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const apiService = {
  // Health check
  async getHealth() {
    const response = await api.get('/api/health')
    return response.data
  },

  // Process management
  async getProcesses(): Promise<ProcessInfo[]> {
    const response = await api.get('/api/processes')
    return response.data
  },

  async getProcess(id: string): Promise<ProcessInfo> {
    const response = await api.get(`/api/processes/${id}`)
    return response.data
  },

  async createProcess(config: any): Promise<ProcessInfo> {
    const response = await api.post('/api/processes', config)
    return response.data
  },

  async stopProcess(id: string): Promise<void> {
    await api.post(`/api/processes/${id}/stop`)
  },

  async restartProcess(id: string): Promise<void> {
    await api.post(`/api/processes/${id}/restart`)
  },

  // Task management
  async getTasks(): Promise<TaskInfo[]> {
    const response = await api.get('/api/tasks')
    return response.data
  },

  async getTask(id: string): Promise<TaskInfo> {
    const response = await api.get(`/api/tasks/${id}`)
    return response.data
  },

  async createTask(task: Partial<TaskInfo>): Promise<TaskInfo> {
    const response = await api.post('/api/tasks', task)
    return response.data
  },

  async updateTask(id: string, updates: Partial<TaskInfo>): Promise<TaskInfo> {
    const response = await api.put(`/api/tasks/${id}`, updates)
    return response.data
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/api/tasks/${id}`)
  },

  // Employee management
  async getEmployees(): Promise<EmployeeInfo[]> {
    const response = await api.get('/api/employees')
    return response.data
  },

  async getEmployee(id: string): Promise<EmployeeInfo> {
    const response = await api.get(`/api/employees/${id}`)
    return response.data
  },

  // System health
  async getSystemHealth(): Promise<SystemHealth> {
    const response = await api.get('/api/system/health')
    return response.data
  },

  // Logs
  async getLogs(limit: number = 100) {
    const response = await api.get(`/api/logs?limit=${limit}`)
    return response.data
  }
}

export default api