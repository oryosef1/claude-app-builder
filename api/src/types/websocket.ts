/**
 * WebSocket Server Types and Interfaces
 */

export interface WebSocketMessage {
  type: 'workflow_status' | 'workflow_output' | 'file_change' | 'error' | 'ping' | 'pong';
  payload: any;
  timestamp: string;
  id?: string;
}

export interface WorkflowStatusMessage extends WebSocketMessage {
  type: 'workflow_status';
  payload: {
    phase: string;
    status: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
    progress: number;
    startTime?: Date;
    endTime?: Date;
    error?: string;
  };
}

export interface WorkflowOutputMessage extends WebSocketMessage {
  type: 'workflow_output';
  payload: {
    source: 'stdout' | 'stderr';
    content: string;
    timestamp: string;
  };
}

export interface FileChangeMessage extends WebSocketMessage {
  type: 'file_change';
  payload: {
    filename: string;
    path: string;
    changeType: 'created' | 'modified' | 'deleted';
    content?: string;
  };
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  payload: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface PingMessage extends WebSocketMessage {
  type: 'ping';
  payload: {};
}

export interface PongMessage extends WebSocketMessage {
  type: 'pong';
  payload: {};
}

export interface WebSocketServerInterface {
  /**
   * Start the WebSocket server
   */
  start(port?: number): Promise<void>;

  /**
   * Stop the WebSocket server
   */
  stop(): Promise<void>;

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WebSocketMessage): void;

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: WebSocketMessage): void;

  /**
   * Get list of connected clients
   */
  getConnectedClients(): string[];

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    port?: number;
    connectedClients: number;
    uptime?: number;
  };

  /**
   * Set up event listeners for workflow and file changes
   */
  setupEventListeners(): void;

  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;
}

export interface WebSocketClientConnection {
  id: string;
  socket: any;
  connectedAt: Date;
  lastPing?: Date;
  authenticated?: boolean;
}