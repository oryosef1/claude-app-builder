import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import App from '../../src/App'

describe('Dashboard E2E Tests', () => {
  it('complete workflow management flow', async () => {
    const user = userEvent.setup()
    let component
    await act(async () => {
      component = render(React.createElement(App))
    })
    
    // Start at dashboard
    expect(screen.getByText(/Claude App Builder Dashboard/i)).toBeInTheDocument()
    
    // Navigate to todo management
    await act(async () => {
      fireEvent.click(screen.getByText('Todo'))
    })
    
    // Add a new todo
    await act(async () => {
      await user.type(screen.getByPlaceholderText('New todo...'), 'Test new feature')
      fireEvent.click(screen.getByText('Add Todo'))
    })
    
    // Verify todo was added
    await waitFor(() => {
      expect(screen.getByText('Test new feature')).toBeInTheDocument()
    })
    
    // Navigate to workflow control
    await act(async () => {
      fireEvent.click(screen.getByText('Workflow'))
    })
    
    // Start workflow
    await act(async () => {
      fireEvent.click(screen.getByText('Start Workflow'))
    })
    
    // Verify workflow status changes
    await waitFor(() => {
      expect(screen.getByText('Status: running')).toBeInTheDocument()
    })
    
    // Navigate to logs
    await act(async () => {
      fireEvent.click(screen.getByText('Logs'))
    })
    
    // Should show workflow logs
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument()
    })
  })

  it('memory editing workflow', async () => {
    const user = userEvent.setup()
    let component
    await act(async () => {
      component = render(React.createElement(App))
    })
    
    // Navigate to memory editor
    await act(async () => {
      fireEvent.click(screen.getByText('Memory'))
    })
    
    // Edit memory content
    await act(async () => {
      fireEvent.click(screen.getByText('Edit'))
    })
    
    const textarea = screen.getByRole('textbox')
    await act(async () => {
      await user.clear(textarea)
      await user.type(textarea, '# Updated Memory\n\nThis is updated content')
    })
    
    // Save changes
    await act(async () => {
      fireEvent.click(screen.getByText('Save'))
    })
    
    // Verify content was saved
    await waitFor(() => {
      expect(screen.getByDisplayValue('# Updated Memory\n\nThis is updated content')).toBeInTheDocument()
    })
  })

  it('real-time status updates', async () => {
    let component
    await act(async () => {
      component = render(React.createElement(App))
    })
    
    // Navigate to workflow control
    await act(async () => {
      fireEvent.click(screen.getByText('Workflow'))
    })
    
    // Start workflow
    await act(async () => {
      fireEvent.click(screen.getByText('Start Workflow'))
    })
    
    // Status should update to running
    await waitFor(() => {
      expect(screen.getByText('Status: running')).toBeInTheDocument()
    })
    
    // Navigate to dashboard - should still show running status
    await act(async () => {
      fireEvent.click(screen.getByText('Dashboard'))
    })
    await waitFor(() => {
      expect(screen.getByText(/Status: running/i)).toBeInTheDocument()
    })
  })

  it('log filtering and search', async () => {
    const user = userEvent.setup()
    let component
    await act(async () => {
      component = render(React.createElement(App))
    })
    
    // Navigate to logs
    await act(async () => {
      fireEvent.click(screen.getByText('Logs'))
    })
    
    // Search logs
    await act(async () => {
      await user.type(screen.getByPlaceholderText('Search logs...'), 'error')
    })
    
    // Filter by level
    await act(async () => {
      fireEvent.click(screen.getByText('All Levels'))
      fireEvent.click(screen.getByText('Error'))
    })
    
    // Only error logs should be visible
    await waitFor(() => {
      const errorLogs = screen.getAllByText('error')
      expect(errorLogs.length).toBeGreaterThan(0)
    })
  })

  it('responsive navigation', async () => {
    act(() => {
      render(React.createElement(App))
    })
    
    // All navigation items should be visible
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Workflow')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('Memory')).toBeInTheDocument()
    expect(screen.getByText('Logs')).toBeInTheDocument()
    
    // Navigation should be accessible
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
  })
})