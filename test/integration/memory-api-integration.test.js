import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import http from 'http';
import { setTimeout } from 'timers/promises';

describe('Memory API Integration Tests', () => {
  let apiProcess;
  let apiPort = 3335;
  
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

  // Start the Memory API before tests
  before(async () => {
    console.log('Starting Memory API for integration tests...');
    
    // Start the API in a child process
    apiProcess = spawn('node', ['src/index.js'], {
      env: { ...process.env, API_PORT: apiPort },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Capture stdout/stderr for debugging
    apiProcess.stdout.on('data', (data) => {
      console.log(`API stdout: ${data}`);
    });
    
    apiProcess.stderr.on('data', (data) => {
      console.error(`API stderr: ${data}`);
    });
    
    // Wait for API to be ready
    let attempts = 0;
    while (attempts < 30) {
      try {
        const response = await makeRequest({ path: '/health', method: 'GET' });
        if (response.status === 200) {
          console.log('Memory API is ready!');
          break;
        }
      } catch (e) {
        // API not ready yet
      }
      await setTimeout(1000);
      attempts++;
    }
    
    if (attempts >= 30) {
      throw new Error('Memory API failed to start');
    }
  });

  // Stop the API after tests
  after(async () => {
    if (apiProcess) {
      console.log('Stopping Memory API...');
      apiProcess.kill('SIGTERM');
      await setTimeout(1000);
      if (!apiProcess.killed) {
        apiProcess.kill('SIGKILL');
      }
    }
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await makeRequest({ path: '/health', method: 'GET' });
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.status, 'healthy');
      assert.strictEqual(response.body.service, 'AI Company Memory System');
    });
  });

  describe('Memory Storage Integration', () => {
    it('should store and retrieve an experience memory', async () => {
      const memory = {
        employeeId: 'emp_test_001',
        content: 'Integration test memory - verifying full storage and retrieval flow',
        context: {
          test_id: Date.now(),
          test_type: 'integration'
        },
        metadata: {
          importance: 5,
          category: 'test_memory'
        }
      };
      
      // Store memory
      const storeResponse = await makeRequest({
        path: '/api/memory/experience',
        method: 'POST'
      }, memory);
      
      assert.strictEqual(storeResponse.status, 200);
      assert.strictEqual(storeResponse.body.success, true);
      assert.ok(storeResponse.body.memoryId);
      assert.strictEqual(storeResponse.body.employeeId, 'emp_test_001');
      assert.strictEqual(storeResponse.body.type, 'experience');
      
      // Wait a bit for indexing
      await setTimeout(2000);
      
      // Search for the memory
      const searchResponse = await makeRequest({
        path: '/api/memory/search',
        method: 'POST'
      }, {
        employeeId: 'emp_test_001',
        query: 'Integration test memory',
        limit: 5
      });
      
      assert.strictEqual(searchResponse.status, 200);
      assert.ok(Array.isArray(searchResponse.body.memories));
      assert.ok(searchResponse.body.memories.length > 0);
      
      const foundMemory = searchResponse.body.memories[0];
      assert.ok(foundMemory.content.includes('Integration test memory'));
      assert.ok(foundMemory.score > 0.7); // Should have high relevance
    });

    it('should store knowledge memory with proper categorization', async () => {
      const knowledge = {
        employeeId: 'emp_test_002',
        content: 'Best practice: Always use integration tests to verify API endpoints work correctly with real services',
        context: {
          domain: 'testing',
          technology: 'Node.js'
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

    it('should store decision memory with rationale', async () => {
      const decision = {
        employeeId: 'emp_test_002',
        content: 'Decided to use Redis for task queue due to reliability and Bull integration',
        context: {
          alternatives: ['RabbitMQ', 'AWS SQS', 'In-memory queue'],
          decision_factors: ['Reliability', 'Performance', 'Cost']
        },
        metadata: {
          importance: 9,
          category: 'architecture_decision'
        }
      };
      
      const response = await makeRequest({
        path: '/api/memory/decision',
        method: 'POST'
      }, decision);
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.type, 'decision');
    });
  });

  describe('Memory Statistics', () => {
    it('should retrieve memory statistics for an employee', async () => {
      const response = await makeRequest({
        path: '/api/memory/stats/emp_test_001',
        method: 'GET'
      });
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.stats);
      assert.ok(typeof response.body.stats.totalMemories === 'number');
      assert.ok(typeof response.body.stats.estimatedSizeMB === 'number');
      assert.ok(response.body.stats.memoryTypes);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid memory format', async () => {
      const invalidMemory = {
        // Missing required fields
        content: 'Test content'
      };
      
      const response = await makeRequest({
        path: '/api/memory/experience',
        method: 'POST'
      }, invalidMemory);
      
      assert.strictEqual(response.status, 400);
      assert.ok(response.body.error);
    });

    it('should handle search with missing parameters', async () => {
      const response = await makeRequest({
        path: '/api/memory/search',
        method: 'POST'
      }, {
        // Missing employeeId
        query: 'test'
      });
      
      assert.strictEqual(response.status, 400);
    });
  });

  describe('CORS and Security', () => {
    it('should include proper CORS headers', async () => {
      const response = await makeRequest({
        path: '/health',
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:8080'
        }
      });
      
      assert.ok(response.headers['access-control-allow-credentials']);
      assert.ok(response.headers['vary'].includes('Origin'));
    });

    it('should handle OPTIONS requests for CORS preflight', async () => {
      const response = await makeRequest({
        path: '/api/memory/experience',
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:8080',
          'Access-Control-Request-Method': 'POST'
        }
      });
      
      assert.strictEqual(response.status, 204);
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent memory storage requests', async () => {
      const promises = [];
      const startTime = Date.now();
      
      // Create 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        const memory = {
          employeeId: `emp_perf_${i % 3}`,
          content: `Performance test memory ${i} - testing concurrent operations`,
          context: { test_id: i },
          metadata: { importance: 5, category: 'performance_test' }
        };
        
        promises.push(makeRequest({
          path: '/api/memory/experience',
          method: 'POST'
        }, memory));
      }
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // All requests should succeed
      results.forEach(result => {
        assert.strictEqual(result.status, 200);
        assert.strictEqual(result.body.success, true);
      });
      
      // Should complete within reasonable time (5 seconds for 10 requests)
      assert.ok(duration < 5000, `Took ${duration}ms to process 10 requests`);
      console.log(`Processed 10 concurrent requests in ${duration}ms`);
    });
  });
});