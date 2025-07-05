import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { 
  WebSocketServerInterface, 
  WebSocketMessage, 
  WebSocketClientConnection 
} from '../types/websocket';

/**
 * WebSocket Server Implementation
 * Handles real-time communication between backend and frontend clients
 */
export class WebSocketServer implements WebSocketServerInterface {
  private io: SocketIOServer | null = null;
  private httpServer: HttpServer | null = null;
  private isRunning: boolean = false;
  private port?: number;
  private startTime?: Date;
  private clients: Map<string, WebSocketClientConnection> = new Map();

  constructor() {
    // Initialize with default state
  }

  /**
   * Start the WebSocket server
   */
  async start(port: number = 3002): Promise<void> {
    if (this.isRunning) {
      throw new Error('WebSocket server is already running');
    }

    try {
      // Create Socket.IO server
      this.io = new SocketIOServer(port, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });

      this.port = port;
      this.startTime = new Date();
      this.isRunning = true;

      // Setup connection handling
      this.io.on('connection', (socket) => {
        this.handleClientConnection(socket);
      });

      this.io.listen(port);
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.io) {
      return;
    }

    this.io.close();
    this.isRunning = false;
    this.port = undefined;
    this.startTime = undefined;
    this.clients.clear();
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WebSocketMessage): void {
    if (!this.io || !this.isRunning) {
      return;
    }

    this.io.sockets.emit('message', message);
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.socket) {
      client.socket.emit('message', message);
    }
  }

  /**
   * Get list of connected clients
   */
  getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    port?: number;
    connectedClients: number;
    uptime?: number;
  } {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : undefined;
    
    return {
      isRunning: this.isRunning,
      port: this.port,
      connectedClients: this.clients.size,
      uptime
    };
  }

  /**
   * Set up event listeners for workflow and file changes
   */
  setupEventListeners(): void {
    // This will be implemented to listen to WorkflowManager and FileWatcher events
    // and broadcast them to connected clients
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    this.clients.clear();
  }

  /**
   * Handle new client connection
   */
  private handleClientConnection(socket: any): void {
    const clientConnection: WebSocketClientConnection = {
      id: socket.id,
      socket: socket,
      connectedAt: new Date(),
      authenticated: false
    };

    this.clients.set(socket.id, clientConnection);

    // Handle client events
    socket.on('disconnect', () => {
      this.clients.delete(socket.id);
    });

    socket.on('ping', () => {
      clientConnection.lastPing = new Date();
      socket.emit('pong', {
        type: 'pong',
        payload: {},
        timestamp: new Date().toISOString()
      });
    });

    socket.on('error', (error: Error) => {
      console.error(`Socket error for client ${socket.id}:`, error);
    });

    socket.on('message', (data: any) => {
      try {
        // Handle incoming messages from clients
        this.handleClientMessage(socket.id, data);
      } catch (error) {
        console.error(`Error handling message from client ${socket.id}:`, error);
      }
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleClientMessage(clientId: string, data: any): void {
    // Process client messages (ping, authentication, etc.)
    if (data && data.type === 'ping') {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastPing = new Date();
      }
    }
  }
}