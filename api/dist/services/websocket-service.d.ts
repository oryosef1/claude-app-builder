import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { WebSocketMessage } from '../types';
import WebSocket from 'ws';
export declare class WebSocketService {
    private io?;
    private wss?;
    private connectedClients;
    constructor(serverOrPort: HTTPServer | number);
    private setupEventHandlers;
    private setupWebSocketHandlers;
    private generateClientId;
    broadcast(message: WebSocketMessage): void;
    broadcastToChannel(channel: string, message: WebSocketMessage): void;
    sendToClient(clientIdOrSocket: string | WebSocket, message: WebSocketMessage): void;
    broadcastWorkflowStatus(status: any): void;
    broadcastLogEntry(logEntry: any): void;
    broadcastTodoUpdate(todoData: any): void;
    broadcastFileChange(fileData: any): void;
    getConnectedClients(): string[];
    getClientCount(): number;
    isClientConnected(clientId: string): boolean;
    disconnectClient(clientId: string): void;
    disconnectAllClients(): void;
    getIOInstance(): SocketIOServer | undefined;
    close(callback?: (error?: Error) => void): void;
}
//# sourceMappingURL=websocket-service.d.ts.map