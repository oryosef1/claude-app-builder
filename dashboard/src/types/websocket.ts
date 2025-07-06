/**
 * WebSocket Client Types and Interfaces for Dashboard
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

export interface WebSocketClientInterface {
  /**
   * Connect to WebSocket server
   */
  connect(url: string): Promise<void>;

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void;

  /**
   * Send message to server
   */
  send(message: WebSocketMessage): void;

  /**
   * Subscribe to specific message types
   */
  subscribe(messageType: string, callback: (message: WebSocketMessage) => void): () => void;

  /**
   * Get connection status
   */
  getStatus(): {
    isConnected: boolean;
    url?: string;
    lastConnected?: Date;
    reconnectAttempts: number;
  };

  /**
   * Enable/disable auto-reconnection
   */
  setAutoReconnect(enabled: boolean): void;

  /**
   * Clean up resources
   */
  cleanup(): void;
}

export interface WebSocketClientState {
  isConnected: boolean;
  isConnecting: boolean;
  url?: string;
  lastConnected?: Date;
  lastError?: Error;
  reconnectAttempts: number;
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
}

export interface WebSocketHookState extends WebSocketClientState {
  messages: WebSocketMessage[];
  workflowStatus?: WorkflowStatusMessage;
  workflowOutput: WorkflowOutputMessage[];
  fileChanges: FileChangeMessage[];
  errors: ErrorMessage[];
}

export interface WebSocketHookActions {
  connect: (url: string) => Promise<void>;
  disconnect: () => void;
  send: (message: WebSocketMessage) => void;
  clearMessages: () => void;
  clearOutput: () => void;
  clearErrors: () => void;
}

export type WebSocketHook = WebSocketHookState & WebSocketHookActions;