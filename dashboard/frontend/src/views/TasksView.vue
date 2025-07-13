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
            <option value="resolved">Resolved</option>
            <option value="reopened">Reopened</option>
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
            <option value="urgent">Urgent</option>
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
              
              <!-- Comments Display -->
              <div v-if="task.comments && task.comments.length > 0" class="mt-3 space-y-2">
                <div v-for="comment in task.comments" :key="comment.id" class="text-xs p-2 rounded" 
                     :class="comment.type === 'reopen_reason' ? 'bg-yellow-50 border-l-4 border-yellow-400' : 
                             comment.type === 'resolution' ? 'bg-green-50 border-l-4 border-green-400' : 
                             'bg-gray-50 border-l-4 border-gray-400'">
                  <div class="flex items-center space-x-2 text-gray-600">
                    <span class="font-medium">{{ comment.authorName }}</span>
                    <span>•</span>
                    <span>{{ formatDate(comment.createdAt) }}</span>
                    <span v-if="comment.type === 'reopen_reason'" class="text-yellow-600">(Reopen Reason)</span>
                    <span v-if="comment.type === 'resolution'" class="text-green-600">(Resolution)</span>
                  </div>
                  <p class="mt-1 text-gray-700">{{ comment.text }}</p>
                </div>
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
                  v-if="task.status === 'completed'"
                  @click="resolveTask(task)"
                  class="btn btn-success text-xs"
                >
                  Resolve
                </button>
                <button 
                  v-if="task.status === 'completed' || task.status === 'resolved'"
                  @click="reopenTask(task)"
                  class="btn btn-warning text-xs"
                >
                  Reopen
                </button>
                <button 
                  v-if="task.status !== 'completed' && task.status !== 'resolved'"
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
                <option value="urgent">Urgent</option>
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

    <!-- Resolve Task Modal -->
    <div v-if="showResolveModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Resolve Task</h3>
        <p class="text-sm text-gray-600 mb-4">{{ resolvingTask.title }}</p>
        
        <form @submit.prevent="confirmResolve">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Resolution Comment (Optional)</label>
              <textarea 
                v-model="resolvingTask.comment"
                rows="3"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Add any final notes about this task completion..."
              ></textarea>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end space-x-3">
            <button 
              type="button"
              @click="showResolveModal = false"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-success"
            >
              Resolve Task
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Reopen Task Modal -->
    <div v-if="showReopenModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Reopen Task</h3>
        <p class="text-sm text-gray-600 mb-4">{{ reopeningTask.title }}</p>
        
        <form @submit.prevent="confirmReopen">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Reason for Reopening *</label>
              <textarea 
                v-model="reopeningTask.reason"
                rows="3"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Explain why this task needs to be reopened..."
                required
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Reassign To</label>
              <select 
                v-model="reopeningTask.assignTo"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Keep current assignment</option>
                <option v-for="employee in availableEmployees" :key="employee.id" :value="employee.id">
                  {{ employee.name }} - {{ employee.role }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end space-x-3">
            <button 
              type="button"
              @click="showReopenModal = false"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-warning"
            >
              Reopen Task
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
const showResolveModal = ref(false)
const showReopenModal = ref(false)
const newTask = ref({
  title: '',
  description: '',
  priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  assignedTo: ''
})
const editingTask = ref({
  id: '',
  title: '',
  description: '',
  priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  skillsRequired: [] as string[]
})
const resolvingTask = ref({
  id: '',
  title: '',
  comment: ''
})
const reopeningTask = ref({
  id: '',
  title: '',
  reason: '',
  assignTo: ''
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
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1)
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
    case 'resolved': return 'bg-green-100 text-green-800'
    case 'reopened': return 'bg-yellow-100 text-yellow-800'
    case 'failed': return 'status-error'
    default: return 'status-idle'
  }
}

function getPriorityClass(priority: TaskInfo['priority']): string {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800'
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
      progress: 0,
      skillsRequired: [],
      estimatedDuration: 0
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
    
    // Create process with the task using the working endpoint - let backend use task's assignedTo
    const processData = await apiService.createProcessWithTask(taskId)
    
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

async function resolveTask(task: TaskInfo) {
  resolvingTask.value = {
    id: task.id,
    title: task.title,
    comment: ''
  }
  showResolveModal.value = true
}

async function confirmResolve() {
  try {
    await apiService.resolveTask(resolvingTask.value.id, resolvingTask.value.comment)
    
    showResolveModal.value = false
    resolvingTask.value = { id: '', title: '', comment: '' }
    
    // Refresh tasks
    const tasks = await apiService.getTasks()
    dashboardStore.updateTasks(tasks)
  } catch (error) {
    console.error('Failed to resolve task:', error)
  }
}

async function reopenTask(task: TaskInfo) {
  reopeningTask.value = {
    id: task.id,
    title: task.title,
    reason: '',
    assignTo: task.assignedTo || ''
  }
  showReopenModal.value = true
}

async function confirmReopen() {
  try {
    if (!reopeningTask.value.reason) {
      alert('Please provide a reason for reopening the task')
      return
    }
    
    await apiService.reopenTask(
      reopeningTask.value.id, 
      reopeningTask.value.reason,
      reopeningTask.value.assignTo || undefined
    )
    
    showReopenModal.value = false
    reopeningTask.value = { id: '', title: '', reason: '', assignTo: '' }
    
    // Refresh tasks
    const tasks = await apiService.getTasks()
    dashboardStore.updateTasks(tasks)
  } catch (error) {
    console.error('Failed to reopen task:', error)
  }
}
</script>