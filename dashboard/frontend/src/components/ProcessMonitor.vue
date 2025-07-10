<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-900">Process Monitor</h2>
      <div class="flex space-x-2">
        <button 
          @click="toggleView"
          class="btn btn-secondary text-sm"
        >
          {{ viewMode === 'grid' ? 'List View' : 'Grid View' }}
        </button>
        <button 
          @click="refreshProcesses"
          class="btn btn-primary text-sm"
        >
          Refresh
        </button>
      </div>
    </div>

    <!-- Process Grid View -->
    <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="process in processes" 
        :key="process.id"
        class="card p-6 hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-medium text-gray-900">{{ process.name }}</h3>
            <p class="text-sm text-gray-500">{{ process.role }}</p>
          </div>
          <div class="flex items-center space-x-2">
            <div 
              class="w-3 h-3 rounded-full"
              :class="getStatusColor(process.status)"
            ></div>
            <span 
              class="status-badge"
              :class="getStatusClass(process.status)"
            >
              {{ process.status }}
            </span>
          </div>
        </div>

        <div class="space-y-3">
          <!-- CPU Usage -->
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-500">CPU</span>
              <span class="font-medium">{{ process.cpu.toFixed(1) }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="h-2 rounded-full transition-all duration-500"
                :class="getCpuColor(process.cpu)"
                :style="{ width: Math.min(process.cpu, 100) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Memory Usage -->
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-500">Memory</span>
              <span class="font-medium">{{ formatMemory(process.memory) }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-primary-600 h-2 rounded-full transition-all duration-500"
                :style="{ width: Math.min((process.memory / (512 * 1024 * 1024)) * 100, 100) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Process Info -->
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Uptime:</span>
            <span class="font-medium">{{ formatUptime(process.uptime) }}</span>
          </div>
          
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Errors:</span>
            <span class="font-medium" :class="process.errorCount > 0 ? 'text-error-600' : ''">
              {{ process.errorCount }}
            </span>
          </div>
          
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Last Activity:</span>
            <span class="font-medium">{{ formatTime(process.lastActivity) }}</span>
          </div>
        </div>

        <!-- Process Controls -->
        <div class="mt-4 flex space-x-2">
          <button 
            v-if="process.status === 'running'"
            @click="$emit('stop-process', process.id)"
            class="btn btn-error text-xs flex-1"
          >
            Stop
          </button>
          <button 
            v-else-if="process.status === 'idle' || process.status === 'error'"
            @click="$emit('start-process', process.id)"
            class="btn btn-success text-xs flex-1"
          >
            Start
          </button>
          <button 
            @click="$emit('restart-process', process.id)"
            class="btn btn-warning text-xs flex-1"
          >
            Restart
          </button>
        </div>
      </div>
    </div>

    <!-- Process List View -->
    <div v-else class="card">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Process List</h3>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Process
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CPU
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Memory
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Uptime
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Errors
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="process in processes" :key="process.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ process.name }}</div>
                  <div class="text-sm text-gray-500">{{ process.role }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div 
                    class="w-2 h-2 rounded-full mr-2"
                    :class="getStatusColor(process.status)"
                  ></div>
                  <span 
                    class="status-badge"
                    :class="getStatusClass(process.status)"
                  >
                    {{ process.status }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ process.cpu.toFixed(1) }}%</div>
                <div class="w-16 bg-gray-200 rounded-full h-1 mt-1">
                  <div 
                    class="h-1 rounded-full"
                    :class="getCpuColor(process.cpu)"
                    :style="{ width: Math.min(process.cpu, 100) + '%' }"
                  ></div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatMemory(process.memory) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatUptime(process.uptime) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span :class="process.errorCount > 0 ? 'text-error-600' : ''">
                  {{ process.errorCount }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button 
                    v-if="process.status === 'running'"
                    @click="$emit('stop-process', process.id)"
                    class="text-error-600 hover:text-error-900"
                  >
                    Stop
                  </button>
                  <button 
                    v-else-if="process.status === 'idle' || process.status === 'error'"
                    @click="$emit('start-process', process.id)"
                    class="text-success-600 hover:text-success-900"
                  >
                    Start
                  </button>
                  <button 
                    @click="$emit('restart-process', process.id)"
                    class="text-warning-600 hover:text-warning-900"
                  >
                    Restart
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ProcessInfo } from '../types'

interface Props {
  processes: ProcessInfo[]
}

defineProps<Props>()

defineEmits<{
  'stop-process': [id: string]
  'start-process': [id: string]
  'restart-process': [id: string]
  'refresh-processes': []
}>()

const viewMode = ref<'grid' | 'list'>('grid')

function toggleView() {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}

function refreshProcesses() {
  // Emit refresh event to parent
  // Parent will handle the actual API call
}

function getStatusClass(status: ProcessInfo['status']): string {
  switch (status) {
    case 'running': return 'status-running'
    case 'idle': return 'status-idle'
    case 'error': return 'status-error'
    case 'pending': return 'status-pending'
    default: return 'status-idle'
  }
}

function getStatusColor(status: ProcessInfo['status']): string {
  switch (status) {
    case 'running': return 'bg-success-500'
    case 'idle': return 'bg-gray-500'
    case 'error': return 'bg-error-500'
    case 'pending': return 'bg-warning-500'
    default: return 'bg-gray-500'
  }
}

function getCpuColor(cpu: number): string {
  if (cpu >= 90) return 'bg-error-600'
  if (cpu >= 70) return 'bg-warning-600'
  return 'bg-success-600'
}

function formatMemory(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1000) {
    return (mb / 1024).toFixed(1) + ' GB'
  }
  return mb.toFixed(1) + ' MB'
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString()
}
</script>