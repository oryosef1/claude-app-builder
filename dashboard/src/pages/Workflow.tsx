import React from 'react';
import WorkflowControl from '../components/WorkflowControl';
import WorkflowLogs from '../components/WorkflowLogs';
import useWorkflowStore from '../stores/workflowStore';

const Workflow: React.FC = () => {
  const { isRunning, start, stop, pause, resume, logs, clearLogs } = useWorkflowStore();

  return (
    <div className="workflow-page">
      <h1>Workflow Management</h1>
      <div className="workflow-content">
        <WorkflowControl
          isRunning={isRunning}
          onStart={start}
          onStop={stop}
          onPause={pause}
          onResume={resume}
        />
        <WorkflowLogs
          logs={logs}
          onClear={clearLogs}
        />
      </div>
    </div>
  );
};

export default Workflow;
