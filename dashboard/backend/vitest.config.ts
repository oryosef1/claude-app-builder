import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.d.ts',
        'vitest.config.ts',
        'jest.config.js'
      ]
    },
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000
  }
});