import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowOrchestrator } from '../../src/core/WorkflowOrchestrator.js';
import type { Task } from '../../src/types/index.js';

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;
  let mockRegistry: any;
  let mockProcessManager: any;
  let mockTaskQueue: any;
  let mockCommunication: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };

    mockRegistry = {
      getEmployeesBySkills: vi.fn(() => [
        { id: 'emp_001', name: 'Alice', skills: ['coding'], status: 'active', workload: 30 },
        { id: 'emp_002', name: 'Bob', skills: ['testing'], status: 'active', workload: 40 },
        { id: 'emp_003', name: 'Charlie', skills: ['project_management'], status: 'active', workload: 20 }
      ])
    };

    mockProcessManager = {
      on: vi.fn()
    };

    mockTaskQueue = {
      addTask: vi.fn().mockResolvedValue('task-id'),
      assignTask: vi.fn().mockResolvedValue(undefined),
      updateTaskStatus: vi.fn().mockResolvedValue(undefined),
      on: vi.fn()
    };

    mockCommunication = {
      findExperts: vi.fn().mockResolvedValue([
        { id: 'emp_001', name: 'Alice', skills: ['coding'] }
      ]),
      sendMessage: vi.fn().mockResolvedValue('msg-id'),
      createCollaboration: vi.fn().mockResolvedValue('collab-id')
    };

    orchestrator = new WorkflowOrchestrator(
      mockRegistry,
      mockProcessManager,
      mockTaskQueue,
      mockCommunication,
      mockLogger
    );
  });

  describe('Template Management', () => {
    it('should initialize with default templates', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Initialized 2 workflow templates')
      );
    });

    it('should add custom template', () => {
      const templateAddedHandler = vi.fn();
      orchestrator.on('template-added', templateAddedHandler);

      orchestrator.addTemplate({
        id: 'custom-template',
        name: 'Custom Workflow',
        description: 'Custom workflow template',
        type: 'custom',
        steps: [
          {
            name: 'Step 1',
            description: 'First step',
            requiredSkills: ['coding'],
            dependencies: []
          }
        ]
      });

      expect(templateAddedHandler).toHaveBeenCalled();
    });
  });

  describe('Workflow Creation', () => {
    it('should create workflow from template', async () => {
      const workflowCreatedHandler = vi.fn();
      orchestrator.on('workflow-created', workflowCreatedHandler);

      const workflowId = await orchestrator.createWorkflow(
        'feature-dev',
        'New Feature X',
        'Implement feature X',
        { priority: 'high' }
      );

      expect(workflowId).toBeDefined();
      expect(workflowCreatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Feature X',
          status: 'draft',
          type: 'sequential'
        })
      );
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        orchestrator.createWorkflow('non-existent', 'Test')
      ).rejects.toThrow('Template non-existent not found');
    });

    it('should create workflow with unique step IDs', async () => {
      const workflowId = await orchestrator.createWorkflow(
        'bug-fix',
        'Fix Bug #123'
      );

      const workflow = orchestrator.getWorkflow(workflowId);
      const stepIds = workflow?.steps.map(s => s.id) || [];
      const uniqueIds = new Set(stepIds);
      
      expect(uniqueIds.size).toBe(stepIds.length);
    });
  });

  describe('Workflow Execution', () => {
    it('should start workflow and assign initial steps', async () => {
      const workflowStartedHandler = vi.fn();
      orchestrator.on('workflow-started', workflowStartedHandler);

      const workflowId = await orchestrator.createWorkflow(
        'bug-fix',
        'Fix Critical Bug'
      );

      await orchestrator.startWorkflow(workflowId);

      expect(workflowStartedHandler).toHaveBeenCalled();
      expect(mockTaskQueue.addTask).toHaveBeenCalled();
      expect(mockTaskQueue.assignTask).toHaveBeenCalled();
    });

    it('should throw error when starting non-draft workflow', async () => {
      const workflowId = await orchestrator.createWorkflow(
        'bug-fix',
        'Test Workflow'
      );

      await orchestrator.startWorkflow(workflowId);

      await expect(
        orchestrator.startWorkflow(workflowId)
      ).rejects.toThrow('is not in draft status');
    });

    it('should throw error for non-existent workflow', async () => {
      await expect(
        orchestrator.startWorkflow('non-existent-id')
      ).rejects.toThrow('Workflow non-existent-id not found');
    });
  });

  describe('Step Assignment', () => {
    it('should assign steps based on skills', async () => {
      const stepAssignedHandler = vi.fn();
      orchestrator.on('step-assigned', stepAssignedHandler);

      const workflowId = await orchestrator.createWorkflow(
        'feature-dev',
        'New Feature'
      );

      await orchestrator.startWorkflow(workflowId);

      expect(stepAssignedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          employee: expect.objectContaining({ id: 'emp_001' })
        })
      );
    });

    it('should handle no suitable employee found', async () => {
      mockCommunication.findExperts.mockResolvedValueOnce([]);
      mockRegistry.getEmployeesBySkills.mockReturnValueOnce([]);

      const workflowId = await orchestrator.createWorkflow(
        'bug-fix',
        'Fix Bug'
      );

      await orchestrator.startWorkflow(workflowId);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('No suitable employee found')
      );
    });

    it('should notify assigned employee', async () => {
      const workflowId = await orchestrator.createWorkflow(
        'bug-fix',
        'Fix Bug'
      );

      await orchestrator.startWorkflow(workflowId);

      expect(mockCommunication.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'emp_001',
          type: 'notification',
          topic: 'workflow-step-assigned'
        })
      );
    });
  });

  describe('Step Completion', () => {
    it('should handle step completion and assign dependent steps', async () => {
      const stepCompletedHandler = vi.fn();
      orchestrator.on('step-completed', stepCompletedHandler);

      const workflowId = await orchestrator.createWorkflow(
        'feature-dev',
        'New Feature'
      );

      await orchestrator.startWorkflow(workflowId);

      // Get the task completed handler
      const taskCompletedHandler = mockTaskQueue.on.mock.calls.find(
        call => call[0] === 'task-completed'
      )?.[1];

      // Simulate completion of first step
      const workflow = orchestrator.getWorkflow(workflowId);
      const firstStep = workflow?.steps[0];
      
      if (taskCompletedHandler && firstStep) {
        const task: Task = {
          id: firstStep.id,
          title: 'Test Task',
          description: 'Test',
          priority: 'medium',
          skillsRequired: [],
          status: 'completed',
          createdAt: new Date()
        };
        taskCompletedHandler(task);
      }

      expect(stepCompletedHandler).toHaveBeenCalled();
    });

    it('should mark workflow as completed when all steps done', async () => {
      const workflowCompletedHandler = vi.fn();
      orchestrator.on('workflow-completed', workflowCompletedHandler);

      const workflowId = await orchestrator.createWorkflow(
        'bug-fix',
        'Simple Bug Fix'
      );

      const workflow = orchestrator.getWorkflow(workflowId);
      
      // Mark all steps as completed
      if (workflow) {
        workflow.steps.forEach(step => {
          step.status = 'completed';
        });
      }

      // Trigger completion check via task completion
      const taskCompletedHandler = mockTaskQueue.on.mock.calls.find(
        call => call[0] === 'task-completed'
      )?.[1];

      if (taskCompletedHandler && workflow?.steps[0]) {
        const task: Task = {
          id: workflow.steps[0].id,
          title: 'Test',
          description: 'Test',
          priority: 'medium',
          skillsRequired: [],
          status: 'completed',
          createdAt: new Date()
        };
        taskCompletedHandler(task);
      }

      expect(workflowCompletedHandler).toHaveBeenCalled();
    });
  });

  describe('Step Failure', () => {
    it('should handle step failure and create collaboration', async () => {
      const stepFailedHandler = vi.fn();
      orchestrator.on('step-failed', stepFailedHandler);

      const workflowId = await orchestrator.createWorkflow(
        'bug-fix',
        'Critical Fix'
      );

      await orchestrator.startWorkflow(workflowId);

      // Get the task failed handler
      const taskFailedHandler = mockTaskQueue.on.mock.calls.find(
        call => call[0] === 'task-failed'
      )?.[1];

      // Simulate task failure
      const workflow = orchestrator.getWorkflow(workflowId);
      const firstStep = workflow?.steps[0];
      
      if (taskFailedHandler && firstStep) {
        firstStep.assignedTo = 'emp_001';
        const task: Task = {
          id: firstStep.id,
          title: 'Test Task',
          description: 'Test',
          priority: 'high',
          skillsRequired: [],
          status: 'failed',
          createdAt: new Date()
        };
        taskFailedHandler(task);
      }

      expect(stepFailedHandler).toHaveBeenCalled();
      expect(mockCommunication.createCollaboration).toHaveBeenCalledWith(
        'emp_001',
        expect.any(Array),
        expect.stringContaining('Help needed'),
        expect.any(String),
        expect.any(Date)
      );
    });
  });

  describe('Workflow Queries', () => {
    it('should get active workflows', async () => {
      const workflowId1 = await orchestrator.createWorkflow('bug-fix', 'Bug 1');
      const workflowId2 = await orchestrator.createWorkflow('bug-fix', 'Bug 2');
      
      await orchestrator.startWorkflow(workflowId1);

      const activeWorkflows = orchestrator.getActiveWorkflows();
      expect(activeWorkflows).toHaveLength(1);
      expect(activeWorkflows[0]?.id).toBe(workflowId1);
    });

    it('should get workflows by employee', async () => {
      const workflowId = await orchestrator.createWorkflow('bug-fix', 'Bug Fix');
      await orchestrator.startWorkflow(workflowId);

      const workflows = orchestrator.getWorkflowsByEmployee('emp_001');
      expect(workflows).toHaveLength(1);
    });
  });

  describe('Workflow Cancellation', () => {
    it('should cancel workflow and update tasks', async () => {
      const workflowCancelledHandler = vi.fn();
      orchestrator.on('workflow-cancelled', workflowCancelledHandler);

      const workflowId = await orchestrator.createWorkflow('feature-dev', 'Feature');
      await orchestrator.startWorkflow(workflowId);

      await orchestrator.cancelWorkflow(workflowId, 'Requirements changed');

      expect(workflowCancelledHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'Requirements changed'
        })
      );
      expect(mockTaskQueue.updateTaskStatus).toHaveBeenCalledWith(
        expect.any(String),
        'cancelled'
      );
    });

    it('should throw error for non-existent workflow', async () => {
      await expect(
        orchestrator.cancelWorkflow('non-existent')
      ).rejects.toThrow('Workflow non-existent not found');
    });
  });

  describe('Metrics', () => {
    it('should calculate workflow metrics', async () => {
      // Create and complete a workflow
      const workflowId = await orchestrator.createWorkflow('bug-fix', 'Bug');
      const workflow = orchestrator.getWorkflow(workflowId);
      
      if (workflow) {
        workflow.status = 'completed';
        workflow.steps.forEach(step => {
          step.status = 'completed';
          step.startedAt = new Date(Date.now() - 3600000);
          step.completedAt = new Date();
        });
      }

      const metrics = orchestrator.getMetrics();
      
      expect(metrics.totalWorkflows).toBe(1);
      expect(metrics.completedWorkflows).toBe(1);
      expect(metrics.activeWorkflows).toBe(0);
      expect(metrics.stepSuccessRate).toBeGreaterThan(0);
    });
  });
});