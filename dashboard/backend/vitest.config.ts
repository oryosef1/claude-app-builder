import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.d.ts',
        'vitest.config.ts',
        'jest.config.js',
        'coverage/**'
      ],
      all: true
    },
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000
  }
});