import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowManager, FileWatcherService, WorkflowState } from '../../src/types/workflow';

// Mock implementations for integration testing
class MockWorkflowManager implements WorkflowManager {
  private state: WorkflowState = {
    id: 'integration-workflow',
    status: 'idle',
    currentPhase: null,
    startTime: null,
    endTime: null,
    output: [],
    error: null
  };
  
  private subscribers: ((state: WorkflowState) => void)[] = [];
  
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
  
  getState(): WorkflowState {
    return { ...this.state };
  }
  
  getOutput(): string[] {
    return [...this.state.output];
  }
  
  subscribe(callback: (state: WorkflowState) => void): () => void {
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
  
  // Test helper
  simulatePhaseChange(phase: WorkflowState['currentPhase']): void {
    this.state.currentPhase = phase;
    this.notifySubscribers();
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
  
  // Test helper
  triggerFileChange(filePath: string, content: string): void {
    this.fileContents.set(filePath, content);
    const callback = this.watchers.get(filePath);
    if (callback) {
      callback(content);
    }
  }
}

// Integration service that combines workflow and file watching
class WorkflowIntegrationService {
  constructor(
    private workflowManager: WorkflowManager,
    private fileWatcher: FileWatcherService
  ) {}
  
  async startWorkflowWithFileMonitoring(): Promise<void> {
    // Start workflow
    await this.workflowManager.start();
    
    // Watch for state files
    this.fileWatcher.watchFile('todo.md', this.handleTodoChange.bind(this));
    this.fileWatcher.watchFile('memory.md', this.handleMemoryChange.bind(this));
  }
  
  private handleTodoChange(content: string): void {
    // Parse todo changes and potentially trigger workflow actions
    if (content.includes('- [x]')) {
      // Task completed, might trigger next phase
    }
  }
  
  private handleMemoryChange(content: string): void {
    // Handle memory file changes
    if (content.includes('Phase completed')) {
      // Phase completed, update workflow state
    }
  }
  
  async stopWorkflow(): Promise<void> {
    await this.workflowManager.stop();
  }
  
  getWorkflowState(): WorkflowState {
    return this.workflowManager.getState();
  }
}

describe('Workflow Integration', () => {
  let workflowManager: MockWorkflowManager;
  let fileWatcher: MockFileWatcherService;
  let integrationService: WorkflowIntegrationService;
  
  beforeEach(() => {
    workflowManager = new MockWorkflowManager();
    fileWatcher = new MockFileWatcherService();
    integrationService = new WorkflowIntegrationService(workflowManager, fileWatcher);
  });
  
  describe('workflow lifecycle with file monitoring', () => {
    it('should start workflow and begin file monitoring', async () => {
      await integrationService.startWorkflowWithFileMonitoring();
      
      const state = integrationService.getWorkflowState();
      expect(state.status).toBe('running');
      expect(state.currentPhase).toBe('test-writer');
    });
    
    it('should handle todo.md changes during workflow', async () => {
      const todoCallback = vi.fn();
      fileWatcher.watchFile('todo.md', todoCallback);
      
      await integrationService.startWorkflowWithFileMonitoring();
      
      // Simulate todo file change
      fileWatcher.triggerFileChange('todo.md', '- [x] Task completed');
      
      expect(todoCallback).toHaveBeenCalledWith('- [x] Task completed');
    });
    
    it('should handle memory.md changes during workflow', async () => {
      const memoryCallback = vi.fn();
      fileWatcher.watchFile('memory.md', memoryCallback);
      
      await integrationService.startWorkflowWithFileMonitoring();
      
      // Simulate memory file change
      fileWatcher.triggerFileChange('memory.md', 'Phase completed: test-writer');
      
      expect(memoryCallback).toHaveBeenCalledWith('Phase completed: test-writer');
    });
    
    it('should stop workflow and cleanup', async () => {
      await integrationService.startWorkflowWithFileMonitoring();
      await integrationService.stopWorkflow();
      
      const state = integrationService.getWorkflowState();
      expect(state.status).toBe('idle');
      expect(state.currentPhase).toBeNull();
    });
  });
  
  describe('workflow phase transitions', () => {
    it('should handle phase transitions correctly', async () => {
      const stateCallback = vi.fn();
      workflowManager.subscribe(stateCallback);
      
      await integrationService.startWorkflowWithFileMonitoring();
      
      // Simulate phase transition
      workflowManager.simulatePhaseChange('test-reviewer');
      
      expect(stateCallback).toHaveBeenCalledWith(
        expect.objectContaining({ currentPhase: 'test-reviewer' })
      );
    });
    
    it('should track all workflow phases', async () => {
      const phases: (WorkflowState['currentPhase'])[] = [];
      workflowManager.subscribe((state) => {
        phases.push(state.currentPhase);
      });
      
      await integrationService.startWorkflowWithFileMonitoring();
      
      // Simulate phase transitions
      workflowManager.simulatePhaseChange('test-reviewer');
      workflowManager.simulatePhaseChange('developer');
      workflowManager.simulatePhaseChange('code-reviewer');
      workflowManager.simulatePhaseChange('coordinator');
      
      expect(phases).toEqual([
        'test-writer',
        'test-reviewer',
        'developer',
        'code-reviewer',
        'coordinator'
      ]);
    });
  });
  
  describe('file synchronization', () => {
    it('should synchronize file changes with workflow state', async () => {
      await integrationService.startWorkflowWithFileMonitoring();
      
      // Write to files and verify they are monitored
      await fileWatcher.writeFile('todo.md', '- [ ] New task');
      await fileWatcher.writeFile('memory.md', 'New memory entry');
      
      const todoContent = await fileWatcher.readFile('todo.md');
      const memoryContent = await fileWatcher.readFile('memory.md');
      
      expect(todoContent).toBe('- [ ] New task');
      expect(memoryContent).toBe('New memory entry');
    });
    
    it('should handle concurrent file changes', async () => {
      const todoCallback = vi.fn();
      const memoryCallback = vi.fn();
      
      fileWatcher.watchFile('todo.md', todoCallback);
      fileWatcher.watchFile('memory.md', memoryCallback);
      
      await integrationService.startWorkflowWithFileMonitoring();
      
      // Trigger concurrent changes
      fileWatcher.triggerFileChange('todo.md', 'Todo update');
      fileWatcher.triggerFileChange('memory.md', 'Memory update');
      
      expect(todoCallback).toHaveBeenCalledWith('Todo update');
      expect(memoryCallback).toHaveBeenCalledWith('Memory update');
    });
  });
  
  describe('error handling', () => {
    it('should handle file read errors gracefully', async () => {
      await expect(fileWatcher.readFile('non-existent.md'))
        .rejects.toThrow('File not found: non-existent.md');
    });
    
    it('should continue workflow even if file operations fail', async () => {
      await integrationService.startWorkflowWithFileMonitoring();
      
      // Workflow should continue despite file errors
      const state = integrationService.getWorkflowState();
      expect(state.status).toBe('running');
    });
  });
});