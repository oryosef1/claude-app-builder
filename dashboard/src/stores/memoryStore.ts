/**
 * Memory Store - Zustand State Management
 * Manages memory data and UI state
 */

import { create } from 'zustand';
import { Memory, MemoryStats, CleanupAnalytics, MemoryUIState, SearchOptions } from '@/types/memory';
import memoryService from '@/services/memory';

interface MemoryStore extends MemoryUIState {
  // Data state
  memories: Memory[];
  employeeStats: Record<string, MemoryStats>;
  cleanupAnalytics: CleanupAnalytics | null;
  selectedMemories: string[];
  
  // Actions
  setSelectedEmployee: (employeeId: string) => void;
  setSelectedMemoryTypes: (types: string[]) => void;
  setSearchQuery: (query: string) => void;
  setView: (view: 'list' | 'grid' | 'analytics') => void;
  setSortBy: (sortBy: 'timestamp' | 'relevance' | 'importance') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setError: (error: string | null) => void;
  
  // Memory selection
  toggleMemorySelection: (memoryId: string) => void;
  selectAllMemories: () => void;
  clearSelection: () => void;
  
  // Data operations
  searchMemories: (employeeId: string, query: string, options?: SearchOptions) => Promise<void>;
  loadEmployeeStats: (employeeId: string) => Promise<void>;
  loadAllEmployeeStats: () => Promise<void>;
  loadCleanupAnalytics: () => Promise<void>;
  performCleanup: (employeeId?: string) => Promise<void>;
  archiveSelectedMemories: () => Promise<void>;
  restoreMemories: (employeeId: string, memoryIds: string[]) => Promise<void>;
  
  // Computed getters
  getFilteredMemories: () => Memory[];
  getSortedMemories: () => Memory[];
  getSelectedEmployeeStats: () => MemoryStats | null;
  getTotalCompanyMemories: () => number;
}

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  // Initial UI state
  selectedEmployee: '',
  selectedMemoryTypes: ['experience', 'knowledge', 'decision', 'interaction'],
  searchQuery: '',
  isLoading: false,
  error: null,
  view: 'list',
  sortBy: 'timestamp',
  sortOrder: 'desc',
  
  // Initial data state
  memories: [],
  employeeStats: {},
  cleanupAnalytics: null,
  selectedMemories: [],
  
  // UI Actions
  setSelectedEmployee: (employeeId) => set({ selectedEmployee: employeeId }),
  setSelectedMemoryTypes: (types) => set({ selectedMemoryTypes: types }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setView: (view) => set({ view }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setError: (error) => set({ error }),
  
  // Memory selection actions
  toggleMemorySelection: (memoryId) => {
    const { selectedMemories } = get();
    const isSelected = selectedMemories.includes(memoryId);
    
    set({
      selectedMemories: isSelected
        ? selectedMemories.filter(id => id !== memoryId)
        : [...selectedMemories, memoryId]
    });
  },
  
  selectAllMemories: () => {
    const { memories } = get();
    set({ selectedMemories: memories.map(m => m.id) });
  },
  
  clearSelection: () => set({ selectedMemories: [] }),
  
  // Data operations
  searchMemories: async (employeeId, query, options = {}) => {
    set({ isLoading: true, error: null });
    
    try {
      const memories = await memoryService.searchMemories(employeeId, query, options);
      set({ memories, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to search memories',
        isLoading: false 
      });
    }
  },
  
  loadEmployeeStats: async (employeeId) => {
    set({ isLoading: true, error: null });
    
    try {
      const stats = await memoryService.getEmployeeStats(employeeId);
      set(state => ({
        employeeStats: {
          ...state.employeeStats,
          [employeeId]: stats
        },
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load employee stats',
        isLoading: false 
      });
    }
  },
  
  loadAllEmployeeStats: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const allStats = await memoryService.getAllEmployeeStats();
      set({ employeeStats: allStats, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load employee stats',
        isLoading: false 
      });
    }
  },
  
  loadCleanupAnalytics: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const analytics = await memoryService.getCleanupAnalytics();
      set({ cleanupAnalytics: analytics, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load cleanup analytics',
        isLoading: false 
      });
    }
  },
  
  performCleanup: async (employeeId) => {
    set({ isLoading: true, error: null });
    
    try {
      if (employeeId) {
        await memoryService.cleanupEmployeeMemories(employeeId);
      } else {
        await memoryService.cleanupAllMemories();
      }
      
      // Reload data after cleanup
      get().loadAllEmployeeStats();
      get().loadCleanupAnalytics();
      
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to perform cleanup',
        isLoading: false 
      });
    }
  },
  
  archiveSelectedMemories: async () => {
    const { selectedMemories, selectedEmployee } = get();
    
    if (!selectedEmployee || selectedMemories.length === 0) {
      set({ error: 'Please select an employee and memories to archive' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      await memoryService.archiveMemories(selectedEmployee, selectedMemories);
      
      // Reload data and clear selection
      get().searchMemories(selectedEmployee, get().searchQuery);
      get().loadEmployeeStats(selectedEmployee);
      set({ selectedMemories: [], isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to archive memories',
        isLoading: false 
      });
    }
  },
  
  restoreMemories: async (employeeId, memoryIds) => {
    set({ isLoading: true, error: null });
    
    try {
      await memoryService.restoreMemories(employeeId, memoryIds);
      
      // Reload data
      get().searchMemories(employeeId, get().searchQuery);
      get().loadEmployeeStats(employeeId);
      
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to restore memories',
        isLoading: false 
      });
    }
  },
  
  // Computed getters
  getFilteredMemories: () => {
    const { memories, selectedMemoryTypes, searchQuery } = get();
    
    return memories.filter(memory => {
      const typeMatch = selectedMemoryTypes.includes(memory.type);
      const queryMatch = searchQuery === '' || 
        memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        memory.metadata.task?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return typeMatch && queryMatch;
    });
  },
  
  getSortedMemories: () => {
    const { sortBy, sortOrder } = get();
    const filtered = get().getFilteredMemories();
    
    return [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
        case 'relevance':
          aValue = a.relevanceScore || 0;
          bValue = b.relevanceScore || 0;
          break;
        case 'importance':
          aValue = a.importance || 0;
          bValue = b.importance || 0;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  },
  
  getSelectedEmployeeStats: () => {
    const { employeeStats, selectedEmployee } = get();
    return selectedEmployee ? employeeStats[selectedEmployee] || null : null;
  },
  
  getTotalCompanyMemories: () => {
    const { employeeStats } = get();
    return Object.values(employeeStats).reduce((total, stats) => total + stats.total, 0);
  }
}));

export default useMemoryStore;