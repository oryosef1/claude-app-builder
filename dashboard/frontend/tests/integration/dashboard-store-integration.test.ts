import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDashboardStore } from '@/stores/dashboard';

describe('Dashboard Store Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });
  
  describe('Agent Management', () => {
    it('should manage agents in store', () => {
      const store = useDashboardStore();
      
      // Add agents
      store.agents = [
        { id: 'emp_001', name: 'Alex PM', role: 'Project Manager', status: 'available' },
        { id: 'emp_002', name: 'Taylor TL', role: 'Technical Lead', status: 'busy' }
      ];
      
      expect(store.agents).toHaveLength(2);
      expect(store.agents[0].name).toBe('Alex PM');
    });
    
    it('should update agent status', () => {
      const store = useDashboardStore();
      
      store.agents = [
        { id: 'emp_001', name: 'Agent 1', status: 'available' }
      ];
      
      // Update status
      const agent = store.agents.find(a => a.id === 'emp_001');
      if (agent) agent.status = 'busy';
      
      expect(store.agents[0].status).toBe('busy');
    });
  });
  
  describe('Process Management', () => {
    it('should handle process lifecycle', () => {
      const store = useDashboardStore();
      
      // Add process
      store.processes = [{
        id: 'proc_1',
        role: 'developer',
        status: 'running',
        output: []
      }];
      
      expect(store.processes).toHaveLength(1);
      
      // Update status
      store.processes[0].status = 'completed';
      expect(store.processes[0].status).toBe('completed');
      
      // Remove process
      store.processes = store.processes.filter(p => p.id !== 'proc_1');
      expect(store.processes).toHaveLength(0);
    });
  });
  
  describe('Task Management', () => {
    it('should manage tasks', () => {
      const store = useDashboardStore();
      
      // Add task
      const newTask = {
        id: 'task_1',
        title: 'Test Task',
        status: 'pending',
        assignedTo: null
      };
      
      store.tasks = [newTask];
      expect(store.tasks).toHaveLength(1);
      
      // Assign task
      store.tasks[0].assignedTo = 'emp_001';
      expect(store.tasks[0].assignedTo).toBe('emp_001');
      
      // Complete task
      store.tasks[0].status = 'completed';
      expect(store.tasks[0].status).toBe('completed');
    });
  });
  
  describe('Metrics and System Status', () => {
    it('should update metrics', () => {
      const store = useDashboardStore();
      
      store.metrics = {
        cpu: 45.5,
        memory: { usedMemoryMB: 1024, totalMemoryMB: 2048 },
        timestamp: Date.now()
      };
      
      expect(store.metrics.cpu).toBe(45.5);
      expect(store.metrics.memory.usedMemoryMB).toBe(1024);
    });
    
    it('should track connection status', () => {
      const store = useDashboardStore();
      
      store.isConnected = true;
      expect(store.isConnected).toBe(true);
      
      store.isConnected = false;
      expect(store.isConnected).toBe(false);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle errors', () => {
      const store = useDashboardStore();
      
      store.error = 'Connection failed';
      expect(store.error).toBe('Connection failed');
      
      // Clear error
      store.error = null;
      expect(store.error).toBeNull();
    });
  });
});