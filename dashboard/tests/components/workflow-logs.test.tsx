import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import WorkflowLogs from '../../src/components/WorkflowLogs'

describe('WorkflowLogs Component', () => {
  const mockLogs = [
    { id: '1', timestamp: '2023-01-01T10:00:00Z', level: 'info' as const, message: 'Test log message 1', role: 'test-writer' },
    { id: '2', timestamp: '2023-01-01T10:01:00Z', level: 'error' as const, message: 'Test error message', role: 'developer' },
    { id: '3', timestamp: '2023-01-01T10:02:00Z', level: 'warning' as const, message: 'Test warning message', role: 'coordinator' }
  ]

  const defaultProps = {
    logs: mockLogs,
    onClear: vi.fn()
  }

  it('displays log messages', () => {
    render(React.createElement(WorkflowLogs, defaultProps))
    expect(screen.getByText('Test log message 1')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('shows log timestamps', () => {
    render(React.createElement(WorkflowLogs, defaultProps))
    expect(screen.getByText('2023-01-01T10:00:00Z')).toBeInTheDocument()
    expect(screen.getByText('2023-01-01T10:01:00Z')).toBeInTheDocument()
  })

  it('displays log levels', () => {
    render(React.createElement(WorkflowLogs, defaultProps))
    expect(screen.getByText('info')).toBeInTheDocument()
    expect(screen.getByText('error')).toBeInTheDocument()
    expect(screen.getByText('warning')).toBeInTheDocument()
  })

  it('shows log roles', () => {
    render(React.createElement(WorkflowLogs, defaultProps))
    expect(screen.getByText('[test-writer]')).toBeInTheDocument()
    expect(screen.getByText('[developer]')).toBeInTheDocument()
  })

  it('has clear logs button', async () => {
    const mockOnClear = vi.fn()
    render(React.createElement(WorkflowLogs, { ...defaultProps, onClear: mockOnClear }))
    
    await act(async () => {
      fireEvent.click(screen.getByText('Clear Logs'))
    })
    
    expect(mockOnClear).toHaveBeenCalled()
  })

  it('renders workflow logs heading', () => {
    render(React.createElement(WorkflowLogs, defaultProps))
    expect(screen.getByText('Workflow Logs')).toBeInTheDocument()
  })

  it('shows empty state when no logs', () => {
    render(React.createElement(WorkflowLogs, { ...defaultProps, logs: [] }))
    expect(screen.getByText('Workflow Logs')).toBeInTheDocument()
    expect(screen.getByText('Clear Logs')).toBeInTheDocument()
  })

  it('applies proper CSS classes to log entries', () => {
    const { container } = render(React.createElement(WorkflowLogs, defaultProps))
    expect(container.querySelector('.log-entry.info')).toBeInTheDocument()
    expect(container.querySelector('.log-entry.error')).toBeInTheDocument()
    expect(container.querySelector('.log-entry.warning')).toBeInTheDocument()
  })
})