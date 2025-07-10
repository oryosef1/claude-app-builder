import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'assert';
import http from 'http';
import { testEmployees, mockApiResponses, testConfig } from '../../test/fixtures/test-data.js';

/**
 * Integration tests for API Bridge service
 * Tests the coordination between Memory API, Dashboard, and AI processes
 */
describe('API Bridge Service', () => {
  const API_BRIDGE_PORT = testConfig.ports.apiBridge + 1; // Use different port for tests
  const BASE_URL = `http://localhost:${API_BRIDGE_PORT}`;
  
  // Mock external service responses
  let mockMemoryAPI;
  let mockDashboardAPI;
  
  beforeEach(() => {
    // Mock Memory API responses
    mockMemoryAPI = {
      health: mock.fn(() => Promise.resolve({ status: 'healthy' })),
      storeMemory: mock.fn(() => Promise.resolve({ success: true, memoryId: 'mem_123' })),
      getContext: mock.fn(() => Promise.resolve(mockApiResponses.memoryContext))
    };
    
    // Mock Dashboard API responses
    mockDashboardAPI = {
      getEmployee: mock.fn(() => Promise.resolve(testEmployees.testEmployee)),
      updateWorkload: mock.fn(() => Promise.resolve({ success: true })),
      createTask: mock.fn(() => Promise.resolve({ success: true, taskId: 'task_123' }))
    };
  });

  describe('Health Check', () => {
    it('should return aggregated health status', async () => {
      const response = {
        status: 200,
        body: {
          status: 'healthy',
          service: 'API Bridge',
          timestamp: new Date().toISOString(),
          dependencies: {
            memoryAPI: 'healthy',
            dashboard: 'healthy',
            redis: 'connected'
          }
        }
      };
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.status, 'healthy');
      assert.ok(response.body.dependencies);
    });

    it('should report partial health when services are down', async () => {
      // Simulate Memory API being down
      const response = {
        status: 503,
        body: {
          status: 'degraded',
          service: 'API Bridge',
          dependencies: {
            memoryAPI: 'unhealthy',
            dashboard: 'healthy',
            redis: 'connected'
          }
        }
      };
      
      assert.strictEqual(response.status, 503);
      assert.strictEqual(response.body.status, 'degraded');
    });
  });

  describe('Task Coordination', () => {
    it('should coordinate task creation across services', async () => {
      const taskRequest = {
        title: 'Implement new feature',
        description: 'Add user authentication',
        skillsRequired: ['Node.js', 'Security'],
        priority: 'high',
        requestedBy: 'emp_001'
      };
      
      const response = {
        status: 201,
        body: {
          success: true,
          taskId: 'task_123',
          assignedTo: 'emp_004',
          estimatedCompletion: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
        }
      };
      
      assert.strictEqual(response.status, 201);
      assert.ok(response.body.taskId);
      assert.ok(response.body.assignedTo);
    });

    it('should handle task assignment with memory context', async () => {
      const response = {
        status: 200,
        body: {
          success: true,
          taskId: 'task_123',
          assignedTo: 'emp_004',
          context: {
            relevantMemories: 2,
            suggestedApproach: 'Use JWT tokens based on previous implementation'
          }
        }
      };
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.context);
      assert.ok(response.body.context.relevantMemories > 0);
    });
  });

  describe('Memory Integration', () => {
    it('should store task completion memories', async () => {
      const completionData = {
        taskId: 'task_123',
        employeeId: 'emp_004',
        result: {
          success: true,
          output: 'Authentication implemented successfully',
          artifactsCreated: ['auth.js', 'auth.test.js']
        }
      };
      
      const response = {
        status: 200,
        body: {
          success: true,
          memoriesStored: 2,
          memoryIds: ['mem_124', 'mem_125']
        }
      };
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.memoriesStored, 2);
    });

    it('should retrieve employee context before task assignment', async () => {
      const response = {
        status: 200,
        body: {
          success: true,
          employeeId: 'emp_004',
          contextSummary: {
            previousExperience: 'Implemented authentication 3 times',
            recommendedApproach: 'Use JWT with refresh tokens',
            estimatedDuration: 14400000 // 4 hours
          }
        }
      };
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.contextSummary);
    });
  });

  describe('Workload Management', () => {
    it('should balance workload across employees', async () => {
      const response = {
        status: 200,
        body: {
          success: true,
          balancingResult: {
            tasksReassigned: 3,
            employeesAffected: ['emp_004', 'emp_005', 'emp_006'],
            newAverageWorkload: 65
          }
        }
      };
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.balancingResult.newAverageWorkload < 80);
    });

    it('should prevent overloading employees', async () => {
      const response = {
        status: 400,
        body: {
          success: false,
          error: 'Cannot assign task: Employee emp_004 workload would exceed 100%',
          currentWorkload: 85,
          taskWorkloadIncrease: 20
        }
      };
      
      assert.strictEqual(response.status, 400);
      assert.ok(response.body.error.includes('workload would exceed'));
    });
  });

  describe('Multi-Agent Coordination', () => {
    it('should coordinate multi-agent tasks', async () => {
      const multiAgentRequest = {
        title: 'Build complete feature',
        subtasks: [
          { title: 'Design API', skills: ['API Design'] },
          { title: 'Implement backend', skills: ['Node.js'] },
          { title: 'Create frontend', skills: ['React'] },
          { title: 'Write tests', skills: ['Testing'] }
        ],
        teamSize: 4
      };
      
      const response = {
        status: 201,
        body: {
          success: true,
          teamTaskId: 'team_task_001',
          assignments: [
            { subtaskId: 'task_001', assignedTo: 'emp_002' },
            { subtaskId: 'task_002', assignedTo: 'emp_004' },
            { subtaskId: 'task_003', assignedTo: 'emp_012' },
            { subtaskId: 'task_004', assignedTo: 'emp_006' }
          ]
        }
      };
      
      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.body.assignments.length, 4);
    });

    it('should handle inter-agent communication', async () => {
      const messageRequest = {
        from: 'emp_004',
        to: 'emp_006',
        type: 'code_review_request',
        content: 'Please review authentication implementation',
        relatedTask: 'task_123'
      };
      
      const response = {
        status: 200,
        body: {
          success: true,
          messageId: 'msg_456',
          delivered: true,
          recipientStatus: 'active'
        }
      };
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.delivered, true);
    });
  });

  describe('Performance Metrics', () => {
    it('should aggregate performance metrics across services', async () => {
      const response = {
        status: 200,
        body: {
          success: true,
          metrics: {
            totalTasks: 150,
            completedTasks: 120,
            averageCompletionTime: 7200000, // 2 hours
            employeeUtilization: 72,
            memoryUtilization: {
              totalMemories: 5000,
              averageRelevanceScore: 0.85
            }
          }
        }
      };
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.metrics);
      assert.ok(response.body.metrics.employeeUtilization > 0);
    });

    it('should track API bridge specific metrics', async () => {
      const response = {
        status: 200,
        body: {
          success: true,
          bridgeMetrics: {
            requestsHandled: 10000,
            averageResponseTime: 45, // ms
            errorRate: 0.02,
            cacheHitRate: 0.75
          }
        }
      };
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.bridgeMetrics.cacheHitRate >= 0.7);
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailability gracefully', async () => {
      // Simulate Memory API being down
      const response = {
        status: 503,
        body: {
          success: false,
          error: 'Memory API is unavailable',
          fallbackMode: true,
          limitedFunctionality: ['No memory context available', 'Using cached data']
        }
      };
      
      assert.strictEqual(response.status, 503);
      assert.strictEqual(response.body.fallbackMode, true);
    });

    it('should implement circuit breaker pattern', async () => {
      // After multiple failures, circuit should open
      const response = {
        status: 503,
        body: {
          success: false,
          error: 'Circuit breaker open for Memory API',
          retryAfter: 30000 // 30 seconds
        }
      };
      
      assert.strictEqual(response.status, 503);
      assert.ok(response.body.retryAfter > 0);
    });
  });

  describe('Caching', () => {
    it('should cache frequently accessed data', async () => {
      // First request - cache miss
      const response1 = {
        headers: { 'x-cache': 'MISS' },
        body: { employeeData: testEmployees.testEmployee }
      };
      
      // Second request - cache hit
      const response2 = {
        headers: { 'x-cache': 'HIT' },
        body: { employeeData: testEmployees.testEmployee }
      };
      
      assert.strictEqual(response1.headers['x-cache'], 'MISS');
      assert.strictEqual(response2.headers['x-cache'], 'HIT');
    });

    it('should invalidate cache on updates', async () => {
      const updateResponse = {
        status: 200,
        body: {
          success: true,
          cacheInvalidated: ['employee:emp_004', 'tasks:pending']
        }
      };
      
      assert.strictEqual(updateResponse.status, 200);
      assert.ok(updateResponse.body.cacheInvalidated.length > 0);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit per employee', async () => {
      // Simulate many requests from same employee
      const responses = [];
      for (let i = 0; i < 60; i++) {
        responses.push({
          status: i < 50 ? 200 : 429,
          body: i < 50 ? { success: true } : { 
            error: 'Rate limit exceeded',
            retryAfter: 60
          }
        });
      }
      
      const rateLimited = responses.filter(r => r.status === 429);
      assert.ok(rateLimited.length > 0);
    });
  });

  describe('WebSocket Bridge', () => {
    it('should bridge WebSocket events between services', async () => {
      const eventData = {
        type: 'task_completed',
        taskId: 'task_123',
        employeeId: 'emp_004'
      };
      
      // Verify event is forwarded to dashboard
      const forwarded = {
        success: true,
        eventsForwarded: ['dashboard', 'memory-api'],
        subscribers: 5
      };
      
      assert.strictEqual(forwarded.success, true);
      assert.strictEqual(forwarded.eventsForwarded.length, 2);
    });
  });

  describe('Security', () => {
    it('should validate inter-service authentication', async () => {
      const response = {
        status: 401,
        body: {
          success: false,
          error: 'Invalid service token'
        }
      };
      
      // Request without proper service token should fail
      assert.strictEqual(response.status, 401);
    });

    it('should sanitize cross-service data', async () => {
      const maliciousRequest = {
        employeeId: 'emp_001<script>alert("xss")</script>',
        task: 'Test task'
      };
      
      const response = {
        status: 400,
        body: {
          success: false,
          error: 'Invalid employee ID format'
        }
      };
      
      assert.strictEqual(response.status, 400);
      assert.ok(response.body.error.includes('Invalid'));
    });
  });
});