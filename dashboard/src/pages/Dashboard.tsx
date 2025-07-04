import React from 'react';
import WorkflowControl from '../components/WorkflowControl';
import TodoManager from '../components/TodoManager';
import useWorkflowStore from '../stores/workflowStore';
import useTodoStore from '../stores/todoStore';

const Dashboard: React.FC = () => {
  const { isRunning, start, stop, pause, resume } = useWorkflowStore();
  const { todos, addTodo, deleteTodo } = useTodoStore();

  return (
    <div className="dashboard-page">
      <h1>Claude App Builder Dashboard</h1>
      <div className="dashboard-content">
        <WorkflowControl
          isRunning={isRunning}
          onStart={start}
          onStop={stop}
          onPause={pause}
          onResume={resume}
        />
        <TodoManager
          todos={todos}
          onAddTodo={addTodo}
          onDeleteTodo={deleteTodo}
        />
      </div>
    </div>
  );
};

export default Dashboard;
