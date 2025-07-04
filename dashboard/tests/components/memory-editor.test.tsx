import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import MemoryEditor from '../../src/components/MemoryEditor'

describe('MemoryEditor Component', () => {
  const mockMemoryContent = '# Memory\n\nThis is test memory content'

  it('displays memory content', () => {
    render(React.createElement(MemoryEditor, { content: mockMemoryContent }))
    expect(screen.getByDisplayValue(mockMemoryContent)).toBeInTheDocument()
  })

  it('has edit and save buttons', () => {
    render(React.createElement(MemoryEditor, { content: mockMemoryContent }))
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('enables editing when edit button clicked', () => {
    render(React.createElement(MemoryEditor, { content: mockMemoryContent }))
    
    fireEvent.click(screen.getByText('Edit'))
    const textarea = screen.getByDisplayValue(mockMemoryContent)
    expect(textarea).not.toBeDisabled()
  })

  it('calls onSave when save button clicked', async () => {
    const user = userEvent.setup()
    const mockOnSave = vi.fn()
    render(React.createElement(MemoryEditor, { content: mockMemoryContent, onSave: mockOnSave }))
    
    fireEvent.click(screen.getByText('Edit'))
    const textarea = screen.getByDisplayValue(mockMemoryContent)
    await user.clear(textarea)
    await user.type(textarea, 'Updated memory content')
    fireEvent.click(screen.getByText('Save'))
    
    expect(mockOnSave).toHaveBeenCalledWith('Updated memory content')
  })

  it('shows preview mode by default', () => {
    render(React.createElement(MemoryEditor, { content: mockMemoryContent }))
    const textarea = screen.getByDisplayValue(mockMemoryContent)
    expect(textarea).toBeDisabled()
  })

  it('has syntax highlighting for markdown', () => {
    render(React.createElement(MemoryEditor, { content: mockMemoryContent }))
    const textarea = screen.getByDisplayValue(mockMemoryContent)
    expect(textarea).toHaveClass('markdown-editor')
  })

  it('shows character count', () => {
    render(React.createElement(MemoryEditor, { content: mockMemoryContent }))
    expect(screen.getByText(/\d+ characters/)).toBeInTheDocument()
  })
})