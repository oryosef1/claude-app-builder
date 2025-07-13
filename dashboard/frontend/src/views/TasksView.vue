<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900">Task Management</h1>
      <button 
        @click="showCreateModal = true"
        class="btn-primary"
      >
        Create Task
      </button>
    </div>

    <!-- Task Filters -->
    <div class="card p-4">
      <div class="flex space-x-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select 
            v-model="filterStatus"
            class="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select 
            v-model="filterPriority"
            class="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Task List -->
    <div class="card">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Tasks</h3>
      </div>
      
      <div class="divide-y divide-gray-200">
        <div 
          v-for="task in filteredTasks" 
          :key="task.id"
          class="p-6 hover:bg-gray-50"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <h4 class="text-lg font-medium text-gray-900">{{ task.title }}</h4>
                <div 
                  class="status-badge"
                  :class="getStatusClass(task.status)"
                >
                  {{ task.status }}
                </div>
                <div 
                  class="status-badge"
                  :class="getPriorityClass(task.priority)"
                >
                  {{ task.priority }}
                </div>
              </div>
              
              <p class="mt-1 text-sm text-gray-600">{{ task.description }}</p>
              
              <div class="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                <span>Created: {{ formatDate(task.createdAt) }}</span>
                <span v-if="task.assignedTo">Assigned to: {{ getEmployeeName(task.assignedTo) }}</span>
                <span v-if="task.completedAt">Completed: {{ formatDate(task.completedAt) }}</span>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <div class="text-right">
                <div class="text-sm font-medium text-gray-900">{{ task.progress }}%</div>
                <div class="w-20 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    class="bg-primary-600 h-2 rounded-full" 
                    :style="{ width: task.progress + '%' }"
                  ></div>
                </div>
              </div>
              
              <div class="flex flex-col space-y-1">
                <button 
                  v-if="task.status === 'pending'"
                  @click="assignTask(task.id)"
                  class="btn btn-primary text-xs"
                >
                  Assign
                </button>
                <button 
                  v-if="task.status !== 'completed'"
                  @click="editTask(task)"
                  class="btn btn-secondary text-xs"
                >
                  Edit
                </button>
                <button 
                  @click="deleteTask(task.id)"
                  class="btn btn-error text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Task Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
        
        <form @submit.prevent="createTask">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input 
                v-model="newTask.title"
                type="text" 
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea 
                v-model="newTask.description"
                rows="3"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select 
                v-model="newTask.priority"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select 
                v-model="newTask.assignedTo"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Unassigned</option>
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

    <!-- Edit Task Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Edit Task</h3>
        
        <form @submit.prevent="saveTask">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input 
                v-model="editingTask.title"
                type="text" 
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea 
                v-model="editingTask.description"
                rows="3"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select 
                v-model="editingTask.priority"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Skills Required</label>
              <input 
                v-model="skillsInput"
                type="text" 
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Comma-separated skills"
              />
            </div>
          </div>
          
          <div class="mt-6 flex justify-end space-x-3">
            <button 
              type="button"
              @click="showEditModal = false"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
            >
              Save
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
import type { TaskInfo } from '../types'

const dashboardStore = useDashboardStore()

const tasks = computed(() => dashboardStore.tasks)
const availableEmployees = computed(() => dashboardStore.employees)

const filterStatus = ref('')
const filterPriority = ref('')

const showCreateModal = ref(false)
const showEditModal = ref(false)
const newTask = ref({
  title: '',
  description: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  assignedTo: ''
})
const editingTask = ref({
  id: '',
  title: '',
  description: '',
  priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  skillsRequired: [] as string[]
})
const skillsInput = ref('')

const filteredTasks = computed(() => {
  let filtered = tasks.value
  
  if (filterStatus.value) {
    filtered = filtered.filter(task => task.status === filterStatus.value)
  }
  
  if (filterPriority.value) {
    filtered = filtered.filter(task => task.priority === filterPriority.value)
  }
  
  return filtered.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
})

onMounted(async () => {
  try {
    const [tasksData, employeesData] = await Promise.all([
      apiService.getTasks(),
      apiService.getEmployees()
    ])
    
    dashboardStore.updateTasks(tasksData)
    dashboardStore.updateEmployees(employeesData)
  } catch (error) {
    console.error('Failed to load data:', error)
  }
})

function getStatusClass(status: TaskInfo['status']): string {
  switch (status) {
    case 'pending': return 'status-pending'
    case 'running': return 'status-running'
    case 'completed': return 'status-running bg-success-100 text-success-800'
    case 'failed': return 'status-error'
    default: return 'status-idle'
  }
}

function getPriorityClass(priority: TaskInfo['priority']): string {
  switch (priority) {
    case 'high': return 'bg-error-100 text-error-800'
    case 'medium': return 'bg-warning-100 text-warning-800'
    case 'low': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString()
}

function getEmployeeName(employeeId: string): string {
  const employee = dashboardStore.getEmployeeById(employeeId)
  return employee ? employee.name : 'Unknown'
}

async function createTask() {
  try {
    const taskData = {
      ...newTask.value,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: 0
    }
    
    await apiService.createTask(taskData)
    
    showCreateModal.value = false
    newTask.value = {
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: ''
    }
    
    // Refresh tasks
    const tasks = await apiService.getTasks()
    dashboardStore.updateTasks(tasks)
  } catch (error) {
    console.error('Failed to create task:', error)
  }
}

async function assignTask(taskId: string) {
  try {
    console.log('Assign task:', taskId)
    
    // Create process with the task using the working endpoint
    const processData = await apiService.createProcessWithTask(taskId, 'emp_004')
    
    console.log('Process created:', processData)
    
    // Refresh tasks to show updated status
    const tasks = await apiService.getTasks()
    dashboardStore.updateTasks(tasks)
    
    // Refresh processes to show new process
    const processes = await apiService.getProcesses()
    dashboardStore.updateProcesses(processes)
    
  } catch (error) {
    console.error('Failed to assign task:', error)
  }
}

async function editTask(task: TaskInfo) {
  editingTask.value = {
    id: task.id,
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    skillsRequired: task.skillsRequired || []
  }
  skillsInput.value = editingTask.value.skillsRequired.join(', ')
  showEditModal.value = true
}

async function saveTask() {
  try {
    const skills = skillsInput.value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    await apiService.updateTask(editingTask.value.id, {
      title: editingTask.value.title,
      description: editingTask.value.description,
      priority: editingTask.value.priority,
      skillsRequired: skills
    })
    
    showEditModal.value = false
    
    // Refresh tasks
    const tasks = await apiService.getTasks()
    dashboardStore.updateTasks(tasks)
  } catch (error) {
    console.error('Failed to update task:', error)
  }
}

async function deleteTask(taskId: string) {
  if (confirm('Are you sure you want to delete this task?')) {
    try {
      await apiService.deleteTask(taskId)
      
      // Refresh tasks
      const tasks = await apiService.getTasks()
      dashboardStore.updateTasks(tasks)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }
}
</script>