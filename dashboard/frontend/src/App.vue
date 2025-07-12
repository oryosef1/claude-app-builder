<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-semibold text-gray-900">Claude Dashboard</h1>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <router-link
                to="/"
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                :class="$route.name === 'dashboard' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Dashboard
              </router-link>
              <router-link
                to="/processes"
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                :class="$route.name === 'processes' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Processes
              </router-link>
              <router-link
                to="/tasks"
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                :class="$route.name === 'tasks' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Tasks
              </router-link>
              <router-link
                to="/employees"
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                :class="$route.name === 'employees' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Employees
              </router-link>
              <router-link
                to="/logs"
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                :class="$route.name === 'logs' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Logs
              </router-link>
            </div>
          </div>
          <div class="flex items-center">
            <div class="flex items-center space-x-2">
              <div 
                class="w-2 h-2 rounded-full"
                :class="connected ? 'bg-success-500' : 'bg-error-500'"
              ></div>
              <span class="text-sm text-gray-600">
                {{ connected ? 'Connected' : 'Disconnected' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useDashboardStore } from './stores/dashboard'
import { socketService } from './services/socket'

const dashboardStore = useDashboardStore()

const connected = computed(() => dashboardStore.connected)

onMounted(async () => {
  socketService.connect()
  
  // Also fetch initial data via REST API
  try {
    const { apiService } = await import('./services/api')
    
    // Fetch initial data
    const [processes, tasks, employees] = await Promise.all([
      apiService.getProcesses(),
      apiService.getTasks(),
      apiService.getEmployees()
    ])
    
    // Update store with initial data
    dashboardStore.updateProcesses(processes)
    dashboardStore.updateTasks(tasks)
    dashboardStore.updateEmployees(employees)
  } catch (error) {
    console.error('Failed to fetch initial data:', error)
  }
})

onUnmounted(() => {
  socketService.disconnect()
})
</script>