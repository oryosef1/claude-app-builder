"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const ws_1 = __importDefault(require("ws"));
class WebSocketService {
    constructor(serverOrPort) {
        this.connectedClients = new Set();
        if (typeof serverOrPort === 'number') {
            // For testing - create ws server with port
            this.wss = new ws_1.default.Server({ port: serverOrPort });
            this.setupWebSocketHandlers();
        }
        else {
            // For production - create socket.io server with HTTP server
            this.io = new socket_io_1.Server(serverOrPort, {
                cors: {
                    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
                    methods: ["GET", "POST"]
                }
            });
            this.setupEventHandlers();
        }
    }
    setupEventHandlers() {
        if (!this.io)
            return;
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);
            this.connectedClients.add(socket.id);
            // Send initial connection confirmation
            socket.emit('connected', {
                message: 'Successfully connected to Claude App Builder API',
                timestamp: new Date()
            });
            // Handle client disconnection
            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
                this.connectedClients.delete(socket.id);
            });
            // Handle client subscription to specific channels
            socket.on('subscribe', (channel) => {
                console.log(`Client ${socket.id} subscribed to ${channel}`);
                socket.join(channel);
            });
            // Handle client unsubscription from channels
            socket.on('unsubscribe', (channel) => {
                console.log(`Client ${socket.id} unsubscribed from ${channel}`);
                socket.leave(channel);
            });
            // Handle ping/pong for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: new Date() });
            });
        });
    }
    setupWebSocketHandlers() {
        if (!this.wss)
            return;
        this.wss.on('connection', (ws) => {
            const clientId = this.generateClientId();
            this.connectedClients.add(clientId);
            console.log(`Client connected: ${clientId}`);
            ws.on('close', () => {
                console.log(`Client disconnected: ${clientId}`);
                this.connectedClients.delete(clientId);
            });
            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
            });
        });
    }
    generateClientId() {
        return Math.random().toString(36).substr(2, 9);
    }
    broadcast(message) {
        const payload = {
            ...message,
            timestamp: new Date()
        };
        if (this.io) {
            this.io.emit('message', payload);
        }
        else if (this.wss) {
            const messageStr = JSON.stringify(payload);
            this.wss.clients.forEach((client) => {
                if (client.readyState === ws_1.default.OPEN) {
                    try {
                        client.send(messageStr);
                    }
                    catch (error) {
                        console.error('Error sending message to client:', error);
                    }
                }
            });
        }
        console.log(`Broadcasted message to ${this.connectedClients.size} clients:`, payload.type);
    }
    broadcastToChannel(channel, message) {
        const payload = {
            ...message,
            timestamp: new Date()
        };
        if (this.io) {
            this.io.to(channel).emit('message', payload);
            console.log(`Broadcasted message to channel ${channel}:`, payload.type);
        }
    }
    sendToClient(clientIdOrSocket, message) {
        const payload = {
            ...message,
            timestamp: new Date()
        };
        if (typeof clientIdOrSocket === 'string') {
            // Socket.IO client ID
            if (this.io) {
                this.io.to(clientIdOrSocket).emit('message', payload);
                console.log(`Sent message to client ${clientIdOrSocket}:`, payload.type);
            }
        }
        else {
            // WebSocket client
            if (clientIdOrSocket.readyState === ws_1.default.OPEN) {
                try {
                    clientIdOrSocket.send(JSON.stringify(payload));
                }
                catch (error) {
                    console.error('Error sending message to client:', error);
                }
            }
        }
    }
    broadcastWorkflowStatus(status) {
        const message = {
            type: 'workflow_status',
            data: status,
            timestamp: new Date()
        };
        this.broadcast(message);
    }
    broadcastLogEntry(logEntry) {
        const message = {
            type: 'log_entry',
            data: logEntry,
            timestamp: new Date()
        };
        this.broadcast(message);
    }
    broadcastTodoUpdate(todoData) {
        const message = {
            type: 'todo_update',
            data: todoData,
            timestamp: new Date()
        };
        this.broadcast(message);
    }
    broadcastFileChange(fileData) {
        const message = {
            type: 'file_change',
            data: fileData,
            timestamp: new Date()
        };
        this.broadcast(message);
    }
    getConnectedClients() {
        return Array.from(this.connectedClients);
    }
    getClientCount() {
        if (this.wss) {
            return this.wss.clients.size;
        }
        return this.connectedClients.size;
    }
    isClientConnected(clientId) {
        return this.connectedClients.has(clientId);
    }
    disconnectClient(clientId) {
        if (this.connectedClients.has(clientId)) {
            if (this.io) {
                this.io.to(clientId).emit('disconnect_request', {
                    message: 'Server requested disconnection',
                    timestamp: new Date()
                });
                this.io.sockets.sockets.get(clientId)?.disconnect(true);
            }
            this.connectedClients.delete(clientId);
        }
    }
    disconnectAllClients() {
        if (this.io) {
            this.io.emit('disconnect_request', {
                message: 'Server shutting down',
                timestamp: new Date()
            });
            this.io.disconnectSockets(true);
        }
        else if (this.wss) {
            this.wss.clients.forEach((client) => {
                if (client.readyState === ws_1.default.OPEN) {
                    client.close();
                }
            });
        }
        this.connectedClients.clear();
    }
    getIOInstance() {
        return this.io;
    }
    close(callback) {
        this.disconnectAllClients();
        if (this.io) {
            this.io.close(callback);
        }
        else if (this.wss) {
            this.wss.close(callback);
        }
        else if (callback) {
            callback();
        }
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=websocket-service.js.map