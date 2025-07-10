<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-900">Log Viewer</h2>
      <div class="flex space-x-2">
        <button 
          @click="toggleAutoScroll"
          class="btn text-sm"
          :class="autoScroll ? 'btn-primary' : 'btn-secondary'"
        >
          {{ autoScroll ? 'Auto-scroll On' : 'Auto-scroll Off' }}
        </button>
        <button 
          @click="$emit('clear-logs')"
          class="btn btn-secondary text-sm"
        >
          Clear
        </button>
        <button 
          @click="$emit('export-logs')"
          class="btn btn-primary text-sm"
        >
          Export
        </button>
      </div>
    </div>

    <!-- Log Controls -->
    <div class="card p-4">
      <div class="flex flex-wrap gap-4 items-end">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Level</label>
          <select 
            v-model="selectedLevel"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Levels</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Process</label>
          <select 
            v-model="selectedProcess"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Processes</option>
            <option v-for="process in processes" :key="process.id" :value="process.id">
              {{ process.name }}
            </option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Employee</label>
          <select 
            v-model="selectedEmployee"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Employees</option>
            <option v-for="employee in employees" :key="employee.id" :value="employee.id">
              {{ employee.name }}
            </option>
          </select>
        </div>
        
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search logs..."
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Max Entries</label>
          <select 
            v-model="maxEntries"
            class="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option :value="100">100</option>
            <option :value="500">500</option>
            <option :value="1000">1000</option>
            <option :value="0">All</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Log Stream -->
    <div class="card">
      <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <h3 class="text-md font-medium text-gray-900">Live Log Stream</h3>
            <div class="flex items-center space-x-2">
              <div 
                class="w-2 h-2 rounded-full"
                :class="isStreaming ? 'bg-success-500' : 'bg-gray-400'"
              ></div>
              <span class="text-sm text-gray-600">
                {{ isStreaming ? 'Streaming' : 'Paused' }}
              </span>
            </div>
          </div>
          <div class="text-sm text-gray-500">
            {{ filteredLogs.length }} entries
          </div>
        </div>
      </div>
      
      <div 
        ref="logContainer"
        class="overflow-y-auto bg-gray-900 text-gray-100 font-mono text-sm"
        :style="{ height: logHeight + 'px' }"
        @scroll="onScroll"
      >
        <div 
          v-for="(log, index) in displayedLogs" 
          :key="log.timestamp.getTime() + index"
          class="px-4 py-2 border-b border-gray-700 hover:bg-gray-800 transition-colors"
          :class="getLogRowClass(log)"
        >
          <div class="flex items-start space-x-3">
            <!-- Timestamp -->
            <div class="flex-shrink-0 w-20 text-gray-400 text-xs">
              {{ formatTime(log.timestamp) }}
            </div>
            
            <!-- Level Badge -->
            <div class="flex-shrink-0 w-16">
              <span 
                class="px-2 py-1 text-xs font-medium rounded"
                :class="getLevelStyle(log.level)"
              >
                {{ log.level.toUpperCase() }}
              </span>
            </div>
            
            <!-- Message Content -->
            <div class="flex-1 min-w-0">
              <div class="text-gray-100 break-words">{{ log.message }}</div>
              
              <!-- Metadata -->
              <div v-if="log.processId || log.employeeId" class="text-gray-400 text-xs mt-1 space-x-3">
                <span v-if="log.processId">Process: {{ getProcessName(log.processId) }}</span>
                <span v-if="log.employeeId">Employee: {{ getEmployeeName(log.employeeId) }}</span>
              </div>
              
              <!-- Context Data -->
              <div v-if="log.context && showContext" class="text-gray-500 text-xs mt-1">
                <details class="cursor-pointer">
                  <summary class="hover:text-gray-300">Context</summary>
                  <pre class="mt-1 p-2 bg-gray-800 rounded text-xs overflow-x-auto">{{ JSON.stringify(log.context, null, 2) }}</pre>
                </details>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex-shrink-0 flex items-center space-x-2">
              <button 
                @click="copyLog(log)"
                class="text-gray-400 hover:text-gray-200 text-xs"
                title="Copy log entry"
              >
                Copy
              </button>
              <button 
                v-if="log.processId"
                @click="filterByProcess(log.processId)"
                class="text-gray-400 hover:text-gray-200 text-xs"
                title="Filter by process"
              >
                Filter
              </button>
            </div>
          </div>
        </div>
        
        <div v-if="filteredLogs.length === 0" class="p-8 text-center text-gray-500">
          No logs match the current filters
        </div>
        
        <div v-if="isLoading" class="p-4 text-center text-gray-500">
          Loading more logs...
        </div>
      </div>
    </div>

    <!-- Log Statistics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card p-4">
        <div class="text-center">
          <div class="text-2xl font-semibold text-gray-600">{{ getLogCount('debug') }}</div>
          <div class="text-sm text-gray-500">Debug</div>
        </div>
      </div>
      
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import type { LogEntry, ProcessInfo, EmployeeInfo } from '../types'

interface Props {
  logs: LogEntry[]
  processes: ProcessInfo[]
  employees: EmployeeInfo[]
  isStreaming?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: true
})

defineEmits<{
  'clear-logs': []
  'export-logs': []
  'toggle-auto-scroll': []
}>()

const logContainer = ref<HTMLElement>()
const autoScroll = ref(true)
const selectedLevel = ref('')
const selectedProcess = ref('')
const selectedEmployee = ref('')
const searchQuery = ref('')
const maxEntries = ref(500)
const logHeight = ref(400)
const showContext = ref(false)
const isLoading = ref(false)

const filteredLogs = computed(() => {
  let filtered = props.logs

  if (selectedLevel.value) {
    filtered = filtered.filter(log => log.level === selectedLevel.value)
  }

  if (selectedProcess.value) {
    filtered = filtered.filter(log => log.processId === selectedProcess.value)
  }

  if (selectedEmployee.value) {
    filtered = filtered.filter(log => log.employeeId === selectedEmployee.value)
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

const displayedLogs = computed(() => {
  if (maxEntries.value === 0) return filteredLogs.value
  return filteredLogs.value.slice(0, maxEntries.value)
})

onMounted(() => {
  updateLogHeight()
  window.addEventListener('resize', updateLogHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateLogHeight)
})

function updateLogHeight() {
  const viewportHeight = window.innerHeight
  const headerHeight = 200 // Approximate header and controls height
  const footerHeight = 150 // Approximate footer height
  logHeight.value = Math.max(300, viewportHeight - headerHeight - footerHeight)
}

// Auto-scroll to bottom when new logs arrive
watch(() => props.logs, async () => {
  if (autoScroll.value && logContainer.value) {
    await nextTick()
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
}, { flush: 'post' })

function onScroll() {
  if (!logContainer.value) return
  
  const { scrollTop, scrollHeight, clientHeight } = logContainer.value
  const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
  
  if (autoScroll.value && !isAtBottom) {
    autoScroll.value = false
  }
}

function toggleAutoScroll() {
  autoScroll.value = !autoScroll.value
  if (autoScroll.value && logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

function getLevelStyle(level: LogEntry['level']): string {
  switch (level) {
    case 'debug': return 'bg-gray-600 text-white'
    case 'info': return 'bg-primary-600 text-white'
    case 'warn': return 'bg-warning-600 text-white'
    case 'error': return 'bg-error-600 text-white'
    default: return 'bg-gray-600 text-white'
  }
}

function getLogRowClass(log: LogEntry): string {
  switch (log.level) {
    case 'error': return 'bg-error-900 bg-opacity-20'
    case 'warn': return 'bg-warning-900 bg-opacity-20'
    default: return ''
  }
}

function getLogCount(level: LogEntry['level']): number {
  return props.logs.filter(log => log.level === level).length
}

function getProcessName(processId: string): string {
  const process = props.processes.find(p => p.id === processId)
  return process ? process.name : processId
}

function getEmployeeName(employeeId: string): string {
  const employee = props.employees.find(e => e.id === employeeId)
  return employee ? employee.name : employeeId
}

function copyLog(log: LogEntry) {
  const logText = `[${formatTime(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}`
  navigator.clipboard.writeText(logText).then(() => {
    // Could show a toast notification here
    console.log('Log copied to clipboard')
  })
}

function filterByProcess(processId: string) {
  selectedProcess.value = processId
}
</script>