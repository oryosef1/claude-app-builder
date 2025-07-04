import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Layout from '../../src/components/Layout'

describe('Layout Component', () => {
  it('renders sidebar navigation', () => {
    render(React.createElement(Layout, { children: React.createElement('div', {}, 'Test Content') }))
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('renders main content area', () => {
    render(React.createElement(Layout, { children: React.createElement('div', { 'data-testid': 'content' }, 'Test Content') }))
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('displays navigation links', () => {
    render(React.createElement(Layout, { children: React.createElement('div') }))
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Workflow')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('Memory')).toBeInTheDocument()
    expect(screen.getByText('Logs')).toBeInTheDocument()
  })

  it('has responsive design structure', () => {
    render(React.createElement(Layout, { children: React.createElement('div') }))
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('sidebar')
  })
})