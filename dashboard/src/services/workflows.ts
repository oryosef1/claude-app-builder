// Workflow API Service
export interface WorkflowTemplate {
  id: string;
  name: string;
  type: 'corporate' | 'development' | 'testing' | 'deployment';
  description: string;
  defaultEmployees: string[];
  defaultConfiguration: WorkflowConfiguration;
}

export interface WorkflowConfiguration {
  maxConcurrentEmployees: number;
  timeout: number;
  retryAttempts: number;
  memoryEnabled: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
  notificationsEnabled: boolean;
  autoRestart: boolean;
  resourceLimits: {
    maxMemoryMB: number;
    maxCpuPercent: number;
  };
  employees: string[];
  tags: string[];
  environmentVars: Record<string, string>;
}

export interface Workflow {
  id: string;
  name: string;
  type: 'corporate' | 'development' | 'testing' | 'deployment';
  status: 'running' | 'stopped' | 'paused' | 'completed' | 'failed';
  progress: number;
  employees: string[];
  startTime?: Date;
  endTime?: Date;
  estimatedCompletion?: Date;
  lastRun?: Date;
  description: string;
  configuration: WorkflowConfiguration;
  templateId?: string;
  executionHistory: WorkflowExecution[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startTime: Date;
  endTime?: Date;
  progress: number;
  currentStep?: string;
  steps: WorkflowStep[];
  logs: WorkflowLog[];
  statistics: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    activeEmployees: number;
    memoryOperations: number;
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  employeeId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  progress?: number;
  memoryOperations?: {
    retrieved: number;
    stored: number;
  };
  output?: string;
  error?: string;
}

export interface WorkflowLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  source: string;
  stepId?: string;
  employeeId?: string;
}

export interface WorkflowMetrics {
  totalWorkflows: number;
  runningWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  averageExecutionTime: number;
  successRate: number;
  activeEmployees: number;
  totalMemoryOperations: number;
}

class WorkflowService {
  private readonly baseUrl = 'http://localhost:3333/api/workflows';

  // Get all workflows
  async getWorkflows(): Promise<Workflow[]> {
    try {
      const response = await fetch(`${this.baseUrl}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.workflows || [];
    } catch (error) {
      console.error('Error fetching workflows:', error);
      // Return mock data for development
      return this.getMockWorkflows();
    }
  }

  // Get specific workflow
  async getWorkflow(id: string): Promise<Workflow | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching workflow ${id}:`, error);
      const workflows = this.getMockWorkflows();
      return workflows.find(w => w.id === id) || null;
    }
  }

  // Create new workflow
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'executionHistory'>): Promise<Workflow> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating workflow:', error);
      // Return mock created workflow
      return {
        ...workflow,
        id: `wf-${Date.now()}`,
        executionHistory: [],
      };
    }
  }

  // Update workflow configuration
  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error updating workflow ${id}:`, error);
      throw error;
    }
  }

  // Start workflow
  async startWorkflow(id: string): Promise<WorkflowExecution> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/start`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error starting workflow ${id}:`, error);
      throw error;
    }
  }

  // Stop workflow
  async stopWorkflow(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/stop`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error stopping workflow ${id}:`, error);
      throw error;
    }
  }

  // Pause workflow
  async pauseWorkflow(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/pause`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error pausing workflow ${id}:`, error);
      throw error;
    }
  }

  // Resume workflow
  async resumeWorkflow(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}/resume`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error resuming workflow ${id}:`, error);
      throw error;
    }
  }

  // Get workflow execution
  async getWorkflowExecution(workflowId: string, executionId: string): Promise<WorkflowExecution | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${workflowId}/executions/${executionId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching execution ${executionId}:`, error);
      return null;
    }
  }

  // Get workflow templates
  async getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      console.error('Error fetching workflow templates:', error);
      return this.getMockTemplates();
    }
  }

  // Get workflow metrics
  async getWorkflowMetrics(): Promise<WorkflowMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching workflow metrics:', error);
      return this.getMockMetrics();
    }
  }

  // Delete workflow
  async deleteWorkflow(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error deleting workflow ${id}:`, error);
      throw error;
    }
  }

  // Mock data for development
  private getMockWorkflows(): Workflow[] {
    return [
      {
        id: 'wf-001',
        name: 'AI Memory Management System',
        type: 'development',
        status: 'completed',
        progress: 100,
        employees: ['emp_004_sd', 'emp_002_tl', 'emp_006_qe'],
        startTime: new Date('2025-07-06T10:00:00'),
        endTime: new Date('2025-07-07T14:30:00'),
        lastRun: new Date('2025-07-07T14:30:00'),
        description: 'Implement comprehensive AI memory management with vector database integration',
        configuration: {
          maxConcurrentEmployees: 3,
          timeout: 3600,
          retryAttempts: 2,
          memoryEnabled: true,
          priority: 'high',
          notificationsEnabled: true,
          autoRestart: false,
          resourceLimits: {
            maxMemoryMB: 1024,
            maxCpuPercent: 80,
          },
          employees: ['emp_004_sd', 'emp_002_tl', 'emp_006_qe'],
          tags: ['memory', 'vector-db', 'ai'],
          environmentVars: {
            MEMORY_API_PORT: '3333',
            VECTOR_DB_URL: 'pinecone://...',
          },
        },
        templateId: 'template-dev',
        executionHistory: [],
      },
      {
        id: 'wf-002',
        name: 'Master Control Dashboard',
        type: 'development',
        status: 'running',
        progress: 75,
        employees: ['emp_012_ux', 'emp_004_sd', 'emp_011_tw'],
        startTime: new Date('2025-07-07T09:00:00'),
        estimatedCompletion: new Date('2025-07-07T18:00:00'),
        description: 'Build comprehensive control dashboard for AI company operations',
        configuration: {
          maxConcurrentEmployees: 3,
          timeout: 7200,
          retryAttempts: 1,
          memoryEnabled: true,
          priority: 'normal',
          notificationsEnabled: true,
          autoRestart: false,
          resourceLimits: {
            maxMemoryMB: 512,
            maxCpuPercent: 70,
          },
          employees: ['emp_012_ux', 'emp_004_sd', 'emp_011_tw'],
          tags: ['dashboard', 'ui', 'control'],
          environmentVars: {},
        },
        templateId: 'template-dev',
        executionHistory: [],
      },
      {
        id: 'wf-003',
        name: 'Corporate Infrastructure Testing',
        type: 'testing',
        status: 'stopped',
        progress: 0,
        employees: ['emp_006_qe', 'emp_007_te', 'emp_003_qd'],
        description: 'Comprehensive testing of all corporate infrastructure components',
        configuration: {
          maxConcurrentEmployees: 3,
          timeout: 1800,
          retryAttempts: 3,
          memoryEnabled: false,
          priority: 'normal',
          notificationsEnabled: true,
          autoRestart: true,
          resourceLimits: {
            maxMemoryMB: 256,
            maxCpuPercent: 60,
          },
          employees: ['emp_006_qe', 'emp_007_te', 'emp_003_qd'],
          tags: ['testing', 'infrastructure', 'qa'],
          environmentVars: {},
        },
        templateId: 'template-test',
        executionHistory: [],
      },
    ];
  }

  private getMockTemplates(): WorkflowTemplate[] {
    return [
      {
        id: 'template-dev',
        name: 'Development Workflow',
        type: 'development',
        description: 'Standard development workflow with TDD approach',
        defaultEmployees: ['emp_004_sd', 'emp_002_tl', 'emp_006_qe'],
        defaultConfiguration: {
          maxConcurrentEmployees: 3,
          timeout: 3600,
          retryAttempts: 2,
          memoryEnabled: true,
          priority: 'normal',
          notificationsEnabled: true,
          autoRestart: false,
          resourceLimits: {
            maxMemoryMB: 512,
            maxCpuPercent: 80,
          },
          employees: ['emp_004_sd', 'emp_002_tl', 'emp_006_qe'],
          tags: ['development', 'tdd'],
          environmentVars: {},
        },
      },
      {
        id: 'template-test',
        name: 'Testing Workflow',
        type: 'testing',
        description: 'Comprehensive testing workflow for quality assurance',
        defaultEmployees: ['emp_006_qe', 'emp_007_te', 'emp_003_qd'],
        defaultConfiguration: {
          maxConcurrentEmployees: 3,
          timeout: 1800,
          retryAttempts: 3,
          memoryEnabled: false,
          priority: 'normal',
          notificationsEnabled: true,
          autoRestart: true,
          resourceLimits: {
            maxMemoryMB: 256,
            maxCpuPercent: 60,
          },
          employees: ['emp_006_qe', 'emp_007_te', 'emp_003_qd'],
          tags: ['testing', 'qa'],
          environmentVars: {},
        },
      },
      {
        id: 'template-deploy',
        name: 'Deployment Workflow',
        type: 'deployment',
        description: 'Production deployment with infrastructure validation',
        defaultEmployees: ['emp_008_do', 'emp_009_sre', 'emp_010_se'],
        defaultConfiguration: {
          maxConcurrentEmployees: 3,
          timeout: 2400,
          retryAttempts: 1,
          memoryEnabled: true,
          priority: 'high',
          notificationsEnabled: true,
          autoRestart: false,
          resourceLimits: {
            maxMemoryMB: 1024,
            maxCpuPercent: 90,
          },
          employees: ['emp_008_do', 'emp_009_sre', 'emp_010_se'],
          tags: ['deployment', 'production', 'infrastructure'],
          environmentVars: {},
        },
      },
    ];
  }

  private getMockMetrics(): WorkflowMetrics {
    return {
      totalWorkflows: 12,
      runningWorkflows: 2,
      completedWorkflows: 8,
      failedWorkflows: 2,
      averageExecutionTime: 2460, // seconds
      successRate: 80, // percentage
      activeEmployees: 6,
      totalMemoryOperations: 1247,
    };
  }
}

export const workflowService = new WorkflowService();