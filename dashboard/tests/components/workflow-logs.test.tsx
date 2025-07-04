import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import WorkflowLogs from '../../src/components/WorkflowLogs'

describe('WorkflowLogs Component', () => {
  const mockLogs = [
    { id: '1', timestamp: '2023-01-01T10:00:00Z', level: 'info', message: 'Test log message 1', source: 'test-writer' },
    { id: '2', timestamp: '2023-01-01T10:01:00Z', level: 'error', message: 'Test error message', source: 'developer' },
    { id: '3', timestamp: '2023-01-01T10:02:00Z', level: 'debug', message: 'Test debug message', source: 'coordinator' }
  ]

  it('displays log messages', () => {
    render(React.createElement(WorkflowLogs, { logs: mockLogs }))
    expect(screen.getByText('Test log message 1')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('shows log timestamps', () => {
    render(React.createElement(WorkflowLogs, { logs: mockLogs }))
    expect(screen.getByText('10:00:00')).toBeInTheDocument()
    expect(screen.getByText('10:01:00')).toBeInTheDocument()
  })

  it('displays log levels with appropriate styling', () => {
    render(React.createElement(WorkflowLogs, { logs: mockLogs }))
    expect(screen.getByText('info')).toHaveClass('log-level', 'info')
    expect(screen.getByText('error')).toHaveClass('log-level', 'error')
    expect(screen.getByText('debug')).toHaveClass('log-level', 'debug')
  })

  it('shows log source', () => {
    render(React.createElement(WorkflowLogs, { logs: mockLogs }))
    expect(screen.getByText('test-writer')).toBeInTheDocument()
    expect(screen.getByText('developer')).toBeInTheDocument()
  })

  it('has search functionality', () => {
    render(React.createElement(WorkflowLogs, { logs: mockLogs }))
    expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument()
  })

  it('filters logs by search term', () => {
    render(React.createElement(WorkflowLogs, { logs: mockLogs }))
    const searchInput = screen.getByPlaceholderText('Search logs...')
    
    fireEvent.change(searchInput, { target: { value: 'error' } })
    expect(screen.getByText('Test error message')).toBeInTheDocument()
    expect(screen.queryByText('Test log message 1')).not.toBeInTheDocument()
  })

  it('has level filter dropdown', () => {
    render(React.createElement(WorkflowLogs, { logs: mockLogs }))
    expect(screen.getByText('All Levels')).toBeInTheDocument()
  })

  it('filters logs by level', () => {
    render(React.createElement(WorkflowLogs, { logs: mockLogs }))
    fireEvent.click(screen.getByText('All Levels'))
    fireEvent.click(screen.getByText('Error'))
    
    expect(screen.getByText('Test error message')).toBeInTheDocument()
    expect(screen.queryByText('Test log message 1')).not.toBeInTheDocument()
  })

  it('has clear logs button', () => {
    const mockOnClear = vi.fn()
    render(React.createElement(WorkflowLogs, { logs: mockLogs, onClear: mockOnClear }))
    
    fireEvent.click(screen.getByText('Clear Logs'))
    expect(mockOnClear).toHaveBeenCalled()
  })
})