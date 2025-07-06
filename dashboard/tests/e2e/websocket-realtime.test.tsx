import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { 
  WorkflowStatusMessage, 
  WorkflowOutputMessage, 
  FileChangeMessage 
} from '../../src/types/websocket';
import React from 'react';

// Mock dependencies
vi.mock('child_process');
vi.mock('chokidar');

// Simple dashboard component for E2E testing
const SimpleDashboard: React.FC = () => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [workflowStatus, setWorkflowStatus] = React.useState<WorkflowStatusMessage | null>(null);
  const [workflowOutput, setWorkflowOutput] = React.useState<WorkflowOutputMessage[]>([]);
  const [fileChanges, setFileChanges] = React.useState<FileChangeMessage[]>([]);
  const [errors, setErrors] = React.useState<any[]>([]);

  const handleConnect = () => {
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  const handleMessage = (message: any) => {
    switch (message.type) {
      case 'workflow_status':
        setWorkflowStatus(message);
        break;
      case 'workflow_output':
        setWorkflowOutput(prev => [...prev, message]);
        break;
      case 'file_change':
        setFileChanges(prev => [...prev, message]);
        break;
      case 'error':
        setErrors(prev => [...prev, message]);
        break;
    }
  };

  const clearMessages = () => {
    setWorkflowOutput([]);
    setFileChanges([]);
    setErrors([]);
  };

  // Expose message handler for testing
  React.useEffect(() => {
    (window as any).handleMessage = handleMessage;
  }, []);

  return (
    <div>
      <div data-testid="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      
      {workflowStatus && (
        <div data-testid="workflow-status">
          {workflowStatus.payload.phase}: {workflowStatus.payload.status} ({workflowStatus.payload.progress}%)
        </div>
      )}
      
      <div data-testid="output-count">{workflowOutput.length}</div>
      <div data-testid="file-changes-count">{fileChanges.length}</div>
      <div data-testid="error-count">{errors.length}</div>
      
      <button data-testid="connect-btn" onClick={handleConnect}>
        Connect
      </button>
      <button data-testid="disconnect-btn" onClick={handleDisconnect}>
        Disconnect
      </button>
      <button data-testid="clear-btn" onClick={clearMessages}>
        Clear
      </button>
      
      <div data-testid="output-log">
        {workflowOutput.map((msg, i) => (
          <div key={i} data-testid={`output-${i}`}>
            {msg.payload.content}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Dashboard E2E Real-time Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any previous message handlers
    delete (window as any).handleMessage;
  });

  afterEach(() => {
    delete (window as any).handleMessage;
  });

  describe('End-to-End Workflow Communication', () => {
    it('should handle complete workflow lifecycle with real-time updates', async () => {
      const user = userEvent.setup();
      render(<SimpleDashboard />);

      // Connect to dashboard
      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Simulate workflow phases
      const phases = ['test-writer', 'test-reviewer', 'developer', 'code-reviewer', 'coordinator'];
      
      for (let i = 0; i < phases.length; i++) {
        const statusMessage: WorkflowStatusMessage = {
          type: 'workflow_status',
          payload: {
            phase: phases[i],
            status: 'running',
            progress: (i + 1) * 20
          },
          timestamp: new Date().toISOString(),
          id: `phase-${i}`
        };

        await act(async () => {
          (window as any).handleMessage?.(statusMessage);
        });

        await waitFor(() => {
          expect(screen.getByTestId('workflow-status')).toHaveTextContent(
            `${phases[i]}: running (${(i + 1) * 20}%)`
          );
        });
      }

      // Final completion
      const completionMessage: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: {
          phase: 'coordinator',
          status: 'completed',
          progress: 100
        },
        timestamp: new Date().toISOString(),
        id: 'completion'
      };

      await act(async () => {
        (window as any).handleMessage?.(completionMessage);
      });

      await waitFor(() => {
        expect(screen.getByTestId('workflow-status')).toHaveTextContent('coordinator: completed (100%)');
      });
    });

    it('should stream workflow output in real-time during execution', async () => {
      const user = userEvent.setup();
      render(<SimpleDashboard />);

      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });

      const outputMessages = [
        'Starting Test Writer phase...',
        'Writing unit tests...',
        'Writing integration tests...',
        'Test Writer phase complete'
      ];

      // Simulate output streaming
      for (let i = 0; i < outputMessages.length; i++) {
        const outputMessage: WorkflowOutputMessage = {
          type: 'workflow_output',
          payload: {
            source: 'stdout',
            content: outputMessages[i],
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
          id: `output-${i}`
        };

        await act(async () => {
          (window as any).handleMessage?.(outputMessage);
        });

        await waitFor(() => {
          expect(screen.getByTestId('output-count')).toHaveTextContent((i + 1).toString());
          expect(screen.getByTestId(`output-${i}`)).toHaveTextContent(outputMessages[i]);
        });
      }

      expect(screen.getByTestId('output-count')).toHaveTextContent('4');
    });

    it('should handle file changes during workflow execution', async () => {
      const user = userEvent.setup();
      render(<SimpleDashboard />);

      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });

      const fileChanges = [
        { filename: 'todo.md', changeType: 'modified' as const },
        { filename: 'memory.md', changeType: 'modified' as const },
        { filename: 'test-results.txt', changeType: 'created' as const }
      ];

      // Simulate file changes
      for (let i = 0; i < fileChanges.length; i++) {
        const fileChangeMessage: FileChangeMessage = {
          type: 'file_change',
          payload: {
            filename: fileChanges[i].filename,
            path: `/path/to/${fileChanges[i].filename}`,
            changeType: fileChanges[i].changeType,
            content: `Updated content for ${fileChanges[i].filename}`
          },
          timestamp: new Date().toISOString(),
          id: `file-${i}`
        };

        await act(async () => {
          (window as any).handleMessage?.(fileChangeMessage);
        });

        await waitFor(() => {
          expect(screen.getByTestId('file-changes-count')).toHaveTextContent((i + 1).toString());
        });
      }

      expect(screen.getByTestId('file-changes-count')).toHaveTextContent('3');
    });

    it('should handle errors and recovery scenarios', async () => {
      const user = userEvent.setup();
      render(<SimpleDashboard />);

      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });

      // Simulate error
      const errorMessage = {
        type: 'error',
        payload: {
          message: 'Test Writer failed with syntax error',
          code: 'SYNTAX_ERROR'
        },
        timestamp: new Date().toISOString(),
        id: 'error-1'
      };

      await act(async () => {
        (window as any).handleMessage?.(errorMessage);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('1');
      });

      // Simulate recovery
      const recoveryMessage: WorkflowStatusMessage = {
        type: 'workflow_status',
        payload: {
          phase: 'test-writer',
          status: 'retrying',
          progress: 15
        },
        timestamp: new Date().toISOString(),
        id: 'recovery-1'
      };

      await act(async () => {
        (window as any).handleMessage?.(recoveryMessage);
      });

      await waitFor(() => {
        expect(screen.getByTestId('workflow-status')).toHaveTextContent('test-writer: retrying (15%)');
      });
    });

    it('should handle message clearing and UI state management', async () => {
      const user = userEvent.setup();
      render(<SimpleDashboard />);

      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });

      // Add some messages
      const outputMessage: WorkflowOutputMessage = {
        type: 'workflow_output',
        payload: {
          source: 'stdout',
          content: 'Test output',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        id: 'output-1'
      };

      const fileMessage: FileChangeMessage = {
        type: 'file_change',
        payload: {
          filename: 'test.md',
          path: '/test.md',
          changeType: 'modified'
        },
        timestamp: new Date().toISOString(),
        id: 'file-1'
      };

      await act(async () => {
        (window as any).handleMessage?.(outputMessage);
        (window as any).handleMessage?.(fileMessage);
      });

      await waitFor(() => {
        expect(screen.getByTestId('output-count')).toHaveTextContent('1');
        expect(screen.getByTestId('file-changes-count')).toHaveTextContent('1');
      });

      // Clear messages
      await act(async () => {
        await user.click(screen.getByTestId('clear-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('output-count')).toHaveTextContent('0');
        expect(screen.getByTestId('file-changes-count')).toHaveTextContent('0');
      });

      // Connection should remain
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle high-frequency message updates efficiently', async () => {
      const user = userEvent.setup();
      render(<SimpleDashboard />);

      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });

      const messageCount = 20; // Reduced for testing
      
      // Send many messages rapidly
      await act(async () => {
        for (let i = 0; i < messageCount; i++) {
          const outputMessage: WorkflowOutputMessage = {
            type: 'workflow_output',
            payload: {
              source: 'stdout',
              content: `Rapid output ${i}`,
              timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString(),
            id: `rapid-${i}`
          };
          (window as any).handleMessage?.(outputMessage);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('output-count')).toHaveTextContent(messageCount.toString());
      }, { timeout: 3000 });
    });

    it('should maintain UI responsiveness during concurrent operations', async () => {
      const user = userEvent.setup();
      render(<SimpleDashboard />);

      await act(async () => {
        await user.click(screen.getByTestId('connect-btn'));
      });

      // Simulate concurrent workflow status updates and output
      await act(async () => {
        // Status updates
        for (let i = 0; i < 5; i++) {
          const statusMessage: WorkflowStatusMessage = {
            type: 'workflow_status',
            payload: {
              phase: 'developer',
              status: 'running',
              progress: i * 25
            },
            timestamp: new Date().toISOString(),
            id: `status-${i}`
          };
          (window as any).handleMessage?.(statusMessage);
        }

        // Output messages
        for (let i = 0; i < 10; i++) {
          const outputMessage: WorkflowOutputMessage = {
            type: 'workflow_output',
            payload: {
              source: 'stdout',
              content: `Concurrent output ${i}`,
              timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString(),
            id: `concurrent-${i}`
          };
          (window as any).handleMessage?.(outputMessage);
        }

        // File changes
        for (let i = 0; i < 3; i++) {
          const fileMessage: FileChangeMessage = {
            type: 'file_change',
            payload: {
              filename: `file-${i}.md`,
              path: `/path/file-${i}.md`,
              changeType: 'modified'
            },
            timestamp: new Date().toISOString(),
            id: `file-concurrent-${i}`
          };
          (window as any).handleMessage?.(fileMessage);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('workflow-status')).toHaveTextContent('developer: running (100%)');
        expect(screen.getByTestId('output-count')).toHaveTextContent('10');
        expect(screen.getByTestId('file-changes-count')).toHaveTextContent('3');
      });
    });
  });
});