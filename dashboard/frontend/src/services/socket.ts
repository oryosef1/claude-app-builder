import { io, Socket } from 'socket.io-client'
import { useDashboardStore } from '../stores/dashboard'
import type { ProcessInfo, TaskInfo, EmployeeInfo, SystemHealth, LogEntry } from '../types'

class SocketService {
  private socket: Socket | null = null
  private dashboardStore: any = null

  connect() {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
    
    this.socket = io(API_URL, {
      transports: ['websocket'],
      upgrade: false
    })

    this.dashboardStore = useDashboardStore()

    this.socket.on('connect', () => {
      console.log('Connected to server')
      this.dashboardStore.updateConnectionStatus(true)
      
      // Request initial data when connected
      this.socket.emit('request_processes')
      this.socket.emit('request_tasks')
      this.socket.emit('request_employees')
      this.socket.emit('request_metrics')
      this.socket.emit('request_employee_stats')
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server')
      this.dashboardStore.updateConnectionStatus(false)
    })

    this.socket.on('reconnect', () => {
      console.log('Reconnected to server')
      this.dashboardStore.updateConnectionStatus(true)
    })

    // Process events
    this.socket.on('processes:updated', (processes: ProcessInfo[]) => {
      this.dashboardStore.updateProcesses(processes)
    })
    
    this.socket.on('processes_data', (processes: ProcessInfo[]) => {
      this.dashboardStore.updateProcesses(processes)
    })

    this.socket.on('process:started', (process: ProcessInfo) => {
      console.log('Process started:', process.id)
      this.dashboardStore.addLog({
        timestamp: new Date(),
        level: 'info',
        message: `Process ${process.name} started`,
        processId: process.id,
        employeeId: process.employeeId
      })
    })

    this.socket.on('process:stopped', (processId: string) => {
      console.log('Process stopped:', processId)
      this.dashboardStore.addLog({
        timestamp: new Date(),
        level: 'info',
        message: `Process ${processId} stopped`,
        processId
      })
    })

    this.socket.on('process:error', (error: { processId: string; message: string }) => {
      console.error('Process error:', error)
      this.dashboardStore.addLog({
        timestamp: new Date(),
        level: 'error',
        message: `Process ${error.processId} error: ${error.message}`,
        processId: error.processId
      })
    })

    // Task events
    this.socket.on('tasks:updated', (tasks: TaskInfo[]) => {
      this.dashboardStore.updateTasks(tasks)
    })
    
    this.socket.on('tasks_data', (tasks: TaskInfo[]) => {
      this.dashboardStore.updateTasks(tasks)
    })

    this.socket.on('task:created', (task: TaskInfo) => {
      console.log('Task created:', task.id)
      this.dashboardStore.addLog({
        timestamp: new Date(),
        level: 'info',
        message: `Task "${task.title}" created`,
        context: { taskId: task.id }
      })
    })

    this.socket.on('task:completed', (task: TaskInfo) => {
      console.log('Task completed:', task.id)
      this.dashboardStore.addLog({
        timestamp: new Date(),
        level: 'info',
        message: `Task "${task.title}" completed`,
        context: { taskId: task.id }
      })
    })

    this.socket.on('task:failed', (task: TaskInfo) => {
      console.log('Task failed:', task.id)
      this.dashboardStore.addLog({
        timestamp: new Date(),
        level: 'error',
        message: `Task "${task.title}" failed`,
        context: { taskId: task.id }
      })
    })

    // Employee events
    this.socket.on('employees:updated', (employees: EmployeeInfo[]) => {
      this.dashboardStore.updateEmployees(employees)
    })
    
    this.socket.on('employees_data', (employees: EmployeeInfo[]) => {
      this.dashboardStore.updateEmployees(employees)
    })

    // System health events
    this.socket.on('system:health', (health: SystemHealth) => {
      this.dashboardStore.updateSystemHealth(health)
    })
    
    this.socket.on('system_metrics', (metrics: any) => {
      console.log('Received system_metrics:', metrics)
      
      // Convert metrics to SystemHealth format
      if (metrics && metrics.system && metrics.system.memoryUsage) {
        const health: SystemHealth = {
          memory: {
            used: metrics.system.memoryUsage.heapUsed || 0,
            total: metrics.system.memoryUsage.heapTotal || 1,
            percentage: metrics.system.memoryUsage.heapTotal ? 
              (metrics.system.memoryUsage.heapUsed / metrics.system.memoryUsage.heapTotal) * 100 : 0
          },
          cpu: {
            usage: (metrics.system.cpuUsage || 0) / 1000000, // Convert from microseconds to percentage
            load: [0, 0, 0]
          },
          processes: metrics.processes || { total: 0, running: 0, idle: 0, error: 0 },
          queue: metrics.tasks || { pending: 0, processing: 0, completed: 0, failed: 0 }
        }
        this.dashboardStore.updateSystemHealth(health)
      }
    })

    // Log events
    this.socket.on('log:entry', (log: LogEntry) => {
      this.dashboardStore.addLog({
        ...log,
        timestamp: new Date(log.timestamp)
      })
    })

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error)
      this.dashboardStore.addLog({
        timestamp: new Date(),
        level: 'error',
        message: `Socket error: ${error.message || 'Unknown error'}`,
        context: { error }
      })
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data)
    }
  }

  isConnected() {
    return this.socket?.connected || false
  }
}

export const socketService = new SocketService()
export default socketService