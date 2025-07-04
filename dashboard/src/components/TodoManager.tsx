import React, { useState } from 'react';

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface TodoManagerProps {
  todos: TodoItem[];
  onAddTodo: (todo: Omit<TodoItem, 'id'>) => void;
  onDeleteTodo: (id: string) => void;
}

const TodoManager: React.FC<TodoManagerProps> = ({ todos, onAddTodo, onDeleteTodo }) => {
  const [newTodo, setNewTodo] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const handleAddTodo = () => {
    if (newTodo.trim()) {
      onAddTodo({
        content: newTodo,
        status: 'pending',
        priority: newPriority
      });
      setNewTodo('');
    }
  };

  return (
    <div className="todo-manager">
      <h3>Todo Manager</h3>
      <div className="add-todo">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="New todo..."
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button onClick={handleAddTodo}>Add Todo</button>
      </div>
      <div className="todo-list">
        {todos.map((todo) => (
          <div key={todo.id} className="todo-item">
            <span className={`status ${todo.status}`}>{todo.status}</span>
            <span className={`priority ${todo.priority}`}>{todo.priority}</span>
            <span className="content">{todo.content}</span>
            <button onClick={() => onDeleteTodo(todo.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodoManager;
