<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900">Employee Management</h1>
    </div>

    <!-- Employee Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="employee in employees" 
        :key="employee.id"
        class="card p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-medium text-gray-900">{{ employee.name }}</h3>
            <p class="text-sm text-gray-500">{{ employee.role }}</p>
            <p class="text-xs text-gray-400">{{ employee.department }}</p>
          </div>
          <div 
            class="status-badge"
            :class="getAvailabilityClass(employee.availability)"
          >
            {{ employee.availability }}
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <div class="text-sm font-medium text-gray-700 mb-1">Skills</div>
            <div class="flex flex-wrap gap-1">
              <span 
                v-for="skill in employee.skills" 
                :key="skill"
                class="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full"
              >
                {{ skill }}
              </span>
            </div>
          </div>

          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Current Tasks:</span>
            <span class="font-medium">{{ employee.currentTasks }} / {{ employee.maxTasks }}</span>
          </div>
          
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Performance:</span>
            <span class="font-medium">{{ (employee.performanceScore || 0).toFixed(1) }}%</span>
          </div>
          
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-success-600 h-2 rounded-full" 
              :style="{ width: (employee.performanceScore || 0) + '%' }"
            ></div>
          </div>
        </div>

        <div class="mt-4 flex space-x-2">
          <button 
            @click="viewEmployeeDetails(employee.id)"
            class="btn btn-primary text-xs"
          >
            View Details
          </button>
          <button 
            @click="assignTask(employee.id)"
            class="btn btn-secondary text-xs"
            :disabled="employee.availability !== 'available'"
          >
            Assign Task
          </button>
        </div>
      </div>
    </div>

    <!-- Employee Details Modal -->
    <div v-if="selectedEmployee" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">{{ selectedEmployee.name }}</h3>
          <button 
            @click="selectedEmployee = null"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-sm font-medium text-gray-700">Role</div>
              <div class="text-lg">{{ selectedEmployee.role }}</div>
            </div>
            <div>
              <div class="text-sm font-medium text-gray-700">Department</div>
              <div class="text-lg">{{ selectedEmployee.department }}</div>
            </div>
            <div>
              <div class="text-sm font-medium text-gray-700">Availability</div>
              <div 
                class="inline-block status-badge"
                :class="getAvailabilityClass(selectedEmployee.availability)"
              >
                {{ selectedEmployee.availability }}
              </div>
            </div>
            <div>
              <div class="text-sm font-medium text-gray-700">Performance Score</div>
              <div class="text-lg">{{ selectedEmployee.performanceScore.toFixed(1) }}%</div>
            </div>
          </div>
          
          <div>
            <div class="text-sm font-medium text-gray-700 mb-2">Skills</div>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="skill in selectedEmployee.skills" 
                :key="skill"
                class="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full"
              >
                {{ skill }}
              </span>
            </div>
          </div>
          
          <div>
            <div class="text-sm font-medium text-gray-700 mb-2">Task Load</div>
            <div class="flex items-center space-x-4">
              <div class="flex-1">
                <div class="flex justify-between text-sm mb-1">
                  <span>Current Tasks</span>
                  <span>{{ selectedEmployee.currentTasks }} / {{ selectedEmployee.maxTasks }}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="h-2 rounded-full" 
                    :class="getTaskLoadColor(selectedEmployee.currentTasks / selectedEmployee.maxTasks)"
                    :style="{ width: (selectedEmployee.currentTasks / selectedEmployee.maxTasks) * 100 + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div class="text-sm font-medium text-gray-700 mb-2">Recent Tasks</div>
            <div class="space-y-2">
              <div 
                v-for="task in getEmployeeTasks(selectedEmployee.id)" 
                :key="task.id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <div class="font-medium">{{ task.title }}</div>
                  <div class="text-sm text-gray-500">{{ task.status }}</div>
                </div>
                <div class="text-sm text-gray-500">
                  {{ task.progress }}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDashboardStore } from '../stores/dashboard'
import { apiService } from '../services/api'
import type { EmployeeInfo } from '../types'

const dashboardStore = useDashboardStore()

const employees = computed(() => dashboardStore.employees)
const selectedEmployee = ref<EmployeeInfo | null>(null)

onMounted(async () => {
  try {
    const [employeesData, tasksData] = await Promise.all([
      apiService.getEmployees(),
      apiService.getTasks()
    ])
    
    dashboardStore.updateEmployees(employeesData)
    dashboardStore.updateTasks(tasksData)
  } catch (error) {
    console.error('Failed to load data:', error)
  }
})

function getAvailabilityClass(availability: EmployeeInfo['availability']): string {
  switch (availability) {
    case 'available': return 'status-running bg-success-100 text-success-800'
    case 'busy': return 'status-warning bg-warning-100 text-warning-800'
    case 'offline': return 'status-error'
    default: return 'status-idle'
  }
}

function getTaskLoadColor(ratio: number): string {
  if (ratio >= 0.9) return 'bg-error-600'
  if (ratio >= 0.7) return 'bg-warning-600'
  return 'bg-success-600'
}

function getEmployeeTasks(employeeId: string) {
  return dashboardStore.tasks.filter(task => task.assignedTo === employeeId).slice(0, 5)
}

function viewEmployeeDetails(employeeId: string) {
  selectedEmployee.value = dashboardStore.getEmployeeById(employeeId) || null
}

function assignTask(employeeId: string) {
  // This would open a task assignment modal
  console.log('Assign task to employee:', employeeId)
}
</script>