#!/usr/bin/env node

/**
 * Simple test runner for mock-only tests
 * Designed to avoid WSL2 hanging issues by using only mocks
 */

const { spawn } = require('child_process');
const path = require('path');

// Test individual files in isolation to prevent hanging
const testFiles = [
  'tests/unit/websocket-service.test.ts',
  'tests/unit/workflow-service.test.ts', 
  'tests/unit/file-service.test.ts'
];

async function runSingleTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running ${testFile}...`);
    
    const testProcess = spawn('npm', ['test', '--', testFile, '--forceExit', '--detectOpenHandles'], {
      cwd: path.join(__dirname),
      stdio: 'pipe',
      timeout: 10000 // 10 second timeout
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Timeout handling
    const timeout = setTimeout(() => {
      console.log(`⏰ Test ${testFile} timed out - killing process`);
      testProcess.kill('SIGKILL');
      reject(new Error(`Test ${testFile} timed out`));
    }, 10000);

    testProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0) {
        console.log(`✅ ${testFile} passed`);
        resolve({ file: testFile, success: true, stdout, stderr });
      } else {
        console.log(`❌ ${testFile} failed with exit code ${code}`);
        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);
        resolve({ file: testFile, success: false, stdout, stderr, exitCode: code });
      }
    });

    testProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`💥 ${testFile} errored:`, error.message);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting mock-only test execution...');
  
  const results = [];
  
  for (const testFile of testFiles) {
    try {
      const result = await runSingleTest(testFile);
      results.push(result);
    } catch (error) {
      results.push({ 
        file: testFile, 
        success: false, 
        error: error.message 
      });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.file}: ${r.error || `Exit code ${r.exitCode}`}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runSingleTest, runAllTests };