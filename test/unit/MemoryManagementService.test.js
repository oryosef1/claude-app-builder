import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'assert';
import { MemoryManagementService } from '../../src/services/MemoryManagementService.js';
import { createTestEmployee, createTestMemory, testEmployees } from '../fixtures/test-data.js';

describe('MemoryManagementService', () => {
  let memoryService;
  let mockVectorDbService;
  let mockLogger;
  let mockRedisClient;

  beforeEach(() => {
    // Create mock Redis client
    mockRedisClient = {
      hGetAll: mock.fn(() => Promise.resolve({
        memory_count: '42',
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        department: 'Development',
        role: 'senior_developer'
      }))
    };

    // Create mocks for VectorDatabaseService
    mockVectorDbService = {
      initialize: mock.fn(() => Promise.resolve()),
      createEmployeeNamespace: mock.fn(() => Promise.resolve()),
      storeMemory: mock.fn(() => Promise.resolve('mem_test_123')),
      retrieveMemories: mock.fn(() => Promise.resolve([])),
      deleteMemory: mock.fn(() => Promise.resolve(true)),
      getNamespaceStats: mock.fn(() => Promise.resolve({ vectorCount: 0 })),
      generateEmployeeNamespace: mock.fn((id) => `poe_helper_employee_${id}`),
      getRedisClient: mock.fn(() => mockRedisClient),
      performMemoryCleanup: mock.fn(() => Promise.resolve({
        success: true,
        archival: { archivedCount: 5 },
        storage: { savedMB: 2.5 },
        executionTimeMs: 150
      })),
      getStorageStatistics: mock.fn(() => Promise.resolve({
        estimatedSizeMB: 75,
        vectorCount: 150
      })),
      getCleanupAnalytics: mock.fn(() => Promise.resolve({
        totalEmployees: 13,
        employeesOverTarget: 2,
        totalEstimatedSizeMB: 850,
        averageStorageMB: 65.4,
        totalVectorCount: 1500
      })),
      getMemoriesForLifecycleAnalysis: mock.fn(() => Promise.resolve([
        { id: 'mem_1', metadata: { timestamp: new Date().toISOString(), memory_type: 'experience' }, importanceScore: 0.8 },
        { id: 'mem_2', metadata: { timestamp: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(), memory_type: 'knowledge' }, importanceScore: 0.2 }
      ])),
      archiveMemories: mock.fn(() => Promise.resolve({ archivedCount: 2, errors: [] })),
      restoreMemories: mock.fn(() => Promise.resolve({ restoredCount: 2, errors: [] })),
      scheduleAutomatedCleanup: mock.fn(() => Promise.resolve({
        schedule: '0 2 * * *',
        employees: 13,
        timezone: 'UTC'
      })),
      shutdown: mock.fn(() => Promise.resolve())
    };

    // Create mock logger
    mockLogger = {
      info: mock.fn(),
      error: mock.fn(),
      warn: mock.fn(),
      debug: mock.fn()
    };

    // Mock winston logger creation
    const originalCreateLogger = global.winston?.createLogger;
    if (!global.winston) {
      global.winston = {
        createLogger: mock.fn(() => mockLogger),
        format: {
          combine: mock.fn(),
          timestamp: mock.fn(),
          errors: mock.fn(),
          json: mock.fn()
        },
        transports: {
          Console: mock.fn(),
          File: mock.fn()
        }
      };
    }

    // Create service instance
    memoryService = new MemoryManagementService();
    memoryService.vectorDb = mockVectorDbService;
    memoryService.logger = mockLogger;
  });

  afterEach(() => {
    // Cleanup
    if (global.winston && !global.winston.createLogger.mock) {
      delete global.winston;
    }
  });

  describe('initialize', () => {
    it('should initialize the service successfully', async () => {
      await memoryService.initialize();
      
      assert.strictEqual(mockVectorDbService.initialize.mock.calls.length, 1);
      assert.strictEqual(mockVectorDbService.createEmployeeNamespace.mock.calls.length, 13);
      assert.strictEqual(memoryService.initialized, true);
    });

    it('should initialize all 13 employee namespaces', async () => {
      await memoryService.initialize();
      
      const namespaceCallEmployeeIds = mockVectorDbService.createEmployeeNamespace.mock.calls
        .map(call => call.arguments[0]);
      
      const expectedIds = testEmployees.validEmployees.map(emp => emp.id);
      assert.deepStrictEqual(namespaceCallEmployeeIds.sort(), expectedIds.sort());
    });

    it('should handle initialization errors', async () => {
      mockVectorDbService.initialize = mock.fn(() => Promise.reject(new Error('Connection failed')));
      
      await assert.rejects(
        async () => await memoryService.initialize(),
        { message: 'Connection failed' }
      );
    });

    it('should continue if individual namespace creation fails', async () => {
      let callCount = 0;
      mockVectorDbService.createEmployeeNamespace = mock.fn(() => {
        callCount++;
        if (callCount === 3) {
          return Promise.reject(new Error('Namespace creation failed'));
        }
        return Promise.resolve();
      });
      
      await memoryService.initialize();
      
      assert.strictEqual(memoryService.initialized, true);
      assert.strictEqual(mockLogger.warn.mock.calls.length >= 1, true);
    });
  });

  describe('storeExperienceMemory', () => {
    it('should store experience memory with valid data', async () => {
      const context = {
        project: 'Dashboard Implementation',
        technologies: ['React', 'TypeScript'],
        outcome: 'success',
        lessons_learned: ['Use TypeScript strict mode']
      };
      
      const metadata = {
        importance: 8.5,
        tags: ['frontend', 'dashboard']
      };
      
      const memoryId = await memoryService.storeExperienceMemory('emp_004', 'Implemented dashboard', context, metadata);
      
      assert.strictEqual(memoryId, 'mem_test_123');
      assert.strictEqual(mockVectorDbService.storeMemory.mock.calls.length, 1);
      
      const storeCall = mockVectorDbService.storeMemory.mock.calls[0];
      assert.strictEqual(storeCall.arguments[0], 'emp_004');
      
      const storedData = storeCall.arguments[1];
      assert.strictEqual(storedData.memory_type, 'experience');
      assert.strictEqual(storedData.content, 'Implemented dashboard');
      assert.deepStrictEqual(storedData.context.technologies, ['React', 'TypeScript']);
      assert.strictEqual(storedData.metadata.importance, 8.5);
    });

    it('should use default values for missing context fields', async () => {
      const memoryId = await memoryService.storeExperienceMemory('emp_001', 'Test experience', {});
      
      const storedData = mockVectorDbService.storeMemory.mock.calls[0].arguments[1];
      assert.strictEqual(storedData.context.project, 'unknown');
      assert.deepStrictEqual(storedData.context.technologies, []);
      assert.strictEqual(storedData.context.outcome, 'unknown');
      assert.deepStrictEqual(storedData.context.lessons_learned, []);
    });

    it('should handle storage errors', async () => {
      mockVectorDbService.storeMemory = mock.fn(() => Promise.reject(new Error('Storage failed')));
      
      await assert.rejects(
        async () => await memoryService.storeExperienceMemory('emp_001', 'Test', {}),
        { message: 'Storage failed' }
      );
    });
  });

  describe('storeKnowledgeMemory', () => {
    it('should store knowledge memory with valid data', async () => {
      const context = {
        domain: 'TypeScript',
        complexity: 'advanced',
        applications: ['Type safety', 'Better IDE support']
      };
      
      const metadata = {
        importance: 7.5,
        source: 'documentation',
        confidence: 9.0
      };
      
      const memoryId = await memoryService.storeKnowledgeMemory('emp_004', 'TypeScript best practices', context, metadata);
      
      assert.strictEqual(memoryId, 'mem_test_123');
      
      const storedData = mockVectorDbService.storeMemory.mock.calls[0].arguments[1];
      assert.strictEqual(storedData.memory_type, 'knowledge');
      assert.strictEqual(storedData.context.domain, 'TypeScript');
      assert.strictEqual(storedData.metadata.confidence, 9.0);
    });
  });

  describe('storeDecisionMemory', () => {
    it('should store decision memory with valid data', async () => {
      const context = {
        decision_type: 'architecture',
        alternatives: ['React', 'Vue', 'Angular'],
        criteria: ['Learning curve', 'Performance', 'Community support'],
        rationale: 'Vue has simpler learning curve for the team'
      };
      
      const metadata = {
        importance: 9.0,
        stakeholders: ['emp_001', 'emp_002'],
        outcome: 'implemented',
        effectiveness: 8.5
      };
      
      const memoryId = await memoryService.storeDecisionMemory('emp_002', 'Chose Vue for dashboard', context, metadata);
      
      assert.strictEqual(memoryId, 'mem_test_123');
      
      const storedData = mockVectorDbService.storeMemory.mock.calls[0].arguments[1];
      assert.strictEqual(storedData.memory_type, 'decision');
      assert.deepStrictEqual(storedData.context.alternatives, ['React', 'Vue', 'Angular']);
      assert.strictEqual(storedData.metadata.effectiveness, 8.5);
    });
  });

  describe('searchMemories', () => {
    it('should search memories with default options', async () => {
      const mockResults = [
        { 
          id: 'mem_1', 
          memory: { 
            content: 'Test memory 1',
            memory_type: 'experience',
            metadata: { importance: 8 }
          }, 
          score: 0.9 
        },
        { 
          id: 'mem_2', 
          memory: { 
            content: 'Test memory 2',
            memory_type: 'knowledge',
            metadata: { importance: 7 }
          }, 
          score: 0.8 
        }
      ];
      
      mockVectorDbService.retrieveMemories = mock.fn(() => Promise.resolve(mockResults));
      
      const results = await memoryService.searchMemories('emp_001', 'test query');
      
      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].score, 0.9);
      
      const retrieveCall = mockVectorDbService.retrieveMemories.mock.calls[0];
      assert.strictEqual(retrieveCall.arguments[0], 'test query');
      assert.strictEqual(retrieveCall.arguments[1], 'emp_001');
      assert.strictEqual(retrieveCall.arguments[2].topK, 5);
    });

    it('should apply custom search options', async () => {
      mockVectorDbService.retrieveMemories = mock.fn(() => Promise.resolve([]));
      
      const options = {
        topK: 10,
        memoryTypes: ['experience', 'decision'],
        minImportance: 7,
        boostRecent: true
      };
      
      await memoryService.searchMemories('emp_004', 'architecture', options);
      
      const retrieveCall = mockVectorDbService.retrieveMemories.mock.calls[0];
      assert.strictEqual(retrieveCall.arguments[2].topK, 10);
      assert.deepStrictEqual(retrieveCall.arguments[2].memoryTypes, ['experience', 'decision']);
      assert.strictEqual(retrieveCall.arguments[2].minImportance, 7);
    });

    it('should handle search errors', async () => {
      mockVectorDbService.retrieveMemories = mock.fn(() => Promise.reject(new Error('Search failed')));
      
      await assert.rejects(
        async () => await memoryService.searchMemories('emp_001', 'query'),
        { message: 'Search failed' }
      );
    });
  });

  describe('getRelevantContext', () => {
    it('should get relevant context for a task', async () => {
      const mockMemories = [
        { 
          id: 'mem_1',
          memory: { 
            content: 'Implemented authentication',
            memory_type: 'experience',
            metadata: { importance: 9, timestamp: new Date().toISOString() }
          },
          score: 0.95
        },
        { 
          id: 'mem_2',
          memory: { 
            content: 'JWT best practices',
            memory_type: 'knowledge',
            metadata: { importance: 8, timestamp: new Date().toISOString() }
          },
          score: 0.85
        }
      ];
      
      mockVectorDbService.retrieveMemories = mock.fn(() => Promise.resolve(mockMemories));
      
      const context = await memoryService.getRelevantContext('emp_004', 'Implement user authentication');
      
      assert.strictEqual(context.total_results, 2);
      assert.strictEqual(context.memories.length, 2);
      assert.ok(context.summary);
      assert.strictEqual(context.summary.task, 'Implement user authentication');
      assert.strictEqual(context.summary.experience_count, 1);
      assert.strictEqual(context.summary.knowledge_count, 1);
    });
  });

  describe('getEmployeeExpertise', () => {
    it('should calculate employee expertise in a domain', async () => {
      const mockMemories = [
        { 
          memory: { 
            memory_type: 'experience',
            metadata: { 
              importance: 9,
              timestamp: new Date().toISOString(),
              tags: ['React', 'TypeScript']
            }
          },
          score: 0.9
        },
        { 
          memory: { 
            memory_type: 'knowledge',
            metadata: { 
              importance: 8,
              timestamp: new Date().toISOString(),
              tags: ['React', 'Hooks']
            }
          },
          score: 0.85
        }
      ];
      
      mockVectorDbService.retrieveMemories = mock.fn(() => Promise.resolve(mockMemories));
      
      const expertise = await memoryService.getEmployeeExpertise('emp_004', 'React development');
      
      assert.strictEqual(expertise.employee_id, 'emp_004');
      assert.strictEqual(expertise.domain, 'React development');
      assert.ok(expertise.expertise_score >= 0 && expertise.expertise_score <= 10);
      assert.strictEqual(expertise.experience_count, 1);
      assert.strictEqual(expertise.knowledge_count, 1);
      assert.ok(Array.isArray(expertise.key_skills));
    });
  });

  describe('getMemoryStatistics', () => {
    it('should return memory statistics for employee', async () => {
      const stats = await memoryService.getMemoryStatistics('emp_001');
      
      assert.strictEqual(stats.employee_id, 'emp_001');
      assert.strictEqual(stats.namespace, 'poe_helper_employee_emp_001');
      assert.strictEqual(stats.total_memories, 42);
      assert.strictEqual(stats.department, 'Development');
      assert.strictEqual(stats.role, 'senior_developer');
    });
  });

  describe('Memory Lifecycle Management', () => {
    describe('performEmployeeMemoryCleanup', () => {
      it('should perform cleanup for an employee', async () => {
        const result = await memoryService.performEmployeeMemoryCleanup('emp_001');
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.archival.archivedCount, 5);
        assert.strictEqual(result.storage.savedMB, 2.5);
        assert.strictEqual(result.executionTimeMs, 150);
        
        assert.strictEqual(mockVectorDbService.performMemoryCleanup.mock.calls.length, 1);
        assert.strictEqual(mockVectorDbService.performMemoryCleanup.mock.calls[0].arguments[0], 'emp_001');
      });

      it('should handle cleanup errors', async () => {
        mockVectorDbService.performMemoryCleanup = mock.fn(() => Promise.reject(new Error('Cleanup failed')));
        
        await assert.rejects(
          async () => await memoryService.performEmployeeMemoryCleanup('emp_001'),
          { message: 'Cleanup failed' }
        );
      });
    });

    describe('performCompanyWideCleanup', () => {
      it('should perform cleanup for all employees', async () => {
        const result = await memoryService.performCompanyWideCleanup();
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.totalEmployees, 13);
        assert.strictEqual(result.successfulCleanups, 13);
        assert.strictEqual(result.failedCleanups, 0);
        assert.strictEqual(result.aggregate.totalMemoriesArchived, 65); // 5 * 13
        assert.strictEqual(result.aggregate.totalStorageSavedMB, 32.5); // 2.5 * 13
        
        // Should have called cleanup for each employee
        assert.strictEqual(mockVectorDbService.performMemoryCleanup.mock.calls.length, 13);
      });

      it('should handle partial failures', async () => {
        let callCount = 0;
        mockVectorDbService.performMemoryCleanup = mock.fn(() => {
          callCount++;
          if (callCount === 3) {
            return Promise.reject(new Error('Cleanup failed for emp_003'));
          }
          return Promise.resolve({
            success: true,
            archival: { archivedCount: 5 },
            storage: { savedMB: 2.5 },
            executionTimeMs: 150
          });
        });
        
        const result = await memoryService.performCompanyWideCleanup();
        
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.successfulCleanups, 12);
        assert.strictEqual(result.failedCleanups, 1);
      });
    });

    describe('getEmployeeStorageStats', () => {
      it('should get enhanced storage statistics', async () => {
        const stats = await memoryService.getEmployeeStorageStats('emp_004');
        
        assert.strictEqual(stats.estimatedSizeMB, 75);
        assert.strictEqual(stats.vectorCount, 150);
        assert.strictEqual(stats.storageStatus, 'within_target');
        assert.strictEqual(stats.targetStorageMB, 100);
        assert.strictEqual(stats.utilizationPercent, 75);
      });

      it('should identify over-target storage', async () => {
        mockVectorDbService.getStorageStatistics = mock.fn(() => Promise.resolve({
          estimatedSizeMB: 125,
          vectorCount: 250
        }));
        
        const stats = await memoryService.getEmployeeStorageStats('emp_001');
        
        assert.strictEqual(stats.storageStatus, 'over_target');
        assert.strictEqual(stats.utilizationPercent, 125);
      });
    });

    describe('getCleanupAnalytics', () => {
      it('should get comprehensive cleanup analytics', async () => {
        const analytics = await memoryService.getCleanupAnalytics();
        
        assert.strictEqual(analytics.totalEmployees, 13);
        assert.strictEqual(analytics.businessMetrics.storageEfficiency, 'excellent');
        assert.ok(analytics.businessMetrics.recommendations);
        assert.ok(Array.isArray(analytics.businessMetrics.recommendations));
      });
    });

    describe('getMemoryLifecycleAnalysis', () => {
      it('should analyze memory lifecycle for an employee', async () => {
        const analysis = await memoryService.getMemoryLifecycleAnalysis('emp_004');
        
        assert.strictEqual(analysis.employeeId, 'emp_004');
        assert.ok(analysis.analysis);
        assert.strictEqual(analysis.analysis.totalMemories, 2);
        assert.ok(analysis.analysis.memoryTypes);
        assert.ok(analysis.analysis.ageDistribution);
        assert.ok(analysis.analysis.importanceStats);
        assert.ok(Array.isArray(analysis.analysis.recommendations));
      });
    });
  });

  describe('Utility Methods', () => {
    describe('rankMemoriesByRelevance', () => {
      it('should rank memories by relevance', () => {
        const memories = [
          {
            memory: {
              memory_type: 'experience',
              metadata: { importance: 9, timestamp: new Date().toISOString() }
            },
            score: 0.8
          },
          {
            memory: {
              memory_type: 'knowledge',
              metadata: { importance: 7, timestamp: new Date().toISOString() }
            },
            score: 0.9
          }
        ];
        
        const ranked = memoryService.rankMemoriesByRelevance(memories, 'implement feature');
        
        assert.ok(ranked[0].relevance_score);
        assert.ok(ranked[0].relevance_score >= 0 && ranked[0].relevance_score <= 1);
        // Should be sorted by relevance score
        assert.ok(ranked[0].relevance_score >= ranked[1].relevance_score);
      });
    });

    describe('getMemoryTypeScore', () => {
      it('should score experience higher for implementation tasks', () => {
        const score = memoryService.getMemoryTypeScore('experience', 'implement authentication');
        assert.strictEqual(score, 0.9);
      });

      it('should score knowledge higher for learning tasks', () => {
        const score = memoryService.getMemoryTypeScore('knowledge', 'learn about React hooks');
        assert.strictEqual(score, 0.9);
      });

      it('should score decision higher for planning tasks', () => {
        const score = memoryService.getMemoryTypeScore('decision', 'plan the architecture');
        assert.strictEqual(score, 0.9);
      });
    });

    describe('getRecencyScore', () => {
      it('should give higher score to recent memories', () => {
        const recentScore = memoryService.getRecencyScore(new Date().toISOString());
        const oldScore = memoryService.getRecencyScore(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());
        
        assert.ok(recentScore > oldScore);
        assert.ok(recentScore > 0.9);
        assert.ok(oldScore < 0.5);
      });
    });

    describe('generateContextSummary', () => {
      it('should generate comprehensive context summary', () => {
        const memories = [
          {
            memory: {
              content: 'Implemented user authentication with JWT tokens for secure access',
              memory_type: 'experience',
              metadata: { importance: 9 }
            },
            relevance_score: 0.95
          },
          {
            memory: {
              content: 'JWT tokens should be stored securely and have appropriate expiration',
              memory_type: 'knowledge',
              metadata: { importance: 8 }
            },
            relevance_score: 0.85
          }
        ];
        
        const summary = memoryService.generateContextSummary(memories, 'Implement authentication');
        
        assert.strictEqual(summary.task, 'Implement authentication');
        assert.strictEqual(summary.total_memories, 2);
        assert.strictEqual(summary.experience_count, 1);
        assert.strictEqual(summary.knowledge_count, 1);
        assert.ok(summary.avg_relevance > 0);
        assert.ok(Array.isArray(summary.key_experiences));
        assert.ok(Array.isArray(summary.key_knowledge));
      });
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await memoryService.shutdown();
      
      assert.strictEqual(mockVectorDbService.shutdown.mock.calls.length, 1);
      assert.ok(mockLogger.info.mock.calls.some(call => 
        call.arguments[0].includes('Shutting down')
      ));
    });

    it('should handle shutdown errors', async () => {
      mockVectorDbService.shutdown = mock.fn(() => Promise.reject(new Error('Shutdown failed')));
      
      // Should not throw
      await memoryService.shutdown();
      
      assert.ok(mockLogger.error.mock.calls.some(call => 
        call.arguments[0].includes('Error during shutdown')
      ));
    });
  });
});