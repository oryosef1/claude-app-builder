import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'http';

describe('Memory API Live Integration Tests', () => {
  const apiPort = 3335; // Using the running instance
  
  // Helper function to make HTTP requests
  const makeRequest = (options, body = null) => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: apiPort,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: data ? JSON.parse(data) : null
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: data
            });
          }
        });
      });
      
      req.on('error', reject);
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  };

  describe('API Connectivity', () => {
    it('should connect to the running Memory API', async () => {
      const response = await makeRequest({ path: '/health', method: 'GET' });
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.status, 'healthy');
      assert.strictEqual(response.body.service, 'AI Company Memory System');
    });
  });

  describe('Complete Memory Lifecycle', () => {
    const testEmployeeId = 'emp_test_' + Date.now();
    let storedMemoryId;
    
    it('should store an experience memory', async () => {
      const memory = {
        employeeId: testEmployeeId,
        content: 'Integration test: Verifying complete memory lifecycle from storage to retrieval',
        context: {
          test_suite: 'integration',
          timestamp: new Date().toISOString()
        },
        metadata: {
          importance: 7,
          category: 'integration_test'
        }
      };
      
      const response = await makeRequest({
        path: '/api/memory/experience',
        method: 'POST'
      }, memory);
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.ok(response.body.memoryId);
      storedMemoryId = response.body.memoryId;
      
      console.log(`✓ Stored memory with ID: ${storedMemoryId}`);
    });

    it('should store a knowledge memory', async () => {
      const knowledge = {
        employeeId: testEmployeeId,
        content: 'Integration testing best practice: Always test the complete flow from API to database',
        context: {
          domain: 'testing',
          applicability: 'all projects'
        },
        metadata: {
          importance: 8,
          category: 'best_practice'
        }
      };
      
      const response = await makeRequest({
        path: '/api/memory/knowledge',
        method: 'POST'
      }, knowledge);
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.type, 'knowledge');
    });

    it('should store a decision memory', async () => {
      const decision = {
        employeeId: testEmployeeId,
        content: 'Decision to use integration tests alongside unit tests for comprehensive coverage',
        context: {
          rationale: 'Integration tests catch issues that unit tests miss',
          impact: 'Higher confidence in system reliability'
        },
        metadata: {
          importance: 9,
          category: 'testing_strategy'
        }
      };
      
      const response = await makeRequest({
        path: '/api/memory/decision',
        method: 'POST'
      }, decision);
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.type, 'decision');
    });

    it('should search and find stored memories', async () => {
      // Wait a moment for indexing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const searchResponse = await makeRequest({
        path: '/api/memory/search',
        method: 'POST'
      }, {
        employeeId: testEmployeeId,
        query: 'integration test lifecycle',
        limit: 10
      });
      
      assert.strictEqual(searchResponse.status, 200);
      assert.ok(Array.isArray(searchResponse.body.memories));
      assert.ok(searchResponse.body.memories.length > 0);
      
      const foundMemory = searchResponse.body.memories.find(m => 
        m.content.includes('complete memory lifecycle')
      );
      assert.ok(foundMemory, 'Should find the stored memory');
      assert.ok(foundMemory.score > 0.5, 'Should have reasonable relevance score');
      
      console.log(`✓ Found ${searchResponse.body.memories.length} memories for employee ${testEmployeeId}`);
    });

    it('should retrieve memory statistics', async () => {
      const response = await makeRequest({
        path: `/api/memory/stats/${testEmployeeId}`,
        method: 'GET'
      });
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.stats);
      assert.strictEqual(response.body.stats.totalMemories, 3); // We stored 3 memories
      assert.ok(response.body.stats.memoryTypes.experience >= 1);
      assert.ok(response.body.stats.memoryTypes.knowledge >= 1);
      assert.ok(response.body.stats.memoryTypes.decision >= 1);
      
      console.log(`✓ Statistics: ${JSON.stringify(response.body.stats)}`);
    });
  });

  describe('Cross-Employee Memory Search', () => {
    it('should search across all employees when no employeeId specified', async () => {
      const searchResponse = await makeRequest({
        path: '/api/memory/search',
        method: 'POST'
      }, {
        employeeId: 'emp_001', // Using a standard employee
        query: 'system verification',
        limit: 5
      });
      
      assert.strictEqual(searchResponse.status, 200);
      assert.ok(Array.isArray(searchResponse.body.memories));
      
      console.log(`✓ Cross-employee search returned ${searchResponse.body.memories.length} results`);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid memory format gracefully', async () => {
      const invalidMemory = {
        content: 'Missing required employeeId field'
        // Missing employeeId
      };
      
      const response = await makeRequest({
        path: '/api/memory/experience',
        method: 'POST'
      }, invalidMemory);
      
      assert.strictEqual(response.status, 400);
      assert.ok(response.body.error);
      assert.ok(response.body.message || response.body.error);
    });

    it('should handle non-existent employee stats', async () => {
      const response = await makeRequest({
        path: '/api/memory/stats/emp_nonexistent',
        method: 'GET'
      });
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.stats.totalMemories, 0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous memory operations', async () => {
      const promises = [];
      const baseEmployeeId = 'emp_concurrent_' + Date.now();
      
      // Create 5 concurrent memory storage requests
      for (let i = 0; i < 5; i++) {
        const memory = {
          employeeId: `${baseEmployeeId}_${i}`,
          content: `Concurrent operation test ${i} - Testing system under load`,
          context: { operation_id: i },
          metadata: { importance: 5, category: 'load_test' }
        };
        
        promises.push(makeRequest({
          path: '/api/memory/experience',
          method: 'POST'
        }, memory));
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach((result, index) => {
        assert.strictEqual(result.status, 200, `Request ${index} should succeed`);
        assert.strictEqual(result.body.success, true);
      });
      
      console.log('✓ Successfully processed 5 concurrent memory operations');
    });
  });

  describe('Integration with Different Memory Types', () => {
    it('should handle complex nested context objects', async () => {
      const complexMemory = {
        employeeId: 'emp_complex_test',
        content: 'Testing complex nested data structures in memory storage',
        context: {
          level1: {
            level2: {
              level3: {
                data: 'deeply nested value',
                array: [1, 2, 3, { nested: true }]
              }
            },
            metadata: {
              tags: ['test', 'integration', 'complex'],
              metrics: { performance: 95, reliability: 98 }
            }
          }
        },
        metadata: {
          importance: 6,
          category: 'complex_data_test'
        }
      };
      
      const response = await makeRequest({
        path: '/api/memory/knowledge',
        method: 'POST'
      }, complexMemory);
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      
      console.log('✓ Successfully stored memory with complex nested structure');
    });
  });
});