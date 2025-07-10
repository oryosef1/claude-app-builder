<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
      <div class="text-sm text-gray-500">
        Last updated: {{ formatTime(lastUpdated) }}
      </div>
    </div>

    <!-- System Status Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="card p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Active Processes</p>
            <p class="text-2xl font-semibold text-gray-900">{{ runningProcesses.length }}</p>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Pending Tasks</p>
            <p class="text-2xl font-semibold text-gray-900">{{ pendingTasks.length }}</p>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-warning-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Available Employees</p>
            <p class="text-2xl font-semibold text-gray-900">{{ availableEmployees.length }}</p>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 rounded-full flex items-center justify-center"
                 :class="systemStatusColor">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">System Status</p>
            <p class="text-2xl font-semibold text-gray-900 capitalize">{{ systemStatus }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- System Health -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">System Resources</h3>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-sm">
              <span>CPU Usage</span>
              <span>{{ systemHealth.cpu.usage.toFixed(1) }}%</span>
            </div>
            <div class="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div class="bg-primary-600 h-2 rounded-full" 
                   :style="{ width: systemHealth.cpu.usage + '%' }"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-sm">
              <span>Memory Usage</span>
              <span>{{ systemHealth.memory.percentage.toFixed(1) }}%</span>
            </div>
            <div class="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div class="bg-success-600 h-2 rounded-full" 
                   :style="{ width: systemHealth.memory.percentage + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Queue Status</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="text-2xl font-semibold text-warning-600">{{ systemHealth.queue.pending }}</div>
            <div class="text-sm text-gray-500">Pending</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-semibold text-primary-600">{{ systemHealth.queue.processing }}</div>
            <div class="text-sm text-gray-500">Processing</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-semibold text-success-600">{{ systemHealth.queue.completed }}</div>
            <div class="text-sm text-gray-500">Completed</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-semibold text-error-600">{{ systemHealth.queue.failed }}</div>
            <div class="text-sm text-gray-500">Failed</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
      <div class="space-y-3">
        <div v-for="log in recentLogs" :key="log.timestamp.getTime()" 
             class="flex items-center space-x-3 text-sm">
          <div class="flex-shrink-0">
            <div class="w-2 h-2 rounded-full" 
                 :class="getLogLevelColor(log.level)"></div>
          </div>
          <div class="flex-1">
            <span class="text-gray-900">{{ log.message }}</span>
          </div>
          <div class="text-gray-500">
            {{ formatTime(log.timestamp) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDashboardStore } from '../stores/dashboard'
import type { LogEntry } from '../types'

const dashboardStore = useDashboardStore()

const runningProcesses = computed(() => dashboardStore.runningProcesses)
const pendingTasks = computed(() => dashboardStore.pendingTasks)
const availableEmployees = computed(() => dashboardStore.availableEmployees)
const systemStatus = computed(() => dashboardStore.systemStatus)
const systemHealth = computed(() => dashboardStore.systemHealth)
const lastUpdated = computed(() => dashboardStore.lastUpdated)

const recentLogs = computed(() => dashboardStore.logs.slice(0, 10))

const systemStatusColor = computed(() => {
  switch (systemStatus.value) {
    case 'healthy': return 'bg-success-100 text-success-600'
    case 'warning': return 'bg-warning-100 text-warning-600'
    case 'error': return 'bg-error-100 text-error-600'
    default: return 'bg-gray-100 text-gray-600'
  }
})

function formatTime(date: Date): string {
  return date.toLocaleTimeString()
}

function getLogLevelColor(level: LogEntry['level']): string {
  switch (level) {
    case 'info': return 'bg-primary-500'
    case 'warn': return 'bg-warning-500'
    case 'error': return 'bg-error-500'
    case 'debug': return 'bg-gray-500'
    default: return 'bg-gray-500'
  }
}
</script>