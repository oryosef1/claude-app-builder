import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketServer } from '../../src/services/WebSocketServer';
import { WorkflowManager } from '../../src/services/WorkflowManager';
import { FileWatcher } from '../../src/services/FileWatcher';
import { WorkflowIntegration } from '../../src/services/WorkflowIntegration';
import { WebSocketMessage, WorkflowStatusMessage, WorkflowOutputMessage, FileChangeMessage } from '../../src/types/websocket';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';

// Mock external dependencies
vi.mock('child_process');
vi.mock('chokidar');

describe('WebSocket E2E Workflow Tests', () => {
  let webSocketServer: WebSocketServer;
  let workflowManager: WorkflowManager;
  let fileWatcher: FileWatcher;
  let workflowIntegration: WorkflowIntegration;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeEach(async () => {
    serverPort = 3500 + Math.floor(Math.random() * 500);
    
    // Create all services
    webSocketServer = new WebSocketServer();
    workflowManager = new WorkflowManager();
    fileWatcher = new FileWatcher();
    workflowIntegration = new WorkflowIntegration(workflowManager, fileWatcher);

    // Start WebSocket server
    await webSocketServer.start(serverPort);
    webSocketServer.setupEventListeners();

    // Setup integration between services
    await workflowIntegration.initialize();
  });

  afterEach(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    
    await webSocketServer.cleanup();
    await workflowManager.cleanup();
    await fileWatcher.cleanup();
    await workflowIntegration.cleanup();
  });

  describe('Complete Workflow with Real-time Updates', () => {
    it('should provide full workflow lifecycle with WebSocket updates', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      const receivedMessages: WebSocketMessage[] = [];
      const expectedPhases = ['test-writer', 'test-reviewer', 'developer', 'code-reviewer', 'coordinator'];
      let workflowCompleted = false;

      clientSocket.on('connect', async () => {
        // Start monitoring workflow
        clientSocket.on('message', (message: WebSocketMessage) => {
          receivedMessages.push(message);
          
          if (message.type === 'workflow_status') {
            const statusMessage = message as WorkflowStatusMessage;
            
            // Check if workflow completed
            if (statusMessage.payload.status === 'stopped' && statusMessage.payload.progress === 100) {
              workflowCompleted = true;
            }
          }
          
          // Complete test when workflow finishes
          if (workflowCompleted) {
            // Verify we received status updates for each phase
            const statusMessages = receivedMessages.filter(m => m.type === 'workflow_status') as WorkflowStatusMessage[];
            const phases = statusMessages.map(m => m.payload.phase);
            
            expectedPhases.forEach(phase => {
              expect(phases).toContain(phase);
            });
            
            // Verify we received output messages
            const outputMessages = receivedMessages.filter(m => m.type === 'workflow_output');
            expect(outputMessages.length).toBeGreaterThan(0);
            
            done();
          }
        });

        // Start complete workflow
        await workflowIntegration.startWorkflow();
        
        // Simulate workflow progression
        setTimeout(async () => {
          await workflowIntegration.pauseWorkflow();
          setTimeout(async () => {
            await workflowIntegration.resumeWorkflow();
            setTimeout(async () => {
              await workflowIntegration.stopWorkflow();
            }, 100);
          }, 100);
        }, 100);
      });
    });

    it('should handle file updates during workflow with real-time notifications', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      const fileUpdates: FileChangeMessage[] = [];
      const workflowUpdates: WorkflowStatusMessage[] = [];

      clientSocket.on('connect', async () => {
        clientSocket.on('message', (message: WebSocketMessage) => {
          if (message.type === 'file_change') {
            fileUpdates.push(message as FileChangeMessage);
          } else if (message.type === 'workflow_status') {
            workflowUpdates.push(message as WorkflowStatusMessage);
          }
          
          // Check completion criteria
          if (fileUpdates.length >= 3 && workflowUpdates.length >= 2) {
            // Verify file changes
            expect(fileUpdates.find(f => f.payload.filename === 'todo.md')).toBeDefined();
            expect(fileUpdates.find(f => f.payload.filename === 'memory.md')).toBeDefined();
            
            // Verify workflow status updates
            expect(workflowUpdates.find(w => w.payload.status === 'running')).toBeDefined();
            expect(workflowUpdates.find(w => w.payload.status === 'stopped')).toBeDefined();
            
            done();
          }
        });

        // Start workflow and trigger file changes
        await workflowIntegration.startWorkflow();
        
        // Simulate file changes during workflow
        setTimeout(async () => {
          await workflowIntegration.updateTodo('new-task', 'New task added');
          await workflowIntegration.updateMemory('Progress update');
          
          setTimeout(async () => {
            await workflowIntegration.stopWorkflow();
          }, 50);
        }, 50);
      });
    });

    it('should handle multiple client connections during workflow', (done) => {
      const clients: ClientSocket[] = [];
      const numClients = 3;
      let connectedClients = 0;
      const clientMessages: { [clientIndex: number]: WebSocketMessage[] } = {};

      // Create multiple clients
      for (let i = 0; i < numClients; i++) {
        const client = ClientIO(`http://localhost:${serverPort}`);
        clients.push(client);
        clientMessages[i] = [];

        client.on('connect', () => {
          connectedClients++;
          
          client.on('message', (message: WebSocketMessage) => {
            clientMessages[i].push(message);
            
            // Check if all clients received workflow completion
            if (message.type === 'workflow_status') {
              const statusMessage = message as WorkflowStatusMessage;
              if (statusMessage.payload.status === 'stopped') {
                // Check if all clients received messages
                const allClientsReceived = Object.values(clientMessages).every(messages => 
                  messages.length > 0
                );
                
                if (allClientsReceived) {
                  // Verify all clients received the same workflow updates
                  const firstClientStatuses = clientMessages[0].filter(m => m.type === 'workflow_status');
                  
                  for (let j = 1; j < numClients; j++) {
                    const otherClientStatuses = clientMessages[j].filter(m => m.type === 'workflow_status');
                    expect(otherClientStatuses.length).toBe(firstClientStatuses.length);
                  }
                  
                  clients.forEach(c => c.disconnect());
                  done();
                }
              }
            }
          });
          
          // Start workflow when all clients connected
          if (connectedClients === numClients) {
            workflowIntegration.startWorkflow().then(() => {
              setTimeout(async () => {
                await workflowIntegration.stopWorkflow();
              }, 200);
            });
          }
        });
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle workflow errors and broadcast error messages', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      let errorReceived = false;
      let recoveryReceived = false;

      clientSocket.on('connect', async () => {
        clientSocket.on('message', (message: WebSocketMessage) => {
          if (message.type === 'error') {
            errorReceived = true;
            expect(message.payload.message).toContain('error');
          }
          
          if (message.type === 'workflow_status') {
            const statusMessage = message as WorkflowStatusMessage;
            if (statusMessage.payload.status === 'running' && errorReceived) {
              recoveryReceived = true;
            }
            
            if (errorReceived && recoveryReceived && statusMessage.payload.status === 'stopped') {
              done();
            }
          }
        });

        // Start workflow
        await workflowIntegration.startWorkflow();
        
        // Simulate error
        setTimeout(() => {
          const errorMessage: WebSocketMessage = {
            type: 'error',
            payload: {
              message: 'Simulated workflow error',
              code: 'WORKFLOW_ERROR'
            },
            timestamp: new Date().toISOString()
          };
          webSocketServer.broadcast(errorMessage);
          
          // Simulate recovery
          setTimeout(async () => {
            await workflowIntegration.startWorkflow();
            setTimeout(async () => {
              await workflowIntegration.stopWorkflow();
            }, 50);
          }, 50);
        }, 50);
      });
    });

    it('should handle client disconnection during workflow', (done) => {
      const client1 = ClientIO(`http://localhost:${serverPort}`);
      const client2 = ClientIO(`http://localhost:${serverPort}`);
      
      let client1Connected = false;
      let client2Connected = false;
      let client1Disconnected = false;

      client1.on('connect', () => {
        client1Connected = true;
        checkAllConnected();
      });

      client2.on('connect', () => {
        client2Connected = true;
        checkAllConnected();
      });

      function checkAllConnected() {
        if (client1Connected && client2Connected) {
          // Start workflow
          workflowIntegration.startWorkflow().then(() => {
            // Disconnect client1 during workflow
            setTimeout(() => {
              client1.disconnect();
              client1Disconnected = true;
              
              // Client2 should still receive updates
              client2.on('message', (message: WebSocketMessage) => {
                if (message.type === 'workflow_status' && client1Disconnected) {
                  const statusMessage = message as WorkflowStatusMessage;
                  if (statusMessage.payload.status === 'stopped') {
                    // Verify server handled disconnection gracefully
                    const status = webSocketServer.getStatus();
                    expect(status.connectedClients).toBe(1); // Only client2
                    
                    client2.disconnect();
                    done();
                  }
                }
              });
              
              // Stop workflow
              setTimeout(async () => {
                await workflowIntegration.stopWorkflow();
              }, 50);
            }, 50);
          });
        }
      }
    });

    it('should handle server restart during client connections', async () => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      // Wait for connection
      await new Promise<void>(resolve => {
        clientSocket.on('connect', () => resolve());
      });

      expect(clientSocket.connected).toBe(true);
      
      // Restart server
      await webSocketServer.stop();
      expect(clientSocket.connected).toBe(false);
      
      await webSocketServer.start(serverPort);
      
      // Client should be able to reconnect
      const newClient = ClientIO(`http://localhost:${serverPort}`);
      await new Promise<void>(resolve => {
        newClient.on('connect', () => {
          expect(newClient.connected).toBe(true);
          newClient.disconnect();
          resolve();
        });
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high frequency message broadcasting', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      let messageCount = 0;
      const expectedMessages = 50;
      const startTime = Date.now();

      clientSocket.on('connect', () => {
        clientSocket.on('message', (message: WebSocketMessage) => {
          messageCount++;
          
          if (messageCount === expectedMessages) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should handle 50 messages in reasonable time (< 1 second)
            expect(duration).toBeLessThan(1000);
            done();
          }
        });

        // Broadcast many messages rapidly
        for (let i = 0; i < expectedMessages; i++) {
          setTimeout(() => {
            const message: WebSocketMessage = {
              type: 'workflow_output',
              payload: {
                source: 'stdout',
                content: `Output line ${i}`,
                timestamp: new Date().toISOString()
              },
              timestamp: new Date().toISOString(),
              id: `msg-${i}`
            };
            webSocketServer.broadcast(message);
          }, i * 5); // 5ms intervals
        }
      });
    });

    it('should maintain performance with concurrent workflow operations', (done) => {
      const clients: ClientSocket[] = [];
      const numClients = 5;
      let connectedClients = 0;
      let completedWorkflows = 0;

      for (let i = 0; i < numClients; i++) {
        const client = ClientIO(`http://localhost:${serverPort}`);
        clients.push(client);

        client.on('connect', () => {
          connectedClients++;
          
          client.on('message', (message: WebSocketMessage) => {
            if (message.type === 'workflow_status') {
              const statusMessage = message as WorkflowStatusMessage;
              if (statusMessage.payload.status === 'stopped') {
                completedWorkflows++;
                
                if (completedWorkflows === numClients) {
                  // All workflows completed
                  clients.forEach(c => c.disconnect());
                  done();
                }
              }
            }
          });
          
          if (connectedClients === numClients) {
            // Start multiple workflows concurrently
            Promise.all([
              workflowIntegration.startWorkflow(),
              workflowIntegration.startWorkflow(),
              workflowIntegration.startWorkflow(),
              workflowIntegration.startWorkflow(),
              workflowIntegration.startWorkflow()
            ]).then(() => {
              // Stop all workflows after short delay
              setTimeout(async () => {
                await workflowIntegration.stopWorkflow();
                await workflowIntegration.stopWorkflow();
                await workflowIntegration.stopWorkflow();
                await workflowIntegration.stopWorkflow();
                await workflowIntegration.stopWorkflow();
              }, 100);
            });
          }
        });
      }
    });
  });

  describe('Real-time Output Streaming', () => {
    it('should stream continuous workflow output', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      const outputLines: string[] = [];
      const expectedLines = ['Starting Test Writer', 'Running tests', 'Test complete', 'Starting Developer'];

      clientSocket.on('connect', async () => {
        clientSocket.on('message', (message: WebSocketMessage) => {
          if (message.type === 'workflow_output') {
            const outputMessage = message as WorkflowOutputMessage;
            outputLines.push(outputMessage.payload.content);
            
            // Check if we received expected output
            const hasAllExpected = expectedLines.every(line => 
              outputLines.some(output => output.includes(line))
            );
            
            if (hasAllExpected) {
              expect(outputLines.length).toBeGreaterThan(expectedLines.length);
              done();
            }
          }
        });

        // Start workflow to generate output
        await workflowIntegration.startWorkflow();
        
        // Simulate continuous output
        const outputInterval = setInterval(() => {
          expectedLines.forEach(line => {
            const outputMessage: WorkflowOutputMessage = {
              type: 'workflow_output',
              payload: {
                source: 'stdout',
                content: line,
                timestamp: new Date().toISOString()
              },
              timestamp: new Date().toISOString()
            };
            webSocketServer.broadcast(outputMessage);
          });
          
          clearInterval(outputInterval);
        }, 50);
      });
    });

    it('should handle both stdout and stderr streams', (done) => {
      clientSocket = ClientIO(`http://localhost:${serverPort}`);
      
      const outputs = { stdout: 0, stderr: 0 };

      clientSocket.on('connect', () => {
        clientSocket.on('message', (message: WebSocketMessage) => {
          if (message.type === 'workflow_output') {
            const outputMessage = message as WorkflowOutputMessage;
            outputs[outputMessage.payload.source]++;
            
            if (outputs.stdout > 0 && outputs.stderr > 0) {
              expect(outputs.stdout).toBeGreaterThan(0);
              expect(outputs.stderr).toBeGreaterThan(0);
              done();
            }
          }
        });

        // Broadcast stdout message
        const stdoutMessage: WorkflowOutputMessage = {
          type: 'workflow_output',
          payload: {
            source: 'stdout',
            content: 'Normal output',
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        };
        webSocketServer.broadcast(stdoutMessage);

        // Broadcast stderr message
        const stderrMessage: WorkflowOutputMessage = {
          type: 'workflow_output',
          payload: {
            source: 'stderr',
            content: 'Error output',
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        };
        webSocketServer.broadcast(stderrMessage);
      });
    });
  });
});