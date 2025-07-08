# Real-time Communication Architecture

## Overview

This document defines the real-time communication architecture for the Multi-Agent Dashboard System, including WebSocket implementation, event streaming patterns, and live data synchronization strategies.

## 1. WebSocket Architecture

### 1.1 Connection Management
```typescript
// Real-time event broadcasting with Socket.io
export class WebSocketManager {
  private io: Server;
  private clients: Map<string, ClientConnection> = new Map();

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: { origin: process.env.CLIENT_URL },
      transports: ['websocket', 'polling']
    });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket): void {
    const clientId = socket.id;
    
    // Store client connection
    this.clients.set(clientId, {
      socket,
      subscriptions: new Set(),
      userId: socket.handshake.auth?.userId,
      connectedAt: new Date()
    });

    // Handle client events
    socket.on('subscribe-process', (processId: string) => {
      this.subscribeToProcess(clientId, processId);
    });

    socket.on('unsubscribe-process', (processId: string) => {
      this.unsubscribeFromProcess(clientId, processId);
    });

    socket.on('disconnect', () => {
      this.handleDisconnection(clientId);
    });
  }

  broadcastProcessEvent(processId: string, event: string, data: any): void {
    this.io.to(`process-${processId}`).emit(event, data);
  }
}
```

### 1.2 Event Broadcasting Patterns
```typescript
// Event types and broadcasting
export enum EventType {
  PROCESS_STARTED = 'process-started',
  PROCESS_STOPPED = 'process-stopped',
  PROCESS_OUTPUT = 'process-output',
  PROCESS_ERROR = 'process-error',
  TASK_ASSIGNED = 'task-assigned',
  TASK_COMPLETED = 'task-completed',
  SYSTEM_ALERT = 'system-alert'
}

export class EventBroadcaster {
  constructor(private wsManager: WebSocketManager) {}

  broadcastProcessOutput(processId: string, output: string): void {
    this.wsManager.broadcastProcessEvent(processId, EventType.PROCESS_OUTPUT, {
      processId,
      output,
      timestamp: new Date()
    });
  }

  broadcastTaskStatus(taskId: string, status: TaskStatus): void {
    this.wsManager.io.emit(EventType.TASK_ASSIGNED, {
      taskId,
      status,
      timestamp: new Date()
    });
  }
}
```

## 2. Server-Sent Events (SSE)

### 2.1 Log Streaming Implementation
```typescript
// SSE for live log streaming
export class LogStreamingService {
  private streams: Map<string, Response> = new Map();

  setupLogStream(req: Request, res: Response): void {
    const processId = req.params.processId;
    const streamId = `${processId}-${Date.now()}`;

    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Store stream reference
    this.streams.set(streamId, res);

    // Handle client disconnect
    req.on('close', () => {
      this.streams.delete(streamId);
    });

    // Send initial connection event
    this.sendEvent(res, 'connected', { processId, streamId });
  }

  streamLogEntry(processId: string, logEntry: ProcessLog): void {
    const streamsToNotify = Array.from(this.streams.entries())
      .filter(([id]) => id.startsWith(processId))
      .map(([, stream]) => stream);

    streamsToNotify.forEach(stream => {
      this.sendEvent(stream, 'log', logEntry);
    });
  }

  private sendEvent(res: Response, event: string, data: any): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
```

## 3. Frontend WebSocket Client

### 3.1 Vue.js WebSocket Integration
```typescript
// composables/useWebSocket.ts
export function useWebSocket(url: string) {
  const socket = ref<Socket | null>(null);
  const connected = ref(false);
  const error = ref<string | null>(null);

  const connect = () => {
    socket.value = io(url, {
      auth: { userId: getCurrentUserId() },
      transports: ['websocket']
    });

    socket.value.on('connect', () => {
      connected.value = true;
      error.value = null;
    });

    socket.value.on('disconnect', () => {
      connected.value = false;
    });

    socket.value.on('connect_error', (err) => {
      error.value = err.message;
    });
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
      connected.value = false;
    }
  };

  const emit = (event: string, data: any) => {
    if (socket.value?.connected) {
      socket.value.emit(event, data);
    }
  };

  const on = (event: string, callback: Function) => {
    if (socket.value) {
      socket.value.on(event, callback);
    }
  };

  return {
    socket: readonly(socket),
    connected: readonly(connected),
    error: readonly(error),
    connect,
    disconnect,
    emit,
    on
  };
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-07-08  
**Author**: Taylor Technical Lead