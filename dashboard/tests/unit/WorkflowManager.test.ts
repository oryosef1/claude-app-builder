import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowManager, WorkflowState } from '../../src/types/workflow';

class MockWorkflowManager implements WorkflowManager {
  private state: WorkflowState = {
    id: 'test-workflow',
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
    this.state = {
      ...this.state,
      status: 'paused'
    };
    this.notifySubscribers();
  }
  
  async resume(): Promise<void> {
    this.state = {
      ...this.state,
      status: 'running'
    };
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
  
  // Test helper methods
  setOutput(output: string[]): void {
    this.state.output = [...output];
    this.notifySubscribers();
  }
  
  setError(error: string | null): void {
    this.state.error = error;
    this.notifySubscribers();
  }
  
  setPhase(phase: WorkflowState['currentPhase']): void {
    this.state.currentPhase = phase;
    this.notifySubscribers();
  }
}

describe('WorkflowManager', () => {
  let manager: MockWorkflowManager;
  
  beforeEach(() => {
    manager = new MockWorkflowManager();
  });
  
  describe('start', () => {
    it('should change status to running', async () => {
      await manager.start();
      const state = manager.getState();
      expect(state.status).toBe('running');
    });
    
    it('should set current phase to test-writer', async () => {
      await manager.start();
      const state = manager.getState();
      expect(state.currentPhase).toBe('test-writer');
    });
    
    it('should set start time', async () => {
      await manager.start();
      const state = manager.getState();
      expect(state.startTime).toBeInstanceOf(Date);
    });
    
    it('should notify subscribers', async () => {
      const callback = vi.fn();
      manager.subscribe(callback);
      
      await manager.start();
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'running' })
      );
    });
  });
  
  describe('stop', () => {
    it('should change status to idle', async () => {
      await manager.start();
      await manager.stop();
      const state = manager.getState();
      expect(state.status).toBe('idle');
    });
    
    it('should clear current phase', async () => {
      await manager.start();
      await manager.stop();
      const state = manager.getState();
      expect(state.currentPhase).toBeNull();
    });
    
    it('should set end time', async () => {
      await manager.start();
      await manager.stop();
      const state = manager.getState();
      expect(state.endTime).toBeInstanceOf(Date);
    });
  });
  
  describe('pause', () => {
    it('should change status to paused', async () => {
      await manager.start();
      await manager.pause();
      const state = manager.getState();
      expect(state.status).toBe('paused');
    });
    
    it('should maintain current phase', async () => {
      await manager.start();
      await manager.pause();
      const state = manager.getState();
      expect(state.currentPhase).toBe('test-writer');
    });
  });
  
  describe('resume', () => {
    it('should change status to running', async () => {
      await manager.start();
      await manager.pause();
      await manager.resume();
      const state = manager.getState();
      expect(state.status).toBe('running');
    });
  });
  
  describe('getState', () => {
    it('should return current state', () => {
      const state = manager.getState();
      expect(state).toEqual({
        id: 'test-workflow',
        status: 'idle',
        currentPhase: null,
        startTime: null,
        endTime: null,
        output: [],
        error: null
      });
    });
    
    it('should return a copy of state', () => {
      const state1 = manager.getState();
      const state2 = manager.getState();
      expect(state1).not.toBe(state2);
    });
  });
  
  describe('getOutput', () => {
    it('should return empty array initially', () => {
      const output = manager.getOutput();
      expect(output).toEqual([]);
    });
    
    it('should return output lines', () => {
      const testOutput = ['line 1', 'line 2'];
      manager.setOutput(testOutput);
      const output = manager.getOutput();
      expect(output).toEqual(testOutput);
    });
    
    it('should return a copy of output', () => {
      const testOutput = ['line 1'];
      manager.setOutput(testOutput);
      const output = manager.getOutput();
      expect(output).not.toBe(testOutput);
    });
  });
  
  describe('subscribe', () => {
    it('should call callback on state changes', async () => {
      const callback = vi.fn();
      manager.subscribe(callback);
      
      await manager.start();
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'running' })
      );
    });
    
    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = manager.subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
    });
    
    it('should stop calling callback after unsubscribe', async () => {
      const callback = vi.fn();
      const unsubscribe = manager.subscribe(callback);
      
      unsubscribe();
      await manager.start();
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});