import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import TodoManager from '../../src/components/TodoManager'

describe('TodoManager Component', () => {
  const mockTodos = [
    { id: '1', content: 'Test todo 1', status: 'pending', priority: 'high' },
    { id: '2', content: 'Test todo 2', status: 'completed', priority: 'medium' }
  ]

  it('displays todo list', () => {
    render(React.createElement(TodoManager, { todos: mockTodos }))
    expect(screen.getByText('Test todo 1')).toBeInTheDocument()
    expect(screen.getByText('Test todo 2')).toBeInTheDocument()
  })

  it('shows add todo form', () => {
    render(React.createElement(TodoManager, { todos: [] }))
    expect(screen.getByPlaceholderText('Add new todo...')).toBeInTheDocument()
    expect(screen.getByText('Add Todo')).toBeInTheDocument()
  })

  it('calls onAdd when adding new todo', async () => {
    const user = userEvent.setup()
    const mockOnAdd = vi.fn()
    render(React.createElement(TodoManager, { todos: [], onAdd: mockOnAdd }))
    
    await user.type(screen.getByPlaceholderText('Add new todo...'), 'New todo item')
    fireEvent.click(screen.getByText('Add Todo'))
    
    expect(mockOnAdd).toHaveBeenCalledWith('New todo item')
  })

  it('calls onEdit when editing todo', () => {
    const mockOnEdit = vi.fn()
    render(React.createElement(TodoManager, { todos: mockTodos, onEdit: mockOnEdit }))
    
    fireEvent.click(screen.getAllByText('Edit')[0])
    expect(mockOnEdit).toHaveBeenCalledWith('1')
  })

  it('calls onDelete when deleting todo', () => {
    const mockOnDelete = vi.fn()
    render(React.createElement(TodoManager, { todos: mockTodos, onDelete: mockOnDelete }))
    
    fireEvent.click(screen.getAllByText('Delete')[0])
    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })

  it('shows todo status and priority', () => {
    render(React.createElement(TodoManager, { todos: mockTodos }))
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('filters todos by status', () => {
    render(React.createElement(TodoManager, { todos: mockTodos }))
    fireEvent.click(screen.getByText('Pending'))
    expect(screen.getByText('Test todo 1')).toBeInTheDocument()
    expect(screen.queryByText('Test todo 2')).not.toBeInTheDocument()
  })
})