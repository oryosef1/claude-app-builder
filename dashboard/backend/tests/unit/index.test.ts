import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock all external dependencies
vi.mock('express', () => {
  const expressMock = vi.fn(() => {
    const app = {
      use: vi.fn(),
      get: vi.fn(),
      listen: vi.fn((port, cb) => {
        if (cb) cb();
        return { close: vi.fn() };
      })
    };
    return app;
  });
  expressMock.json = vi.fn(() => vi.fn());
  expressMock.urlencoded = vi.fn(() => vi.fn());
  expressMock.Request = vi.fn();
  expressMock.Response = vi.fn();
  expressMock.NextFunction = vi.fn();
  return { default: expressMock };
});

vi.mock('http', () => ({
  createServer: vi.fn(() => ({
    listen: vi.fn((port, cb) => {
      if (cb) cb();
    }),
    close: vi.fn()
  }))
}));

vi.mock('cors', () => ({ default: vi.fn(() => vi.fn()) }));
vi.mock('helmet', () => ({ default: vi.fn(() => vi.fn()) }));
vi.mock('express-rate-limit', () => ({ default: vi.fn(() => vi.fn()) }));
vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('node-fetch', () => ({ default: vi.fn() }));

vi.mock('../../src/core/ProcessManager.js', () => ({
  ProcessManager: vi.fn().mockImplementation(() => ({
    cleanup: vi.fn(),
    loadEmployees: vi.fn()
  }))
}));

vi.mock('../../src/core/TaskQueue.js', () => ({
  TaskQueue: vi.fn().mockImplementation(() => ({
    cleanup: vi.fn(),
    loadEmployees: vi.fn()
  }))
}));

vi.mock('../../src/core/AgentRegistry.js', () => ({
  AgentRegistry: vi.fn().mockImplementation(() => ({
    getAllEmployees: vi.fn(() => [])
  }))
}));

vi.mock('../../src/api/server.js', () => ({
  DashboardServer: vi.fn().mockImplementation(() => ({
    shutdown: vi.fn()
  })),
  createAPIRouter: vi.fn(() => ({ use: vi.fn() }))
}));

vi.mock('../../src/api/routes.js', () => ({
  createAdditionalRoutes: vi.fn(() => ({ use: vi.fn() }))
}));

describe('Application Entry Point', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required environment variables
    process.env['DASHBOARD_PORT'] = '8080';
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env['DASHBOARD_PORT'];
  });

  it('should start the application', async () => {
    // Import will trigger the startup
    const module = await import('../../src/index.js');
    
    // Verify server components were created
    const { ProcessManager } = await import('../../src/core/ProcessManager.js');
    const { TaskQueue } = await import('../../src/core/TaskQueue.js');
    const { AgentRegistry } = await import('../../src/core/AgentRegistry.js');
    const { DashboardServer } = await import('../../src/api/server.js');
    
    expect(ProcessManager).toHaveBeenCalled();
    expect(TaskQueue).toHaveBeenCalled();
    expect(AgentRegistry).toHaveBeenCalled();
    expect(DashboardServer).toHaveBeenCalled();
    
    // Verify app was exported
    expect(module.default).toBeDefined();
    expect(module.server).toBeDefined();
  });
});