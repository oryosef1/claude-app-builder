import { WorkflowManagerInterface, WorkflowState } from '../types/workflow';

export class WorkflowManager implements WorkflowManagerInterface {
  private state: WorkflowState;
  private subscribers: Array<(state: WorkflowState) => void> = [];
  private process: any = null;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      phase: 'idle',
      status: 'stopped',
      progress: 0,
      output: []
    };
  }

  async startWorkflow(): Promise<void> {
    if (this.state.status === 'running') {
      throw new Error('Workflow is already running');
    }

    this.updateState({
      status: 'running',
      startTime: new Date(),
      progress: 0,
      phase: 'test-writer'
    });

    // Simulate progress updates
    this.intervalId = setInterval(() => {
      if (this.state.status === 'running') {
        const newProgress = Math.min(this.state.progress + 10, 100);
        const phases: Array<'test-writer' | 'test-reviewer' | 'developer' | 'code-reviewer' | 'coordinator'> = 
          ['test-writer', 'test-reviewer', 'developer', 'code-reviewer', 'coordinator'];
        const currentPhaseIndex = Math.floor(newProgress / 20);
        
        this.updateState({
          progress: newProgress,
          phase: phases[currentPhaseIndex] || 'coordinator',
          output: [...this.state.output, `Progress: ${newProgress}%`]
        });

        if (newProgress >= 100) {
          this.updateState({ status: 'completed' });
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
        }
      }
    }, 50);
  }

  async stopWorkflow(): Promise<void> {
    if (this.state.status !== 'running' && this.state.status !== 'paused') {
      throw new Error('Workflow is not running');
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.updateState({
      status: 'stopped',
      endTime: new Date()
    });
  }

  async pauseWorkflow(): Promise<void> {
    if (this.state.status !== 'running') {
      throw new Error('Workflow is not running');
    }

    this.updateState({ status: 'paused' });
  }

  async resumeWorkflow(): Promise<void> {
    if (this.state.status !== 'paused') {
      throw new Error('Workflow is not paused');
    }

    this.updateState({ status: 'running' });
  }

  getState(): WorkflowState {
    return { ...this.state };
  }

  async cleanup(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.process) {
      try {
        process.kill(this.process.pid);
      } catch (error) {
        // Process already terminated
      }
      this.process = null;
    }

    this.updateState({ status: 'stopped' });
    this.subscribers.length = 0;
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
    this.subscribers.forEach(callback => {
      try {
        callback(this.getState());
      } catch (error) {
        console.error('Error in workflow state subscriber:', error);
      }
    });
  }

  protected updateState(updates: Partial<WorkflowState>): void {
    this.state = { ...this.state, ...updates };
    this.notifySubscribers();
  }
}