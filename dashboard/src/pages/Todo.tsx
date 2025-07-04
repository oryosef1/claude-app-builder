import React from 'react';
import TodoManager from '../components/TodoManager';
import useTodoStore from '../stores/todoStore';

const Todo: React.FC = () => {
  const { todos, addTodo, deleteTodo } = useTodoStore();

  return (
    <div className="todo-page">
      <h1>Todo Management</h1>
      <TodoManager
        todos={todos}
        onAddTodo={addTodo}
        onDeleteTodo={deleteTodo}
      />
    </div>
  );
};

export default Todo;
