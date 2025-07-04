import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'
import App from '../../src/App'

describe('Workflow Integration', () => {
  it('workflow control integrates with dashboard', async () => {
    let component
    await act(async () => {
      component = render(React.createElement(App))
    })
    
    // Navigate to workflow page
    await act(async () => {
      fireEvent.click(screen.getByText('Workflow'))
    })
    
    // Should show workflow controls
    await waitFor(() => {
      expect(screen.getByText('Start Workflow')).toBeInTheDocument()
      expect(screen.getByText('Stop Workflow')).toBeInTheDocument()
    })
  })

  it('todo management integrates with workflow', async () => {
    let component
    await act(async () => {
      component = render(React.createElement(App))
    })
    
    // Navigate to todo page
    await act(async () => {
      fireEvent.click(screen.getByText('Todo'))
    })
    
    // Should show todo interface
    await waitFor(() => {
      expect(screen.getByPlaceholderText('New todo...')).toBeInTheDocument()
    })
  })

  it('memory editor integrates with dashboard', async () => {
    let component
    await act(async () => {
      component = render(React.createElement(App))
    })
    
    // Navigate to memory page
    await act(async () => {
      fireEvent.click(screen.getByText('Memory'))
    })
    
    // Should show memory editor
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })

  it('workflow logs integrate with dashboard', async () => {
    let component
    await act(async () => {
      component = render(React.createElement(App))
    })
    
    // Navigate to logs page
    await act(async () => {
      fireEvent.click(screen.getByText('Logs'))
    })
    
    // Should show logs interface
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument()
    })
  })

  it('navigation between pages works correctly', async () => {
    act(() => {
      render(React.createElement(App))
    })
    
    // Start at dashboard
    expect(screen.getByText(/Claude App Builder Dashboard/i)).toBeInTheDocument()
    
    // Navigate to workflow
    await act(async () => {
      fireEvent.click(screen.getByText('Workflow'))
    })
    await waitFor(() => {
      expect(screen.getByText('Start Workflow')).toBeInTheDocument()
    })
    
    // Navigate back to dashboard
    await act(async () => {
      fireEvent.click(screen.getByText('Dashboard'))
    })
    await waitFor(() => {
      expect(screen.getByText(/Claude App Builder Dashboard/i)).toBeInTheDocument()
    })
  })
})