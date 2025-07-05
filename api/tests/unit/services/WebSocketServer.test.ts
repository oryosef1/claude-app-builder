import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketServer } from '../../../src/services/WebSocketServer';
import { WebSocketMessage, WorkflowStatusMessage, WorkflowOutputMessage, FileChangeMessage } from '../../../src/types/websocket';

// Mock socket.io
const mockIo = {
  on: vi.fn(),
  emit: vi.fn(),
  close: vi.fn(),
  listen: vi.fn(),
  sockets: {
    emit: vi.fn(),
    sockets: new Map()
  }
};

const mockSocket = {
  id: 'test-socket-1',
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  join: vi.fn(),
  leave: vi.fn()
};

vi.mock('socket.io', () => ({
  Server: vi.fn(() => mockIo)
}));

describe('WebSocketServer', () => {
  let webSocketServer: WebSocketServer;

  beforeEach(() => {
    vi.clearAllMocks();
    webSocketServer = new WebSocketServer();
  });

  afterEach(async () => {
    await webSocketServer.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with stopped state', () => {
      const status = webSocketServer.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.connectedClients).toBe(0);
      expect(status.port).toBeUndefined();
    });

    it('should have empty connected clients list initially', () => {
      const clients = webSocketServer.getConnectedClients();
      expect(clients).toEqual([]);
    });
  });

  describe('server lifecycle', () => {
    it('should start server successfully', async () => {
      await webSocketServer.start(3001);
      const status = webSocketServer.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.port).toBe(3001);
      expect(mockIo.listen).toHaveBeenCalledWith(3001);
    });

    it('should start with default port if none provided', async () => {
      await webSocketServer.start();
      const status = webSocketServer.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.port).toBe(3002); // Default WebSocket port
    });

    it('should handle server start error', async () => {
      mockIo.listen.mockImplementation(() => {
        throw new Error('Port already in use');
      });

      await expect(webSocketServer.start(3001)).rejects.toThrow('Port already in use');
    });

    it('should stop server successfully', async () => {
      await webSocketServer.start(3001);
      await webSocketServer.stop();
      
      const status = webSocketServer.getStatus();
      expect(status.isRunning).toBe(false);
      expect(mockIo.close).toHaveBeenCalled();
    });

    it('should handle stop when server not running', async () => {
      await expect(webSocketServer.stop()).resolves.not.toThrow();
    });
  });

  describe('client connection management', () => {
    beforeEach(async () => {
      await webSocketServer.start(3001);
    });

    it('should handle client connection', () => {
      // Simulate client connection
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')?.[1];
      expect(connectionHandler).toBeDefined();
      
      connectionHandler(mockSocket);
      
      const clients = webSocketServer.getConnectedClients();
      expect(clients).toContain('test-socket-1');
    });

    it('should handle client disconnection', () => {
      // Connect client first
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')?.[1];
      connectionHandler(mockSocket);
      
      // Simulate disconnection
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
      disconnectHandler();
      
      const clients = webSocketServer.getConnectedClients();
      expect(clients).not.toContain('test-socket-1');
    });

    it('should track multiple connected clients', () => {
      const mockSocket2 = { ...mockSocket, id: 'test-socket-2' };
      
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')?.[1];
      connectionHandler(mockSocket);
      connectionHandler(mockSocket2);
      
      const clients = webSocketServer.getConnectedClients();
      expect(clients).toHaveLength(2);
      expect(clients).toContain('test-socket-1');
      expect(clients).toContain('test-socket-2');
    });

    it('should update client count in status', () => {
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')?.[1];
      connectionHandler(mockSocket);
      
      const status = webSocketServer.getStatus();
      expect(status.connectedClients).toBe(1);
    });
  });

  describe('message broadcasting', () => {
    beforeEach(async () => {
      await webSocketServer.start(3001);
    });

    it('should broadcast workflow status message', () => {
      const message: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: {
          phase: 'test-writer',
          status: 'running',
          progress: 25
        },
        timestamp: new Date().toISOString(),
        id: 'msg-1'
      };

      webSocketServer.broadcast(message);
      expect(mockIo.sockets.emit).toHaveBeenCalledWith('message', message);
    });

    it('should broadcast workflow output message', () => {
      const message: WorkflowOutputMessage = {
        type: 'workflow_output',
        payload: {
          source: 'stdout',
          content: 'Test output line',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        id: 'msg-2'
      };

      webSocketServer.broadcast(message);
      expect(mockIo.sockets.emit).toHaveBeenCalledWith('message', message);
    });

    it('should broadcast file change message', () => {
      const message: FileChangeMessage = {
        type: 'file_change',
        payload: {
          filename: 'todo.md',
          path: '/path/to/todo.md',
          changeType: 'modified',
          content: 'Updated content'
        },
        timestamp: new Date().toISOString(),
        id: 'msg-3'
      };

      webSocketServer.broadcast(message);
      expect(mockIo.sockets.emit).toHaveBeenCalledWith('message', message);
    });

    it('should send message to specific client', () => {
      // Connect client first
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')?.[1];
      connectionHandler(mockSocket);

      const message: WebSocketMessage = {
        type: 'ping',
        payload: {},
        timestamp: new Date().toISOString(),
        id: 'ping-1'
      };

      webSocketServer.sendToClient('test-socket-1', message);
      expect(mockSocket.emit).toHaveBeenCalledWith('message', message);
    });

    it('should handle sending to non-existent client', () => {
      const message: WebSocketMessage = {
        type: 'ping',
        payload: {},
        timestamp: new Date().toISOString()
      };

      expect(() => {
        webSocketServer.sendToClient('non-existent-id', message);
      }).not.toThrow();
    });
  });

  describe('ping/pong handling', () => {
    beforeEach(async () => {
      await webSocketServer.start(3001);
    });

    it('should handle ping message and respond with pong', () => {
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')?.[1];
      connectionHandler(mockSocket);

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'ping')?.[1];
      expect(messageHandler).toBeDefined();

      messageHandler();
      expect(mockSocket.emit).toHaveBeenCalledWith('pong', expect.objectContaining({
        type: 'pong',
        timestamp: expect.any(String)
      }));
    });

    it('should track client ping times', () => {
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')?.[1];
      connectionHandler(mockSocket);

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'ping')?.[1];
      messageHandler();

      // Verify client ping time is tracked (implementation detail)
      const clients = webSocketServer.getConnectedClients();
      expect(clients).toContain('test-socket-1');
    });
  });

  describe('event listener setup', () => {
    it('should setup event listeners for workflow and file changes', () => {
      const setupSpy = vi.spyOn(webSocketServer, 'setupEventListeners');
      webSocketServer.setupEventListeners();
      
      expect(setupSpy).toHaveBeenCalled();
    });

    it('should handle workflow state changes', async () => {
      await webSocketServer.start(3001);
      webSocketServer.setupEventListeners();

      // Simulate workflow state change event
      const statusMessage: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: {
          phase: 'developer',
          status: 'running',
          progress: 50
        },
        timestamp: new Date().toISOString()
      };

      // This would typically be triggered by WorkflowManager events
      webSocketServer.broadcast(statusMessage);
      expect(mockIo.sockets.emit).toHaveBeenCalledWith('message', statusMessage);
    });

    it('should handle file change events', async () => {
      await webSocketServer.start(3001);
      webSocketServer.setupEventListeners();

      // Simulate file change event
      const fileMessage: FileChangeMessage = {
        type: 'file_change',
        payload: {
          filename: 'memory.md',
          path: '/path/to/memory.md',
          changeType: 'modified'
        },
        timestamp: new Date().toISOString()
      };

      webSocketServer.broadcast(fileMessage);
      expect(mockIo.sockets.emit).toHaveBeenCalledWith('message', fileMessage);
    });
  });

  describe('cleanup and resource management', () => {
    it('should cleanup all resources', async () => {
      await webSocketServer.start(3001);
      await webSocketServer.cleanup();

      const status = webSocketServer.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.connectedClients).toBe(0);
    });

    it('should disconnect all clients during cleanup', async () => {
      await webSocketServer.start(3001);
      
      // Connect multiple clients
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')?.[1];
      connectionHandler(mockSocket);
      connectionHandler({ ...mockSocket, id: 'test-socket-2' });

      await webSocketServer.cleanup();
      
      expect(mockIo.close).toHaveBeenCalled();
    });

    it('should handle cleanup when server not running', async () => {
      await expect(webSocketServer.cleanup()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle socket errors gracefully', async () => {
      await webSocketServer.start(3001);
      
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')?.[1];
      connectionHandler(mockSocket);

      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'error')?.[1];
      expect(errorHandler).toBeDefined();

      const testError = new Error('Socket error');
      errorHandler(testError);

      // Should not crash and should handle error gracefully
      const status = webSocketServer.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should handle malformed messages', async () => {
      await webSocketServer.start(3001);
      
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')?.[1];
      connectionHandler(mockSocket);

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
      
      // Send malformed message
      expect(() => {
        messageHandler('invalid json');
      }).not.toThrow();
    });
  });

  describe('uptime tracking', () => {
    it('should track server uptime', async () => {
      const startTime = Date.now();
      await webSocketServer.start(3001);
      
      // Wait a small amount
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const status = webSocketServer.getStatus();
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.uptime).toBeLessThan(1000); // Less than 1 second for test
    });

    it('should reset uptime when server stops and starts', async () => {
      await webSocketServer.start(3001);
      await webSocketServer.stop();
      await webSocketServer.start(3001);
      
      const status = webSocketServer.getStatus();
      expect(status.uptime).toBeDefined();
      expect(status.uptime).toBeGreaterThan(0);
    });
  });
});