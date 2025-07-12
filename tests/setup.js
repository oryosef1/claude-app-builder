// Test setup file
import { vi } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables
process.env.PINECONE_API_KEY = 'test-api-key';
process.env.PINECONE_INDEX_NAME = 'test-index';
process.env.PINECONE_ENVIRONMENT = 'test-env';

// Global test utilities
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};