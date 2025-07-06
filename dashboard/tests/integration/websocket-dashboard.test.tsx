import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useWebSocket } from '../../src/hooks/useWebSocket';
import { WebSocketClient } from '../../src/services/websocket';
import { 
  WorkflowStatusMessage, 
  WorkflowOutputMessage, 
  FileChangeMessage 
} from '../../src/types/websocket';
import React from 'react';

// Mock WebSocket implementation for integration testing
class MockWebSocketClient {
  private connected = false;
  private subscribers: Map<string, ((message: any) => void)[]> = new Map();
  private url?: string;
  private lastConnected?: Date;
  private reconnectAttempts = 0;

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.url = url;
        this.connected = true;
        this.lastConnected = new Date();
        this.reconnectAttempts = 0;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.connected = false;
    this.url = undefined;
  }

  send(message: any): void {
    if (!this.connected) return;
    // Echo ping messages as pong for testing
    if (message.type === 'ping') {
      this.simulateMessage({
        type: 'pong',
        payload: {},
        timestamp: new Date().toISOString()
      });
    }
  }

  subscribe(messageType: string, callback: (message: any) => void): () => void {
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, []);
    }
    this.subscribers.get(messageType)!.push(callback);
    
    return () => {
      const callbacks = this.subscribers.get(messageType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  getStatus() {
    return {
      isConnected: this.connected,
      url: this.url,
      lastConnected: this.lastConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  setAutoReconnect(enabled: boolean): void {
    // Implementation for testing
  }

  cleanup(): void {
    this.connected = false;
    this.subscribers.clear();
  }

  // Test helper methods
  simulateMessage(message: any): void {
    const callbacks = this.subscribers.get(message.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(message));
    }
  }

  simulateDisconnect(): void {
    this.connected = false;
  }

  simulateReconnect(): void {
    this.connected = true;
    this.reconnectAttempts++;
  }
}

// Mock the WebSocket client
vi.mock('../../src/services/websocket', () => ({
  WebSocketClient: vi.fn(() => new MockWebSocketClient())
}));

// Test component that uses WebSocket
const WebSocketTestComponent: React.FC = () => {
  const ws = useWebSocket();

  return (
    <div>
      <div data-testid="connection-status">
        {ws.isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="connecting-status">
        {ws.isConnecting ? 'Connecting...' : 'Not connecting'}
      </div>
      <div data-testid="message-count">{ws.messages.length}</div>
      <div data-testid="output-count">{ws.workflowOutput.length}</div>
      <div data-testid="error-count">{ws.errors.length}</div>
      
      {ws.workflowStatus && (
        <div data-testid="workflow-status">
          {ws.workflowStatus.payload.phase}: {ws.workflowStatus.payload.status}
        </div>
      )}
      
      <button 
        data-testid="connect-btn" 
        onClick={() => ws.connect('ws://localhost:3002')}
      >
        Connect
      </button>
      <button 
        data-testid="disconnect-btn" 
        onClick={() => ws.disconnect()}
      >
        Disconnect
      </button>
      <button 
        data-testid="send-ping-btn" 
        onClick={() => ws.send({
          type: 'ping',
          payload: {},
          timestamp: new Date().toISOString()
        })}
      >
        Send Ping
      </button>
      <button 
        data-testid="clear-messages-btn" 
        onClick={() => ws.clearMessages()}
      >
        Clear Messages
      </button>
    </div>
  );
};

describe('WebSocket Dashboard Integration', () => {
  let mockClient: MockWebSocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mock instance
    const MockedWebSocketClient = vi.mocked(WebSocketClient);
    mockClient = new MockWebSocketClient();
    MockedWebSocketClient.mockImplementation(() => mockClient as any);
  });

  afterEach(() => {
    mockClient.cleanup();
  });

  describe('connection management integration', () => {
    it('should connect to WebSocket server through UI', async () => {
      const user = userEvent.setup();
      render(<WebSocketTestComponent />);

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');

      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });
    });

    it('should disconnect from WebSocket server through UI', async () => {
      const user = userEvent.setup();
      render(<WebSocketTestComponent />);

      // Connect first
      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Then disconnect
      await act(async () => {
        await user.click(screen.getByTestId('disconnect-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      });
    });

    it('should show connecting state during connection', async () => {
      const user = userEvent.setup();
      render(<WebSocketTestComponent />);

      expect(screen.getByTestId('connecting-status')).toHaveTextContent('Not connecting');

      // Override connect to take time
      let resolveConnect: () => void;
      const connectPromise = new Promise<void>((resolve) => {
        resolveConnect = resolve;
      });
      
      vi.spyOn(mockClient, 'connect').mockReturnValue(connectPromise);

      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('connecting-status')).toHaveTextContent('Connecting...');
      });

      // Complete connection
      await act(async () => {
        resolveConnect!();
      });

      await waitFor(() => {
        expect(screen.getByTestId('connecting-status')).toHaveTextContent('Not connecting');
      });
    });
  });

  describe('real-time message handling integration', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<WebSocketTestComponent />);
      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });
    });

    it('should display workflow status updates in real-time', async () => {
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

      await act(async () => {
        mockClient.simulateMessage(statusMessage);
      });

      await waitFor(() => {
        expect(screen.getByTestId('workflow-status')).toHaveTextContent('test-writer: running');
        expect(screen.getByTestId('message-count')).toHaveTextContent('1');
      });
    });

    it('should accumulate workflow output messages', async () => {
      const output1: WorkflowOutputMessage = {
        type: 'workflow_output',
        payload: {
          source: 'stdout',
          content: 'Starting workflow...',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        id: 'output-1'
      };

      const output2: WorkflowOutputMessage = {
        type: 'workflow_output',
        payload: {
          source: 'stdout',
          content: 'Writing tests...',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        id: 'output-2'
      };

      await act(async () => {
        mockClient.simulateMessage(output1);
        mockClient.simulateMessage(output2);
      });

      await waitFor(() => {
        expect(screen.getByTestId('output-count')).toHaveTextContent('2');
        expect(screen.getByTestId('message-count')).toHaveTextContent('2');
      });
    });

    it('should handle file change notifications', async () => {
      const fileChange: FileChangeMessage = {
        type: 'file_change',
        payload: {
          filename: 'todo.md',
          path: '/path/to/todo.md',
          changeType: 'modified',
          content: 'Updated todo content'
        },
        timestamp: new Date().toISOString(),
        id: 'file-1'
      };

      await act(async () => {
        mockClient.simulateMessage(fileChange);
      });

      await waitFor(() => {
        expect(screen.getByTestId('message-count')).toHaveTextContent('1');
      });
    });

    it('should handle ping/pong communication', async () => {
      const user = userEvent.setup();

      await act(async () => {
        await user.click(screen.getByTestId('send-ping-btn'));
      });

      // Mock client should respond with pong
      await waitFor(() => {
        expect(screen.getByTestId('message-count')).toHaveTextContent('1');
      });
    });
  });

  describe('error handling integration', () => {
    it('should handle connection failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock connection failure
      vi.spyOn(mockClient, 'connect').mockImplementation(() => 
        Promise.reject(new Error('Connection failed'))
      );
      
      render(<WebSocketTestComponent />);

      try {
        await act(async () => {
          await user.click(screen.getByTestId('connect-btn'));
        });
      } catch (error) {
        // Expected connection failure
      }

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      });
    });

    it('should display error messages from server', async () => {
      const user = userEvent.setup();
      render(<WebSocketTestComponent />);
      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });

      const errorMessage = {
        type: 'error',
        payload: {
          message: 'Workflow failed',
          code: 'WORKFLOW_ERROR'
        },
        timestamp: new Date().toISOString()
      };

      await act(async () => {
        mockClient.simulateMessage(errorMessage);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('1');
      });
    });

    it('should handle server disconnection', async () => {
      const user = userEvent.setup();
      render(<WebSocketTestComponent />);
      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Simulate server disconnect
      await act(async () => {
        mockClient.simulateDisconnect();
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      });
    });
  });

  describe('UI state management integration', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<WebSocketTestComponent />);
      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });
    });

    it('should clear messages through UI action', async () => {
      const user = userEvent.setup();

      // Add some messages
      const statusMessage: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: { phase: 'test-writer', status: 'running', progress: 25 },
        timestamp: new Date().toISOString()
      };

      await act(async () => {
        mockClient.simulateMessage(statusMessage);
      });

      await waitFor(() => {
        expect(screen.getByTestId('message-count')).toHaveTextContent('1');
      });

      // Clear messages
      await act(async () => {
        await user.click(screen.getByTestId('clear-messages-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('message-count')).toHaveTextContent('0');
      });
    });
  });

  describe('performance and stress testing', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<WebSocketTestComponent />);
      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });
    });

    it('should handle high-frequency messages efficiently', async () => {
      const messageCount = 50; // Reduced for testing

      // Send many messages rapidly
      await act(async () => {
        for (let i = 0; i < messageCount; i++) {
          mockClient.simulateMessage({
            type: 'workflow_output',
            payload: {
              source: 'stdout',
              content: `Output line ${i}`,
              timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString(),
            id: `output-${i}`
          });
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('output-count')).toHaveTextContent(messageCount.toString());
      }, { timeout: 5000 });
    });
  });
});