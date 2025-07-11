import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Target 80-100% coverage
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        
        // Per-file thresholds for critical components
        perFile: true,
        autoUpdate: false,
        
        // Strict thresholds for core components
        '100': [
          'src/core/AgentRegistry.ts',
          'src/core/SimpleTaskQueue.ts',
          'src/utils/index.ts'
        ],
        '90': [
          'src/core/ProcessManager.ts',
          'src/core/TaskQueue.ts'
        ],
        '80': [
          'src/api/server.ts',
          'src/api/routes.ts'
        ]
      },
      
      // Include all source files
      all: true,
      include: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,tsx}',
        '!src/types/**'
      ],
      exclude: [
        'node_modules',
        'dist',
        'coverage',
        'tests',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/mock*.ts'
      ],
      
      // Clean coverage between runs
      clean: true,
      cleanOnRerun: true,
      
      // Skip files with no tests
      skipFull: false,
      
      // Report uncovered lines
      reportOnFailure: true,
      
      // Watermarks for coverage report colors
      watermarks: {
        statements: [80, 95],
        functions: [80, 95],
        branches: [75, 90],
        lines: [80, 95]
      }
    },
    
    // Test configuration
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Reporter configuration
    reporters: ['verbose'],
    outputFile: {
      junit: './test-results/junit.xml',
      json: './test-results/results.json'
    },
    
    // Watch mode settings
    watch: false,
    
    // Fail on first test failure in CI
    bail: process.env.CI ? 1 : 0
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@api': resolve(__dirname, './src/api'),
      '@utils': resolve(__dirname, './src/utils'),
      '@config': resolve(__dirname, './src/config'),
      '@types': resolve(__dirname, './src/types')
    }
  }
});