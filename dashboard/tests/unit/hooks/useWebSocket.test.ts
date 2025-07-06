import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useWebSocket } from '../../../src/hooks/useWebSocket';
import { 
  WebSocketMessage, 
  WorkflowStatusMessage, 
  WorkflowOutputMessage, 
  FileChangeMessage,
  ErrorMessage 
} from '../../../src/types/websocket';

// Mock WebSocket client
const mockWebSocketClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  subscribe: vi.fn(),
  getStatus: vi.fn(),
  setAutoReconnect: vi.fn(),
  cleanup: vi.fn()
};

vi.mock('../../../src/services/websocket', () => ({
  WebSocketClient: vi.fn(() => mockWebSocketClient)
}));

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocketClient.getStatus.mockReturnValue({
      isConnected: false,
      reconnectAttempts: 0
    });
    mockWebSocketClient.subscribe.mockReturnValue(() => {}); // Mock unsubscribe function
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with disconnected state', () => {
      const { result } = renderHook(() => useWebSocket());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.messages).toEqual([]);
      expect(result.current.workflowOutput).toEqual([]);
      expect(result.current.fileChanges).toEqual([]);
      expect(result.current.errors).toEqual([]);
      expect(result.current.workflowStatus).toBeUndefined();
    });

    it('should initialize WebSocket client with auto-reconnect enabled', () => {
      renderHook(() => useWebSocket());

      expect(mockWebSocketClient.setAutoReconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('connection management', () => {
    it('should connect to WebSocket server', async () => {
      mockWebSocketClient.connect.mockResolvedValue(undefined);
      mockWebSocketClient.getStatus.mockReturnValue({
        isConnected: true,
        url: 'ws://localhost:3002',
        lastConnected: new Date(),
        reconnectAttempts: 0
      });

      const { result } = renderHook(() => useWebSocket());

      await act(async () => {
        await result.current.connect('ws://localhost:3002');
      });

      expect(mockWebSocketClient.connect).toHaveBeenCalledWith('ws://localhost:3002');
      expect(result.current.isConnected).toBe(true);
      expect(result.current.url).toBe('ws://localhost:3002');
    });

    it('should handle connection failure', async () => {
      mockWebSocketClient.connect.mockRejectedValue(new Error('Connection failed'));

      const { result } = renderHook(() => useWebSocket());

      await act(async () => {
        await expect(result.current.connect('ws://invalid-url')).rejects.toThrow('Connection failed');
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should set connecting state during connection attempt', async () => {
      let resolveConnect: () => void;
      const connectPromise = new Promise<void>((resolve) => {
        resolveConnect = resolve;
      });
      mockWebSocketClient.connect.mockReturnValue(connectPromise);

      const { result } = renderHook(() => useWebSocket());

      act(() => {
        result.current.connect('ws://localhost:3002');
      });

      expect(result.current.isConnecting).toBe(true);

      await act(async () => {
        resolveConnect!();
        await connectPromise;
      });

      expect(result.current.isConnecting).toBe(false);
    });

    it('should disconnect from WebSocket server', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        result.current.disconnect();
      });

      expect(mockWebSocketClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    let subscribeCallbacks: { [key: string]: (message: WebSocketMessage) => void };

    beforeEach(() => {
      subscribeCallbacks = {};
      mockWebSocketClient.subscribe.mockImplementation((messageType, callback) => {
        subscribeCallbacks[messageType] = callback;
        return () => {
          delete subscribeCallbacks[messageType];
        };
      });
    });

    it('should handle workflow status messages', () => {
      const { result } = renderHook(() => useWebSocket());

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

      act(() => {
        subscribeCallbacks['workflow_status'](statusMessage);
      });

      expect(result.current.workflowStatus).toEqual(statusMessage);
      expect(result.current.messages).toContain(statusMessage);
    });

    it('should accumulate workflow output messages', () => {
      const { result } = renderHook(() => useWebSocket());

      const output1: WorkflowOutputMessage = {
        type: 'workflow_output',
        payload: {
          source: 'stdout',
          content: 'Line 1',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        id: 'output-1'
      };

      const output2: WorkflowOutputMessage = {
        type: 'workflow_output',
        payload: {
          source: 'stderr',
          content: 'Error line',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        id: 'output-2'
      };

      act(() => {
        subscribeCallbacks['workflow_output'](output1);
        subscribeCallbacks['workflow_output'](output2);
      });

      expect(result.current.workflowOutput).toHaveLength(2);
      expect(result.current.workflowOutput[0]).toEqual(output1);
      expect(result.current.workflowOutput[1]).toEqual(output2);
    });

    it('should track file change messages', () => {
      const { result } = renderHook(() => useWebSocket());

      const fileChange: FileChangeMessage = {
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

      act(() => {
        subscribeCallbacks['file_change'](fileChange);
      });

      expect(result.current.fileChanges).toContain(fileChange);
      expect(result.current.messages).toContain(fileChange);
    });

    it('should handle error messages', () => {
      const { result } = renderHook(() => useWebSocket());

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

      act(() => {
        subscribeCallbacks['error'](errorMessage);
      });

      expect(result.current.errors).toContain(errorMessage);
      expect(result.current.messages).toContain(errorMessage);
    });

    it('should handle multiple message types simultaneously', () => {
      const { result } = renderHook(() => useWebSocket());

      const statusMessage: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: { phase: 'developer', status: 'running', progress: 50 },
        timestamp: new Date().toISOString()
      };

      const outputMessage: WorkflowOutputMessage = {
        type: 'workflow_output',
        payload: { source: 'stdout', content: 'Output', timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      };

      act(() => {
        subscribeCallbacks['workflow_status'](statusMessage);
        subscribeCallbacks['workflow_output'](outputMessage);
      });

      expect(result.current.workflowStatus).toEqual(statusMessage);
      expect(result.current.workflowOutput).toContain(outputMessage);
      expect(result.current.messages).toHaveLength(2);
    });
  });

  describe('message sending', () => {
    it('should send messages through WebSocket client', () => {
      const { result } = renderHook(() => useWebSocket());

      const message: WebSocketMessage = {
        type: 'ping',
        payload: {},
        timestamp: new Date().toISOString(),
        id: 'ping-1'
      };

      act(() => {
        result.current.send(message);
      });

      expect(mockWebSocketClient.send).toHaveBeenCalledWith(message);
    });

    it('should handle send when disconnected', () => {
      const { result } = renderHook(() => useWebSocket());

      const message: WebSocketMessage = {
        type: 'ping',
        payload: {},
        timestamp: new Date().toISOString()
      };

      expect(() => {
        act(() => {
          result.current.send(message);
        });
      }).not.toThrow();

      expect(mockWebSocketClient.send).toHaveBeenCalledWith(message);
    });
  });

  describe('state management actions', () => {
    it('should clear all messages', () => {
      const subscribeCallbacks: { [key: string]: (message: WebSocketMessage) => void } = {};
      mockWebSocketClient.subscribe.mockImplementation((messageType, callback) => {
        subscribeCallbacks[messageType] = callback;
        return () => {};
      });

      const { result } = renderHook(() => useWebSocket());

      const message: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: { phase: 'test-writer', status: 'running', progress: 25 },
        timestamp: new Date().toISOString()
      };

      act(() => {
        subscribeCallbacks['workflow_status'](message);
      });

      expect(result.current.messages).toHaveLength(1);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(0);
      expect(result.current.workflowStatus).toBeUndefined();
    });

    it('should clear workflow output only', () => {
      const subscribeCallbacks: { [key: string]: (message: WebSocketMessage) => void } = {};
      mockWebSocketClient.subscribe.mockImplementation((messageType, callback) => {
        subscribeCallbacks[messageType] = callback;
        return () => {};
      });

      const { result } = renderHook(() => useWebSocket());

      const statusMessage: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: { phase: 'test-writer', status: 'running', progress: 25 },
        timestamp: new Date().toISOString()
      };

      const outputMessage: WorkflowOutputMessage = {
        type: 'workflow_output',
        payload: { source: 'stdout', content: 'Output', timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      };

      act(() => {
        subscribeCallbacks['workflow_status'](statusMessage);
        subscribeCallbacks['workflow_output'](outputMessage);
      });

      expect(result.current.workflowOutput).toHaveLength(1);
      expect(result.current.workflowStatus).toBeDefined();

      act(() => {
        result.current.clearOutput();
      });

      expect(result.current.workflowOutput).toHaveLength(0);
      expect(result.current.workflowStatus).toBeDefined(); // Should remain
    });

    it('should clear errors only', () => {
      const subscribeCallbacks: { [key: string]: (message: WebSocketMessage) => void } = {};
      mockWebSocketClient.subscribe.mockImplementation((messageType, callback) => {
        subscribeCallbacks[messageType] = callback;
        return () => {};
      });

      const { result } = renderHook(() => useWebSocket());

      const errorMessage: ErrorMessage = {
        type: 'error',
        payload: { message: 'Test error', code: 'TEST_ERROR' },
        timestamp: new Date().toISOString()
      };

      const statusMessage: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: { phase: 'test-writer', status: 'running', progress: 25 },
        timestamp: new Date().toISOString()
      };

      act(() => {
        subscribeCallbacks['error'](errorMessage);
        subscribeCallbacks['workflow_status'](statusMessage);
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.workflowStatus).toBeDefined();

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toHaveLength(0);
      expect(result.current.workflowStatus).toBeDefined(); // Should remain
    });
  });

  describe('status updates', () => {
    it('should update connection status from client', () => {
      mockWebSocketClient.getStatus.mockReturnValue({
        isConnected: true,
        url: 'ws://localhost:3002',
        lastConnected: new Date(),
        reconnectAttempts: 2
      });

      const { result } = renderHook(() => useWebSocket());

      expect(result.current.isConnected).toBe(true);
      expect(result.current.url).toBe('ws://localhost:3002');
      expect(result.current.reconnectAttempts).toBe(2);
    });

    it('should handle status updates during reconnection', () => {
      vi.useFakeTimers();

      // Start disconnected
      mockWebSocketClient.getStatus.mockReturnValue({
        isConnected: false,
        reconnectAttempts: 1
      });

      const { result } = renderHook(() => useWebSocket());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.reconnectAttempts).toBe(1);

      // Simulate successful reconnection
      mockWebSocketClient.getStatus.mockReturnValue({
        isConnected: true,
        url: 'ws://localhost:3002',
        lastConnected: new Date(),
        reconnectAttempts: 1
      });

      // Trigger the status update interval
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.reconnectAttempts).toBe(1);

      vi.useRealTimers();
    });
  });

  describe('cleanup and unmount', () => {
    it('should cleanup WebSocket client on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket());

      unmount();

      expect(mockWebSocketClient.cleanup).toHaveBeenCalled();
    });

    it('should unsubscribe from all message types on unmount', () => {
      const unsubscribeFunctions = [vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn()];
      let callIndex = 0;
      
      mockWebSocketClient.subscribe.mockImplementation(() => {
        return unsubscribeFunctions[callIndex++];
      });

      const { unmount } = renderHook(() => useWebSocket());

      unmount();

      // Should have called all unsubscribe functions
      unsubscribeFunctions.forEach(unsubscribe => {
        expect(unsubscribe).toHaveBeenCalled();
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing WebSocket client gracefully', () => {
      // Test that hook handles initialization gracefully
      const { result } = renderHook(() => useWebSocket());
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should handle subscription errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockWebSocketClient.subscribe.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      expect(() => {
        renderHook(() => useWebSocket());
      }).toThrow('Subscription failed');
      
      consoleSpy.mockRestore();
    });

    it('should handle message callback errors gracefully', () => {
      let subscribeCallback: (message: WebSocketMessage) => void;
      mockWebSocketClient.subscribe.mockImplementation((type, callback) => {
        subscribeCallback = callback;
        return () => {};
      });

      const { result } = renderHook(() => useWebSocket());

      // Simulate a message that causes processing error
      const malformedMessage = {
        type: 'workflow_status',
        payload: null, // Invalid payload
        timestamp: 'invalid-date'
      } as WorkflowStatusMessage;

      expect(() => {
        act(() => {
          subscribeCallback!(malformedMessage);
        });
      }).not.toThrow();

      // Should still add to messages even if processing fails
      expect(result.current.messages).toContain(malformedMessage);
    });
  });
});