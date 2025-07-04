import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import WorkflowControl from '../../src/components/WorkflowControl'

describe('WorkflowControl Component', () => {
  it('renders control buttons', () => {
    render(React.createElement(WorkflowControl))
    expect(screen.getByText('Start Workflow')).toBeInTheDocument()
    expect(screen.getByText('Stop Workflow')).toBeInTheDocument()
    expect(screen.getByText('Pause Workflow')).toBeInTheDocument()
  })

  it('shows current workflow status', () => {
    render(React.createElement(WorkflowControl))
    expect(screen.getByText(/Status:/)).toBeInTheDocument()
  })

  it('calls start workflow when start button clicked', () => {
    const mockStart = vi.fn()
    render(React.createElement(WorkflowControl, { onStart: mockStart }))
    
    fireEvent.click(screen.getByText('Start Workflow'))
    expect(mockStart).toHaveBeenCalled()
  })

  it('calls stop workflow when stop button clicked', () => {
    const mockStop = vi.fn()
    render(React.createElement(WorkflowControl, { onStop: mockStop }))
    
    fireEvent.click(screen.getByText('Stop Workflow'))
    expect(mockStop).toHaveBeenCalled()
  })

  it('calls pause workflow when pause button clicked', () => {
    const mockPause = vi.fn()
    render(React.createElement(WorkflowControl, { onPause: mockPause }))
    
    fireEvent.click(screen.getByText('Pause Workflow'))
    expect(mockPause).toHaveBeenCalled()
  })

  it('displays workflow status correctly', () => {
    render(React.createElement(WorkflowControl, { status: 'running' }))
    expect(screen.getByText('Status: running')).toBeInTheDocument()
  })

  it('disables buttons based on workflow state', () => {
    render(React.createElement(WorkflowControl, { status: 'running' }))
    expect(screen.getByText('Start Workflow')).toBeDisabled()
    expect(screen.getByText('Stop Workflow')).not.toBeDisabled()
  })
})