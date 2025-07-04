import { WebSocketService } from '@/services/websocket-service';
import { WebSocketMessage } from '@/types';
import WebSocket from 'ws';

jest.mock('ws');

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockWebSocketServer: jest.Mocked<WebSocket.Server>;
  let mockWebSocket: jest.Mocked<WebSocket>;

  beforeEach(() => {
    mockWebSocket = {
      send: jest.fn(),
      readyState: WebSocket.OPEN,
      close: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    } as any;

    mockWebSocketServer = {
      clients: new Set([mockWebSocket]),
      on: jest.fn(),
      close: jest.fn(),
      handleUpgrade: jest.fn(),
      shouldHandle: jest.fn()
    } as any;

    (WebSocket.Server as jest.Mock).mockImplementation(() => mockWebSocketServer);
    
    service = new WebSocketService(8080);
  });

  describe('constructor', () => {
    it('should create WebSocket server on specified port', () => {
      expect(WebSocket.Server).toHaveBeenCalledWith({ port: 8080 });
    });

    it('should set up connection handler', () => {
      expect(mockWebSocketServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('broadcast', () => {
    it('should send message to all connected clients', () => {
      const message: WebSocketMessage = {
        type: 'workflow_status',
        data: { isRunning: true, currentPhase: 'test-writer' },
        timestamp: new Date()
      };

      service.broadcast(message);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should skip clients that are not in OPEN state', () => {
      const closedWebSocket = {
        ...mockWebSocket,
        readyState: WebSocket.CLOSED
      };

      mockWebSocketServer.clients = new Set([mockWebSocket, closedWebSocket]);

      const message: WebSocketMessage = {
        type: 'workflow_status',
        data: { isRunning: true },
        timestamp: new Date()
      };

      service.broadcast(message);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(closedWebSocket.send).not.toHaveBeenCalled();
    });

    it('should handle send errors gracefully', () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Connection lost');
      });

      const message: WebSocketMessage = {
        type: 'workflow_status',
        data: { isRunning: true },
        timestamp: new Date()
      };

      expect(() => service.broadcast(message)).not.toThrow();
    });

    it('should handle JSON serialization errors', () => {
      const circularObject = { a: {} };
      circularObject.a = circularObject;

      const message: WebSocketMessage = {
        type: 'workflow_status',
        data: circularObject,
        timestamp: new Date()
      };

      expect(() => service.broadcast(message)).not.toThrow();
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('sendToClient', () => {
    it('should send message to specific client', () => {
      const message: WebSocketMessage = {
        type: 'log_entry',
        data: { message: 'Test log', level: 'info' },
        timestamp: new Date()
      };

      service.sendToClient(mockWebSocket, message);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should not send to closed client', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      const message: WebSocketMessage = {
        type: 'log_entry',
        data: { message: 'Test log' },
        timestamp: new Date()
      };

      service.sendToClient(mockWebSocket, message);

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should handle send errors for specific client', () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Connection lost');
      });

      const message: WebSocketMessage = {
        type: 'log_entry',
        data: { message: 'Test log' },
        timestamp: new Date()
      };

      expect(() => service.sendToClient(mockWebSocket, message)).not.toThrow();
    });
  });

  describe('broadcastWorkflowStatus', () => {
    it('should broadcast workflow status update', () => {
      const status = {
        isRunning: true,
        currentPhase: 'test-writer',
        progress: 25
      };

      service.broadcastWorkflowStatus(status);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'workflow_status',
          data: status,
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('broadcastLogEntry', () => {
    it('should broadcast log entry', () => {
      const logEntry = {
        id: 'log-1',
        timestamp: new Date(),
        level: 'info' as const,
        message: 'Test log message',
        phase: 'test-writer'
      };

      service.broadcastLogEntry(logEntry);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'log_entry',
          data: logEntry,
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('broadcastTodoUpdate', () => {
    it('should broadcast todo update', () => {
      const todoUpdate = {
        action: 'created',
        todo: {
          id: 'todo-1',
          content: 'New todo',
          priority: 'high' as const,
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      service.broadcastTodoUpdate(todoUpdate);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'todo_update',
          data: todoUpdate,
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('broadcastFileChange', () => {
    it('should broadcast file change notification', () => {
      const fileChange = {
        path: '/path/to/file.txt',
        type: 'modified',
        content: 'new content'
      };

      service.broadcastFileChange(fileChange);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'file_change',
          data: fileChange,
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('getClientCount', () => {
    it('should return number of connected clients', () => {
      expect(service.getClientCount()).toBe(1);
    });

    it('should return 0 when no clients connected', () => {
      mockWebSocketServer.clients = new Set();
      expect(service.getClientCount()).toBe(0);
    });
  });

  describe('close', () => {
    it('should close WebSocket server', () => {
      service.close();
      expect(mockWebSocketServer.close).toHaveBeenCalled();
    });

    it('should handle close callback', (done) => {
      mockWebSocketServer.close.mockImplementation((callback) => {
        if (callback) callback();
      });

      service.close(() => {
        done();
      });
    });

    it('should handle close errors', () => {
      mockWebSocketServer.close.mockImplementation((callback) => {
        if (callback) callback(new Error('Close error'));
      });

      expect(() => service.close()).not.toThrow();
    });
  });
});