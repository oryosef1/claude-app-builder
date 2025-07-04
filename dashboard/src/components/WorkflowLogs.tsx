import React from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  role?: string;
}

interface WorkflowLogsProps {
  logs: LogEntry[];
  onClear: () => void;
}

const WorkflowLogs: React.FC<WorkflowLogsProps> = ({ logs, onClear }) => {
  return (
    <div className="workflow-logs">
      <div className="logs-header">
        <h3>Workflow Logs</h3>
        <button onClick={onClear}>Clear Logs</button>
      </div>
      <div className="logs-container">
        {logs.map((log) => (
          <div key={log.id} className={`log-entry ${log.level}`}>
            <span className="timestamp">{log.timestamp}</span>
            {log.role && <span className="role">[{log.role}]</span>}
            <span className="level">{log.level}</span>
            <span className="message">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowLogs;
