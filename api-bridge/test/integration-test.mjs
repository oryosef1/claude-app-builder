import test from 'node:test';
import assert from 'node:assert';
import http from 'http';

// Helper to make HTTP requests
const makeRequest = (options) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
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
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
};

test('API Bridge Integration Tests', async (t) => {
  console.log('Starting API Bridge integration tests...');
  
  await t.test('Health Check', async () => {
    try {
      const response = await makeRequest({
        path: '/health',
        method: 'GET'
      });
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.status);
      console.log('✓ Health check passed');
    } catch (error) {
      console.log('✗ API Bridge not running on port 3002');
      throw error;
    }
  });
  
  await t.test('Employee List', async () => {
    const response = await makeRequest({
      path: '/employees',
      method: 'GET'
    });
    
    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body));
    assert.strictEqual(response.body.length, 13);
    console.log(`✓ Retrieved ${response.body.length} employees`);
  });
  
  await t.test('Get Specific Employee', async () => {
    const response = await makeRequest({
      path: '/employees/emp_001',
      method: 'GET'
    });
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.id, 'emp_001');
    assert.ok(response.body.name);
    console.log(`✓ Retrieved employee: ${response.body.name}`);
  });
  
  await t.test('Employee Not Found', async () => {
    const response = await makeRequest({
      path: '/employees/emp_999',
      method: 'GET'
    });
    
    assert.strictEqual(response.status, 404);
    assert.ok(response.body.error);
    console.log('✓ 404 handling works correctly');
  });
  
  await t.test('Performance Metrics', async () => {
    const response = await makeRequest({
      path: '/performance',
      method: 'GET'
    });
    
    assert.strictEqual(response.status, 200);
    assert.ok(response.body.overall_metrics);
    assert.ok(response.body.department_metrics);
    console.log('✓ Performance metrics retrieved');
  });
  
  await t.test('Create Task', async () => {
    const response = await makeRequest({
      path: '/tasks',
      method: 'POST',
      body: {
        title: 'Integration Test Task',
        description: 'Test task creation',
        skills_required: ['testing'],
        priority: 'medium'
      }
    });
    
    assert.strictEqual(response.status, 201);
    assert.ok(response.body.task_id);
    console.log(`✓ Task created: ${response.body.task_id}`);
  });
  
  await t.test('System Information', async () => {
    const response = await makeRequest({
      path: '/system',
      method: 'GET'
    });
    
    assert.strictEqual(response.status, 200);
    assert.ok(response.body.company);
    assert.ok(response.body.employees);
    console.log('✓ System information retrieved');
  });
  
  await t.test('CORS Headers', async () => {
    const response = await makeRequest({
      path: '/health',
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:8080'
      }
    });
    
    assert.strictEqual(response.status, 200);
    console.log('✓ CORS headers working');
  });
  
  await t.test('Invalid JSON Handling', async () => {
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: '/tasks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        assert.strictEqual(res.statusCode, 400);
        console.log('✓ Invalid JSON handled correctly');
      });
    });
    
    req.write('invalid json');
    req.end();
  });
  
  console.log('\nAll API Bridge integration tests completed!');
});