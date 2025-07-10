<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900">System Logs</h1>
      <div class="flex space-x-2">
        <button 
          @click="clearLogs"
          class="btn btn-secondary"
        >
          Clear Logs
        </button>
        <button 
          @click="exportLogs"
          class="btn btn-primary"
        >
          Export Logs
        </button>
      </div>
    </div>

    <!-- Log Filters -->
    <div class="card p-4">
      <div class="flex space-x-4 items-end">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Level</label>
          <select 
            v-model="filterLevel"
            class="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Process</label>
          <select 
            v-model="filterProcess"
            class="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">All Processes</option>
            <option v-for="process in processes" :key="process.id" :value="process.id">
              {{ process.name }}
            </option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search logs..."
            class="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Auto-scroll</label>
          <label class="flex items-center">
            <input 
              v-model="autoScroll"
              type="checkbox"
              class="mr-2"
            />
            <span class="text-sm">Enabled</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Log Stream -->
    <div class="card">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">Live Logs</h3>
          <div class="text-sm text-gray-500">
            {{ filteredLogs.length }} entries
          </div>
        </div>
      </div>
      
      <div 
        ref="logContainer"
        class="max-h-96 overflow-y-auto bg-gray-900 text-gray-100 font-mono text-sm"
      >
        <div 
          v-for="log in filteredLogs" 
          :key="log.timestamp.getTime()"
          class="px-4 py-2 border-b border-gray-700 hover:bg-gray-800"
        >
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-20 text-gray-400">
              {{ formatTime(log.timestamp) }}
            </div>
            <div class="flex-shrink-0 w-16">
              <span 
                class="px-2 py-1 text-xs font-medium rounded"
                :class="getLogLevelStyle(log.level)"
              >
                {{ log.level.toUpperCase() }}
              </span>
            </div>
            <div class="flex-1">
              <div class="text-gray-100">{{ log.message }}</div>
              <div v-if="log.processId || log.employeeId" class="text-gray-400 text-xs mt-1">
                <span v-if="log.processId">Process: {{ log.processId }}</span>
                <span v-if="log.employeeId" class="ml-3">Employee: {{ log.employeeId }}</span>
              </div>
              <div v-if="log.context" class="text-gray-500 text-xs mt-1">
                {{ JSON.stringify(log.context, null, 2) }}
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="filteredLogs.length === 0" class="p-8 text-center text-gray-500">
          No logs match the current filters
        </div>
      </div>
    </div>

    <!-- Log Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card p-4">
        <div class="text-center">
          <div class="text-2xl font-semibold text-primary-600">{{ getLogCount('info') }}</div>
          <div class="text-sm text-gray-500">Info</div>
        </div>
      </div>
      
      <div class="card p-4">
        <div class="text-center">
          <div class="text-2xl font-semibold text-warning-600">{{ getLogCount('warn') }}</div>
          <div class="text-sm text-gray-500">Warnings</div>
        </div>
      </div>
      
      <div class="card p-4">
        <div class="text-center">
          <div class="text-2xl font-semibold text-error-600">{{ getLogCount('error') }}</div>
          <div class="text-sm text-gray-500">Errors</div>
        </div>
      </div>
      
      <div class="card p-4">
        <div class="text-center">
          <div class="text-2xl font-semibold text-gray-600">{{ getLogCount('debug') }}</div>
          <div class="text-sm text-gray-500">Debug</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useDashboardStore } from '../stores/dashboard'
import { apiService } from '../services/api'
import type { LogEntry } from '../types'

const dashboardStore = useDashboardStore()

const logs = computed(() => dashboardStore.logs)
const processes = computed(() => dashboardStore.processes)

const filterLevel = ref('')
const filterProcess = ref('')
const searchQuery = ref('')
const autoScroll = ref(true)

const logContainer = ref<HTMLElement>()

const filteredLogs = computed(() => {
  let filtered = logs.value

  if (filterLevel.value) {
    filtered = filtered.filter(log => log.level === filterLevel.value)
  }

  if (filterProcess.value) {
    filtered = filtered.filter(log => log.processId === filterProcess.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(log => 
      log.message.toLowerCase().includes(query) ||
      log.level.toLowerCase().includes(query) ||
      (log.processId && log.processId.toLowerCase().includes(query)) ||
      (log.employeeId && log.employeeId.toLowerCase().includes(query))
    )
  }

  return filtered
})

onMounted(async () => {
  try {
    const [logsData, processesData] = await Promise.all([
      apiService.getLogs(200),
      apiService.getProcesses()
    ])
    
    // Convert timestamps to Date objects
    const processedLogs = logsData.map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp)
    }))
    
    dashboardStore.logs.splice(0, dashboardStore.logs.length, ...processedLogs)
    dashboardStore.updateProcesses(processesData)
  } catch (error) {
    console.error('Failed to load logs:', error)
  }
})

// Auto-scroll to bottom when new logs arrive
watch(logs, async () => {
  if (autoScroll.value && logContainer.value) {
    await nextTick()
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
})

function formatTime(date: Date): string {
  return date.toLocaleTimeString()
}

function getLogLevelStyle(level: LogEntry['level']): string {
  switch (level) {
    case 'info': return 'bg-primary-600 text-white'
    case 'warn': return 'bg-warning-600 text-white'
    case 'error': return 'bg-error-600 text-white'
    case 'debug': return 'bg-gray-600 text-white'
    default: return 'bg-gray-600 text-white'
  }
}

function getLogCount(level: LogEntry['level']): number {
  return logs.value.filter(log => log.level === level).length
}

function clearLogs() {
  if (confirm('Are you sure you want to clear all logs?')) {
    dashboardStore.clearLogs()
  }
}

function exportLogs() {
  const logsData = filteredLogs.value.map(log => ({
    timestamp: log.timestamp.toISOString(),
    level: log.level,
    message: log.message,
    processId: log.processId,
    employeeId: log.employeeId,
    context: log.context
  }))

  const blob = new Blob([JSON.stringify(logsData, null, 2)], {
    type: 'application/json'
  })
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>