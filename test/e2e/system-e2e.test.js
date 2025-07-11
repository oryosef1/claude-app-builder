import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import http from 'http';
import { setTimeout } from 'timers/promises';

describe('POE Helper System E2E Tests', () => {
  let memoryApiProcess;
  let apiBridgeProcess;
  let dashboardBackendProcess;
  
  const services = {
    memoryApi: { port: 3337, name: 'Memory API' },
    apiBridge: { port: 3003, name: 'API Bridge' },
    dashboard: { port: 8082, name: 'Dashboard Backend' }
  };
  
  // Helper to check if service is ready
  const waitForService = async (port, path = '/health', maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await new Promise((resolve, reject) => {
          http.get(`http://localhost:${port}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
          }).on('error', reject);
        });
        
        if (response.status === 200) {
          return true;
        }
      } catch (e) {
        // Service not ready yet
      }
      await setTimeout(1000);
    }
    return false;
  };
  
  // Helper to make HTTP requests
  const makeRequest = (port, options, body = null) => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port,
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
              body: data ? JSON.parse(data) : null
            });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  before(async () => {
    console.log('Starting all services for E2E tests...');
    
    // Start Memory API
    memoryApiProcess = spawn('node', ['src/index.js'], {
      env: { ...process.env, API_PORT: services.memoryApi.port },
      cwd: process.cwd()
    });
    
    // Start API Bridge
    apiBridgeProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: services.apiBridge.port },
      cwd: 'api-bridge'
    });
    
    // Start Dashboard Backend
    dashboardBackendProcess = spawn('npm', ['start'], {
      env: { ...process.env, PORT: services.dashboard.port },
      cwd: 'dashboard/backend',
      shell: true
    });
    
    // Wait for all services to be ready
    console.log('Waiting for services to start...');
    const serviceChecks = await Promise.all([
      waitForService(services.memoryApi.port),
      waitForService(services.apiBridge.port),
      waitForService(services.dashboard.port)
    ]);
    
    if (!serviceChecks.every(check => check)) {
      throw new Error('One or more services failed to start');
    }
    
    console.log('All services are ready!');
  });

  after(async () => {
    console.log('Stopping all services...');
    
    // Kill all processes
    [memoryApiProcess, apiBridgeProcess, dashboardBackendProcess].forEach(proc => {
      if (proc) {
        proc.kill('SIGTERM');
        setTimeout(() => {
          if (!proc.killed) proc.kill('SIGKILL');
        }, 2000);
      }
    });
    
    await setTimeout(3000);
  });

  describe('Full System Workflow', () => {
    it('should complete end-to-end task assignment workflow', async () => {
      // Step 1: Check all services are healthy
      const healthChecks = await Promise.all([
        makeRequest(services.memoryApi.port, { path: '/health', method: 'GET' }),
        makeRequest(services.apiBridge.port, { path: '/health', method: 'GET' }),
        makeRequest(services.dashboard.port, { path: '/health', method: 'GET' })
      ]);
      
      healthChecks.forEach((check, index) => {
        assert.strictEqual(check.status, 200, `Service ${index} should be healthy`);
      });
      
      // Step 2: Get employee list from API Bridge
      const employeesResponse = await makeRequest(services.apiBridge.port, {
        path: '/employees',
        method: 'GET'
      });
      
      assert.strictEqual(employeesResponse.status, 200);
      assert.ok(Array.isArray(employeesResponse.body));
      assert.strictEqual(employeesResponse.body.length, 13);
      
      // Step 3: Create a task via Dashboard Backend
      const newTask = {
        title: 'E2E Test Task',
        description: 'Implement a new feature for E2E testing',
        priority: 8,
        requiredSkills: ['javascript', 'testing']
      };
      
      const taskResponse = await makeRequest(services.dashboard.port, {
        path: '/api/tasks',
        method: 'POST'
      }, newTask);
      
      assert.strictEqual(taskResponse.status, 201);
      assert.ok(taskResponse.body.id);
      const taskId = taskResponse.body.id;
      
      // Step 4: Assign task to best employee
      const assignResponse = await makeRequest(services.dashboard.port, {
        path: '/api/tasks/assign',
        method: 'POST'
      }, {
        taskId,
        autoAssign: true
      });
      
      assert.strictEqual(assignResponse.status, 200);
      assert.ok(assignResponse.body.assignedTo);
      
      // Step 5: Store task assignment memory
      const memory = {
        employeeId: assignResponse.body.assignedTo,
        content: `Assigned to E2E test task: ${newTask.title}`,
        context: {
          task_id: taskId,
          assignment_reason: assignResponse.body.reason
        },
        metadata: {
          importance: 7,
          category: 'task_assignment'
        }
      };
      
      const memoryResponse = await makeRequest(services.memoryApi.port, {
        path: '/api/memory/experience',
        method: 'POST'
      }, memory);
      
      // Memory storage might fail due to Pinecone, but API should respond
      assert.ok([200, 500].includes(memoryResponse.status));
      
      // Step 6: Verify task appears in employee's workload
      const agentResponse = await makeRequest(services.dashboard.port, {
        path: `/api/agents/${assignResponse.body.assignedTo}`,
        method: 'GET'
      });
      
      assert.strictEqual(agentResponse.status, 200);
      assert.ok(agentResponse.body.currentTasks >= 0);
    });

    it('should handle process spawning and management', async () => {
      // Spawn a new Claude process
      const spawnResponse = await makeRequest(services.dashboard.port, {
        path: '/api/processes/spawn',
        method: 'POST'
      }, {
        role: 'developer',
        systemPrompt: 'You are a developer working on E2E tests',
        task: 'Review and improve test coverage'
      });
      
      assert.strictEqual(spawnResponse.status, 200);
      assert.ok(spawnResponse.body.id);
      const processId = spawnResponse.body.id;
      
      // Get process status
      const statusResponse = await makeRequest(services.dashboard.port, {
        path: `/api/processes/${processId}`,
        method: 'GET'
      });
      
      assert.strictEqual(statusResponse.status, 200);
      assert.strictEqual(statusResponse.body.status, 'running');
      
      // Stop the process
      const stopResponse = await makeRequest(services.dashboard.port, {
        path: `/api/processes/${processId}/stop`,
        method: 'POST'
      });
      
      assert.strictEqual(stopResponse.status, 200);
      
      // Verify process is stopped
      await setTimeout(1000);
      const finalStatus = await makeRequest(services.dashboard.port, {
        path: `/api/processes/${processId}`,
        method: 'GET'
      });
      
      assert.ok(['stopped', 'completed'].includes(finalStatus.body.status));
    });

    it('should handle cross-service data flow', async () => {
      // Get performance data from API Bridge
      const perfResponse = await makeRequest(services.apiBridge.port, {
        path: '/performance',
        method: 'GET'
      });
      
      assert.strictEqual(perfResponse.status, 200);
      assert.ok(perfResponse.body.overall_metrics);
      
      // Use performance data to make task assignment decision
      const employees = perfResponse.body.employee_metrics;
      const topPerformer = Object.entries(employees)
        .sort(([,a], [,b]) => b.average_score - a.average_score)[0];
      
      if (topPerformer) {
        // Check if Dashboard knows about this employee
        const agentResponse = await makeRequest(services.dashboard.port, {
          path: `/api/agents/${topPerformer[0]}`,
          method: 'GET'
        });
        
        assert.strictEqual(agentResponse.status, 200);
        assert.strictEqual(agentResponse.body.id, topPerformer[0]);
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle service unavailability gracefully', async () => {
      // Try to access a service that doesn't exist
      const response = await makeRequest(services.dashboard.port, {
        path: '/api/services/nonexistent/health',
        method: 'GET'
      });
      
      // Should return error but not crash
      assert.ok([404, 503].includes(response.status));
    });

    it('should handle invalid data gracefully', async () => {
      // Send invalid task data
      const invalidTask = {
        title: '', // Empty title
        priority: 'high' // Should be number
      };
      
      const response = await makeRequest(services.dashboard.port, {
        path: '/api/tasks',
        method: 'POST'
      }, invalidTask);
      
      assert.strictEqual(response.status, 400);
      assert.ok(response.body.error);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle multiple concurrent operations', async () => {
      const operations = [];
      
      // Create 5 tasks concurrently
      for (let i = 0; i < 5; i++) {
        operations.push(
          makeRequest(services.dashboard.port, {
            path: '/api/tasks',
            method: 'POST'
          }, {
            title: `Concurrent Task ${i}`,
            description: 'Testing concurrent operations',
            priority: 5
          })
        );
      }
      
      // Get employee list 5 times
      for (let i = 0; i < 5; i++) {
        operations.push(
          makeRequest(services.apiBridge.port, {
            path: '/employees',
            method: 'GET'
          })
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;
      
      // All should complete successfully
      results.forEach(result => {
        assert.ok([200, 201].includes(result.status));
      });
      
      // Should complete in reasonable time (< 5 seconds)
      assert.ok(duration < 5000, `Operations took ${duration}ms`);
      
      console.log(`Completed 10 concurrent operations in ${duration}ms`);
    });
  });
});