import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentCommunication } from '../../src/core/AgentCommunication.js';
import type { AIEmployee } from '../../src/types/index.js';

describe('AgentCommunication', () => {
  let communication: AgentCommunication;
  let mockRegistry: any;
  let mockProcessManager: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };

    mockRegistry = {
      getEmployee: vi.fn((id: string) => ({
        id,
        name: `Employee ${id}`,
        role: 'Developer',
        skills: ['coding', 'testing'],
        status: 'active',
        department: 'Development'
      })),
      getAllEmployees: vi.fn(() => [
        { id: 'emp_001', name: 'Alice', skills: ['coding'], status: 'active', department: 'Development' },
        { id: 'emp_002', name: 'Bob', skills: ['testing'], status: 'active', department: 'Development' },
        { id: 'emp_003', name: 'Charlie', skills: ['coding', 'testing'], status: 'active', department: 'Development' }
      ]),
      getEmployeesBySkills: vi.fn((skills: string[]) => {
        if (skills.includes('coding')) {
          return [
            { id: 'emp_001', name: 'Alice', skills: ['coding'], status: 'active', workload: 30 },
            { id: 'emp_003', name: 'Charlie', skills: ['coding', 'testing'], status: 'active', workload: 50 }
          ];
        }
        return [];
      })
    };

    mockProcessManager = {
      getProcessesByEmployee: vi.fn().mockReturnValue([]),
      sendToProcess: vi.fn()
    };

    communication = new AgentCommunication(mockRegistry, mockProcessManager, mockLogger);
  });

  describe('Direct Messaging', () => {
    it('should send direct message between agents', async () => {
      const messageId = await communication.sendMessage({
        from: 'emp_001',
        to: 'emp_002',
        type: 'info',
        topic: 'task-update',
        content: 'Task completed',
        priority: 'medium'
      });

      expect(messageId).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Direct message from emp_001 to emp_002')
      );
    });

    it('should handle message to non-existent employee', async () => {
      mockRegistry.getEmployee.mockReturnValueOnce(null);
      
      const messageId = await communication.sendMessage({
        from: 'emp_001',
        to: 'emp_999',
        type: 'info',
        topic: 'test',
        content: 'Test message'
      });

      expect(messageId).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Recipient emp_999 not found')
      );
    });

    it('should queue messages for offline agents', async () => {
      mockRegistry.getEmployee.mockReturnValueOnce({
        id: 'emp_002',
        name: 'Bob',
        status: 'offline'
      });

      const messageId = await communication.sendMessage({
        from: 'emp_001',
        to: 'emp_002',
        type: 'info',
        topic: 'test',
        content: 'Queued message'
      });

      expect(messageId).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Message queued for offline employee emp_002')
      );
    });
  });

  describe('Broadcast Messaging', () => {
    it('should broadcast message to all agents', async () => {
      const messageId = await communication.sendMessage({
        from: 'emp_001',
        to: 'broadcast',
        type: 'announcement',
        topic: 'system-update',
        content: 'System maintenance at 5 PM'
      });

      expect(messageId).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Broadcast message from emp_001')
      );
    });
  });

  describe('Channel Messaging', () => {
    it('should send message to channel', async () => {
      const messageId = await communication.sendMessage({
        from: 'emp_001',
        to: 'channel:development',
        type: 'discussion',
        topic: 'code-review',
        content: 'Please review PR #123'
      });

      expect(messageId).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Channel message from emp_001 to development')
      );
    });

    it('should subscribe to channel', () => {
      communication.subscribeToChannel('emp_001', 'development');
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Employee emp_001 subscribed to channel development'
      );
    });

    it('should unsubscribe from channel', () => {
      communication.subscribeToChannel('emp_001', 'development');
      communication.unsubscribeFromChannel('emp_001', 'development');
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Employee emp_001 unsubscribed from channel development'
      );
    });
  });

  describe('Message Retrieval', () => {
    it('should get messages for employee', async () => {
      // Send some messages
      await communication.sendMessage({
        from: 'emp_002',
        to: 'emp_001',
        type: 'info',
        topic: 'test',
        content: 'Message 1'
      });

      await communication.sendMessage({
        from: 'emp_003',
        to: 'emp_001',
        type: 'info',
        topic: 'test',
        content: 'Message 2'
      });

      const messages = communication.getMessagesForEmployee('emp_001');
      expect(messages).toHaveLength(2);
      expect(messages[0]?.content).toBe('Message 1');
      expect(messages[1]?.content).toBe('Message 2');
    });

    it('should get queued messages', async () => {
      // Queue a message for offline employee
      mockRegistry.getEmployee.mockReturnValueOnce({
        id: 'emp_002',
        name: 'Bob',
        status: 'offline'
      });

      await communication.sendMessage({
        from: 'emp_001',
        to: 'emp_002',
        type: 'info',
        topic: 'test',
        content: 'Queued message'
      });

      const queuedMessages = communication.getQueuedMessages('emp_002');
      expect(queuedMessages).toHaveLength(1);
      expect(queuedMessages[0]?.content).toBe('Queued message');
    });

    it('should mark message as read', async () => {
      const messageId = await communication.sendMessage({
        from: 'emp_001',
        to: 'emp_002',
        type: 'info',
        topic: 'test',
        content: 'Test message'
      });

      communication.markAsRead(messageId, 'emp_002');
      
      const messages = communication.getMessagesForEmployee('emp_002');
      expect(messages[0]?.read).toBe(true);
      expect(messages[0]?.readAt).toBeDefined();
    });
  });

  describe('Collaboration', () => {
    it('should create collaboration request', async () => {
      const collaborationId = await communication.createCollaboration(
        'emp_001',
        ['emp_002', 'emp_003'],
        'Bug Investigation',
        'Need help debugging issue #456',
        new Date(Date.now() + 3600000) // 1 hour deadline
      );

      expect(collaborationId).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Created collaboration')
      );
    });

    it('should update collaboration status', async () => {
      const collaborationId = await communication.createCollaboration(
        'emp_001',
        ['emp_002'],
        'Test Collaboration'
      );

      communication.updateCollaborationStatus(collaborationId, 'in_progress');
      
      const collaborations = communication.getActiveCollaborations();
      expect(collaborations[0]?.status).toBe('in_progress');
    });

    it.skip('should add participant to collaboration', async () => {
      const collaborationId = await communication.createCollaboration(
        'emp_001',
        ['emp_002'],
        'Test Collaboration'
      );

      communication.addParticipant(collaborationId, 'emp_003');
      
      const collaborations = communication.getActiveCollaborations();
      expect(collaborations[0]?.participants).toContain('emp_003');
    });
  });

  describe('Expert Finding', () => {
    it('should find experts by skills', async () => {
      const experts = await communication.findExperts('code-review', ['coding']);
      
      expect(experts).toHaveLength(2);
      expect(experts[0]?.id).toBe('emp_001'); // Lower workload
      expect(experts[1]?.id).toBe('emp_003');
    });

    it('should return empty array when no experts found', async () => {
      mockRegistry.getEmployeesBySkills.mockReturnValueOnce([]);
      
      const experts = await communication.findExperts('test', ['non-existent-skill']);
      
      expect(experts).toEqual([]);
    });
  });

  describe('Event Handling', () => {
    it('should emit message events', async () => {
      const messageHandler = vi.fn();
      communication.on('message-sent', messageHandler);

      await communication.sendMessage({
        from: 'emp_001',
        to: 'emp_002',
        type: 'info',
        topic: 'test',
        content: 'Test'
      });

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            from: 'emp_001',
            to: 'emp_002'
          })
        })
      );
    });

    it('should emit collaboration events', async () => {
      const collaborationHandler = vi.fn();
      communication.on('collaboration-created', collaborationHandler);

      await communication.createCollaboration(
        'emp_001',
        ['emp_002'],
        'Test'
      );

      expect(collaborationHandler).toHaveBeenCalled();
    });
  });

  describe('Metrics', () => {
    it('should get communication metrics', async () => {
      // Send various messages
      await communication.sendMessage({
        from: 'emp_001',
        to: 'emp_002',
        type: 'info',
        topic: 'test',
        content: 'Direct'
      });

      await communication.sendMessage({
        from: 'emp_001',
        to: 'broadcast',
        type: 'announcement',
        topic: 'test',
        content: 'Broadcast'
      });

      await communication.createCollaboration('emp_001', ['emp_002'], 'Test');

      const metrics = communication.getMetrics();
      
      expect(metrics.totalMessages).toBe(2);
      expect(metrics.directMessages).toBe(1);
      expect(metrics.broadcastMessages).toBe(1);
      expect(metrics.activeCollaborations).toBe(1);
      expect(metrics.messagesByEmployee.emp_001).toBe(2);
    });
  });
});