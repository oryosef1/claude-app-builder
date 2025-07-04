import { describe, it, expect, beforeEach } from 'vitest'
import { useTodoStore } from '../../src/stores/todoStore'

describe('TodoStore', () => {
  beforeEach(() => {
    useTodoStore.getState().reset()
  })

  it('initializes with empty todos', () => {
    const state = useTodoStore.getState()
    expect(state.todos).toEqual([])
  })

  it('adds new todo', () => {
    const store = useTodoStore.getState()
    const todo = {
      id: '1',
      content: 'Test todo',
      status: 'pending' as const,
      priority: 'high' as const
    }
    
    store.addTodo(todo)
    expect(useTodoStore.getState().todos).toContain(todo)
  })

  it('updates todo status', () => {
    const store = useTodoStore.getState()
    const todo = {
      id: '1',
      content: 'Test todo',
      status: 'pending' as const,
      priority: 'high' as const
    }
    
    store.addTodo(todo)
    store.updateTodo('1', { status: 'completed' })
    
    const updatedTodo = useTodoStore.getState().todos.find(t => t.id === '1')
    expect(updatedTodo?.status).toBe('completed')
  })

  it('updates todo content', () => {
    const store = useTodoStore.getState()
    const todo = {
      id: '1',
      content: 'Test todo',
      status: 'pending' as const,
      priority: 'high' as const
    }
    
    store.addTodo(todo)
    store.updateTodo('1', { content: 'Updated todo' })
    
    const updatedTodo = useTodoStore.getState().todos.find(t => t.id === '1')
    expect(updatedTodo?.content).toBe('Updated todo')
  })

  it('removes todo', () => {
    const store = useTodoStore.getState()
    const todo = {
      id: '1',
      content: 'Test todo',
      status: 'pending' as const,
      priority: 'high' as const
    }
    
    store.addTodo(todo)
    store.removeTodo('1')
    
    expect(useTodoStore.getState().todos).not.toContain(todo)
  })

  it('filters todos by status', () => {
    const store = useTodoStore.getState()
    const todos = [
      { id: '1', content: 'Todo 1', status: 'pending' as const, priority: 'high' as const },
      { id: '2', content: 'Todo 2', status: 'completed' as const, priority: 'medium' as const }
    ]
    
    todos.forEach(todo => store.addTodo(todo))
    
    const pendingTodos = store.getTodosByStatus('pending')
    const completedTodos = store.getTodosByStatus('completed')
    
    expect(pendingTodos).toHaveLength(1)
    expect(completedTodos).toHaveLength(1)
    expect(pendingTodos[0].content).toBe('Todo 1')
    expect(completedTodos[0].content).toBe('Todo 2')
  })

  it('filters todos by priority', () => {
    const store = useTodoStore.getState()
    const todos = [
      { id: '1', content: 'Todo 1', status: 'pending' as const, priority: 'high' as const },
      { id: '2', content: 'Todo 2', status: 'pending' as const, priority: 'low' as const }
    ]
    
    todos.forEach(todo => store.addTodo(todo))
    
    const highPriorityTodos = store.getTodosByPriority('high')
    const lowPriorityTodos = store.getTodosByPriority('low')
    
    expect(highPriorityTodos).toHaveLength(1)
    expect(lowPriorityTodos).toHaveLength(1)
    expect(highPriorityTodos[0].content).toBe('Todo 1')
    expect(lowPriorityTodos[0].content).toBe('Todo 2')
  })
})