import React from 'react';
import WorkflowLogs from '../components/WorkflowLogs';
import useWorkflowStore from '../stores/workflowStore';

const Logs: React.FC = () => {
  const { logs, clearLogs } = useWorkflowStore();

  return (
    <div className="logs-page">
      <h1>Workflow Logs</h1>
      <WorkflowLogs
        logs={logs}
        onClear={clearLogs}
      />
    </div>
  );
};

export default Logs;
