import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketServer } from '../../src/services/WebSocketServer';
import { WorkflowManager } from '../../src/services/WorkflowManager';
import { FileWatcher } from '../../src/services/FileWatcher';
import { WebSocketMessage, WorkflowStatusMessage, WorkflowOutputMessage, FileChangeMessage } from '../../src/types/websocket';
import { createApp } from '../../src/app';
import { Server } from 'http';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';

// Mock external dependencies
vi.mock('child_process');
vi.mock('chokidar');

describe('WebSocket Integration Tests', () => {
  let webSocketServer: WebSocketServer;
  let workflowManager: WorkflowManager;
  let fileWatcher: FileWatcher;
  let httpServer: Server;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeEach(async () => {
    // Use random port for testing
    serverPort = 7000 + Math.floor(Math.random() * 1000);
    
    try {
      // Create services
      webSocketServer = new WebSocketServer();
      workflowManager = new WorkflowManager();
      fileWatcher = new FileWatcher();

      // Start WebSocket server
      await webSocketServer.start(serverPort);

      // Create HTTP server for integration testing
      const app = createApp();
      httpServer = app.listen(serverPort + 1);
    } catch (error) {
      console.warn('Integration test setup error:', error);
      // Try alternative port
      serverPort = 8000 + Math.floor(Math.random() * 1000);
      try {
        await webSocketServer.start(serverPort);
      } catch (retryError) {
        console.warn('Retry setup error:', retryError);
      }
    }
  });

  afterEach(async () => {
    try {
      if (clientSocket) {
        clientSocket.disconnect();
        clientSocket = null as any;
      }
      
      await Promise.all([
        webSocketServer?.cleanup().catch(e => console.warn('WebSocket cleanup:', e)),
        workflowManager?.cleanup().catch(e => console.warn('WorkflowManager cleanup:', e)),
        fileWatcher?.cleanup().catch(e => console.warn('FileWatcher cleanup:', e))
      ]);
      
      if (httpServer) {
        httpServer.close();
      }
      
      // Wait for port release
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  });

  describe('WebSocket Server Integration', () => {
    it('should accept client connections', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        
        const clients = webSocketServer.getConnectedClients();
        expect(clients.length).toBeGreaterThan(0);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should handle client disconnection', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      clientSocket.on('connect', () => {
        const initialClients = webSocketServer.getConnectedClients().length;
        
        clientSocket.disconnect();
        
        setTimeout(() => {
          const finalClients = webSocketServer.getConnectedClients().length;
          expect(finalClients).toBe(initialClients - 1);
          done();
        }, 100);
      });
    });

    it('should broadcast messages to all connected clients', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      clientSocket.on('connect', () => {
        const testMessage: WorkflowStatusMessage = {
          type: 'workflow_status',
          payload: {
            phase: 'test-writer',
            status: 'running',
            progress: 25
          },
          timestamp: new Date().toISOString(),
          id: 'test-msg-1'
        };

        clientSocket.on('message', (message) => {
          expect(message).toEqual(testMessage);
          done();
        });

        // Broadcast message from server
        webSocketServer.broadcast(testMessage);
      });
    });

    it('should handle ping/pong between client and server', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      clientSocket.on('connect', () => {
        clientSocket.on('pong', (pongMessage) => {
          expect(pongMessage.type).toBe('pong');
          expect(pongMessage.timestamp).toBeDefined();
          done();
        });

        clientSocket.emit('ping', {
          type: 'ping',
          payload: {},
          timestamp: new Date().toISOString()
        });
      });
    });
  });

  describe('Workflow Integration with WebSocket', () => {
    beforeEach(async () => {
      webSocketServer.setupEventListeners();
    });

    it('should broadcast workflow state changes', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      clientSocket.on('connect', async () => {
        clientSocket.on('message', (message: WebSocketMessage) => {
          if (message.type === 'workflow_status') {
            const statusMessage = message as WorkflowStatusMessage;
            expect(statusMessage.payload.status).toBe('running');
            expect(statusMessage.payload.phase).toBe('test-writer');
            done();
          }
        });

        // Start workflow to trigger state change
        await workflowManager.startWorkflow();
      });
    });

    it('should stream workflow output in real-time', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      const outputMessages: WorkflowOutputMessage[] = [];
      
      clientSocket.on('connect', async () => {
        clientSocket.on('message', (message: WebSocketMessage) => {
          if (message.type === 'workflow_output') {
            const outputMessage = message as WorkflowOutputMessage;
            outputMessages.push(outputMessage);
            
            if (outputMessages.length >= 2) {
              expect(outputMessages[0].payload.source).toBe('stdout');
              expect(outputMessages[0].payload.content).toContain('Starting');
              expect(outputMessages[1].payload.source).toBe('stdout');
              done();
            }
          }
        });

        // Start workflow to generate output
        await workflowManager.startWorkflow();
      });
    });

    it('should handle workflow state transitions', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      const stateMessages: WorkflowStatusMessage[] = [];
      
      clientSocket.on('connect', async () => {
        clientSocket.on('message', (message: WebSocketMessage) => {
          if (message.type === 'workflow_status') {
            const statusMessage = message as WorkflowStatusMessage;
            stateMessages.push(statusMessage);
            
            if (stateMessages.length >= 3) {
              // Should see: running -> paused -> stopped
              expect(stateMessages[0].payload.status).toBe('running');
              expect(stateMessages[1].payload.status).toBe('paused');
              expect(stateMessages[2].payload.status).toBe('stopped');
              done();
            }
          }
        });

        // Perform workflow state transitions
        await workflowManager.startWorkflow();
        await new Promise(resolve => setTimeout(resolve, 50));
        await workflowManager.pauseWorkflow();
        await new Promise(resolve => setTimeout(resolve, 50));
        await workflowManager.stopWorkflow();
      });
    });
  });

  describe('File Change Integration with WebSocket', () => {
    beforeEach(async () => {
      webSocketServer.setupEventListeners();
    });

    it('should broadcast file change events', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      clientSocket.on('connect', async () => {
        clientSocket.on('message', (message: WebSocketMessage) => {
          if (message.type === 'file_change') {
            const fileMessage = message as FileChangeMessage;
            expect(fileMessage.payload.filename).toBe('todo.md');
            expect(fileMessage.payload.changeType).toBe('modified');
            done();
          }
        });

        // Trigger file change
        await fileWatcher.writeFile('/test/todo.md', 'Updated todo content');
      });
    });

    it('should handle multiple file changes', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      const fileMessages: FileChangeMessage[] = [];
      
      clientSocket.on('connect', async () => {
        clientSocket.on('message', (message: WebSocketMessage) => {
          if (message.type === 'file_change') {
            const fileMessage = message as FileChangeMessage;
            fileMessages.push(fileMessage);
            
            if (fileMessages.length >= 2) {
              expect(fileMessages[0].payload.filename).toBe('todo.md');
              expect(fileMessages[1].payload.filename).toBe('memory.md');
              done();
            }
          }
        });

        // Trigger multiple file changes
        await fileWatcher.writeFile('/test/todo.md', 'Todo content');
        await fileWatcher.writeFile('/test/memory.md', 'Memory content');
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle client connection errors gracefully', (done) => {
      // Try to connect to non-existent server
      const badSocket = ClientIO(`http://localhost:${serverPort + 5000}`);
      
      badSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        badSocket.disconnect();
        done();
      });

      // Should not connect
      setTimeout(() => {
        expect(badSocket.connected).toBe(false);
        badSocket.disconnect();
        done();
      }, 1000);
    });

    it('should handle server errors without crashing', async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      return new Promise<void>((resolve) => {
        clientSocket.on('connect', () => {
          // Send malformed message
          clientSocket.emit('invalid_event', 'malformed data');
          
          // Server should still be responsive
          setTimeout(() => {
            const status = webSocketServer.getStatus();
            expect(status.isRunning).toBe(true);
            resolve();
          }, 100);
        });
      });
    });

    it('should broadcast error messages to clients', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      clientSocket.on('connect', () => {
        clientSocket.on('message', (message: WebSocketMessage) => {
          if (message.type === 'error') {
            expect(message.payload.message).toBe('Test error');
            done();
          }
        });

        // Trigger error broadcast
        const errorMessage: WebSocketMessage = {
          type: 'error',
          payload: {
            message: 'Test error',
            code: 'TEST_ERROR'
          },
          timestamp: new Date().toISOString()
        };
        
        webSocketServer.broadcast(errorMessage);
      });
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent clients', (done) => {
      const clients: ClientSocket[] = [];
      const numClients = 5;
      let connectedClients = 0;

      for (let i = 0; i < numClients; i++) {
        const client = ClientIO(`http://localhost:${serverPort}`);
        clients.push(client);

        client.on('connect', () => {
          connectedClients++;
          
          if (connectedClients === numClients) {
            const status = webSocketServer.getStatus();
            expect(status.connectedClients).toBe(numClients);
            
            // Cleanup
            clients.forEach(c => c.disconnect());
            done();
          }
        });
      }
    });

    it('should broadcast to all clients efficiently', (done) => {
      const clients: ClientSocket[] = [];
      const numClients = 3;
      let connectedClients = 0;
      let messagesReceived = 0;

      for (let i = 0; i < numClients; i++) {
        const client = ClientIO(`http://localhost:${serverPort}`);
        clients.push(client);

        client.on('connect', () => {
          connectedClients++;
          
          if (connectedClients === numClients) {
            // All clients connected, now broadcast
            const testMessage: WebSocketMessage = {
              type: 'ping',
              payload: {},
              timestamp: new Date().toISOString()
            };
            
            webSocketServer.broadcast(testMessage);
          }
        });

        client.on('message', (message) => {
          if (message.type === 'ping') {
            messagesReceived++;
            
            if (messagesReceived === numClients) {
              // All clients received the message
              clients.forEach(c => c.disconnect());
              done();
            }
          }
        });
      }
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory with many connections', async () => {
      const initialStatus = webSocketServer.getStatus();
      
      // Create and destroy many connections
      for (let i = 0; i < 10; i++) {
        const client = ClientIO(`http://localhost:${serverPort}`);
        await new Promise(resolve => {
          client.on('connect', () => {
            client.disconnect();
            resolve(undefined);
          });
        });
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalStatus = webSocketServer.getStatus();
      expect(finalStatus.connectedClients).toBe(0);
    });

    it('should cleanup resources properly', async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      await new Promise<void>(resolve => {
        clientSocket.on('connect', () => resolve());
      });

      expect(webSocketServer.getStatus().connectedClients).toBeGreaterThan(0);
      
      await webSocketServer.cleanup();
      
      expect(webSocketServer.getStatus().isRunning).toBe(false);
      expect(webSocketServer.getStatus().connectedClients).toBe(0);
    });
  });
});