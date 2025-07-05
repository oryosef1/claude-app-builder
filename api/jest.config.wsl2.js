// WSL2-optimized Jest configuration
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // WSL2-specific optimizations
  maxWorkers: 1,              // Single worker process
  cache: false,              // Disable Jest cache
  watchman: false,           // Disable file watching
  testTimeout: 30000,        // Longer timeout
  forceExit: true,           // Force exit after tests
  detectOpenHandles: true,   // Detect hanging handles
  verbose: true,             // More output for debugging
  
  // Memory and process management
  logHeapUsage: true,
  maxConcurrency: 1,
  
  // Disable problematic features in WSL2
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};