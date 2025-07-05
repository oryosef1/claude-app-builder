#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing fixes...\n');

// Test API
console.log('Testing API...');
const apiTest = spawn('npm', ['test', '--', '--testNamePattern=should read and parse todos from todo.md', '--bail'], {
  cwd: path.join(__dirname, 'api'),
  stdio: 'pipe',
  timeout: 30000
});

apiTest.stdout.on('data', (data) => {
  console.log('API:', data.toString());
});

apiTest.stderr.on('data', (data) => {
  console.error('API Error:', data.toString());
});

apiTest.on('close', (code) => {
  console.log(`API test exited with code ${code}\n`);
  
  // Test Dashboard  
  console.log('Testing Dashboard...');
  const dashboardTest = spawn('npm', ['test', '--', 'tests/components/memory-editor.test.tsx', '--run'], {
    cwd: path.join(__dirname, 'dashboard'),
    stdio: 'pipe', 
    timeout: 30000
  });

  dashboardTest.stdout.on('data', (data) => {
    console.log('Dashboard:', data.toString());
  });

  dashboardTest.stderr.on('data', (data) => {
    console.error('Dashboard Error:', data.toString());
  });

  dashboardTest.on('close', (code) => {
    console.log(`Dashboard test exited with code ${code}`);
    console.log('🏁 Testing complete');
  });

  // Kill dashboard test after timeout
  setTimeout(() => {
    if (!dashboardTest.killed) {
      console.log('⏰ Dashboard test timeout, killing...');
      dashboardTest.kill('SIGKILL');
    }
  }, 30000);
});

// Kill API test after timeout
setTimeout(() => {
  if (!apiTest.killed) {
    console.log('⏰ API test timeout, killing...');
    apiTest.kill('SIGKILL');
  }
}, 30000);