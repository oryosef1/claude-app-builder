import test from 'node:test';
import assert from 'node:assert';
import http from 'http';

console.log('Starting API Bridge integration tests...\n');

// Read port from file
import { readFileSync } from 'fs';
let port = 3002;
try {
  const portInfo = JSON.parse(readFileSync('.api-bridge-port', 'utf8'));
  port = portInfo.port;
  console.log(`Using API Bridge on port ${port}\n`);
} catch (e) {
  console.log('Using default port 3002\n');
}

// Helper to make HTTP requests
const makeRequest = (path, options = {}) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method: options.method || 'GET',
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
        } catch (e) {
          console.log('Response:', data);
          resolve({
            status: res.statusCode,
            body: data
          });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
};

// Run tests
test('API Bridge Integration', async (t) => {
  
  await t.test('Health Check', async () => {
    const res = await makeRequest('/api/system/health');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.status);
    console.log('✓ Health check passed');
  });
  
  await t.test('Employee List', async () => {
    const res = await makeRequest('/api/employees');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 13);
    console.log(`✓ Found ${res.body.length} employees`);
  });
  
  await t.test('Get Employee', async () => {
    const res = await makeRequest('/api/employees/emp_001');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, 'emp_001');
    console.log(`✓ Retrieved employee: ${res.body.name}`);
  });
  
  await t.test('Performance Metrics', async () => {
    const res = await makeRequest('/api/performance');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.overall_metrics);
    console.log('✓ Performance metrics working');
  });
  
  await t.test('Create Task', async () => {
    const res = await makeRequest('/api/workflows/tasks', {
      method: 'POST',
      body: {
        title: 'Integration Test',
        description: 'Test task',
        skills_required: ['testing'],
        priority: 'medium'
      }
    });
    assert.strictEqual(res.status, 201);
    console.log(`✓ Task created: ${res.body.task_id}`);
  });
  
  console.log('\n✅ All API Bridge integration tests passed!');
});