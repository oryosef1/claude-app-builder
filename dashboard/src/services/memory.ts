/**
 * Memory API Service
 * Handles all memory-related API communications
 */

const API_BASE_URL = 'http://localhost:3333';

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

class MemoryService {
  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'API call failed');
    }

    return data;
  }

  // Search memories for an employee
  async searchMemories(employeeId: string, query: string, options: SearchOptions = {}): Promise<Memory[]> {
    const response = await this.apiCall<{ results: Memory[] }>('/api/memory/search', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        query,
        options,
      }),
    });
    return response.results;
  }

  // Get memory statistics for an employee
  async getEmployeeStats(employeeId: string): Promise<MemoryStats> {
    const response = await this.apiCall<{ statistics: MemoryStats }>(`/api/memory/stats/${employeeId}`);
    return response.statistics;
  }

  // Get memory statistics for all employees
  async getAllEmployeeStats(): Promise<Record<string, MemoryStats>> {
    const response = await this.apiCall<{ statistics: Record<string, MemoryStats> }>('/api/memory/stats');
    return response.statistics;
  }

  // Get storage statistics for an employee
  async getStorageStats(employeeId: string): Promise<any> {
    const response = await this.apiCall<{ storage: any }>(`/api/memory/storage/${employeeId}`);
    return response.storage;
  }

  // Get cleanup analytics
  async getCleanupAnalytics(): Promise<CleanupAnalytics> {
    const response = await this.apiCall<{ analytics: CleanupAnalytics }>('/api/memory/analytics');
    return response.analytics;
  }

  // Perform memory cleanup for an employee
  async cleanupEmployeeMemories(employeeId: string, options: any = {}): Promise<any> {
    const response = await this.apiCall<{ cleanup: any }>(`/api/memory/cleanup/${employeeId}`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return response.cleanup;
  }

  // Perform company-wide memory cleanup
  async cleanupAllMemories(options: any = {}): Promise<any> {
    const response = await this.apiCall<{ companyWideCleanup: any }>('/api/memory/cleanup', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return response.companyWideCleanup;
  }

  // Archive specific memories
  async archiveMemories(employeeId: string, memoryIds: string[]): Promise<any> {
    const response = await this.apiCall<{ archive: any }>('/api/memory/archive', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        memoryIds,
      }),
    });
    return response.archive;
  }

  // Restore memories from archive
  async restoreMemories(employeeId: string, memoryIds: string[]): Promise<any> {
    const response = await this.apiCall<{ restore: any }>('/api/memory/restore', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        memoryIds,
      }),
    });
    return response.restore;
  }

  // Get memory lifecycle analysis
  async getLifecycleAnalysis(employeeId: string): Promise<any> {
    const response = await this.apiCall<{ lifecycle: any }>(`/api/memory/lifecycle/${employeeId}`);
    return response.lifecycle;
  }

  // Store new experience memory
  async storeExperience(employeeId: string, content: string, context: Record<string, any> = {}, metadata: Record<string, any> = {}): Promise<string> {
    const response = await this.apiCall<{ memoryId: string }>('/api/memory/experience', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        content,
        context,
        metadata,
      }),
    });
    return response.memoryId;
  }

  // Store new knowledge memory
  async storeKnowledge(employeeId: string, content: string, context: Record<string, any> = {}, metadata: Record<string, any> = {}): Promise<string> {
    const response = await this.apiCall<{ memoryId: string }>('/api/memory/knowledge', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        content,
        context,
        metadata,
      }),
    });
    return response.memoryId;
  }

  // Store new decision memory
  async storeDecision(employeeId: string, content: string, context: Record<string, any> = {}, metadata: Record<string, any> = {}): Promise<string> {
    const response = await this.apiCall<{ memoryId: string }>('/api/memory/decision', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        content,
        context,
        metadata,
      }),
    });
    return response.memoryId;
  }

  // Get relevant context for a task
  async getRelevantContext(employeeId: string, taskDescription: string, options: any = {}): Promise<Memory[]> {
    const response = await this.apiCall<{ context: Memory[] }>('/api/memory/context', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        taskDescription,
        options,
      }),
    });
    return response.context;
  }

  // Get employee expertise in a domain
  async getEmployeeExpertise(employeeId: string, domain: string): Promise<any> {
    const response = await this.apiCall<{ expertise: any }>(`/api/memory/expertise/${employeeId}/${domain}`);
    return response.expertise;
  }

  // Schedule automated cleanup
  async scheduleCleanup(options: any = {}): Promise<any> {
    const response = await this.apiCall<{ schedule: any }>('/api/memory/schedule', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return response.schedule;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.apiCall('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const memoryService = new MemoryService();
export default memoryService;