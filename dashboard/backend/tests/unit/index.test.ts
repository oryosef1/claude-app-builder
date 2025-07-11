import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the server startup
vi.mock('../../src/api/server.js', () => ({
  startServer: vi.fn().mockResolvedValue({ port: 8080 })
}));

describe('Application Entry Point', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should start the application', async () => {
    // Import will trigger the startup
    await import('../../src/index.js');
    
    // Verify server was started
    const { startServer } = await import('../../src/api/server.js');
    expect(startServer).toHaveBeenCalled();
  });
});