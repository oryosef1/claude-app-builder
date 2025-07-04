import { create } from 'zustand';

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface TodoState {
  todos: TodoItem[];
  
  // Actions
  addTodo: (todo: Omit<TodoItem, 'id'>) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  deleteTodo: (id: string) => void;
  loadTodos: (todos: TodoItem[]) => void;
  reset: () => void;
}

const useTodoStore = create<TodoState>((set) => ({
  todos: [
    {
      id: '1',
      content: 'Initialize web dashboard project with React and TypeScript',
      status: 'completed',
      priority: 'high'
    },
    {
      id: '2',
      content: 'Create main dashboard layout with sidebar navigation',
      status: 'completed',
      priority: 'high'
    },
    {
      id: '3',
      content: 'Build workflow control panel (start/stop/pause workflow)',
      status: 'in_progress',
      priority: 'high'
    },
    {
      id: '4',
      content: 'Implement real-time workflow status display',
      status: 'pending',
      priority: 'high'
    },
    {
      id: '5',
      content: 'Create todo management interface (add/edit/remove tasks)',
      status: 'pending',
      priority: 'medium'
    }
  ],
  
  addTodo: (todo) => set((state) => ({
    todos: [...state.todos, { ...todo, id: Date.now().toString() }]
  })),
  updateTodo: (id, updates) => set((state) => ({
    todos: state.todos.map(todo => 
      todo.id === id ? { ...todo, ...updates } : todo
    )
  })),
  deleteTodo: (id) => set((state) => ({
    todos: state.todos.filter(todo => todo.id !== id)
  })),
  loadTodos: (todos) => set({ todos }),
  reset: () => set({ todos: [] })
}));

export default useTodoStore;
