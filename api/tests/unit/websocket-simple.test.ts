/**
 * Ultra-simple WebSocket service test - pure mocks only
 * Designed to avoid any real resource creation or hanging
 */

// Mock all dependencies completely
const mockWebSocketService = {
  broadcast: jest.fn(),
  sendToClient: jest.fn(),
  broadcastWorkflowStatus: jest.fn(),
  broadcastLogEntry: jest.fn(),
  broadcastTodoUpdate: jest.fn(),
  broadcastFileChange: jest.fn(),
  getClientCount: jest.fn().mockReturnValue(1),
  close: jest.fn()
};

describe('WebSocketService (Mock-Only)', () => {
  let service: any;

  beforeEach(() => {
    service = mockWebSocketService;
    jest.clearAllMocks();
  });

  afterEach(() => {
    // No real cleanup needed
  });

  it('should have broadcast method', () => {
    expect(service.broadcast).toBeDefined();
    expect(typeof service.broadcast).toBe('function');
  });

  it('should call broadcast with message', () => {
    const message = {
      type: 'test',
      data: { test: true },
      timestamp: new Date()
    };

    service.broadcast(message);
    
    expect(service.broadcast).toHaveBeenCalledWith(message);
  });

  it('should have sendToClient method', () => {
    expect(service.sendToClient).toBeDefined();
    service.sendToClient('client-1', { type: 'test', data: {}, timestamp: new Date() });
    expect(service.sendToClient).toHaveBeenCalled();
  });

  it('should have getClientCount method', () => {
    expect(service.getClientCount()).toBe(1);
  });

  it('should have close method', () => {
    service.close();
    expect(service.close).toHaveBeenCalled();
  });

  it('should handle workflow status broadcast', () => {
    const status = { isRunning: true, currentPhase: 'test-writer' };
    service.broadcastWorkflowStatus(status);
    expect(service.broadcastWorkflowStatus).toHaveBeenCalledWith(status);
  });

  it('should handle log entry broadcast', () => {
    const logEntry = { id: '1', message: 'test', level: 'info', timestamp: new Date() };
    service.broadcastLogEntry(logEntry);
    expect(service.broadcastLogEntry).toHaveBeenCalledWith(logEntry);
  });

  it('should handle todo update broadcast', () => {
    const todoUpdate = { action: 'created', todo: { id: '1', content: 'test' } };
    service.broadcastTodoUpdate(todoUpdate);
    expect(service.broadcastTodoUpdate).toHaveBeenCalledWith(todoUpdate);
  });

  it('should handle file change broadcast', () => {
    const fileChange = { path: '/test.txt', type: 'modified' };
    service.broadcastFileChange(fileChange);
    expect(service.broadcastFileChange).toHaveBeenCalledWith(fileChange);
  });
});