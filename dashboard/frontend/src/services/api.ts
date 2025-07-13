import axios from 'axios'
import type { ProcessInfo, TaskInfo, EmployeeInfo, SystemHealth } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// Map backend employee status to frontend availability
function mapEmployeeStatus(status: string): 'available' | 'busy' | 'offline' {
  switch (status) {
    case 'active': return 'available'
    case 'busy': return 'busy'
    case 'inactive': 
    case 'offline':
    case 'maintenance': return 'offline'
    default: return 'available'
  }
}

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
    try {
      const response = await api.get('/api/processes')
      // Handle both wrapped and unwrapped responses
      if (response.data && response.data.data) {
        return response.data.data
      }
      return response.data || []
    } catch (error) {
      console.error('Failed to get processes:', error)
      // Return empty array if endpoint doesn't exist yet
      return []
    }
  },

  async getProcess(id: string): Promise<ProcessInfo> {
    const response = await api.get(`/api/processes/${id}`)
    return response.data
  },

  async createProcess(config: any): Promise<ProcessInfo> {
    const response = await api.post('/api/processes', config)
    return response.data
  },

  async createProcessWithTask(taskId: string, employeeId?: string): Promise<ProcessInfo> {
    const response = await api.post('/api/processes/create-with-task', {
      taskId,
      employeeId
    })
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
    try {
      const response = await api.get('/api/tasks')
      // Handle both wrapped and unwrapped responses
      if (response.data && response.data.data) {
        return response.data.data
      }
      return response.data || []
    } catch (error) {
      console.error('Failed to get tasks:', error)
      return []
    }
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

  async resolveTask(id: string, comment?: string): Promise<void> {
    await api.post(`/api/tasks/${id}/resolve`, { comment })
  },

  async reopenTask(id: string, reason: string, assignTo?: string): Promise<void> {
    await api.post(`/api/tasks/${id}/reopen`, { reason, assignTo })
  },

  // Employee management
  async getEmployees(): Promise<EmployeeInfo[]> {
    try {
      const response = await api.get('/api/employees')
      let employees = []
      
      // Handle wrapped response format
      if (response.data && response.data.data) {
        employees = response.data.data
      } else {
        employees = response.data || []
      }
      
      // Transform backend data to frontend format
      return employees.map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        skills: emp.skills || [],
        availability: mapEmployeeStatus(emp.status),
        currentTasks: emp.current_projects?.length || 0,
        maxTasks: 5, // Default max tasks
        performanceScore: emp.performance_metrics?.success_rate || 0
      }))
    } catch (error) {
      console.error('Failed to get employees:', error)
      return []
    }
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
  },

  async deleteProcess(id: string): Promise<void> {
    await api.delete(`/api/processes/${id}`)
  }
}

export default api