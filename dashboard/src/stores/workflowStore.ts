import { create } from 'zustand';
import { workflowService, Workflow, WorkflowTemplate, WorkflowMetrics, WorkflowExecution } from '@/services/workflows';

interface WorkflowState {
  // State
  workflows: Workflow[];
  templates: WorkflowTemplate[];
  metrics: WorkflowMetrics | null;
  activeExecutions: Map<string, WorkflowExecution>;
  loading: boolean;
  error: string | null;
  
  // UI State
  selectedWorkflow: Workflow | null;
  viewMode: 'grid' | 'list';
  filterType: 'all' | 'corporate' | 'development' | 'testing' | 'deployment';
  filterStatus: 'all' | 'running' | 'stopped' | 'paused' | 'completed' | 'failed';
  searchQuery: string;
  
  // Actions
  fetchWorkflows: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  createWorkflow: (workflow: Omit<Workflow, 'id' | 'executionHistory'>) => Promise<void>;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  startWorkflow: (id: string) => Promise<void>;
  stopWorkflow: (id: string) => Promise<void>;
  pauseWorkflow: (id: string) => Promise<void>;
  resumeWorkflow: (id: string) => Promise<void>;
  
  // UI Actions
  setSelectedWorkflow: (workflow: Workflow | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setFilterType: (type: WorkflowState['filterType']) => void;
  setFilterStatus: (status: WorkflowState['filterStatus']) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
  
  // Computed
  filteredWorkflows: () => Workflow[];
  runningWorkflows: () => Workflow[];
  completedWorkflows: () => Workflow[];
  failedWorkflows: () => Workflow[];
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial State
  workflows: [],
  templates: [],
  metrics: null,
  activeExecutions: new Map(),
  loading: false,
  error: null,
  
  // UI State
  selectedWorkflow: null,
  viewMode: 'grid',
  filterType: 'all',
  filterStatus: 'all',
  searchQuery: '',
  
  // Actions
  fetchWorkflows: async () => {
    set({ loading: true, error: null });
    try {
      const workflows = await workflowService.getWorkflows();
      set({ workflows, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch workflows',
        loading: false 
      });
    }
  },

  fetchTemplates: async () => {
    try {
      const templates = await workflowService.getWorkflowTemplates();
      set({ templates });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch templates'
      });
    }
  },

  fetchMetrics: async () => {
    try {
      const metrics = await workflowService.getWorkflowMetrics();
      set({ metrics });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch metrics'
      });
    }
  },

  createWorkflow: async (workflowData) => {
    set({ loading: true, error: null });
    try {
      const newWorkflow = await workflowService.createWorkflow(workflowData);
      set(state => ({ 
        workflows: [...state.workflows, newWorkflow],
        loading: false 
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create workflow',
        loading: false 
      });
    }
  },

  updateWorkflow: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updatedWorkflow = await workflowService.updateWorkflow(id, updates);
      set(state => ({
        workflows: state.workflows.map(w => w.id === id ? updatedWorkflow : w),
        selectedWorkflow: state.selectedWorkflow?.id === id ? updatedWorkflow : state.selectedWorkflow,
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update workflow',
        loading: false 
      });
    }
  },

  deleteWorkflow: async (id) => {
    set({ loading: true, error: null });
    try {
      await workflowService.deleteWorkflow(id);
      set(state => ({
        workflows: state.workflows.filter(w => w.id !== id),
        selectedWorkflow: state.selectedWorkflow?.id === id ? null : state.selectedWorkflow,
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete workflow',
        loading: false 
      });
    }
  },

  startWorkflow: async (id) => {
    try {
      const execution = await workflowService.startWorkflow(id);
      set(state => ({
        workflows: state.workflows.map(w => 
          w.id === id 
            ? { ...w, status: 'running', startTime: new Date(), progress: 0 }
            : w
        ),
        activeExecutions: new Map(state.activeExecutions.set(id, execution))
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to start workflow'
      });
    }
  },

  stopWorkflow: async (id) => {
    try {
      await workflowService.stopWorkflow(id);
      set(state => ({
        workflows: state.workflows.map(w => 
          w.id === id 
            ? { ...w, status: 'stopped', endTime: new Date() }
            : w
        ),
        activeExecutions: new Map([...state.activeExecutions].filter(([key]) => key !== id))
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to stop workflow'
      });
    }
  },

  pauseWorkflow: async (id) => {
    try {
      await workflowService.pauseWorkflow(id);
      set(state => ({
        workflows: state.workflows.map(w => 
          w.id === id 
            ? { ...w, status: 'paused' }
            : w
        )
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to pause workflow'
      });
    }
  },

  resumeWorkflow: async (id) => {
    try {
      await workflowService.resumeWorkflow(id);
      set(state => ({
        workflows: state.workflows.map(w => 
          w.id === id 
            ? { ...w, status: 'running' }
            : w
        )
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to resume workflow'
      });
    }
  },

  // UI Actions
  setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilterType: (type) => set({ filterType: type }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearError: () => set({ error: null }),

  // Computed
  filteredWorkflows: () => {
    const { workflows, filterType, filterStatus, searchQuery } = get();
    
    return workflows.filter(workflow => {
      // Type filter
      if (filterType !== 'all' && workflow.type !== filterType) {
        return false;
      }
      
      // Status filter
      if (filterStatus !== 'all' && workflow.status !== filterStatus) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = workflow.name.toLowerCase().includes(query);
        const matchesDescription = workflow.description.toLowerCase().includes(query);
        const matchesTags = workflow.configuration.tags.some(tag => 
          tag.toLowerCase().includes(query)
        );
        
        if (!matchesName && !matchesDescription && !matchesTags) {
          return false;
        }
      }
      
      return true;
    });
  },

  runningWorkflows: () => {
    return get().workflows.filter(w => w.status === 'running');
  },

  completedWorkflows: () => {
    return get().workflows.filter(w => w.status === 'completed');
  },

  failedWorkflows: () => {
    return get().workflows.filter(w => w.status === 'failed');
  },
}));

// Auto-refresh workflows every 30 seconds for running workflows
let refreshInterval: NodeJS.Timeout | null = null;

export const startWorkflowAutoRefresh = () => {
  if (refreshInterval) return;
  
  refreshInterval = setInterval(() => {
    const { workflows, fetchWorkflows } = useWorkflowStore.getState();
    const hasRunningWorkflows = workflows.some(w => w.status === 'running');
    
    if (hasRunningWorkflows) {
      fetchWorkflows();
    }
  }, 30000); // 30 seconds
};

export const stopWorkflowAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

// Hook for easy access to computed values
export const useWorkflowFilters = () => {
  const store = useWorkflowStore();
  return {
    filteredWorkflows: store.filteredWorkflows(),
    runningWorkflows: store.runningWorkflows(),
    completedWorkflows: store.completedWorkflows(),
    failedWorkflows: store.failedWorkflows(),
  };
};