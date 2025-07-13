<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-900">Task Assignment</h2>
      <button 
        @click="showCreateModal = true"
        class="btn btn-primary"
      >
        Create Task
      </button>
    </div>

    <!-- Task Assignment Matrix -->
    <div class="card p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Smart Assignment</h3>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Available Tasks -->
        <div>
          <h4 class="text-md font-medium text-gray-700 mb-3">Unassigned Tasks</h4>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            <div 
              v-for="task in unassignedTasks" 
              :key="task.id"
              class="p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
              :class="{ 'bg-primary-50 border-primary-300': selectedTask?.id === task.id }"
              @click="selectTask(task)"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="font-medium text-gray-900">{{ task.title }}</div>
                  <div class="text-sm text-gray-500">{{ task.description }}</div>
                </div>
                <div class="flex items-center space-x-2">
                  <div 
                    class="status-badge"
                    :class="getPriorityClass(task.priority)"
                  >
                    {{ task.priority }}
                  </div>
                  <div class="text-xs text-gray-400">
                    {{ formatDate(task.createdAt) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Employee Recommendations -->
        <div>
          <h4 class="text-md font-medium text-gray-700 mb-3">
            Recommended Employees
            <span v-if="selectedTask" class="text-sm font-normal text-gray-500">
              for "{{ selectedTask.title }}"
            </span>
          </h4>
          
          <div v-if="!selectedTask" class="text-center text-gray-500 py-8">
            Select a task to see employee recommendations
          </div>
          
          <div v-else class="space-y-2 max-h-96 overflow-y-auto">
            <div 
              v-for="recommendation in employeeRecommendations" 
              :key="recommendation.employee.id"
              class="p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
              :class="{ 'bg-success-50 border-success-300': recommendation.score >= 0.8 }"
              @click="assignTask(selectedTask.id, recommendation.employee.id)"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="font-medium text-gray-900">{{ recommendation.employee.name }}</div>
                  <div class="text-sm text-gray-500">{{ recommendation.employee.role }}</div>
                  <div class="text-xs text-gray-400">{{ recommendation.employee.department }}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium text-gray-900">
                    {{ (recommendation.score * 100).toFixed(0) }}% match
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ recommendation.employee.currentTasks }}/{{ recommendation.employee.maxTasks }} tasks
                  </div>
                  <div 
                    class="status-badge mt-1"
                    :class="getAvailabilityClass(recommendation.employee.availability)"
                  >
                    {{ recommendation.employee.availability }}
                  </div>
                </div>
              </div>
              
              <div class="mt-2">
                <div class="text-xs text-gray-500 mb-1">Skills:</div>
                <div class="flex flex-wrap gap-1">
                  <span 
                    v-for="skill in recommendation.employee.skills.slice(0, 3)" 
                    :key="skill"
                    class="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full"
                  >
                    {{ skill }}
                  </span>
                  <span 
                    v-if="recommendation.employee.skills.length > 3"
                    class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    +{{ recommendation.employee.skills.length - 3 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Assignment -->
    <div class="card p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Bulk Assignment</h3>
      
      <div class="flex items-center space-x-4 mb-4">
        <button 
          @click="autoAssignTasks"
          class="btn btn-primary"
          :disabled="unassignedTasks.length === 0"
        >
          Auto-Assign All Tasks
        </button>
        <button 
          @click="balanceWorkload"
          class="btn btn-secondary"
        >
          Balance Workload
        </button>
        <div class="text-sm text-gray-500">
          {{ unassignedTasks.length }} unassigned tasks
        </div>
      </div>
      
      <div class="text-sm text-gray-600">
        Auto-assignment will distribute tasks based on employee skills, availability, and current workload.
      </div>
    </div>

    <!-- Task Creation Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
        
        <form @submit.prevent="createTask">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Title
                <span class="text-xs text-gray-500">
                  ({{ newTask.title.length }}/200 characters)
                </span>
              </label>
              <input 
                v-model="newTask.title"
                type="text" 
                maxlength="200"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                :class="{ 'border-red-500': newTask.title.length > 200 }"
                required
                placeholder="Enter a concise task title..."
              />
              <div v-if="newTask.title.length > 180" class="text-xs text-amber-600 mt-1">
                Warning: Approaching character limit
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Description
                <span class="text-xs text-gray-500">
                  ({{ newTask.description.length }}/10000 characters)
                </span>
              </label>
              <textarea 
                v-model="newTask.description"
                rows="3"
                maxlength="10000"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                :class="{ 'border-red-500': newTask.description.length > 10000 }"
                required
                placeholder="Describe the task in detail..."
              ></textarea>
              <div v-if="newTask.description.length > 9500" class="text-xs text-amber-600 mt-1">
                Warning: Approaching character limit
              </div>
              <div v-if="newTask.description.length > 10000" class="text-xs text-red-600 mt-1">
                Error: Description too long (max 10,000 characters)
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select 
                v-model="newTask.priority"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (hours)</label>
              <input 
                v-model.number="newTask.estimatedDuration"
                type="number"
                min="1"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
              <div class="flex flex-wrap gap-2 mb-2">
                <span 
                  v-for="skill in newTask.requiredSkills" 
                  :key="skill"
                  class="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full flex items-center"
                >
                  {{ skill }}
                  <button 
                    type="button"
                    @click="removeSkill(skill)"
                    class="ml-1 text-primary-600 hover:text-primary-800"
                  >
                    ×
                  </button>
                </span>
              </div>
              <div class="flex">
                <input 
                  v-model="newSkill"
                  type="text"
                  placeholder="Add skill..."
                  class="flex-1 border border-gray-300 rounded-l-md px-3 py-2"
                  @keyup.enter="addSkill"
                />
                <button 
                  type="button"
                  @click="addSkill"
                  class="btn btn-secondary rounded-l-none"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          
          <!-- Validation Summary -->
          <div v-if="!isFormValid" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 class="text-sm font-medium text-red-800 mb-2">Please fix the following issues:</h4>
            <ul class="text-xs text-red-700 space-y-1">
              <li v-if="newTask.title.trim().length === 0">• Title is required</li>
              <li v-if="newTask.title.length > 200">• Title too long (max 200 characters)</li>
              <li v-if="newTask.description.trim().length === 0">• Description is required</li>
              <li v-if="newTask.description.length > 10000">• Description too long (max 10,000 characters)</li>
              <li v-if="newTask.requiredSkills.length > 20">• Too many skills (max 20)</li>
              <li v-if="newTask.estimatedDuration <= 0">• Estimated duration must be greater than 0</li>
              <li v-if="newTask.estimatedDuration > 24">• Estimated duration too long (max 24 hours)</li>
            </ul>
          </div>
          
          <div class="mt-6 flex justify-end space-x-3">
            <button 
              type="button"
              @click="closeCreateModal"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn"
              :class="isFormValid ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'"
              :disabled="!isFormValid"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TaskInfo, EmployeeInfo } from '../types'

interface Props {
  tasks: TaskInfo[]
  employees: EmployeeInfo[]
}

const props = defineProps<Props>()

defineEmits<{
  'assign-task': [taskId: string, employeeId: string]
  'create-task': [task: Partial<TaskInfo>]
  'auto-assign-tasks': []
  'balance-workload': []
}>()

const selectedTask = ref<TaskInfo | null>(null)
const showCreateModal = ref(false)
const newTask = ref({
  title: '',
  description: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  estimatedDuration: 1,
  requiredSkills: [] as string[]
})
const newSkill = ref('')

const unassignedTasks = computed(() => 
  props.tasks.filter(task => !task.assignedTo && task.status === 'pending')
)

const employeeRecommendations = computed(() => {
  if (!selectedTask.value) return []
  
  return props.employees
    .filter(employee => employee.availability === 'available')
    .map(employee => ({
      employee,
      score: calculateMatchScore(selectedTask.value!, employee)
    }))
    .sort((a, b) => b.score - a.score)
})

const isFormValid = computed(() => {
  return newTask.value.title.trim().length > 0 &&
         newTask.value.title.length <= 200 &&
         newTask.value.description.trim().length > 0 &&
         newTask.value.description.length <= 10000 &&
         newTask.value.requiredSkills.length <= 20 &&
         newTask.value.estimatedDuration > 0 &&
         newTask.value.estimatedDuration <= 24
})

function selectTask(task: TaskInfo) {
  selectedTask.value = task
}

function calculateMatchScore(task: TaskInfo, employee: EmployeeInfo): number {
  let score = 0
  
  // Availability score (40%)
  if (employee.availability === 'available') {
    score += 0.4
  }
  
  // Workload score (30%)
  const workloadRatio = employee.currentTasks / employee.maxTasks
  score += (1 - workloadRatio) * 0.3
  
  // Performance score (20%)
  score += (employee.performanceScore / 100) * 0.2
  
  // Skills match (10%)
  // This would require task to have requiredSkills property
  // For now, we'll use a simple role-based matching
  const roleMatch = employee.skills.some(skill => 
    task.description.toLowerCase().includes(skill.toLowerCase())
  )
  if (roleMatch) {
    score += 0.1
  }
  
  return Math.min(score, 1)
}

function assignTask(taskId: string, employeeId: string) {
  emit('assign-task', taskId, employeeId)
  selectedTask.value = null
}

function autoAssignTasks() {
  emit('auto-assign-tasks')
}

function balanceWorkload() {
  emit('balance-workload')
}

function createTask() {
  // Validate form before submission
  if (!isFormValid.value) {
    return;
  }
  
  const taskData = {
    ...newTask.value,
    status: 'pending' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    progress: 0
  }
  
  emit('create-task', taskData)
  closeCreateModal()
}

function closeCreateModal() {
  showCreateModal.value = false
  newTask.value = {
    title: '',
    description: '',
    priority: 'medium',
    estimatedDuration: 1,
    requiredSkills: []
  }
  newSkill.value = ''
}

function addSkill() {
  if (newSkill.value.trim() && !newTask.value.requiredSkills.includes(newSkill.value.trim())) {
    newTask.value.requiredSkills.push(newSkill.value.trim())
    newSkill.value = ''
  }
}

function removeSkill(skill: string) {
  const index = newTask.value.requiredSkills.indexOf(skill)
  if (index > -1) {
    newTask.value.requiredSkills.splice(index, 1)
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

function getAvailabilityClass(availability: EmployeeInfo['availability']): string {
  switch (availability) {
    case 'available': return 'bg-success-100 text-success-800'
    case 'busy': return 'bg-warning-100 text-warning-800'
    case 'offline': return 'bg-error-100 text-error-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString()
}
</script>