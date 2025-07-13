import { EventEmitter } from 'events';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { AgentRegistry } from './AgentRegistry.js';
import { ProcessManager } from './ProcessManager.js';
import { TaskQueue } from './TaskQueue.js';
import { AgentCommunication } from './AgentCommunication.js';
import type { Task, AIEmployee } from '../types/index.js';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  assignedTo?: string; // Employee ID
  requiredSkills: string[];
  dependencies: string[]; // Step IDs that must complete first
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: 'sequential' | 'parallel' | 'mixed';
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'completed' | 'failed' | 'cancelled';
  created: Date;
  updated: Date;
  metadata?: Record<string, any>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: string; // e.g., 'feature-development', 'bug-fix', 'code-review'
  steps: Omit<WorkflowStep, 'id' | 'status' | 'assignedTo'>[];
}

export class WorkflowOrchestrator extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private stepToWorkflow: Map<string, string> = new Map(); // Step ID -> Workflow ID
  
  constructor(
    private registry: AgentRegistry,
    private processManager: ProcessManager,
    private taskQueue: TaskQueue,
    private communication: AgentCommunication,
    private logger: winston.Logger
  ) {
    super();
    this.initializeTemplates();
    this.setupEventHandlers();
  }

  private initializeTemplates(): void {
    // Feature Development Template
    this.addTemplate({
      id: 'feature-dev',
      name: 'Feature Development',
      description: 'Standard feature development workflow',
      type: 'feature-development',
      steps: [
        {
          name: 'Requirements Analysis',
          description: 'Analyze and document feature requirements',
          requiredSkills: ['project_management', 'technical_analysis'],
          dependencies: []
        },
        {
          name: 'Technical Design',
          description: 'Create technical design and architecture',
          requiredSkills: ['system_architecture', 'design_patterns'],
          dependencies: ['Requirements Analysis']
        },
        {
          name: 'Implementation',
          description: 'Implement the feature',
          requiredSkills: ['coding', 'feature_implementation'],
          dependencies: ['Technical Design']
        },
        {
          name: 'Unit Testing',
          description: 'Write and run unit tests',
          requiredSkills: ['testing', 'test_automation'],
          dependencies: ['Implementation']
        },
        {
          name: 'Code Review',
          description: 'Review code quality and standards',
          requiredSkills: ['code_review', 'quality_assurance'],
          dependencies: ['Unit Testing']
        },
        {
          name: 'Integration Testing',
          description: 'Test integration with existing system',
          requiredSkills: ['integration_testing', 'system_testing'],
          dependencies: ['Code Review']
        },
        {
          name: 'Documentation',
          description: 'Update documentation and user guides',
          requiredSkills: ['documentation', 'technical_writing'],
          dependencies: ['Integration Testing']
        }
      ]
    });

    // Bug Fix Template
    this.addTemplate({
      id: 'bug-fix',
      name: 'Bug Fix',
      description: 'Standard bug fix workflow',
      type: 'bug-fix',
      steps: [
        {
          name: 'Bug Analysis',
          description: 'Analyze and reproduce the bug',
          requiredSkills: ['debugging', 'problem_solving'],
          dependencies: []
        },
        {
          name: 'Root Cause Analysis',
          description: 'Identify the root cause',
          requiredSkills: ['debugging', 'system_analysis'],
          dependencies: ['Bug Analysis']
        },
        {
          name: 'Fix Implementation',
          description: 'Implement the bug fix',
          requiredSkills: ['coding', 'bug_fixing'],
          dependencies: ['Root Cause Analysis']
        },
        {
          name: 'Testing',
          description: 'Test the fix and regression testing',
          requiredSkills: ['testing', 'quality_assurance'],
          dependencies: ['Fix Implementation']
        },
        {
          name: 'Review',
          description: 'Code review and approval',
          requiredSkills: ['code_review', 'quality_standards'],
          dependencies: ['Testing']
        }
      ]
    });

    this.logger.info(`Initialized ${this.templates.size} workflow templates`);
  }

  private setupEventHandlers(): void {
    // Listen for task completions
    this.taskQueue.on('task-completed', (task: Task) => {
      const workflowId = this.stepToWorkflow.get(task.id);
      if (workflowId) {
        this.handleStepCompletion(workflowId, task.id);
      }
    });

    // Listen for task failures
    this.taskQueue.on('task-failed', (task: Task) => {
      const workflowId = this.stepToWorkflow.get(task.id);
      if (workflowId) {
        this.handleStepFailure(workflowId, task.id);
      }
    });
  }

  // Add a workflow template
  addTemplate(template: WorkflowTemplate): void {
    this.templates.set(template.id, template);
    this.emit('template-added', template);
  }

  // Create a workflow from template
  async createWorkflow(
    templateId: string,
    name: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const workflowId = uuidv4();
    const steps: WorkflowStep[] = template.steps.map(step => ({
      ...step,
      id: uuidv4(),
      status: 'pending'
    }));

    const workflow: Workflow = {
      id: workflowId,
      name,
      description: description || template.description,
      type: 'sequential', // Default, can be overridden
      steps,
      status: 'draft',
      created: new Date(),
      updated: new Date(),
      metadata
    };

    this.workflows.set(workflowId, workflow);
    
    // Map steps to workflow
    steps.forEach(step => {
      this.stepToWorkflow.set(step.id, workflowId);
    });

    this.emit('workflow-created', workflow);
    return workflowId;
  }

  // Start a workflow
  async startWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'draft') {
      throw new Error(`Workflow ${workflowId} is not in draft status`);
    }

    workflow.status = 'active';
    workflow.updated = new Date();

    // Start initial steps (those with no dependencies)
    const initialSteps = workflow.steps.filter(step => 
      step.dependencies.length === 0
    );

    await Promise.all(initialSteps.map(step => 
      this.assignStep(workflowId, step.id)
    ));

    this.emit('workflow-started', workflow);
  }

  // Assign a workflow step to an employee
  private async assignStep(workflowId: string, stepId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    const step = workflow?.steps.find(s => s.id === stepId);
    
    if (!workflow || !step) {
      throw new Error(`Step ${stepId} not found in workflow ${workflowId}`);
    }

    // Find best employee for the step
    const employee = await this.findBestEmployee(step.requiredSkills);
    if (!employee) {
      this.logger.error(`No suitable employee found for step ${step.name}`);
      step.status = 'failed';
      return;
    }

    // Create task for the step
    const taskId = await this.taskQueue.addTask({
      id: stepId, // Use step ID as task ID
      title: `${workflow.name}: ${step.name}`,
      description: step.description,
      priority: 'medium',
      status: 'pending',
      skillsRequired: step.requiredSkills,
      createdAt: new Date(),
      estimatedDuration: 30,
      retryCount: 0,
      maxRetries: 3,
      comments: [],
      metadata: {
        workflowId,
        stepId,
        workflowType: workflow.type
      }
    });

    // Assign to employee
    await this.taskQueue.assignTask(taskId, employee.id);
    
    step.assignedTo = employee.id;
    step.status = 'assigned';
    step.startedAt = new Date();

    // Notify via communication system
    await this.communication.sendMessage({
      from: 'workflow-orchestrator',
      to: employee.id,
      type: 'notification',
      topic: 'workflow-step-assigned',
      content: {
        workflowId,
        workflowName: workflow.name,
        stepName: step.name,
        description: step.description
      },
      priority: 'high'
    });

    this.emit('step-assigned', { workflow, step, employee });
  }

  // Find best employee for required skills
  private async findBestEmployee(requiredSkills: string[]): Promise<AIEmployee | null> {
    const experts = await this.communication.findExperts('workflow-task', requiredSkills);
    
    if (experts.length === 0) {
      // Fallback to basic skill matching
      const employees = this.registry.getEmployeesBySkill(requiredSkills[0] || '');
      const available = employees.filter((e: any) => 
        e.status === 'active' && e.workload < 80
      );
      
      return available.length > 0 ? (available[0] as unknown as AIEmployee) : null;
    }

    return experts[0] || null;
  }

  // Handle step completion
  private async handleStepCompletion(workflowId: string, stepId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    const step = workflow?.steps.find(s => s.id === stepId);
    
    if (!workflow || !step) return;

    step.status = 'completed';
    step.completedAt = new Date();

    // Check for dependent steps that can now start
    const dependentSteps = workflow.steps.filter(s => 
      s.status === 'pending' && 
      s.dependencies.includes(step.name) &&
      s.dependencies.every(dep => {
        const depStep = workflow.steps.find(st => st.name === dep);
        return depStep?.status === 'completed';
      })
    );

    // Assign dependent steps
    await Promise.all(dependentSteps.map(depStep => 
      this.assignStep(workflowId, depStep.id)
    ));

    // Check if workflow is complete
    const allCompleted = workflow.steps.every(s => s.status === 'completed');
    if (allCompleted) {
      workflow.status = 'completed';
      workflow.updated = new Date();
      this.emit('workflow-completed', workflow);
    }

    this.emit('step-completed', { workflow, step });
  }

  // Handle step failure
  private async handleStepFailure(workflowId: string, stepId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    const step = workflow?.steps.find(s => s.id === stepId);
    
    if (!workflow || !step) return;

    step.status = 'failed';

    // Create collaboration request for help
    if (step.assignedTo) {
      const experts = await this.communication.findExperts(
        'troubleshooting', 
        step.requiredSkills
      );

      if (experts.length > 0) {
        await this.communication.createCollaboration(
          step.assignedTo,
          experts.map(e => e.id),
          `Help needed: ${step.name}`,
          `Step failed in workflow ${workflow.name}. Need assistance to resolve.`,
          new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hour deadline
        );
      }
    }

    this.emit('step-failed', { workflow, step });
  }

  // Get workflow status
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  // Get active workflows
  getActiveWorkflows(): Workflow[] {
    return Array.from(this.workflows.values()).filter(w => 
      w.status === 'active'
    );
  }

  // Get workflows by employee
  getWorkflowsByEmployee(employeeId: string): Workflow[] {
    return Array.from(this.workflows.values()).filter(w => 
      w.steps.some(s => s.assignedTo === employeeId)
    );
  }

  // Cancel a workflow
  async cancelWorkflow(workflowId: string, reason?: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = 'cancelled';
    workflow.updated = new Date();

    // Cancel all pending/assigned tasks
    const activeTasks = workflow.steps.filter(s => 
      s.status === 'assigned' || s.status === 'in_progress'
    );

    await Promise.all(activeTasks.map(step => 
      this.taskQueue.updateTaskStatus(step.id, 'cancelled')
    ));

    this.emit('workflow-cancelled', { workflow, reason });
  }

  // Get workflow metrics
  getMetrics(): {
    totalWorkflows: number;
    activeWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    averageCompletionTime: number;
    stepSuccessRate: number;
  } {
    const workflows = Array.from(this.workflows.values());
    const completed = workflows.filter(w => w.status === 'completed');
    
    let totalSteps = 0;
    let completedSteps = 0;
    let totalCompletionTime = 0;

    workflows.forEach(w => {
      w.steps.forEach(s => {
        totalSteps++;
        if (s.status === 'completed') {
          completedSteps++;
          if (s.startedAt && s.completedAt) {
            totalCompletionTime += s.completedAt.getTime() - s.startedAt.getTime();
          }
        }
      });
    });

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w => w.status === 'active').length,
      completedWorkflows: completed.length,
      failedWorkflows: workflows.filter(w => w.status === 'failed').length,
      averageCompletionTime: completedSteps > 0 ? totalCompletionTime / completedSteps : 0,
      stepSuccessRate: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
    };
  }
}