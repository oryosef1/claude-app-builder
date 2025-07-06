import { io, Socket } from 'socket.io-client';
import { 
  WebSocketClientInterface, 
  WebSocketMessage, 
  WebSocketClientState 
} from '../types/websocket';

/**
 * WebSocket Client Implementation for Dashboard
 * Handles real-time communication with backend WebSocket server
 */
export class WebSocketClient implements WebSocketClientInterface {
  private socket: Socket | null = null;
  private state: WebSocketClientState = {
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    autoReconnect: true,
    reconnectDelay: 1000,
    maxReconnectAttempts: 5
  };
  private subscribers: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();
  private reconnectTimer?: NodeJS.Timeout;

  constructor() {
    // Initialize with default state
  }

  /**
   * Connect to WebSocket server
   */
  async connect(url: string): Promise<void> {
    if (this.socket?.connected) {
      return; // Already connected
    }

    this.state.isConnecting = true;
    this.state.url = url;

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(url, {
          transports: ['websocket', 'polling'],
          timeout: 5000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          this.state.isConnected = true;
          this.state.isConnecting = false;
          this.state.lastConnected = new Date();
          this.state.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('disconnect', () => {
          this.state.isConnected = false;
          this.handleDisconnection();
        });

        this.socket.on('connect_error', (error) => {
          this.state.isConnecting = false;
          this.state.lastError = error;
          reject(error);
        });

        this.socket.on('error', (error) => {
          this.state.lastError = error;
          console.error('WebSocket error:', error);
        });

        this.socket.on('message', (message: WebSocketMessage) => {
          this.handleMessage(message);
        });

        // Handle ping/pong
        this.socket.on('ping', () => {
          this.socket?.emit('pong', {
            type: 'pong',
            payload: {},
            timestamp: new Date().toISOString()
          });
        });

      } catch (error) {
        this.state.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.url = undefined;
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage): void {
    if (!this.socket?.connected) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    // Auto-respond to ping with pong
    if (message.type === 'ping') {
      this.socket.emit('message', {
        type: 'pong',
        payload: {},
        timestamp: new Date().toISOString()
      });
      return;
    }

    this.socket.emit('message', message);
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(messageType: string, callback: (message: WebSocketMessage) => void): () => void {
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, []);
    }

    this.subscribers.get(messageType)!.push(callback);

    // Return unsubscribe function
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

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.state.isConnected,
      isConnecting: this.state.isConnecting,
      url: this.state.url,
      lastConnected: this.state.lastConnected,
      lastError: this.state.lastError,
      reconnectAttempts: this.state.reconnectAttempts
    };
  }

  /**
   * Enable/disable auto-reconnection
   */
  setAutoReconnect(enabled: boolean): void {
    this.state.autoReconnect = enabled;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.disconnect();
    this.subscribers.clear();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  /**
   * Handle incoming messages from server
   */
  private handleMessage(message: WebSocketMessage): void {
    try {
      // Auto-respond to ping messages
      if (message.type === 'ping') {
        this.send({
          type: 'pong',
          payload: {},
          timestamp: new Date().toISOString()
        });
      }

      // Notify subscribers
      const callbacks = this.subscribers.get(message.type);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in message callback:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Handle disconnection and auto-reconnect
   */
  private handleDisconnection(): void {
    if (!this.state.autoReconnect || this.state.reconnectAttempts >= this.state.maxReconnectAttempts) {
      return;
    }

    const delay = this.state.reconnectDelay * Math.pow(2, this.state.reconnectAttempts);
    this.state.reconnectAttempts++;

    this.reconnectTimer = setTimeout(async () => {
      if (this.state.url && !this.state.isConnected) {
        try {
          await this.connect(this.state.url);
        } catch (error) {
          console.error('Reconnection failed:', error);
        }
      }
    }, delay);
  }
}