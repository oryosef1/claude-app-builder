import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import WorkflowControl from '../../src/components/WorkflowControl'

describe('WorkflowControl Component', () => {
  const defaultProps = {
    isRunning: false,
    onStart: vi.fn(),
    onStop: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn()
  }

  it('renders start button when not running', () => {
    act(() => {
      render(React.createElement(WorkflowControl, defaultProps))
    })
    expect(screen.getByText('Start Workflow')).toBeInTheDocument()
  })

  it('renders control buttons when running', () => {
    act(() => {
      render(React.createElement(WorkflowControl, { ...defaultProps, isRunning: true }))
    })
    expect(screen.getByText('Pause')).toBeInTheDocument()
    expect(screen.getByText('Resume')).toBeInTheDocument()
    expect(screen.getByText('Stop')).toBeInTheDocument()
  })

  it('shows current workflow status', () => {
    act(() => {
      render(React.createElement(WorkflowControl, defaultProps))
    })
    expect(screen.getByText('Status: Stopped')).toBeInTheDocument()
  })

  it('shows running status when running', () => {
    act(() => {
      render(React.createElement(WorkflowControl, { ...defaultProps, isRunning: true }))
    })
    expect(screen.getByText('Status: Running')).toBeInTheDocument()
  })

  it('calls start workflow when start button clicked', async () => {
    const mockStart = vi.fn()
    act(() => {
      render(React.createElement(WorkflowControl, { ...defaultProps, onStart: mockStart }))
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Start Workflow'))
    })
    
    expect(mockStart).toHaveBeenCalled()
  })

  it('calls stop workflow when stop button clicked', async () => {
    const mockStop = vi.fn()
    act(() => {
      render(React.createElement(WorkflowControl, { ...defaultProps, isRunning: true, onStop: mockStop }))
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Stop'))
    })
    
    expect(mockStop).toHaveBeenCalled()
  })

  it('calls pause workflow when pause button clicked', async () => {
    const mockPause = vi.fn()
    act(() => {
      render(React.createElement(WorkflowControl, { ...defaultProps, isRunning: true, onPause: mockPause }))
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Pause'))
    })
    
    expect(mockPause).toHaveBeenCalled()
  })

  it('calls resume workflow when resume button clicked', async () => {
    const mockResume = vi.fn()
    act(() => {
      render(React.createElement(WorkflowControl, { ...defaultProps, isRunning: true, onResume: mockResume }))
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Resume'))
    })
    
    expect(mockResume).toHaveBeenCalled()
  })
})