/**
 * Memory Type Definitions
 */

export interface Memory {
  id: string;
  employeeId: string;
  type: 'experience' | 'knowledge' | 'decision' | 'interaction';
  content: string;
  context: Record<string, any>;
  metadata: Record<string, any>;
  timestamp: string;
  relevanceScore?: number;
  importance?: number;
}

export interface MemoryStats {
  total: number;
  experience: number;
  knowledge: number;
  decision: number;
  interaction: number;
  lastUpdated: string;
  storageSize: number;
}

export interface SearchOptions {
  limit?: number;
  memoryTypes?: string[];
  relevanceThreshold?: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface CleanupAnalytics {
  totalMemories: number;
  archivedMemories: number;
  deletedMemories: number;
  storageOptimization: number;
  lastCleanup: string;
  recommendations: string[];
}

export interface MemoryFilter {
  employeeId: string;
  memoryTypes: string[];
  dateRange: {
    start: string;
    end: string;
  };
  searchQuery: string;
  relevanceThreshold: number;
}

export interface StorageStats {
  activeMemories: number;
  archivedMemories: number;
  totalSize: number;
  utilizationPercentage: number;
  growthTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface LifecycleAnalysis {
  importanceDistribution: Record<string, number>;
  accessPatterns: Record<string, number>;
  archivalCandidates: Memory[];
  retentionPolicy: {
    threshold: number;
    maxAge: number;
    preserveImportant: boolean;
  };
}

export interface MemoryUIState {
  selectedEmployee: string;
  selectedMemoryTypes: string[];
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  view: 'list' | 'grid' | 'analytics';
  sortBy: 'timestamp' | 'relevance' | 'importance';
  sortOrder: 'asc' | 'desc';
}