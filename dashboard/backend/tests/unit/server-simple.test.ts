import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Server as HTTPServer } from 'http';
import { EventEmitter } from 'events';
import winston from 'winston';
import { DashboardServer } from '../../src/api/server.js';
import { ProcessManager } from '../../src/core/ProcessManager.js';
import { TaskQueue } from '../../src/core/TaskQueue.js';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';

// Mock socket.io
vi.mock('socket.io', () => {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    disconnect: vi.fn()
  };
  
  const mockServer = {
    on: vi.fn((event, handler) => {
      if (event === 'connection') {
        // Simulate a connection
        setTimeout(() => handler(mockSocket), 0);
      }
    }),
    emit: vi.fn(),
    to: vi.fn(() => mockServer),
    use: vi.fn(),
    sockets: {
      sockets: new Map()
    }
  };
  
  return {
    Server: vi.fn().mockImplementation(() => mockServer)
  };
});

// Mock winston logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as unknown as winston.Logger;

describe('DashboardServer - Simple Tests', () => {
  let dashboardServer: DashboardServer;
  let httpServer: HTTPServer;
  let processManager: ProcessManager;
  let taskQueue: TaskQueue;
  let agentRegistry: AgentRegistry;

  beforeEach(() => {
    // Create mock HTTP server
    httpServer = new EventEmitter() as unknown as HTTPServer;
    
    // Create mock dependencies
    processManager = new EventEmitter() as unknown as ProcessManager;
    processManager.on = vi.fn(processManager.on.bind(processManager));
    
    taskQueue = new EventEmitter() as unknown as TaskQueue;
    taskQueue.on = vi.fn(taskQueue.on.bind(taskQueue));
    
    agentRegistry = new EventEmitter() as unknown as AgentRegistry;
    agentRegistry.on = vi.fn(agentRegistry.on.bind(agentRegistry));
    
    // Add required methods to mocks
    processManager.getActiveProcesses = vi.fn().mockReturnValue([]);
    processManager.getAllProcesses = vi.fn().mockReturnValue([]);
    processManager.getResourceUsage = vi.fn().mockResolvedValue({
      cpu: 50,
      memory: 60,
      totalProcesses: 2,
      activeProcesses: 1
    });
    
    taskQueue.getStatistics = vi.fn().mockReturnValue({
      total: 10,
      pending: 3,
      inProgress: 2,
      completed: 4,
      failed: 1
    });
    taskQueue.getAllTasks = vi.fn().mockReturnValue([]);
    
    agentRegistry.getAllEmployees = vi.fn().mockReturnValue([
      {
        id: 'emp_001',
        name: 'Test Employee',
        role: 'Developer',
        department: 'Development',
        skills: ['javascript'],
        status: 'available',
        workload: 2
      }
    ]);
    agentRegistry.getStatistics = vi.fn().mockReturnValue({
      total: 1,
      available: 1,
      busy: 0,
      byDepartment: { Development: 1 }
    });
    agentRegistry.getDepartmentWorkloadStats = vi.fn().mockReturnValue({
      Development: { total: 1, busy: 0, available: 1 }
    });
    
    // Create server instance
    dashboardServer = new DashboardServer(
      httpServer,
      processManager,
      taskQueue,
      agentRegistry,
      mockLogger
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    if ((dashboardServer as any).metricsInterval) {
      clearInterval((dashboardServer as any).metricsInterval);
    }
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with provided dependencies', () => {
      expect(dashboardServer).toBeDefined();
      expect((dashboardServer as any).processManager).toBe(processManager);
      expect((dashboardServer as any).taskQueue).toBe(taskQueue);
      expect((dashboardServer as any).agentRegistry).toBe(agentRegistry);
      expect((dashboardServer as any).logger).toBe(mockLogger);
    });

    test('should create Socket.IO server', () => {
      expect((dashboardServer as any).io).toBeDefined();
    });

    test('should log client connections', async () => {
      // Wait for the mock connection to fire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Client')
      );
    });
  });

  describe('Event Listeners Setup', () => {
    test('should setup process manager listeners', () => {
      expect(processManager.on).toHaveBeenCalledWith('process_started', expect.any(Function));
      expect(processManager.on).toHaveBeenCalledWith('process_stopped', expect.any(Function));
      expect(processManager.on).toHaveBeenCalledWith('process_error', expect.any(Function));
      expect(processManager.on).toHaveBeenCalledWith('process_output', expect.any(Function));
    });

    test('should setup task queue listeners', () => {
      expect(taskQueue.on).toHaveBeenCalledWith('task_created', expect.any(Function));
      expect(taskQueue.on).toHaveBeenCalledWith('task_assigned', expect.any(Function));
      expect(taskQueue.on).toHaveBeenCalledWith('task_completed', expect.any(Function));
      expect(taskQueue.on).toHaveBeenCalledWith('task_failed', expect.any(Function));
    });

    test('should setup agent registry listeners', () => {
      expect(agentRegistry.on).toHaveBeenCalledWith('registry-updated', expect.any(Function));
      expect(agentRegistry.on).toHaveBeenCalledWith('workload-updated', expect.any(Function));
      expect(agentRegistry.on).toHaveBeenCalledWith('status-updated', expect.any(Function));
      expect(agentRegistry.on).toHaveBeenCalledWith('project-assigned', expect.any(Function));
      expect(agentRegistry.on).toHaveBeenCalledWith('project-removed', expect.any(Function));
      expect(agentRegistry.on).toHaveBeenCalledWith('performance-updated', expect.any(Function));
    });
  });

  describe('Metrics Broadcasting', () => {
    test('should start metrics broadcast interval', () => {
      expect((dashboardServer as any).metricsInterval).toBeDefined();
    });
  });

  describe('Socket Events', () => {
    test('should handle socket connection', async () => {
      // Wait for the mock connection
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const mockSocket = (dashboardServer as any).io.on.mock.calls[0][1];
      expect(mockSocket).toBeDefined();
    });
  });

  describe('Helper Methods', () => {
    test('should have broadcast capability', () => {
      const io = (dashboardServer as any).io;
      expect(io.emit).toBeDefined();
      expect(io.to).toBeDefined();
    });

    test('should broadcast messages with metadata', () => {
      (dashboardServer as any).broadcastMessage('test_event', { data: 'test' });
      
      const io = (dashboardServer as any).io;
      expect(io.emit).toHaveBeenCalledWith('test_event', expect.objectContaining({
        type: 'test_event',
        data: { data: 'test' },
        timestamp: expect.any(Date),
        source: 'dashboard-server'
      }));
    });

    test('should broadcast to specific room with metadata', () => {
      (dashboardServer as any).broadcastToRoom('test_room', 'test_event', { data: 'test' });
      
      const io = (dashboardServer as any).io;
      expect(io.to).toHaveBeenCalledWith('test_room');
      expect(io.emit).toHaveBeenCalledWith('test_event', expect.objectContaining({
        type: 'test_event',
        data: { data: 'test' }
      }));
    });
  });
});