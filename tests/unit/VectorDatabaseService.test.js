import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { VectorDatabaseService } from '../../src/services/VectorDatabaseService.js';

// Mock external dependencies
vi.mock('@pinecone-database/pinecone', () => ({
  Pinecone: vi.fn().mockImplementation(() => ({
    index: vi.fn().mockReturnValue({
      namespace: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue({
          matches: [
            { id: 'vec1', score: 0.95, metadata: { text: 'Test memory 1' } },
            { id: 'vec2', score: 0.85, metadata: { text: 'Test memory 2' } }
          ]
        }),
        deleteOne: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({}),
        deleteAll: vi.fn().mockResolvedValue({})
      }),
      describeIndexStats: vi.fn().mockResolvedValue({
        namespaces: {
          'emp_001': { vectorCount: 100 },
          'emp_002': { vectorCount: 50 }
        }
      })
    })
  }))
}));

vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue({
    __call__: vi.fn().mockResolvedValue({
      data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]),
      size: 5
    })
  })
}));

vi.mock('redis', () => ({
  createClient: vi.fn().mockReturnValue({
    connect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setEx: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    flushAll: vi.fn().mockResolvedValue('OK'),
    quit: vi.fn().mockResolvedValue('OK')
  })
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-123')
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue(Buffer.from('test-key-32-bytes-long-exactly!!', 'utf8')),
    createCipheriv: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue(Buffer.from('encrypted-part1', 'utf8')),
      final: vi.fn().mockReturnValue(Buffer.from('encrypted-part2', 'utf8'))
    }),
    createDecipheriv: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue(Buffer.from('decrypted-part1', 'utf8')),
      final: vi.fn().mockReturnValue(Buffer.from('decrypted-part2', 'utf8'))
    })
  }
}));

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

vi.mock('dotenv', () => ({
  default: {
    config: vi.fn()
  }
}));

describe('VectorDatabaseService - Comprehensive Tests', () => {
  let service;
  let mockPinecone;
  let mockRedis;
  let mockEmbedder;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.PINECONE_API_KEY = 'test-api-key';
    process.env.PINECONE_ENVIRONMENT = 'test-env';
    process.env.PINECONE_INDEX_NAME = 'test-index';
    process.env.MEMORY_DIMENSION = '5';
    
    // Create service instance
    service = new VectorDatabaseService();
    
    // Get mock instances
    mockPinecone = service.pinecone;
    mockRedis = service.redis;
    mockEmbedder = service.embedder;
  });

  afterEach(() => {
    delete process.env.PINECONE_API_KEY;
    delete process.env.PINECONE_ENVIRONMENT;
    delete process.env.PINECONE_INDEX_NAME;
    delete process.env.MEMORY_DIMENSION;
  });

  describe('Initialization', () => {
    test('should initialize all components successfully', async () => {
      await service.initialize();
      
      expect(service.initialized).toBe(true);
      expect(service.pinecone).toBeDefined();
      expect(service.embedder).toBeDefined();
      expect(service.redis).toBeDefined();
      expect(service.index).toBeDefined();
    });

    test('should handle missing environment variables', async () => {
      delete process.env.PINECONE_API_KEY;
      
      await expect(service.initialize()).rejects.toThrow();
      expect(service.initialized).toBe(false);
    });

    test('should handle Redis connection failure', async () => {
      service.redis.connect.mockRejectedValueOnce(new Error('Redis connection failed'));
      
      await expect(service.initialize()).rejects.toThrow('Redis connection failed');
      expect(service.initialized).toBe(false);
    });

    test('should handle embedder initialization failure', async () => {
      const { pipeline } = await import('@xenova/transformers');
      pipeline.mockRejectedValueOnce(new Error('Model loading failed'));
      
      await expect(service.initialize()).rejects.toThrow('Model loading failed');
      expect(service.initialized).toBe(false);
    });

    test('should skip initialization if already initialized', async () => {
      await service.initialize();
      const firstPinecone = service.pinecone;
      
      await service.initialize();
      expect(service.pinecone).toBe(firstPinecone);
    });
  });

  describe('Memory Storage', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should store memory successfully', async () => {
      const result = await service.storeMemory('emp_001', {
        content: 'Test memory content',
        type: 'task',
        metadata: { taskId: 'task_123' }
      });
      
      expect(result.success).toBe(true);
      expect(result.id).toBe('test-uuid-123');
      expect(result.cached).toBe(true);
      
      const namespace = service.index.namespace('emp_001');
      expect(namespace.upsert).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'test-uuid-123',
          values: expect.any(Array),
          metadata: expect.objectContaining({
            employeeId: 'emp_001',
            type: 'task',
            taskId: 'task_123'
          })
        })
      ]);
    });

    test('should validate memory data', async () => {
      await expect(service.storeMemory('emp_001', {})).rejects.toThrow('Memory content is required');
      await expect(service.storeMemory('', { content: 'test' })).rejects.toThrow('Employee ID is required');
    });

    test('should handle encryption when enabled', async () => {
      process.env.ENABLE_MEMORY_ENCRYPTION = 'true';
      const newService = new VectorDatabaseService();
      await newService.initialize();
      
      await newService.storeMemory('emp_001', {
        content: 'Sensitive data',
        type: 'confidential'
      });
      
      const namespace = newService.index.namespace('emp_001');
      const call = namespace.upsert.mock.calls[0][0][0];
      expect(call.metadata.encrypted).toBe(true);
      expect(call.metadata.content).toContain('encrypted');
    });

    test('should handle storage failure', async () => {
      const namespace = service.index.namespace('emp_001');
      namespace.upsert.mockRejectedValueOnce(new Error('Storage failed'));
      
      await expect(service.storeMemory('emp_001', {
        content: 'Test content'
      })).rejects.toThrow('Storage failed');
    });

    test('should apply importance scoring', async () => {
      await service.storeMemory('emp_001', {
        content: 'Critical system failure detected',
        type: 'alert',
        metadata: { priority: 'high' }
      });
      
      const namespace = service.index.namespace('emp_001');
      const call = namespace.upsert.mock.calls[0][0][0];
      expect(call.metadata.importance).toBeGreaterThan(0.5);
    });
  });

  describe('Memory Search', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should search memories successfully', async () => {
      const results = await service.searchMemories('emp_001', 'test query', {
        topK: 5,
        threshold: 0.7
      });
      
      expect(results).toHaveLength(2);
      expect(results[0].score).toBe(0.95);
      expect(results[0].metadata.text).toBe('Test memory 1');
    });

    test('should check cache before searching', async () => {
      const cachedResult = JSON.stringify([
        { id: 'cached1', score: 0.9, metadata: { text: 'Cached memory' } }
      ]);
      service.redis.get.mockResolvedValueOnce(cachedResult);
      
      const results = await service.searchMemories('emp_001', 'test query');
      
      expect(results).toHaveLength(1);
      expect(results[0].metadata.text).toBe('Cached memory');
      expect(service.index.namespace).not.toHaveBeenCalled();
    });

    test('should handle search filters', async () => {
      await service.searchMemories('emp_001', 'test query', {
        filters: {
          type: 'task',
          timestamp: { $gte: new Date('2025-01-01') }
        }
      });
      
      const namespace = service.index.namespace('emp_001');
      expect(namespace.query).toHaveBeenCalledWith({
        vector: expect.any(Array),
        topK: 10,
        filter: {
          type: 'task',
          timestamp: { $gte: new Date('2025-01-01') }
        },
        includeMetadata: true
      });
    });

    test('should handle empty search results', async () => {
      const namespace = service.index.namespace('emp_001');
      namespace.query.mockResolvedValueOnce({ matches: [] });
      
      const results = await service.searchMemories('emp_001', 'test query');
      expect(results).toEqual([]);
    });

    test('should handle search failure', async () => {
      const namespace = service.index.namespace('emp_001');
      namespace.query.mockRejectedValueOnce(new Error('Search failed'));
      
      await expect(service.searchMemories('emp_001', 'test query')).rejects.toThrow('Search failed');
    });
  });

  describe('Memory Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should delete specific memory', async () => {
      const result = await service.deleteMemory('emp_001', 'mem_123');
      
      expect(result.success).toBe(true);
      const namespace = service.index.namespace('emp_001');
      expect(namespace.deleteOne).toHaveBeenCalledWith('mem_123');
    });

    test('should delete memories by filter', async () => {
      await service.deleteMemoriesByFilter('emp_001', {
        type: 'task',
        timestamp: { $lt: new Date('2024-01-01') }
      });
      
      const namespace = service.index.namespace('emp_001');
      expect(namespace.deleteMany).toHaveBeenCalledWith({
        type: 'task',
        timestamp: { $lt: new Date('2024-01-01') }
      });
    });

    test('should clear all memories for employee', async () => {
      await service.clearEmployeeMemories('emp_001');
      
      const namespace = service.index.namespace('emp_001');
      expect(namespace.deleteAll).toHaveBeenCalled();
      expect(service.redis.del).toHaveBeenCalled();
    });

    test('should get memory statistics', async () => {
      const stats = await service.getMemoryStats();
      
      expect(stats).toEqual({
        totalMemories: 150,
        memoryByEmployee: {
          'emp_001': 100,
          'emp_002': 50
        },
        cacheHitRate: 0,
        averageSearchTime: 0
      });
    });

    test('should archive old memories', async () => {
      const namespace = service.index.namespace('emp_001');
      namespace.query.mockResolvedValueOnce({
        matches: [
          { id: 'old1', metadata: { content: 'Old memory', timestamp: new Date('2023-01-01') } }
        ]
      });
      
      const archived = await service.archiveOldMemories('emp_001', 30);
      
      expect(archived).toBe(1);
      expect(namespace.deleteOne).toHaveBeenCalledWith('old1');
    });
  });

  describe('Context Loading', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should load context for task', async () => {
      const context = await service.loadContextForTask('emp_001', {
        description: 'Fix bug in authentication',
        skills: ['debugging', 'security']
      });
      
      expect(context).toHaveLength(2);
      expect(context[0].relevance).toBeDefined();
    });

    test('should handle context loading with no results', async () => {
      const namespace = service.index.namespace('emp_001');
      namespace.query.mockResolvedValueOnce({ matches: [] });
      
      const context = await service.loadContextForTask('emp_001', {
        description: 'New task'
      });
      
      expect(context).toEqual([]);
    });

    test('should limit context size', async () => {
      const namespace = service.index.namespace('emp_001');
      namespace.query.mockResolvedValueOnce({
        matches: Array(20).fill(null).map((_, i) => ({
          id: `mem_${i}`,
          score: 0.9 - i * 0.01,
          metadata: { text: `Memory ${i}` }
        }))
      });
      
      const context = await service.loadContextForTask('emp_001', {
        description: 'Test task'
      }, 5);
      
      expect(context).toHaveLength(5);
    });
  });

  describe('Embedding Generation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should generate embeddings for text', async () => {
      const embedding = await service.generateEmbedding('Test text');
      
      expect(embedding).toBeInstanceOf(Array);
      expect(embedding).toHaveLength(5);
      expect(embedding[0]).toBe(0.1);
    });

    test('should handle empty text', async () => {
      const embedding = await service.generateEmbedding('');
      expect(embedding).toEqual([]);
    });

    test('should handle embedding generation failure', async () => {
      service.embedder.__call__.mockRejectedValueOnce(new Error('Embedding failed'));
      
      await expect(service.generateEmbedding('Test text')).rejects.toThrow('Embedding failed');
    });

    test('should normalize embeddings', async () => {
      service.embedder.__call__.mockResolvedValueOnce({
        data: new Float32Array([3, 4, 0, 0, 0]),
        size: 5
      });
      
      const embedding = await service.generateEmbedding('Test text');
      
      // Check normalization (3,4,0,0,0) -> magnitude = 5
      expect(embedding[0]).toBeCloseTo(0.6);
      expect(embedding[1]).toBeCloseTo(0.8);
    });
  });

  describe('Encryption', () => {
    beforeEach(async () => {
      process.env.ENABLE_MEMORY_ENCRYPTION = 'true';
      await service.initialize();
    });

    test('should encrypt sensitive content', () => {
      const encrypted = service.encryptContent('Sensitive data');
      
      expect(encrypted).toContain(':');
      expect(encrypted).not.toContain('Sensitive data');
    });

    test('should decrypt encrypted content', () => {
      const encrypted = service.encryptContent('Sensitive data');
      const decrypted = service.decryptContent(encrypted);
      
      expect(decrypted).toBe('decrypted-part1decrypted-part2');
    });

    test('should handle decryption of non-encrypted content', () => {
      const result = service.decryptContent('Plain text');
      expect(result).toBe('Plain text');
    });

    test('should generate encryption key if not provided', () => {
      delete process.env.MEMORY_ENCRYPTION_KEY;
      const newService = new VectorDatabaseService();
      
      expect(newService.encryptionKey).toBeDefined();
      expect(newService.encryptionKey).toHaveLength(32);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should handle Redis errors gracefully', async () => {
      service.redis.get.mockRejectedValueOnce(new Error('Redis error'));
      
      // Should still work without cache
      const results = await service.searchMemories('emp_001', 'test query');
      expect(results).toHaveLength(2);
    });

    test('should validate memory data types', async () => {
      await expect(service.storeMemory('emp_001', {
        content: 123 // Invalid type
      })).rejects.toThrow();
    });

    test('should handle concurrent operations', async () => {
      const promises = Array(10).fill(null).map((_, i) => 
        service.storeMemory('emp_001', {
          content: `Memory ${i}`,
          type: 'test'
        })
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Cleanup and Shutdown', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should cleanup resources on shutdown', async () => {
      await service.shutdown();
      
      expect(service.redis.quit).toHaveBeenCalled();
      expect(service.initialized).toBe(false);
    });

    test('should handle shutdown errors', async () => {
      service.redis.quit.mockRejectedValueOnce(new Error('Quit failed'));
      
      // Should not throw
      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });
});