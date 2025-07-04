import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import TodoManager from '../../src/components/TodoManager'

describe('TodoManager Component', () => {
  const mockTodos = [
    { id: '1', content: 'Test todo 1', status: 'pending' as const, priority: 'high' as const },
    { id: '2', content: 'Test todo 2', status: 'completed' as const, priority: 'medium' as const }
  ]

  const defaultProps = {
    todos: mockTodos,
    onAddTodo: vi.fn(),
    onDeleteTodo: vi.fn()
  }

  it('displays todo list', () => {
    render(React.createElement(TodoManager, defaultProps))
    expect(screen.getByText('Test todo 1')).toBeInTheDocument()
    expect(screen.getByText('Test todo 2')).toBeInTheDocument()
  })

  it('shows add todo form', () => {
    render(React.createElement(TodoManager, { ...defaultProps, todos: [] }))
    expect(screen.getByPlaceholderText('New todo...')).toBeInTheDocument()
    expect(screen.getByText('Add Todo')).toBeInTheDocument()
  })

  it('calls onAddTodo when adding new todo', async () => {
    const user = userEvent.setup()
    const mockOnAddTodo = vi.fn()
    render(React.createElement(TodoManager, { ...defaultProps, todos: [], onAddTodo: mockOnAddTodo }))
    
    await act(async () => {
      await user.type(screen.getByPlaceholderText('New todo...'), 'New todo item')
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Add Todo'))
    })
    
    expect(mockOnAddTodo).toHaveBeenCalledWith({
      content: 'New todo item',
      status: 'pending',
      priority: 'medium'
    })
  })

  it('calls onDeleteTodo when deleting todo', async () => {
    const mockOnDeleteTodo = vi.fn()
    render(React.createElement(TodoManager, { ...defaultProps, onDeleteTodo: mockOnDeleteTodo }))
    
    await act(async () => {
      fireEvent.click(screen.getAllByText('Delete')[0])
    })
    
    expect(mockOnDeleteTodo).toHaveBeenCalledWith('1')
  })

  it('shows todo status and priority', () => {
    render(React.createElement(TodoManager, defaultProps))
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('has priority selector in add form', () => {
    render(React.createElement(TodoManager, { ...defaultProps, todos: [] }))
    expect(screen.getByDisplayValue('Medium')).toBeInTheDocument()
  })

  it('renders todo manager heading', () => {
    render(React.createElement(TodoManager, defaultProps))
    expect(screen.getByText('Todo Manager')).toBeInTheDocument()
  })
})