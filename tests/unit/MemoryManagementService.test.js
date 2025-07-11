import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryManagementService } from '../../src/services/MemoryManagementService.js';

// Mock VectorDatabaseService
vi.mock('../../src/services/VectorDatabaseService.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    storeMemory: vi.fn().mockResolvedValue({ success: true, id: 'mem_123' }),
    searchMemories: vi.fn().mockResolvedValue([
      { id: 'mem_1', score: 0.95, metadata: { content: 'Memory 1', type: 'task' } },
      { id: 'mem_2', score: 0.85, metadata: { content: 'Memory 2', type: 'knowledge' } }
    ]),
    loadContextForTask: vi.fn().mockResolvedValue([
      { metadata: { content: 'Context 1' }, relevance: 0.9 },
      { metadata: { content: 'Context 2' }, relevance: 0.8 }
    ]),
    deleteMemory: vi.fn().mockResolvedValue({ success: true }),
    deleteMemoriesByFilter: vi.fn().mockResolvedValue({ deletedCount: 5 }),
    clearEmployeeMemories: vi.fn().mockResolvedValue({ success: true }),
    getMemoryStats: vi.fn().mockResolvedValue({
      totalMemories: 1000,
      memoryByEmployee: { 'emp_001': 100, 'emp_002': 50 }
    }),
    archiveOldMemories: vi.fn().mockResolvedValue(10)
  }))
}));

// Mock employee config
vi.mock('../../src/config/employees.js', () => ({
  EMPLOYEES: [
    { id: 'emp_001', name: 'Test Employee 1', role: 'Developer', department: 'Development' },
    { id: 'emp_002', name: 'Test Employee 2', role: 'QA Engineer', department: 'Quality' }
  ],
  getEmployeeDepartment: vi.fn((id) => {
    const depts = { 'emp_001': 'Development', 'emp_002': 'Quality' };
    return depts[id] || 'Unknown';
  }),
  getEmployeeRole: vi.fn((id) => {
    const roles = { 'emp_001': 'Developer', 'emp_002': 'QA Engineer' };
    return roles[id] || 'Unknown';
  })
}));

// Mock memory operations utils
vi.mock('../../src/utils/memoryOperations.js', () => ({
  postProcessResults: vi.fn((results) => results),
  rankMemoriesByRelevance: vi.fn((memories) => memories),
  generateContextSummary: vi.fn((memories) => 'Context summary of memories'),
  calculateExpertiseMetrics: vi.fn(() => ({
    domainExpertise: { 'javascript': 0.8, 'testing': 0.7 },
    skillDistribution: { 'coding': 50, 'testing': 30, 'documentation': 20 }
  }))
}));

// Mock cleanup operations utils
vi.mock('../../src/utils/cleanupOperations.js', () => ({
  generateCleanupRecommendations: vi.fn(() => [
    { type: 'archive', target: 'old_memories', reason: 'Age > 90 days' },
    { type: 'deduplicate', target: 'similar_memories', reason: 'Similarity > 0.95' }
  ]),
  generateMemoryRecommendations: vi.fn(() => ({
    recommendations: ['Store more task completions', 'Add knowledge from code reviews'],
    gaps: ['Missing deployment procedures', 'No testing strategies']
  })),
  performCompanyWideCleanup: vi.fn().mockResolvedValue({
    totalDeleted: 100,
    totalArchived: 200,
    spaceReclaimed: '50MB'
  }),
  analyzeMemoryLifecycle: vi.fn(() => ({
    averageLifespan: 30,
    retentionRate: 0.8,
    utilizationRate: 0.6
  }))
}));

// Mock winston
vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      printf: vi.fn(),
      colorize: vi.fn()
    },
    transports: {
      Console: vi.fn(),
      File: vi.fn()
    }
  }
}));

describe('MemoryManagementService - Comprehensive Tests', () => {
  let service;
  let mockVectorDb;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MemoryManagementService();
    mockVectorDb = service.vectorDb;
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await service.initialize();
      
      expect(result).toBe(true);
      expect(service.initialized).toBe(true);
      expect(mockVectorDb.initialize).toHaveBeenCalled();
      expect(service.logger.info).toHaveBeenCalledWith(
        'Memory Management Service initialized successfully'
      );
    });

    test('should handle initialization failure', async () => {
      mockVectorDb.initialize.mockRejectedValueOnce(new Error('Init failed'));
      
      await expect(service.initialize()).rejects.toThrow('Init failed');
      expect(service.initialized).toBe(false);
    });

    test('should skip initialization if already initialized', async () => {
      await service.initialize();
      await service.initialize();
      
      expect(mockVectorDb.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memory Storage', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should store employee memory', async () => {
      const result = await service.storeEmployeeMemory('emp_001', {
        content: 'Completed task successfully',
        type: 'task_completion',
        metadata: { taskId: 'task_123' }
      });
      
      expect(result.success).toBe(true);
      expect(result.id).toBe('mem_123');
      expect(mockVectorDb.storeMemory).toHaveBeenCalledWith('emp_001', {
        content: 'Completed task successfully',
        type: 'task_completion',
        metadata: expect.objectContaining({
          taskId: 'task_123',
          department: 'Development',
          role: 'Developer'
        })
      });
    });

    test('should validate memory content', async () => {
      await expect(service.storeEmployeeMemory('emp_001', {}))
        .rejects.toThrow('Memory content is required');
    });

    test('should add automatic metadata', async () => {
      await service.storeEmployeeMemory('emp_001', {
        content: 'Test memory',
        type: 'knowledge'
      });
      
      const call = mockVectorDb.storeMemory.mock.calls[0];
      expect(call[1].metadata).toMatchObject({
        department: 'Development',
        role: 'Developer',
        timestamp: expect.any(Date)
      });
    });

    test('should handle storage failure', async () => {
      mockVectorDb.storeMemory.mockRejectedValueOnce(new Error('Storage failed'));
      
      await expect(service.storeEmployeeMemory('emp_001', {
        content: 'Test memory'
      })).rejects.toThrow('Storage failed');
    });
  });

  describe('Memory Retrieval', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should search employee memories', async () => {
      const results = await service.searchEmployeeMemories('emp_001', 'test query', {
        topK: 5,
        type: 'task'
      });
      
      expect(results).toHaveLength(2);
      expect(results[0].score).toBe(0.95);
      expect(mockVectorDb.searchMemories).toHaveBeenCalledWith('emp_001', 'test query', {
        topK: 5,
        filters: { type: 'task' }
      });
    });

    test('should get recent memories', async () => {
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 1);
      
      await service.getRecentMemories('emp_001', 24);
      
      expect(mockVectorDb.searchMemories).toHaveBeenCalledWith('emp_001', '', {
        filters: {
          timestamp: { $gte: expect.any(Date) }
        },
        topK: 50
      });
    });

    test('should load task context', async () => {
      const context = await service.loadTaskContext('emp_001', {
        id: 'task_123',
        description: 'Fix authentication bug',
        requiredSkills: ['debugging', 'security']
      });
      
      expect(context).toHaveLength(2);
      expect(context[0].metadata.content).toBe('Context 1');
      expect(mockVectorDb.loadContextForTask).toHaveBeenCalled();
    });

    test('should generate context summary', async () => {
      const summary = await service.getContextSummary('emp_001', 'test query');
      
      expect(summary).toBe('Context summary of memories');
      expect(mockVectorDb.searchMemories).toHaveBeenCalled();
    });
  });

  describe('Cross-Employee Operations', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should search across all employees', async () => {
      const results = await service.searchAllEmployeeMemories('test query');
      
      expect(mockVectorDb.searchMemories).toHaveBeenCalledTimes(2);
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    test('should find experts by topic', async () => {
      mockVectorDb.searchMemories.mockResolvedValueOnce([
        { score: 0.9, metadata: { content: 'Expert knowledge' } }
      ]);
      
      const experts = await service.findExpertsByTopic('javascript');
      
      expect(experts).toHaveLength(1);
      expect(experts[0].employeeId).toBe('emp_001');
      expect(experts[0].relevanceScore).toBeGreaterThan(0);
    });

    test('should get department memories', async () => {
      const results = await service.getDepartmentMemories('Development', 'test query');
      
      expect(mockVectorDb.searchMemories).toHaveBeenCalledWith('emp_001', 'test query', {});
      expect(results['emp_001']).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should delete employee memory', async () => {
      const result = await service.deleteEmployeeMemory('emp_001', 'mem_123');
      
      expect(result.success).toBe(true);
      expect(mockVectorDb.deleteMemory).toHaveBeenCalledWith('emp_001', 'mem_123');
    });

    test('should cleanup old memories', async () => {
      const result = await service.cleanupOldMemories('emp_001', 30);
      
      expect(result.archived).toBe(10);
      expect(mockVectorDb.archiveOldMemories).toHaveBeenCalledWith('emp_001', 30);
    });

    test('should clear all employee memories', async () => {
      const result = await service.clearEmployeeMemories('emp_001');
      
      expect(result.success).toBe(true);
      expect(mockVectorDb.clearEmployeeMemories).toHaveBeenCalledWith('emp_001');
      expect(service.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Clearing all memories')
      );
    });

    test('should require confirmation for clear all', async () => {
      await expect(service.clearEmployeeMemories('emp_001', false))
        .rejects.toThrow('Confirmation required');
    });
  });

  describe('Analytics and Insights', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should get memory statistics', async () => {
      const stats = await service.getMemoryStatistics();
      
      expect(stats.totalMemories).toBe(1000);
      expect(stats.byEmployee['emp_001']).toBe(100);
      expect(mockVectorDb.getMemoryStats).toHaveBeenCalled();
    });

    test('should analyze employee expertise', async () => {
      const expertise = await service.analyzeEmployeeExpertise('emp_001');
      
      expect(expertise.domainExpertise).toBeDefined();
      expect(expertise.domainExpertise['javascript']).toBe(0.8);
      expect(expertise.skillDistribution).toBeDefined();
    });

    test('should generate memory recommendations', async () => {
      const recommendations = await service.getMemoryRecommendations('emp_001');
      
      expect(recommendations.recommendations).toContain('Store more task completions');
      expect(recommendations.gaps).toContain('Missing deployment procedures');
    });

    test('should analyze memory lifecycle', async () => {
      const lifecycle = await service.analyzeMemoryLifecycle();
      
      expect(lifecycle.averageLifespan).toBe(30);
      expect(lifecycle.retentionRate).toBe(0.8);
      expect(lifecycle.utilizationRate).toBe(0.6);
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should perform batch memory storage', async () => {
      const memories = [
        { content: 'Memory 1', type: 'task' },
        { content: 'Memory 2', type: 'knowledge' }
      ];
      
      const results = await service.batchStoreMemories('emp_001', memories);
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockVectorDb.storeMemory).toHaveBeenCalledTimes(2);
    });

    test('should handle partial batch failures', async () => {
      mockVectorDb.storeMemory
        .mockResolvedValueOnce({ success: true, id: 'mem_1' })
        .mockRejectedValueOnce(new Error('Storage failed'));
      
      const memories = [
        { content: 'Memory 1', type: 'task' },
        { content: 'Memory 2', type: 'knowledge' }
      ];
      
      const results = await service.batchStoreMemories('emp_001', memories);
      
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Storage failed');
    });
  });

  describe('Advanced Search', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should search with time range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      
      await service.searchMemoriesByTimeRange('emp_001', startDate, endDate);
      
      expect(mockVectorDb.searchMemories).toHaveBeenCalledWith('emp_001', '', {
        filters: {
          timestamp: {
            $gte: startDate,
            $lte: endDate
          }
        },
        topK: 100
      });
    });

    test('should search by multiple types', async () => {
      await service.searchByTypes('emp_001', ['task', 'knowledge'], 'test query');
      
      expect(mockVectorDb.searchMemories).toHaveBeenCalledWith('emp_001', 'test query', {
        filters: {
          type: { $in: ['task', 'knowledge'] }
        }
      });
    });

    test('should find similar memories', async () => {
      const referenceMemory = {
        content: 'Reference memory content',
        metadata: { id: 'ref_123' }
      };
      
      const similar = await service.findSimilarMemories('emp_001', referenceMemory);
      
      expect(similar).toHaveLength(2);
      expect(mockVectorDb.searchMemories).toHaveBeenCalledWith(
        'emp_001',
        'Reference memory content',
        { topK: 10 }
      );
    });
  });

  describe('Cleanup and Maintenance', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should generate cleanup recommendations', async () => {
      const recommendations = await service.getCleanupRecommendations();
      
      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].type).toBe('archive');
      expect(recommendations[0].reason).toBe('Age > 90 days');
    });

    test('should perform company-wide cleanup', async () => {
      const result = await service.performCompanyWideCleanup({
        dryRun: false,
        maxAge: 90
      });
      
      expect(result.totalDeleted).toBe(100);
      expect(result.totalArchived).toBe(200);
      expect(result.spaceReclaimed).toBe('50MB');
    });

    test('should deduplicate memories', async () => {
      mockVectorDb.searchMemories.mockResolvedValueOnce([
        { id: 'mem_1', score: 0.98, metadata: { content: 'Duplicate 1' } },
        { id: 'mem_2', score: 0.97, metadata: { content: 'Duplicate 2' } }
      ]);
      
      await service.deduplicateMemories('emp_001', 0.95);
      
      expect(mockVectorDb.deleteMemory).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should handle invalid employee ID', async () => {
      await expect(service.storeEmployeeMemory('invalid_emp', {
        content: 'Test'
      })).rejects.toThrow();
    });

    test('should handle search errors gracefully', async () => {
      mockVectorDb.searchMemories.mockRejectedValueOnce(new Error('Search failed'));
      
      await expect(service.searchEmployeeMemories('emp_001', 'query'))
        .rejects.toThrow('Search failed');
    });

    test('should validate batch size limits', async () => {
      const largeBatch = Array(101).fill({ content: 'Memory', type: 'test' });
      
      await expect(service.batchStoreMemories('emp_001', largeBatch))
        .rejects.toThrow('Batch size exceeds limit');
    });
  });

  describe('Export and Import', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should export employee memories', async () => {
      const exported = await service.exportEmployeeMemories('emp_001');
      
      expect(exported.employeeId).toBe('emp_001');
      expect(exported.memories).toHaveLength(2);
      expect(exported.exportDate).toBeDefined();
    });

    test('should import employee memories', async () => {
      const importData = {
        employeeId: 'emp_001',
        memories: [
          { content: 'Imported memory 1', type: 'task' },
          { content: 'Imported memory 2', type: 'knowledge' }
        ]
      };
      
      const result = await service.importEmployeeMemories(importData);
      
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockVectorDb.storeMemory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Monitoring and Health', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should check service health', async () => {
      const health = await service.checkHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.vectorDbStatus).toBe('connected');
      expect(health.totalMemories).toBe(1000);
    });

    test('should report unhealthy status on error', async () => {
      mockVectorDb.getMemoryStats.mockRejectedValueOnce(new Error('Connection failed'));
      
      const health = await service.checkHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Connection failed');
    });
  });
});