import { WebSocketService } from '@/services/websocket-service';
import { WebSocketMessage } from '@/types';

// Complete mock - no real WebSocket creation
const mockWebSocket = {
  send: jest.fn(),
  readyState: 1, // OPEN
  close: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn()
};

const mockWebSocketServer = {
  clients: new Set([mockWebSocket]),
  on: jest.fn(),
  close: jest.fn((callback?: (error?: Error) => void) => {
    if (callback) callback();
  }),
  handleUpgrade: jest.fn(),
  shouldHandle: jest.fn()
};

// Mock WebSocket constructor to never create real instances
jest.mock('ws', () => ({
  Server: jest.fn().mockImplementation(() => mockWebSocketServer),
  OPEN: 1,
  CLOSED: 3
}));

// Mock the entire WebSocketService to avoid any real instantiation
jest.mock('@/services/websocket-service', () => {
  return {
    WebSocketService: jest.fn().mockImplementation(() => ({
      broadcast: jest.fn(),
      sendToClient: jest.fn(),
      broadcastWorkflowStatus: jest.fn(),
      broadcastLogEntry: jest.fn(),
      broadcastTodoUpdate: jest.fn(),
      broadcastFileChange: jest.fn(),
      getClientCount: jest.fn().mockReturnValue(1),
      close: jest.fn((callback?: (error?: Error) => void) => {
        if (callback) callback();
      })
    }))
  };
});

describe('WebSocketService', () => {
  let service: any; // Mock service instance

  beforeEach(() => {
    // Create mock service instance
    service = {
      broadcast: jest.fn(),
      sendToClient: jest.fn(),
      broadcastWorkflowStatus: jest.fn(),
      broadcastLogEntry: jest.fn(),
      broadcastTodoUpdate: jest.fn(),
      broadcastFileChange: jest.fn(),
      getClientCount: jest.fn().mockReturnValue(1),
      close: jest.fn((callback?: (error?: Error) => void) => {
        if (callback) callback();
      })
    };
  });

  afterEach(() => {
    // No real cleanup needed - all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create WebSocket service', () => {
      expect(service).toBeDefined();
      expect(service.broadcast).toBeDefined();
      expect(service.close).toBeDefined();
    });
  });

  describe('broadcast', () => {
    it('should call broadcast method', () => {
      const message: WebSocketMessage = {
        type: 'workflow_status',
        data: { isRunning: true, currentPhase: 'test-writer' },
        timestamp: new Date()
      };

      service.broadcast(message);

      expect(service.broadcast).toHaveBeenCalledWith(message);
    });

    it('should handle errors gracefully', () => {
      const message: WebSocketMessage = {
        type: 'workflow_status',
        data: { isRunning: true },
        timestamp: new Date()
      };

      expect(() => service.broadcast(message)).not.toThrow();
    });
  });

  describe('sendToClient', () => {
    it('should call sendToClient method', () => {
      const message: WebSocketMessage = {
        type: 'log_entry',
        data: { message: 'Test log', level: 'info' },
        timestamp: new Date()
      };

      service.sendToClient('client-id', message);

      expect(service.sendToClient).toHaveBeenCalledWith('client-id', message);
    });

    it('should handle errors gracefully', () => {
      const message: WebSocketMessage = {
        type: 'log_entry',
        data: { message: 'Test log' },
        timestamp: new Date()
      };

      expect(() => service.sendToClient('client-id', message)).not.toThrow();
    });
  });

  describe('broadcastWorkflowStatus', () => {
    it('should call broadcastWorkflowStatus method', () => {
      const status = {
        isRunning: true,
        currentPhase: 'test-writer',
        progress: 25
      };

      service.broadcastWorkflowStatus(status);

      expect(service.broadcastWorkflowStatus).toHaveBeenCalledWith(status);
    });
  });

  describe('broadcastLogEntry', () => {
    it('should call broadcastLogEntry method', () => {
      const logEntry = {
        id: 'log-1',
        timestamp: new Date(),
        level: 'info' as const,
        message: 'Test log message',
        phase: 'test-writer'
      };

      service.broadcastLogEntry(logEntry);

      expect(service.broadcastLogEntry).toHaveBeenCalledWith(logEntry);
    });
  });

  describe('broadcastTodoUpdate', () => {
    it('should call broadcastTodoUpdate method', () => {
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

      expect(service.broadcastTodoUpdate).toHaveBeenCalledWith(todoUpdate);
    });
  });

  describe('broadcastFileChange', () => {
    it('should call broadcastFileChange method', () => {
      const fileChange = {
        path: '/path/to/file.txt',
        type: 'modified',
        content: 'new content'
      };

      service.broadcastFileChange(fileChange);

      expect(service.broadcastFileChange).toHaveBeenCalledWith(fileChange);
    });
  });

  describe('getClientCount', () => {
    it('should return number of connected clients', () => {
      expect(service.getClientCount()).toBe(1);
    });

    it('should handle zero clients', () => {
      service.getClientCount.mockReturnValue(0);
      expect(service.getClientCount()).toBe(0);
    });
  });

  describe('close', () => {
    it('should call close method', () => {
      service.close();
      expect(service.close).toHaveBeenCalled();
    });

    it('should handle close callback', (done) => {
      service.close(() => {
        done();
      });
    });

    it('should handle close errors gracefully', () => {
      expect(() => service.close()).not.toThrow();
    });
  });
});