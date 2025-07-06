import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketClient } from '../services/websocket';
import { 
  WebSocketHook,
  WebSocketMessage, 
  WorkflowStatusMessage, 
  WorkflowOutputMessage, 
  FileChangeMessage,
  ErrorMessage 
} from '../types/websocket';

/**
 * Custom React hook for WebSocket real-time communication
 * Provides state management and actions for WebSocket connectivity
 */
export function useWebSocket(): WebSocketHook {
  const clientRef = useRef<WebSocketClient | null>(null);
  const unsubscribeFuncsRef = useRef<(() => void)[]>([]);
  
  // WebSocket connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [url, setUrl] = useState<string | undefined>();
  const [lastConnected, setLastConnected] = useState<Date | undefined>();
  const [lastError, setLastError] = useState<Error | undefined>();
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [autoReconnect] = useState(true);
  const [reconnectDelay] = useState(1000);
  const [maxReconnectAttempts] = useState(5);

  // Message state
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusMessage | undefined>();
  const [workflowOutput, setWorkflowOutput] = useState<WorkflowOutputMessage[]>([]);
  const [fileChanges, setFileChanges] = useState<FileChangeMessage[]>([]);
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  // Initialize WebSocket client
  useEffect(() => {
    clientRef.current = new WebSocketClient();
    clientRef.current.setAutoReconnect(autoReconnect);

    return () => {
      if (clientRef.current) {
        clientRef.current.cleanup();
      }
    };
  }, [autoReconnect]);

  // Set up message subscriptions
  useEffect(() => {
    if (!clientRef.current) return;

    const client = clientRef.current;

    // Subscribe to all message types
    const unsubscribeFunctions = [
      client.subscribe('workflow_status', handleWorkflowStatusMessage),
      client.subscribe('workflow_output', handleWorkflowOutputMessage),
      client.subscribe('file_change', handleFileChangeMessage),
      client.subscribe('error', handleErrorMessage),
      client.subscribe('pong', handlePongMessage)
    ];

    unsubscribeFuncsRef.current = unsubscribeFunctions;

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Update connection status from client
  useEffect(() => {
    if (!clientRef.current) return;

    const updateStatus = () => {
      const status = clientRef.current!.getStatus();
      setIsConnected(status.isConnected);
      setUrl(status.url);
      setLastConnected(status.lastConnected);
      setLastError(status.lastError);
      setReconnectAttempts(status.reconnectAttempts);
    };

    // Initial status update
    updateStatus();

    // Set up periodic status updates
    const statusInterval = setInterval(updateStatus, 1000);

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  // Message handlers
  const handleWorkflowStatusMessage = useCallback((message: WorkflowStatusMessage) => {
    setWorkflowStatus(message);
    setMessages(prev => [...prev, message]);
  }, []);

  const handleWorkflowOutputMessage = useCallback((message: WorkflowOutputMessage) => {
    setWorkflowOutput(prev => [...prev, message]);
    setMessages(prev => [...prev, message]);
  }, []);

  const handleFileChangeMessage = useCallback((message: FileChangeMessage) => {
    setFileChanges(prev => [...prev, message]);
    setMessages(prev => [...prev, message]);
  }, []);

  const handleErrorMessage = useCallback((message: ErrorMessage) => {
    setErrors(prev => [...prev, message]);
    setMessages(prev => [...prev, message]);
  }, []);

  const handlePongMessage = useCallback((message: WebSocketMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Actions
  const connect = useCallback(async (wsUrl: string): Promise<void> => {
    if (!clientRef.current) throw new Error('WebSocket client not initialized');
    
    setIsConnecting(true);
    setLastError(undefined);
    
    try {
      await clientRef.current.connect(wsUrl);
      setUrl(wsUrl);
    } catch (error) {
      setLastError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    setIsConnected(false);
    setIsConnecting(false);
    setUrl(undefined);
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    if (clientRef.current) {
      clientRef.current.send(message);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setWorkflowStatus(undefined);
    setWorkflowOutput([]);
    setFileChanges([]);
    setErrors([]);
  }, []);

  const clearOutput = useCallback(() => {
    setWorkflowOutput([]);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    // State
    isConnected,
    isConnecting,
    url,
    lastConnected,
    lastError,
    reconnectAttempts,
    autoReconnect,
    reconnectDelay,
    maxReconnectAttempts,
    messages,
    workflowStatus,
    workflowOutput,
    fileChanges,
    errors,

    // Actions
    connect,
    disconnect,
    send,
    clearMessages,
    clearOutput,
    clearErrors
  };
}