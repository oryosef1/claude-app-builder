import { EventEmitter } from 'events';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { AgentRegistry } from './AgentRegistry.js';
import { ProcessManager } from './ProcessManager.js';
import type { AIEmployee } from '../types/index.js';

export interface AgentMessage {
  id: string;
  from: string; // Employee ID
  to: string | string[]; // Employee ID(s) or 'broadcast'
  type: 'request' | 'response' | 'notification' | 'broadcast';
  topic: string;
  content: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

export interface CommunicationChannel {
  id: string;
  name: string;
  members: string[]; // Employee IDs
  type: 'direct' | 'team' | 'department' | 'broadcast';
  created: Date;
  lastActivity: Date;
}

export interface CollaborationRequest {
  id: string;
  initiator: string;
  participants: string[];
  topic: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created: Date;
  deadline?: Date;
}

export class AgentCommunication extends EventEmitter {
  private messages: Map<string, AgentMessage> = new Map();
  private channels: Map<string, CommunicationChannel> = new Map();
  private collaborations: Map<string, CollaborationRequest> = new Map();
  private messageQueues: Map<string, AgentMessage[]> = new Map(); // Per-employee message queues
  
  constructor(
    private registry: AgentRegistry,
    private processManager: ProcessManager,
    private logger: winston.Logger
  ) {
    super();
    this.initializeChannels();
  }

  private initializeChannels(): void {
    // Create department channels
    const departments = new Set<string>();
    const employees = this.registry.getAllEmployees();
    
    employees.forEach(emp => departments.add(emp.department));
    
    departments.forEach(dept => {
      const channel: CommunicationChannel = {
        id: `dept-${dept.toLowerCase()}`,
        name: `${dept} Department`,
        members: employees.filter(e => e.department === dept).map(e => e.id),
        type: 'department',
        created: new Date(),
        lastActivity: new Date()
      };
      this.channels.set(channel.id, channel);
    });

    // Create broadcast channel
    const broadcastChannel: CommunicationChannel = {
      id: 'broadcast',
      name: 'Company Broadcast',
      members: employees.map(e => e.id),
      type: 'broadcast',
      created: new Date(),
      lastActivity: new Date()
    };
    this.channels.set('broadcast', broadcastChannel);

    this.logger.info(`Initialized ${this.channels.size} communication channels`);
  }

  // Send a message between agents
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: AgentMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date()
    };

    this.messages.set(fullMessage.id, fullMessage);

    // Handle different message types
    if (typeof fullMessage.to === 'string') {
      if (fullMessage.to === 'broadcast') {
        await this.broadcastMessage(fullMessage);
      } else if (fullMessage.to.startsWith('channel:')) {
        // Channel message
        const channelName = fullMessage.to.substring(8);
        this.logger.info(`Channel message from ${fullMessage.from} to ${channelName}`);
        await this.sendToChannelByName(channelName, fullMessage);
      } else {
        await this.deliverToAgent(fullMessage.to, fullMessage);
      }
    } else if (Array.isArray(fullMessage.to)) {
      // Multi-recipient message
      await Promise.all(fullMessage.to.map(recipient => 
        this.deliverToAgent(recipient, fullMessage)
      ));
    }

    this.emit('message-sent', { message: fullMessage });
    return fullMessage.id;
  }

  private async deliverToAgent(employeeId: string, message: AgentMessage): Promise<void> {
    // Check if recipient exists
    const recipient = this.registry.getEmployeeById(employeeId);
    if (!recipient) {
      this.logger.warn(`Recipient ${employeeId} not found`);
      return;
    }

    // Log the message
    if (message.type === 'notification') {
      this.logger.info(`Direct message from ${message.from} to ${employeeId}`);
    }

    // Check if agent has an active process
    const processes = this.processManager.getProcessesByEmployee(employeeId);
    const activeProcess = processes.find(p => p.status === 'running');

    if (activeProcess) {
      // Deliver immediately to active process
      this.processManager.sendToProcess(activeProcess.id, {
        type: 'agent-message',
        message
      });
      this.emit('message-delivered', { employeeId, message, delivered: true });
    } else {
      // Queue message for later delivery
      if (!this.messageQueues.has(employeeId)) {
        this.messageQueues.set(employeeId, []);
      }
      this.messageQueues.get(employeeId)!.push(message);
      this.logger.info(`Message queued for offline employee ${employeeId}`);
      this.emit('message-queued', { employeeId, message });
    }
  }

  private async broadcastMessage(message: AgentMessage): Promise<void> {
    this.logger.info(`Broadcast message from ${message.from}`);
    const employees = this.registry.getAllEmployees();
    await Promise.all(employees.map(emp => 
      this.deliverToAgent(emp.id, message)
    ));
  }

  private async sendToChannelByName(channelName: string, message: AgentMessage): Promise<void> {
    // Try to find channel by name or ID
    let channel = this.channels.get(`dept-${channelName.toLowerCase()}`);
    
    if (!channel) {
      channel = Array.from(this.channels.values()).find(
        ch => ch.name.toLowerCase().includes(channelName.toLowerCase()) || 
              ch.id.toLowerCase().includes(channelName.toLowerCase())
      );
    }
    
    if (channel) {
      // Send to all channel members
      await Promise.all(channel.members.map(memberId => 
        this.deliverToAgent(memberId, message)
      ));
    } else {
      this.logger.warn(`Channel ${channelName} not found`);
    }
  }

  // Get pending messages for an agent
  getPendingMessages(employeeId: string): AgentMessage[] {
    return this.messageQueues.get(employeeId) || [];
  }

  // Clear delivered messages
  clearDeliveredMessages(employeeId: string, messageIds: string[]): void {
    const queue = this.messageQueues.get(employeeId);
    if (queue) {
      const remaining = queue.filter(msg => !messageIds.includes(msg.id));
      this.messageQueues.set(employeeId, remaining);
    }
  }

  // Create a collaboration request
  async createCollaboration(
    initiator: string,
    participants: string[],
    topic: string,
    description: string,
    deadline?: Date
  ): Promise<string> {
    const collaboration: CollaborationRequest = {
      id: uuidv4(),
      initiator,
      participants: [initiator, ...participants],
      topic,
      description,
      status: 'pending',
      created: new Date(),
      deadline
    };

    this.collaborations.set(collaboration.id, collaboration);
    this.logger.info(`Created collaboration ${collaboration.id} on topic: ${topic}`);

    // Notify all participants
    await this.sendMessage({
      from: initiator,
      to: participants,
      type: 'request',
      topic: 'collaboration-request',
      content: {
        collaborationId: collaboration.id,
        topic,
        description,
        deadline
      },
      priority: 'high'
    });

    this.emit('collaboration-created', collaboration);
    return collaboration.id;
  }

  // Update collaboration status
  updateCollaborationStatus(
    collaborationId: string, 
    status: CollaborationRequest['status']
  ): void {
    const collaboration = this.collaborations.get(collaborationId);
    if (collaboration) {
      collaboration.status = status;
      this.emit('collaboration-updated', collaboration);
    }
  }

  // Get active collaborations for an employee
  getActiveCollaborations(employeeId?: string): CollaborationRequest[] {
    if (employeeId) {
      return Array.from(this.collaborations.values()).filter(
        collab => collab.participants.includes(employeeId) && 
                  (collab.status === 'active' || collab.status === 'in_progress')
      );
    } else {
      // Return all active/in_progress collaborations
      return Array.from(this.collaborations.values()).filter(
        collab => collab.status === 'active' || collab.status === 'in_progress'
      );
    }
  }

  // Create a direct channel between agents
  createDirectChannel(employee1: string, employee2: string): string {
    const channelId = `direct-${[employee1, employee2].sort().join('-')}`;
    
    if (!this.channels.has(channelId)) {
      const channel: CommunicationChannel = {
        id: channelId,
        name: `Direct: ${employee1} <-> ${employee2}`,
        members: [employee1, employee2],
        type: 'direct',
        created: new Date(),
        lastActivity: new Date()
      };
      this.channels.set(channelId, channel);
    }

    return channelId;
  }

  // Create a team channel
  createTeamChannel(name: string, members: string[]): string {
    const channelId = `team-${uuidv4()}`;
    const channel: CommunicationChannel = {
      id: channelId,
      name,
      members,
      type: 'team',
      created: new Date(),
      lastActivity: new Date()
    };
    
    this.channels.set(channelId, channel);
    this.emit('channel-created', channel);
    
    return channelId;
  }

  // Send message to a channel
  async sendToChannel(channelId: string, message: Omit<AgentMessage, 'id' | 'timestamp' | 'to'>): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    const fullMessage: AgentMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
      to: channel.members
    };

    await this.sendMessage(fullMessage);
    
    channel.lastActivity = new Date();
  }

  // Get communication metrics
  getMetrics(): {
    totalMessages: number;
    directMessages: number;
    broadcastMessages: number;
    queuedMessages: number;
    activeChannels: number;
    activeCollaborations: number;
    messagesByPriority: Record<string, number>;
    messagesByEmployee: Record<string, number>;
  } {
    const messagesByPriority: Record<string, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    const messagesByEmployee: Record<string, number> = {};
    let directMessages = 0;
    let broadcastMessages = 0;

    this.messages.forEach(msg => {
      messagesByPriority[msg.priority]++;
      
      // Count by employee
      if (!messagesByEmployee[msg.from]) {
        messagesByEmployee[msg.from] = 0;
      }
      messagesByEmployee[msg.from]++;
      
      // Count message types
      if (msg.to === 'broadcast') {
        broadcastMessages++;
      } else if (typeof msg.to === 'string' && !msg.to.startsWith('channel:')) {
        directMessages++;
      }
    });

    let queuedMessages = 0;
    this.messageQueues.forEach(queue => {
      queuedMessages += queue.length;
    });

    return {
      totalMessages: this.messages.size,
      directMessages,
      broadcastMessages,
      queuedMessages,
      activeChannels: this.channels.size,
      activeCollaborations: Array.from(this.collaborations.values())
        .filter(c => c.status === 'active').length,
      messagesByPriority,
      messagesByEmployee
    };
  }

  // Find experts for a topic
  async findExperts(topic: string, skills: string[]): Promise<AIEmployee[]> {
    const employees = this.registry.getAllEmployees();
    
    // Score employees based on skill match
    const scored = employees.map(emp => {
      let score = 0;
      skills.forEach(skill => {
        if (emp.skills.includes(skill)) score += 10;
        // Partial matches
        if (emp.skills.some(s => s.includes(skill) || skill.includes(s))) score += 5;
      });
      
      // Boost for availability
      if (emp.status === 'active' && emp.workload < 50) score += 20;
      else if (emp.status === 'active' && emp.workload < 80) score += 10;
      
      return { employee: emp, score };
    });

    // Return top experts
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.employee);
  }

  // Handle agent status changes
  handleAgentStatusChange(employeeId: string, status: string): void {
    if (status === 'active') {
      // Deliver queued messages
      const messages = this.getPendingMessages(employeeId);
      if (messages.length > 0) {
        this.logger.info(`Delivering ${messages.length} queued messages to ${employeeId}`);
        messages.forEach(msg => this.deliverToAgent(employeeId, msg));
      }
    }
  }

  // Subscribe an employee to a channel
  subscribeToChannel(employeeId: string, channelName: string): void {
    // Try to find channel by name, ID, or partial match
    const channel = Array.from(this.channels.values()).find(ch => 
      ch.name.toLowerCase() === channelName.toLowerCase() ||
      ch.id.toLowerCase() === channelName.toLowerCase() ||
      ch.name.toLowerCase().includes(channelName.toLowerCase()) ||
      ch.id.toLowerCase().includes(channelName.toLowerCase())
    );
    
    if (channel && !channel.members.includes(employeeId)) {
      channel.members.push(employeeId);
      this.logger.info(`Employee ${employeeId} subscribed to channel ${channelName}`);
    }
  }

  // Unsubscribe an employee from a channel
  unsubscribeFromChannel(employeeId: string, channelName: string): void {
    // Try to find channel by name, ID, or partial match
    const channel = Array.from(this.channels.values()).find(ch => 
      ch.name.toLowerCase() === channelName.toLowerCase() ||
      ch.id.toLowerCase() === channelName.toLowerCase() ||
      ch.name.toLowerCase().includes(channelName.toLowerCase()) ||
      ch.id.toLowerCase().includes(channelName.toLowerCase())
    );
    
    if (channel) {
      channel.members = channel.members.filter(id => id !== employeeId);
      this.logger.info(`Employee ${employeeId} unsubscribed from channel ${channelName}`);
    }
  }

  // Get messages for a specific employee
  getMessagesForEmployee(employeeId: string): AgentMessage[] {
    return Array.from(this.messages.values()).filter(msg => {
      if (typeof msg.to === 'string') {
        return msg.to === employeeId || msg.from === employeeId;
      } else if (Array.isArray(msg.to)) {
        return msg.to.includes(employeeId) || msg.from === employeeId;
      }
      return false;
    });
  }

  // Get queued messages for an offline employee
  getQueuedMessages(employeeId: string): AgentMessage[] {
    return this.messageQueues.get(employeeId) || [];
  }

  // Mark a message as read
  markAsRead(messageId: string, employeeId: string): void {
    const message = this.messages.get(messageId);
    if (message) {
      if (!message.metadata) {
        message.metadata = {};
      }
      if (!message.metadata.readBy) {
        message.metadata.readBy = [];
      }
      if (!message.metadata.readBy.includes(employeeId)) {
        message.metadata.readBy.push(employeeId);
      }
      
      // Remove from queue if exists
      const queue = this.messageQueues.get(employeeId);
      if (queue) {
        const index = queue.findIndex(msg => msg.id === messageId);
        if (index >= 0) {
          queue.splice(index, 1);
        }
      }
    }
  }

  // Cleanup old messages
  cleanup(olderThan: Date): void {
    let cleaned = 0;
    
    this.messages.forEach((msg, id) => {
      if (msg.timestamp < olderThan) {
        this.messages.delete(id);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.logger.info(`Cleaned up ${cleaned} old messages`);
    }
  }
}