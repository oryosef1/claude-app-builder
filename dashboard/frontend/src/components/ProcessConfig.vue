<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-900">Process Configuration</h2>
      <button 
        @click="showCreateModal = true"
        class="btn btn-primary"
      >
        Create Process
      </button>
    </div>

    <!-- Process Templates -->
    <div class="card p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Process Templates</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="template in processTemplates" 
          :key="template.id"
          class="border border-gray-200 rounded-lg p-4 hover:border-primary-300 cursor-pointer transition-colors"
          @click="selectTemplate(template)"
        >
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-medium text-gray-900">{{ template.name }}</h4>
            <div 
              class="w-3 h-3 rounded-full"
              :class="template.department === 'Development' ? 'bg-primary-500' : 
                     template.department === 'Operations' ? 'bg-warning-500' : 
                     template.department === 'Support' ? 'bg-success-500' : 'bg-gray-500'"
            ></div>
          </div>
          <p class="text-sm text-gray-600 mb-3">{{ template.description }}</p>
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>{{ template.department }}</span>
            <span>{{ template.skills.length }} skills</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Processes Configuration -->
    <div class="card p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Active Processes</h3>
      
      <div class="space-y-4">
        <div 
          v-for="process in processes" 
          :key="process.id"
          class="border border-gray-200 rounded-lg p-4"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-3">
              <h4 class="font-medium text-gray-900">{{ process.name }}</h4>
              <div 
                class="status-badge"
                :class="getStatusClass(process.status)"
              >
                {{ process.status }}
              </div>
            </div>
            <div class="flex space-x-2">
              <button 
                @click="editProcess(process)"
                class="btn btn-secondary text-xs"
              >
                Edit
              </button>
              <button 
                @click="duplicateProcess(process)"
                class="btn btn-secondary text-xs"
              >
                Duplicate
              </button>
              <button 
                @click="deleteProcess(process.id)"
                class="btn btn-error text-xs"
              >
                Delete
              </button>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Role:</span>
              <span class="ml-2 font-medium">{{ process.role }}</span>
            </div>
            <div>
              <span class="text-gray-500">Employee:</span>
              <span class="ml-2 font-medium">{{ getEmployeeName(process.employeeId) }}</span>
            </div>
            <div>
              <span class="text-gray-500">Uptime:</span>
              <span class="ml-2 font-medium">{{ formatUptime(process.uptime) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Process Creation/Edit Modal -->
    <div v-if="showCreateModal || editingProcess" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-medium text-gray-900 mb-6">
          {{ editingProcess ? 'Edit Process' : 'Create New Process' }}
        </h3>
        
        <form @submit.prevent="saveProcess">
          <div class="space-y-6">
            <!-- Basic Information -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Process Name</label>
                <input 
                  v-model="processForm.name"
                  type="text" 
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select 
                  v-model="processForm.employeeId"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select Employee</option>
                  <option v-for="employee in availableEmployees" :key="employee.id" :value="employee.id">
                    {{ employee.name }} - {{ employee.role }}
                  </option>
                </select>
              </div>
            </div>
            
            <!-- Role and Department -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input 
                  v-model="processForm.role"
                  type="text" 
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select 
                  v-model="processForm.department"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="Development">Development</option>
                  <option value="Operations">Operations</option>
                  <option value="Support">Support</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>
            </div>
            
            <!-- System Prompt -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
              <textarea 
                v-model="processForm.systemPrompt"
                rows="6"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter the system prompt that will define this process's behavior..."
              ></textarea>
            </div>
            
            <!-- Tools Configuration -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Allowed Tools</label>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                <label v-for="tool in availableTools" :key="tool" class="flex items-center">
                  <input 
                    v-model="processForm.allowedTools"
                    type="checkbox"
                    :value="tool"
                    class="mr-2"
                  />
                  <span class="text-sm">{{ tool }}</span>
                </label>
              </div>
            </div>
            
            <!-- Advanced Configuration -->
            <div class="border-t pt-4">
              <h4 class="text-md font-medium text-gray-900 mb-3">Advanced Configuration</h4>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Max Turns</label>
                  <input 
                    v-model.number="processForm.maxTurns"
                    type="number"
                    min="1"
                    max="100"
                    class="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Memory Limit (MB)</label>
                  <input 
                    v-model.number="processForm.memoryLimit"
                    type="number"
                    min="128"
                    max="2048"
                    class="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                  <input 
                    v-model.number="processForm.timeout"
                    type="number"
                    min="30"
                    max="3600"
                    class="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>
            
            <!-- Environment Variables -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Environment Variables</label>
              <div class="space-y-2">
                <div 
                  v-for="(env, index) in processForm.environment" 
                  :key="index"
                  class="flex space-x-2"
                >
                  <input 
                    v-model="env.key"
                    type="text"
                    placeholder="Key"
                    class="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  />
                  <input 
                    v-model="env.value"
                    type="text"
                    placeholder="Value"
                    class="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  />
                  <button 
                    type="button"
                    @click="removeEnvironmentVariable(index)"
                    class="btn btn-error text-xs"
                  >
                    Remove
                  </button>
                </div>
                <button 
                  type="button"
                  @click="addEnvironmentVariable"
                  class="btn btn-secondary text-sm"
                >
                  Add Variable
                </button>
              </div>
            </div>
          </div>
          
          <div class="mt-8 flex justify-end space-x-3">
            <button 
              type="button"
              @click="closeModal"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
            >
              {{ editingProcess ? 'Update' : 'Create' }} Process
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProcessInfo, EmployeeInfo } from '../types'

interface ProcessTemplate {
  id: string
  name: string
  description: string
  role: string
  department: string
  skills: string[]
  systemPrompt: string
  allowedTools: string[]
  maxTurns: number
  memoryLimit: number
  timeout: number
}

interface Props {
  processes: ProcessInfo[]
  employees: EmployeeInfo[]
}

const props = defineProps<Props>()

defineEmits<{
  'create-process': [config: any]
  'update-process': [id: string, config: any]
  'delete-process': [id: string]
}>()

const showCreateModal = ref(false)
const editingProcess = ref<ProcessInfo | null>(null)

const processForm = ref({
  name: '',
  employeeId: '',
  role: '',
  department: 'Development',
  systemPrompt: '',
  allowedTools: ['Bash', 'Edit', 'Write', 'Read', 'Grep', 'Glob', 'LS'] as string[],
  maxTurns: 20,
  memoryLimit: 512,
  timeout: 300,
  environment: [] as { key: string; value: string }[]
})

const availableTools = [
  'Bash', 'Edit', 'Write', 'Read', 'Grep', 'Glob', 'LS',
  'WebFetch', 'WebSearch', 'NotebookRead', 'NotebookEdit',
  'MultiEdit', 'TodoRead', 'TodoWrite', 'Task'
]

const processTemplates: ProcessTemplate[] = [
  {
    id: 'senior-developer',
    name: 'Senior Developer',
    description: 'Full-stack development with architecture design',
    role: 'Senior Developer',
    department: 'Development',
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Database'],
    systemPrompt: 'You are a Senior Developer at Claude AI Software Company. Focus on code quality, architecture, and mentoring.',
    allowedTools: ['Bash', 'Edit', 'Write', 'Read', 'Grep', 'Glob', 'LS', 'MultiEdit'],
    maxTurns: 30,
    memoryLimit: 1024,
    timeout: 600
  },
  {
    id: 'devops-engineer',
    name: 'DevOps Engineer',
    description: 'Infrastructure management and CI/CD automation',
    role: 'DevOps Engineer',
    department: 'Operations',
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Monitoring'],
    systemPrompt: 'You are a DevOps Engineer. Focus on infrastructure, deployment automation, and system reliability.',
    allowedTools: ['Bash', 'Edit', 'Write', 'Read', 'Grep', 'Glob', 'LS'],
    maxTurns: 25,
    memoryLimit: 768,
    timeout: 450
  },
  {
    id: 'qa-engineer',
    name: 'QA Engineer',
    description: 'Quality assurance and testing automation',
    role: 'QA Engineer',
    department: 'Development',
    skills: ['Testing', 'Automation', 'Quality Control', 'Bug Tracking'],
    systemPrompt: 'You are a QA Engineer. Focus on testing, quality assurance, and bug identification.',
    allowedTools: ['Bash', 'Edit', 'Write', 'Read', 'Grep', 'Glob', 'LS', 'Task'],
    maxTurns: 20,
    memoryLimit: 512,
    timeout: 300
  },
  {
    id: 'ui-ux-designer',
    name: 'UI/UX Designer',
    description: 'User interface and experience design',
    role: 'UI/UX Designer',
    department: 'Support',
    skills: ['UI Design', 'UX Research', 'Prototyping', 'User Testing'],
    systemPrompt: 'You are a UI/UX Designer. Focus on user experience, interface design, and usability.',
    allowedTools: ['Edit', 'Write', 'Read', 'WebFetch', 'WebSearch'],
    maxTurns: 15,
    memoryLimit: 256,
    timeout: 300
  }
]

const availableEmployees = computed(() => 
  props.employees.filter(emp => emp.availability === 'available')
)

function selectTemplate(template: ProcessTemplate) {
  processForm.value = {
    name: template.name,
    employeeId: '',
    role: template.role,
    department: template.department,
    systemPrompt: template.systemPrompt,
    allowedTools: [...template.allowedTools],
    maxTurns: template.maxTurns,
    memoryLimit: template.memoryLimit,
    timeout: template.timeout,
    environment: []
  }
  showCreateModal.value = true
}

function editProcess(process: ProcessInfo) {
  editingProcess.value = process
  processForm.value = {
    name: process.name,
    employeeId: process.employeeId,
    role: process.role,
    department: 'Development', // Default if not stored
    systemPrompt: '', // Would need to be stored in process
    allowedTools: ['Bash', 'Edit', 'Write', 'Read', 'Grep', 'Glob', 'LS'],
    maxTurns: 20,
    memoryLimit: 512,
    timeout: 300,
    environment: []
  }
}

function duplicateProcess(process: ProcessInfo) {
  processForm.value = {
    name: process.name + ' (Copy)',
    employeeId: '',
    role: process.role,
    department: 'Development',
    systemPrompt: '',
    allowedTools: ['Bash', 'Edit', 'Write', 'Read', 'Grep', 'Glob', 'LS'],
    maxTurns: 20,
    memoryLimit: 512,
    timeout: 300,
    environment: []
  }
  showCreateModal.value = true
}

function saveProcess() {
  if (editingProcess.value) {
    emit('update-process', editingProcess.value.id, processForm.value)
  } else {
    emit('create-process', processForm.value)
  }
  closeModal()
}

function deleteProcess(id: string) {
  if (confirm('Are you sure you want to delete this process?')) {
    emit('delete-process', id)
  }
}

function closeModal() {
  showCreateModal.value = false
  editingProcess.value = null
  processForm.value = {
    name: '',
    employeeId: '',
    role: '',
    department: 'Development',
    systemPrompt: '',
    allowedTools: ['Bash', 'Edit', 'Write', 'Read', 'Grep', 'Glob', 'LS'],
    maxTurns: 20,
    memoryLimit: 512,
    timeout: 300,
    environment: []
  }
}

function addEnvironmentVariable() {
  processForm.value.environment.push({ key: '', value: '' })
}

function removeEnvironmentVariable(index: number) {
  processForm.value.environment.splice(index, 1)
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

function getEmployeeName(employeeId: string): string {
  const employee = props.employees.find(e => e.id === employeeId)
  return employee ? employee.name : 'Unknown'
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}
</script>