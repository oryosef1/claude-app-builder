import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DashboardState, ProcessInfo, TaskInfo, EmployeeInfo, SystemHealth, LogEntry } from '../types'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const processes = ref<ProcessInfo[]>([])
  const tasks = ref<TaskInfo[]>([])
  const employees = ref<EmployeeInfo[]>([])
  const systemHealth = ref<SystemHealth>({
    memory: { used: 0, total: 0, percentage: 0 },
    cpu: { usage: 0, load: [0, 0, 0] },
    processes: { total: 0, running: 0, idle: 0, error: 0 },
    queue: { pending: 0, processing: 0, completed: 0, failed: 0 }
  })
  const logs = ref<LogEntry[]>([])
  const connected = ref(false)
  const lastUpdated = ref(new Date())

  // Getters
  const runningProcesses = computed(() => 
    processes.value.filter(p => p.status === 'running')
  )
  
  const errorProcesses = computed(() => 
    processes.value.filter(p => p.status === 'error')
  )
  
  const pendingTasks = computed(() => 
    tasks.value.filter(t => t.status === 'pending')
  )
  
  const activeTasks = computed(() => 
    tasks.value.filter(t => t.status === 'running')
  )
  
  const availableEmployees = computed(() => 
    employees.value.filter(e => e.availability === 'available')
  )
  
  const systemStatus = computed(() => {
    if (!connected.value) return 'disconnected'
    if (errorProcesses.value.length > 0) return 'error'
    if (systemHealth.value.cpu.usage > 90) return 'warning'
    if (systemHealth.value.memory.percentage > 90) return 'warning'
    return 'healthy'
  })

  // Actions
  function updateProcesses(newProcesses: ProcessInfo[]) {
    processes.value = newProcesses
    lastUpdated.value = new Date()
  }

  function updateTasks(newTasks: TaskInfo[]) {
    tasks.value = newTasks
    lastUpdated.value = new Date()
  }

  function updateEmployees(newEmployees: EmployeeInfo[]) {
    employees.value = newEmployees
    lastUpdated.value = new Date()
  }

  function updateSystemHealth(newHealth: SystemHealth) {
    systemHealth.value = newHealth
    lastUpdated.value = new Date()
  }

  function addLog(log: LogEntry) {
    logs.value.unshift(log)
    if (logs.value.length > 1000) {
      logs.value = logs.value.slice(0, 1000)
    }
  }

  function updateConnectionStatus(status: boolean) {
    connected.value = status
  }

  function clearLogs() {
    logs.value = []
  }

  function getProcessById(id: string) {
    return processes.value.find(p => p.id === id)
  }

  function getTaskById(id: string) {
    return tasks.value.find(t => t.id === id)
  }

  function getEmployeeById(id: string) {
    return employees.value.find(e => e.id === id)
  }

  return {
    // State
    processes,
    tasks,
    employees,
    systemHealth,
    logs,
    connected,
    lastUpdated,
    
    // Getters
    runningProcesses,
    errorProcesses,
    pendingTasks,
    activeTasks,
    availableEmployees,
    systemStatus,
    
    // Actions
    updateProcesses,
    updateTasks,
    updateEmployees,
    updateSystemHealth,
    addLog,
    updateConnectionStatus,
    clearLogs,
    getProcessById,
    getTaskById,
    getEmployeeById
  }
})