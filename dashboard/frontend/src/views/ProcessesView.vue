<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900">Process Management</h1>
      <button 
        @click="showCreateModal = true"
        class="btn-primary"
      >
        Create Process
      </button>
    </div>

    <!-- Process Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="process in processes" 
        :key="process.id"
        class="card p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-medium text-gray-900">{{ process.name }}</h3>
            <p class="text-sm text-gray-500">{{ process.role }}</p>
          </div>
          <div 
            class="status-badge"
            :class="getStatusClass(process.status)"
          >
            {{ process.status }}
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">CPU:</span>
            <span class="font-medium">{{ (process.cpu || 0).toFixed(1) }}%</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Memory:</span>
            <span class="font-medium">{{ ((process.memory || 0) / 1024 / 1024).toFixed(1) }}MB</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Uptime:</span>
            <span class="font-medium">{{ formatUptime(process.uptime) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Errors:</span>
            <span class="font-medium">{{ process.errorCount }}</span>
          </div>
        </div>

        <div class="mt-4 flex space-x-2">
          <button 
            v-if="process.status === 'running'"
            @click="stopProcess(process.id)"
            class="btn btn-error text-xs"
          >
            Stop
          </button>
          <button 
            v-else
            @click="startProcess(process.id)"
            class="btn btn-success text-xs"
          >
            Start
          </button>
          <button 
            @click="restartProcess(process.id)"
            class="btn btn-warning text-xs"
          >
            Restart
          </button>
          <button 
            @click="deleteProcess(process.id)"
            class="btn btn-error btn-outline text-xs"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Create Process Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Process</h3>
        
        <form @submit.prevent="createProcess">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input 
                v-model="newProcess.name"
                type="text" 
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select 
                v-model="newProcess.role"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              >
                <option value="">Select a role</option>
                <option v-for="employee in availableEmployees" :key="employee.id" :value="employee.role">
                  {{ employee.role }} ({{ employee.name }})
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select 
                v-model="newProcess.employeeId"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              >
                <option value="">Select an employee</option>
                <option v-for="employee in availableEmployees" :key="employee.id" :value="employee.id">
                  {{ employee.name }} - {{ employee.role }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end space-x-3">
            <button 
              type="button"
              @click="showCreateModal = false"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDashboardStore } from '../stores/dashboard'
import { apiService } from '../services/api'
import type { ProcessInfo } from '../types'

const dashboardStore = useDashboardStore()

const processes = computed(() => dashboardStore.processes)
const availableEmployees = computed(() => dashboardStore.availableEmployees)

const showCreateModal = ref(false)
const newProcess = ref({
  name: '',
  role: '',
  employeeId: ''
})

onMounted(async () => {
  try {
    const [processesData, employeesData] = await Promise.all([
      apiService.getProcesses(),
      apiService.getEmployees()
    ])
    
    dashboardStore.updateProcesses(processesData)
    dashboardStore.updateEmployees(employeesData)
  } catch (error) {
    console.error('Failed to load data:', error)
  }
})

function getStatusClass(status: ProcessInfo['status']): string {
  switch (status) {
    case 'running': return 'status-running'
    case 'idle': return 'status-idle'
    case 'error': return 'status-error'
    case 'pending': return 'status-pending'
    default: return 'status-idle'
  }
}

function formatUptime(seconds: number): string {
  // Handle undefined, null, or NaN values
  if (!seconds || isNaN(seconds)) {
    return '0s'
  }
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

async function createProcess() {
  try {
    const processData = await apiService.createProcess(newProcess.value)
    
    showCreateModal.value = false
    newProcess.value = {
      name: '',
      role: '',
      employeeId: ''
    }
    
    // Refresh processes
    const processes = await apiService.getProcesses()
    dashboardStore.updateProcesses(processes)
  } catch (error) {
    console.error('Failed to create process:', error)
  }
}

async function stopProcess(id: string) {
  try {
    await apiService.stopProcess(id)
    
    // Refresh processes
    const processes = await apiService.getProcesses()
    dashboardStore.updateProcesses(processes)
  } catch (error) {
    console.error('Failed to stop process:', error)
  }
}

async function startProcess(id: string) {
  try {
    await apiService.restartProcess(id)
    
    // Refresh processes
    const processes = await apiService.getProcesses()
    dashboardStore.updateProcesses(processes)
  } catch (error) {
    console.error('Failed to start process:', error)
  }
}

async function restartProcess(id: string) {
  try {
    await apiService.restartProcess(id)
    
    // Refresh processes
    const processes = await apiService.getProcesses()
    dashboardStore.updateProcesses(processes)
  } catch (error) {
    console.error('Failed to restart process:', error)
  }
}

async function deleteProcess(id: string) {
  if (confirm('Are you sure you want to delete this process?')) {
    try {
      await apiService.deleteProcess(id)
      
      // Refresh processes
      const processes = await apiService.getProcesses()
      dashboardStore.updateProcesses(processes)
    } catch (error) {
      console.error('Failed to delete process:', error)
    }
  }
}
</script>