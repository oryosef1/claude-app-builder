import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import App from '../src/App'

describe('App Component', () => {
  it('renders the dashboard title', () => {
    act(() => {
      render(React.createElement(App))
    })
    expect(screen.getByText(/Claude App Builder Dashboard/i)).toBeInTheDocument()
  })

  it('has a main container', () => {
    act(() => {
      render(React.createElement(App))
    })
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('initializes without crashing', () => {
    expect(() => {
      act(() => {
        render(React.createElement(App))
      })
    }).not.toThrow()
  })
})