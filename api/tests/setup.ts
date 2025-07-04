import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test environment setup
beforeAll(() => {
  // Create test directories
  const testDirs = [
    'test-workspace',
    'test-workspace/logs',
    'test-workspace/projects'
  ];
  
  testDirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.WORKSPACE_PATH = path.join(__dirname, '..', 'test-workspace');
  process.env.LOG_LEVEL = 'debug';
});

afterAll(() => {
  // Clean up test directories
  const testWorkspace = path.join(__dirname, '..', 'test-workspace');
  if (fs.existsSync(testWorkspace)) {
    fs.rmSync(testWorkspace, { recursive: true, force: true });
  }
});

// Mock console methods for cleaner test output
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});