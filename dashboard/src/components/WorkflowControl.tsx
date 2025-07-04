import React from 'react';

interface WorkflowControlProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

const WorkflowControl: React.FC<WorkflowControlProps> = ({ 
  isRunning, 
  onStart, 
  onStop, 
  onPause, 
  onResume 
}) => {
  return (
    <div className="workflow-control">
      <h3>Workflow Control</h3>
      <div className="control-buttons">
        {!isRunning ? (
          <button onClick={onStart} className="start-button">Start Workflow</button>
        ) : (
          <>
            <button onClick={onPause} className="pause-button">Pause</button>
            <button onClick={onResume} className="resume-button">Resume</button>
            <button onClick={onStop} className="stop-button">Stop</button>
          </>
        )}
      </div>
      <div className="status">
        Status: {isRunning ? 'Running' : 'Stopped'}
      </div>
    </div>
  );
};

export default WorkflowControl;
