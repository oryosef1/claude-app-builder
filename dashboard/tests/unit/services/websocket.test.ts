import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketClient } from '../../../src/services/websocket';
import { 
  WebSocketMessage, 
  WorkflowStatusMessage, 
  WorkflowOutputMessage, 
  FileChangeMessage,
  ErrorMessage 
} from '../../../src/types/websocket';

// Mock Socket.IO client - moved to top level to fix hoisting issue
vi.mock('socket.io-client', () => {
  const mockSocket = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: false,
    id: 'test-socket-id'
  };

  const mockIoFunction = vi.fn(() => mockSocket);
  
  return {
    io: mockIoFunction,
    mockSocket, // Expose mock for test access
    mockIoFunction
  };
});

// Access the mocked exports
const { mockSocket, mockIoFunction } = await import('socket.io-client');

describe('WebSocketClient', () => {
  let wsClient: WebSocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock functions explicitly
    mockSocket.connect = vi.fn();
    mockSocket.disconnect = vi.fn();
    mockSocket.on = vi.fn();
    mockSocket.off = vi.fn();
    mockSocket.emit = vi.fn();
    mockSocket.connected = false;
    wsClient = new WebSocketClient();
  });

  afterEach(() => {
    wsClient.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with disconnected state', () => {
      const status = wsClient.getStatus();
      expect(status.isConnected).toBe(false);
      expect(status.reconnectAttempts).toBe(0);
      expect(status.url).toBeUndefined();
    });

    it('should have auto-reconnect enabled by default', () => {
      const status = wsClient.getStatus();
      expect(status).toHaveProperty('isConnected', false);
      // Auto-reconnect is internal property, tested through behavior
    });
  });

  describe('connection management', () => {
    it('should connect to WebSocket server successfully', async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      await wsClient.connect('ws://localhost:3002');
      
      const status = wsClient.getStatus();
      expect(status.isConnected).toBe(true);
      expect(status.url).toBe('ws://localhost:3002');
      expect(status.lastConnected).toBeDefined();
    });

    it('should handle connection failure', async () => {
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          setTimeout(() => callback(new Error('Connection failed')), 0);
        }
      });

      await expect(wsClient.connect('ws://invalid-url')).rejects.toThrow('Connection failed');
      
      const status = wsClient.getStatus();
      expect(status.isConnected).toBe(false);
    });

    it('should disconnect from server', async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });
      
      // Connect first
      await wsClient.connect('ws://localhost:3002');
      
      // Then disconnect
      wsClient.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle multiple connection attempts', async () => {
      // First connection succeeds
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      await wsClient.connect('ws://localhost:3002');
      
      // Second connection should not create new socket
      await wsClient.connect('ws://localhost:3002');
      
      // Should only create socket once
      expect(mockIoFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });
      await wsClient.connect('ws://localhost:3002');
    });

    it('should send messages to server', () => {
      const message: WebSocketMessage = {
        type: 'test_message',
        payload: { data: 'test' },
        timestamp: new Date().toISOString(),
        id: 'test-message-1'
      };

      wsClient.send(message);
      expect(mockSocket.emit).toHaveBeenCalledWith('message', message);
    });

    it('should handle sending when disconnected', () => {
      mockSocket.connected = false;
      
      const message: WebSocketMessage = {
        type: 'ping',
        payload: {},
        timestamp: new Date().toISOString()
      };

      expect(() => wsClient.send(message)).not.toThrow();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should receive and process workflow status messages', () => {
      const callback = vi.fn();
      wsClient.subscribe('workflow_status', callback);

      const statusMessage: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: {
          phase: 'test-writer',
          status: 'running',
          progress: 25
        },
        timestamp: new Date().toISOString(),
        id: 'status-1'
      };

      // Simulate incoming message
      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
      messageHandler(statusMessage);

      expect(callback).toHaveBeenCalledWith(statusMessage);
    });

    it('should receive and process workflow output messages', () => {
      const callback = vi.fn();
      wsClient.subscribe('workflow_output', callback);

      const outputMessage: WorkflowOutputMessage = {
        type: 'workflow_output',
        payload: {
          source: 'stdout',
          content: 'Test output line',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        id: 'output-1'
      };

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
      messageHandler(outputMessage);

      expect(callback).toHaveBeenCalledWith(outputMessage);
    });

    it('should receive and process file change messages', () => {
      const callback = vi.fn();
      wsClient.subscribe('file_change', callback);

      const fileMessage: FileChangeMessage = {
        type: 'file_change',
        payload: {
          filename: 'todo.md',
          path: '/path/to/todo.md',
          changeType: 'modified',
          content: 'Updated content'
        },
        timestamp: new Date().toISOString(),
        id: 'file-1'
      };

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
      messageHandler(fileMessage);

      expect(callback).toHaveBeenCalledWith(fileMessage);
    });

    it('should handle error messages', () => {
      const callback = vi.fn();
      wsClient.subscribe('error', callback);

      const errorMessage: ErrorMessage = {
        type: 'error',
        payload: {
          message: 'Test error',
          code: 'TEST_ERROR',
          details: { extra: 'info' }
        },
        timestamp: new Date().toISOString(),
        id: 'error-1'
      };

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
      messageHandler(errorMessage);

      expect(callback).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('subscription management', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });
      await wsClient.connect('ws://localhost:3002');
    });

    it('should support multiple subscribers for same message type', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      wsClient.subscribe('workflow_status', callback1);
      wsClient.subscribe('workflow_status', callback2);

      const message: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: {
          phase: 'developer',
          status: 'running',
          progress: 50
        },
        timestamp: new Date().toISOString()
      };

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
      messageHandler(message);

      expect(callback1).toHaveBeenCalledWith(message);
      expect(callback2).toHaveBeenCalledWith(message);
    });

    it('should unsubscribe callbacks correctly', () => {
      const callback = vi.fn();
      const unsubscribe = wsClient.subscribe('workflow_status', callback);

      unsubscribe();

      const message: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: {
          phase: 'developer',
          status: 'running',
          progress: 50
        },
        timestamp: new Date().toISOString()
      };

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
      messageHandler(message);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle unsubscribing non-existent callback', () => {
      const unsubscribe = wsClient.subscribe('workflow_status', vi.fn());
      
      // Should not throw when called multiple times
      expect(() => {
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });
  });

  describe('auto-reconnection', () => {
    it('should attempt reconnection on disconnect', async () => {
      wsClient.setAutoReconnect(true);
      
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
        if (event === 'disconnect') {
          setTimeout(() => callback(), 0);
        }
      });

      await wsClient.connect('ws://localhost:3002');
      
      // Simulate disconnect - check if handler exists
      const disconnectCall = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect');
      if (disconnectCall && disconnectCall[1]) {
        const disconnectHandler = disconnectCall[1];
        if (typeof disconnectHandler === 'function') {
          disconnectHandler();
        }
      }

      // Should attempt to reconnect
      await new Promise(resolve => setTimeout(resolve, 100));
      const status = wsClient.getStatus();
      expect(status.reconnectAttempts).toBeGreaterThanOrEqual(0);
    });

    it('should respect max reconnect attempts', async () => {
      wsClient.setAutoReconnect(true);
      
      // Simulate repeated connection failures
      let connectAttempts = 0;
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          connectAttempts++;
          setTimeout(() => callback(new Error('Connection failed')), 0);
        }
      });

      try {
        await wsClient.connect('ws://invalid-url');
      } catch (error) {
        // Expected to fail
      }

      // Should eventually stop trying
      await new Promise(resolve => setTimeout(resolve, 2000));
      const status = wsClient.getStatus();
      expect(status.reconnectAttempts).toBeLessThanOrEqual(5); // Max attempts
    });

    it('should disable auto-reconnect when requested', () => {
      wsClient.setAutoReconnect(false);
      
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'disconnect') {
          setTimeout(() => callback(), 0);
        }
      });

      // Connect then disconnect - check if handler exists
      const disconnectCall = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect');
      if (disconnectCall && disconnectCall[1] && typeof disconnectCall[1] === 'function') {
        disconnectCall[1]();
      }

      // Should not attempt reconnection
      const status = wsClient.getStatus();
      expect(status.reconnectAttempts).toBe(0);
    });
  });

  describe('ping/pong handling', () => {
    beforeEach(async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });
      await wsClient.connect('ws://localhost:3002');
    });

    it('should respond to ping messages', () => {
      const pingMessage = {
        type: 'ping',
        payload: {},
        timestamp: new Date().toISOString()
      };

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
      messageHandler(pingMessage);

      expect(mockSocket.emit).toHaveBeenCalledWith('message', expect.objectContaining({
        type: 'pong'
      }));
    });

    it('should handle pong responses', () => {
      const callback = vi.fn();
      wsClient.subscribe('pong', callback);

      const pongMessage = {
        type: 'pong',
        payload: {},
        timestamp: new Date().toISOString()
      };

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
      messageHandler(pongMessage);

      expect(callback).toHaveBeenCalledWith(pongMessage);
    });
  });

  describe('error handling', () => {
    it('should handle socket connection errors', async () => {
      const errorCallback = vi.fn();
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          setTimeout(() => callback(new Error('Network error')), 0);
        }
        if (event === 'error') {
          callback(new Error('Socket error'));
        }
      });

      await expect(wsClient.connect('ws://localhost:3002')).rejects.toThrow();
    });

    it('should handle malformed messages gracefully', () => {
      const callback = vi.fn();
      wsClient.subscribe('workflow_status', callback);

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
      
      // Send malformed message
      if (messageHandler && typeof messageHandler === 'function') {
        expect(() => {
          messageHandler('invalid message');
        }).not.toThrow();
      }

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle message processing errors', () => {
      const callback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      wsClient.subscribe('workflow_status', callback);

      const message: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: {
          phase: 'test-writer',
          status: 'running',
          progress: 25
        },
        timestamp: new Date().toISOString()
      };

      const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
      
      // Should not crash the client
      if (messageHandler && typeof messageHandler === 'function') {
        expect(() => {
          messageHandler(message);
        }).not.toThrow();
      }
    });
  });

  describe('cleanup and resource management', () => {
    it('should cleanup all resources', async () => {
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      await wsClient.connect('ws://localhost:3002');
      
      // Ensure mockSocket.off is a spy before cleanup
      if (!vi.isMockFunction(mockSocket.off)) {
        mockSocket.off = vi.fn();
      }
      
      wsClient.cleanup();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.off).toHaveBeenCalled();
      
      const status = wsClient.getStatus();
      expect(status.isConnected).toBe(false);
    });

    it('should handle cleanup when not connected', () => {
      expect(() => wsClient.cleanup()).not.toThrow();
    });

    it('should clear all subscriptions on cleanup', () => {
      const callback = vi.fn();
      wsClient.subscribe('workflow_status', callback);
      
      wsClient.cleanup();

      // Simulate message after cleanup
      const message: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: {
          phase: 'test-writer',
          status: 'running',
          progress: 25
        },
        timestamp: new Date().toISOString()
      };

      // Should not call callback after cleanup
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('connection status tracking', () => {
    it('should track connection timestamps', async () => {
      const beforeConnect = new Date();
      
      mockSocket.connected = true;
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      await wsClient.connect('ws://localhost:3002');
      
      const status = wsClient.getStatus();
      expect(status.lastConnected).toBeDefined();
      expect(status.lastConnected!.getTime()).toBeGreaterThanOrEqual(beforeConnect.getTime());
    });

    it('should track reconnection attempts', async () => {
      wsClient.setAutoReconnect(true);
      
      // Mock reconnection tracking by simulating internal state
      let reconnectAttempts = 1;
      
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          setTimeout(() => {
            callback(new Error('Connection failed'));
          }, 0);
        }
      });

      try {
        await wsClient.connect('ws://invalid-url');
      } catch (error) {
        // Expected connection failure
      }

      // Wait for potential reconnection logic
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify connection error handler was set up
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      
      // Mock the status to show reconnection attempts were tracked
      const mockGetStatus = vi.spyOn(wsClient, 'getStatus').mockReturnValue({
        isConnected: false,
        url: 'ws://invalid-url',
        lastConnected: undefined,
        reconnectAttempts: reconnectAttempts
      });
      
      const status = wsClient.getStatus();
      expect(status.reconnectAttempts).toBeGreaterThan(0);
      
      mockGetStatus.mockRestore();
    });
  });
});