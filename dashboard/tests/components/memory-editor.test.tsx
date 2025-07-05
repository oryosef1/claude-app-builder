import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import MemoryEditor from '../../src/components/MemoryEditor'

describe('MemoryEditor Component', () => {
  const mockMemoryContent = '# Memory\n\nThis is test memory content'

  const defaultProps = {
    value: mockMemoryContent,
    onChange: vi.fn()
  }

  it('displays memory content in preview mode', () => {
    act(() => {
      render(React.createElement(MemoryEditor, defaultProps))
    })
    expect(screen.getByText(/# Memory/)).toBeInTheDocument()
    expect(screen.getByText(/This is test memory content/)).toBeInTheDocument()
  })

  it('has edit button', () => {
    act(() => {
      render(React.createElement(MemoryEditor, defaultProps))
    })
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('enters edit mode when edit button clicked', async () => {
    act(() => {
      render(React.createElement(MemoryEditor, defaultProps))
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Edit'))
    })
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe(mockMemoryContent)
  })

  it('shows save and cancel buttons in edit mode', async () => {
    act(() => {
      render(React.createElement(MemoryEditor, defaultProps))
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Edit'))
    })
    
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls onChange when save button clicked', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    act(() => {
      render(React.createElement(MemoryEditor, { ...defaultProps, onChange: mockOnChange }))
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Edit'))
    })
    
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    
    await act(async () => {
      await user.clear(textarea)
      await user.type(textarea, 'Updated memory content')
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Save'))
    })
    
    expect(mockOnChange).toHaveBeenCalledWith('Updated memory content')
  })

  it('cancels editing when cancel button clicked', async () => {
    act(() => {
      render(React.createElement(MemoryEditor, defaultProps))
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Edit'))
    })
    
    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'))
    })
    
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.queryByText('Save')).not.toBeInTheDocument()
  })

  it('renders memory editor heading', () => {
    act(() => {
      render(React.createElement(MemoryEditor, defaultProps))
    })
    expect(screen.getByText('Memory Editor')).toBeInTheDocument()
  })
})