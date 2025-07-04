import { describe, it, expect, beforeEach } from 'vitest'
import useTodoStore from '../../src/stores/todoStore'

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
    const todoInput = {
      content: 'Test todo',
      status: 'pending' as const,
      priority: 'high' as const
    }
    
    store.addTodo(todoInput)
    const todos = useTodoStore.getState().todos
    expect(todos).toHaveLength(1)
    expect(todos[0]).toMatchObject(todoInput)
    expect(todos[0].id).toBeDefined()
  })

  it('updates todo status', () => {
    const store = useTodoStore.getState()
    const todoInput = {
      content: 'Test todo',
      status: 'pending' as const,
      priority: 'high' as const
    }
    
    store.addTodo(todoInput)
    const todoId = useTodoStore.getState().todos[0].id
    store.updateTodo(todoId, { status: 'completed' })
    
    const updatedTodo = useTodoStore.getState().todos.find(t => t.id === todoId)
    expect(updatedTodo?.status).toBe('completed')
  })

  it('updates todo content', () => {
    const store = useTodoStore.getState()
    const todoInput = {
      content: 'Test todo',
      status: 'pending' as const,
      priority: 'high' as const
    }
    
    store.addTodo(todoInput)
    const todoId = useTodoStore.getState().todos[0].id
    store.updateTodo(todoId, { content: 'Updated todo' })
    
    const updatedTodo = useTodoStore.getState().todos.find(t => t.id === todoId)
    expect(updatedTodo?.content).toBe('Updated todo')
  })

  it('deletes todo', () => {
    const store = useTodoStore.getState()
    const todoInput = {
      content: 'Test todo',
      status: 'pending' as const,
      priority: 'high' as const
    }
    
    store.addTodo(todoInput)
    const todoId = useTodoStore.getState().todos[0].id
    store.deleteTodo(todoId)
    
    expect(useTodoStore.getState().todos).toHaveLength(0)
  })

  it('loads todos from external source', () => {
    const store = useTodoStore.getState()
    const todos = [
      { id: '1', content: 'Todo 1', status: 'pending' as const, priority: 'high' as const },
      { id: '2', content: 'Todo 2', status: 'completed' as const, priority: 'medium' as const }
    ]
    
    store.loadTodos(todos)
    
    expect(useTodoStore.getState().todos).toEqual(todos)
  })

  it('resets store', () => {
    const store = useTodoStore.getState()
    store.addTodo({ content: 'Test', status: 'pending', priority: 'high' })
    
    store.reset()
    
    expect(useTodoStore.getState().todos).toEqual([])
  })
})