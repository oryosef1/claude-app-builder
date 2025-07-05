import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowManager, FileWatcherService, TaskItem } from '../../src/types/workflow';
import { ApiResponse, WorkflowControlRequest, TaskUpdateRequest } from '../../src/types/api';

// Mock API service for E2E testing
class MockApiService {
  private workflowManager: WorkflowManager;
  private fileWatcher: FileWatcherService;
  
  constructor(workflowManager: WorkflowManager, fileWatcher: FileWatcherService) {
    this.workflowManager = workflowManager;
    this.fileWatcher = fileWatcher;
  }
  
  async controlWorkflow(request: WorkflowControlRequest): Promise<ApiResponse> {
    try {
      switch (request.action) {
        case 'start':
          await this.workflowManager.start();
          break;
        case 'stop':
          await this.workflowManager.stop();
          break;
        case 'pause':
          await this.workflowManager.pause();
          break;
        case 'resume':
          await this.workflowManager.resume();
          break;
      }
      
      return {
        data: { action: request.action },
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async getWorkflowStatus(): Promise<ApiResponse> {
    const state = this.workflowManager.getState();
    return {
      data: {
        workflow: {
          id: state.id,
          status: state.status,
          currentPhase: state.currentPhase,
          startTime: state.startTime?.toISOString() || null,
          endTime: state.endTime?.toISOString() || null,
          output: state.output,
          error: state.error
        }
      },
      success: true
    };
  }
  
  async updateTask(request: TaskUpdateRequest): Promise<ApiResponse> {
    try {
      // Simulate updating task in todo.md
      const todoContent = await this.fileWatcher.readFile('todo.md');
      const updatedContent = todoContent.replace(
        new RegExp(`- \\[.\\] (.*)${request.id}(.*)`),
        `- [${request.status === 'completed' ? 'x' : ' '}] $1${request.id}$2`
      );
      
      await this.fileWatcher.writeFile('todo.md', updatedContent);
      
      return {
        data: { task: request },
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task'
      };
    }
  }
}

// Complete E2E workflow simulator
class WorkflowE2ESimulator {
  constructor(
    private apiService: MockApiService,
    private workflowManager: WorkflowManager,
    private fileWatcher: FileWatcherService
  ) {}
  
  async runCompleteWorkflow(): Promise<void> {
    // Initialize todo.md
    await this.fileWatcher.writeFile('todo.md', `
# Dashboard Development Plan
- [ ] Create Node.js backend service backend-service
- [ ] Implement WorkflowManager class workflow-manager
- [ ] Build process lifecycle management process-lifecycle
`);
    
    // Start workflow
    await this.apiService.controlWorkflow({ action: 'start' });
    
    // Simulate workflow phases
    await this.simulatePhase('test-writer');
    await this.simulatePhase('test-reviewer');
    await this.simulatePhase('developer');
    await this.simulatePhase('code-reviewer');
    await this.simulatePhase('coordinator');
    
    // Complete workflow
    await this.apiService.controlWorkflow({ action: 'stop' });
  }
  
  private async simulatePhase(phase: string): Promise<void> {
    // Simulate phase output
    await this.fileWatcher.writeFile('memory.md', `
## Current Phase: ${phase}
Working on ${phase} phase...
`);
    
    // Simulate task completion
    if (phase === 'coordinator') {
      await this.apiService.updateTask({
        id: 'backend-service',
        status: 'completed'
      });
    }
  }
}

// Mock implementations for E2E testing
class MockWorkflowManager implements WorkflowManager {
  private state = {
    id: 'e2e-workflow',
    status: 'idle' as const,
    currentPhase: null as any,
    startTime: null as Date | null,
    endTime: null as Date | null,
    output: [] as string[],
    error: null as string | null
  };
  
  private subscribers: ((state: any) => void)[] = [];
  
  async start(): Promise<void> {
    this.state = {
      ...this.state,
      status: 'running',
      currentPhase: 'test-writer',
      startTime: new Date()
    };
    this.notifySubscribers();
  }
  
  async stop(): Promise<void> {
    this.state = {
      ...this.state,
      status: 'idle',
      currentPhase: null,
      endTime: new Date()
    };
    this.notifySubscribers();
  }
  
  async pause(): Promise<void> {
    this.state = { ...this.state, status: 'paused' };
    this.notifySubscribers();
  }
  
  async resume(): Promise<void> {
    this.state = { ...this.state, status: 'running' };
    this.notifySubscribers();
  }
  
  getState(): any {
    return { ...this.state };
  }
  
  getOutput(): string[] {
    return [...this.state.output];
  }
  
  subscribe(callback: (state: any) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
  
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.getState()));
  }
}

class MockFileWatcherService implements FileWatcherService {
  private watchers: Map<string, (content: string) => void> = new Map();
  private fileContents: Map<string, string> = new Map();
  
  watchFile(filePath: string, callback: (content: string) => void): () => void {
    this.watchers.set(filePath, callback);
    return () => {
      this.watchers.delete(filePath);
    };
  }
  
  async readFile(filePath: string): Promise<string> {
    const content = this.fileContents.get(filePath);
    if (content === undefined) {
      throw new Error(`File not found: ${filePath}`);
    }
    return content;
  }
  
  async writeFile(filePath: string, content: string): Promise<void> {
    this.fileContents.set(filePath, content);
    const callback = this.watchers.get(filePath);
    if (callback) {
      callback(content);
    }
  }
}

describe('Workflow E2E Tests', () => {
  let workflowManager: MockWorkflowManager;
  let fileWatcher: MockFileWatcherService;
  let apiService: MockApiService;
  let simulator: WorkflowE2ESimulator;
  
  beforeEach(() => {
    workflowManager = new MockWorkflowManager();
    fileWatcher = new MockFileWatcherService();
    apiService = new MockApiService(workflowManager, fileWatcher);
    simulator = new WorkflowE2ESimulator(apiService, workflowManager, fileWatcher);
  });
  
  describe('complete workflow execution', () => {
    it('should execute complete workflow from start to finish', async () => {
      await simulator.runCompleteWorkflow();
      
      const statusResponse = await apiService.getWorkflowStatus();
      expect(statusResponse.success).toBe(true);
      expect(statusResponse.data.workflow.status).toBe('idle');
      expect(statusResponse.data.workflow.endTime).toBeTruthy();
    });
    
    it('should handle workflow interruption and resumption', async () => {
      // Start workflow
      await apiService.controlWorkflow({ action: 'start' });
      
      // Pause workflow
      await apiService.controlWorkflow({ action: 'pause' });
      let status = await apiService.getWorkflowStatus();
      expect(status.data.workflow.status).toBe('paused');
      
      // Resume workflow
      await apiService.controlWorkflow({ action: 'resume' });
      status = await apiService.getWorkflowStatus();
      expect(status.data.workflow.status).toBe('running');
      
      // Stop workflow
      await apiService.controlWorkflow({ action: 'stop' });
      status = await apiService.getWorkflowStatus();
      expect(status.data.workflow.status).toBe('idle');
    });
  });
  
  describe('task management throughout workflow', () => {
    it('should update tasks during workflow execution', async () => {
      // Initialize todo
      await fileWatcher.writeFile('todo.md', '- [ ] Test task test-task');
      
      // Update task
      const updateResponse = await apiService.updateTask({
        id: 'test-task',
        status: 'completed'
      });
      
      expect(updateResponse.success).toBe(true);
      
      // Verify task was updated
      const todoContent = await fileWatcher.readFile('todo.md');
      expect(todoContent).toContain('- [x] Test task test-task');
    });
    
    it('should handle task updates during active workflow', async () => {
      await apiService.controlWorkflow({ action: 'start' });
      
      // Update task while workflow is running
      await fileWatcher.writeFile('todo.md', '- [ ] Active task active-task');
      const updateResponse = await apiService.updateTask({
        id: 'active-task',
        status: 'in_progress'
      });
      
      expect(updateResponse.success).toBe(true);
      
      await apiService.controlWorkflow({ action: 'stop' });
    });
  });
  
  describe('file synchronization during workflow', () => {
    it('should maintain file synchronization throughout workflow', async () => {
      const memoryCallback = vi.fn();
      const todoCallback = vi.fn();
      
      fileWatcher.watchFile('memory.md', memoryCallback);
      fileWatcher.watchFile('todo.md', todoCallback);
      
      await simulator.runCompleteWorkflow();
      
      // Verify files were updated during workflow
      expect(memoryCallback).toHaveBeenCalled();
      expect(todoCallback).toHaveBeenCalled();
    });
    
    it('should handle concurrent file operations', async () => {
      await apiService.controlWorkflow({ action: 'start' });
      
      // Simulate concurrent file operations
      const promises = [
        fileWatcher.writeFile('memory.md', 'Memory update 1'),
        fileWatcher.writeFile('todo.md', 'Todo update 1'),
        fileWatcher.writeFile('memory.md', 'Memory update 2'),
        fileWatcher.writeFile('todo.md', 'Todo update 2')
      ];
      
      await Promise.all(promises);
      
      const memoryContent = await fileWatcher.readFile('memory.md');
      const todoContent = await fileWatcher.readFile('todo.md');
      
      expect(memoryContent).toBe('Memory update 2');
      expect(todoContent).toBe('Todo update 2');
      
      await apiService.controlWorkflow({ action: 'stop' });
    });
  });
  
  describe('error scenarios', () => {
    it('should handle API errors gracefully', async () => {
      // Force an error by trying to read non-existent file
      const response = await apiService.updateTask({
        id: 'non-existent-task',
        status: 'completed'
      });
      
      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });
    
    it('should recover from workflow failures', async () => {
      await apiService.controlWorkflow({ action: 'start' });
      
      // Even if there are issues, workflow should be stoppable
      const stopResponse = await apiService.controlWorkflow({ action: 'stop' });
      expect(stopResponse.success).toBe(true);
      
      const status = await apiService.getWorkflowStatus();
      expect(status.data.workflow.status).toBe('idle');
    });
  });
  
  describe('performance and reliability', () => {
    it('should handle rapid workflow state changes', async () => {
      const actions = ['start', 'pause', 'resume', 'stop'] as const;
      
      for (const action of actions) {
        const response = await apiService.controlWorkflow({ action });
        expect(response.success).toBe(true);
      }
      
      const finalStatus = await apiService.getWorkflowStatus();
      expect(finalStatus.data.workflow.status).toBe('idle');
    });
    
    it('should maintain consistency across multiple operations', async () => {
      // Execute multiple workflows sequentially
      for (let i = 0; i < 3; i++) {
        await apiService.controlWorkflow({ action: 'start' });
        await apiService.controlWorkflow({ action: 'stop' });
      }
      
      const status = await apiService.getWorkflowStatus();
      expect(status.success).toBe(true);
      expect(status.data.workflow.status).toBe('idle');
    });
  });
});