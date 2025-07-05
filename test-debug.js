const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Debugging Test Issues...\n');

// Test API dependencies and setup
const apiPath = path.join(__dirname, 'api');

console.log('📍 API Directory:', apiPath);
console.log('📍 Current Working Directory:', process.cwd());

// Try to run a simple Jest command with detailed output
const jestProcess = spawn('npx', ['jest', '--version'], {
  cwd: apiPath,
  stdio: ['pipe', 'pipe', 'pipe']
});

jestProcess.stdout.on('data', (data) => {
  console.log('✅ Jest Version:', data.toString().trim());
});

jestProcess.stderr.on('data', (data) => {
  console.log('❌ Jest Error:', data.toString());
});

jestProcess.on('close', (code) => {
  console.log(`\n📊 Jest version check exit code: ${code}`);
  
  if (code === 0) {
    console.log('\n🔍 Trying to run Jest with debug info...');
    
    // Try to run Jest with more debug info
    const debugProcess = spawn('npx', ['jest', '--listTests', '--verbose'], {
      cwd: apiPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    debugProcess.stdout.on('data', (data) => {
      console.log('📋 Test Files Found:');
      console.log(data.toString());
    });

    debugProcess.stderr.on('data', (data) => {
      console.log('❌ Jest Debug Error:');
      console.log(data.toString());
    });

    debugProcess.on('close', (debugCode) => {
      console.log(`\n📊 Jest debug exit code: ${debugCode}`);
      
      if (debugCode === 0) {
        console.log('\n🚀 Trying to run one simple test...');
        
        // Try to run one test file with maximum debugging
        const testProcess = spawn('npx', ['jest', 'tests/unit/file-service.test.ts', '--forceExit', '--detectOpenHandles', '--verbose'], {
          cwd: apiPath,
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 10000
        });

        testProcess.stdout.on('data', (data) => {
          console.log('📝 Test Output:');
          console.log(data.toString());
        });

        testProcess.stderr.on('data', (data) => {
          console.log('❌ Test Error:');
          console.log(data.toString());
        });

        testProcess.on('close', (testCode) => {
          console.log(`\n📊 Test exit code: ${testCode}`);
        });

        // Kill process after timeout
        setTimeout(() => {
          if (!testProcess.killed) {
            console.log('\n⏰ Test timeout - killing process');
            testProcess.kill('SIGKILL');
          }
        }, 10000);
      }
    });
  }
});

jestProcess.on('error', (error) => {
  console.log('❌ Jest Process Error:', error.message);
});