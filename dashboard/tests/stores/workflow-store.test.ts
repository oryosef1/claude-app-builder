import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowStore } from '../../src/stores/workflowStore'

describe('WorkflowStore', () => {
  beforeEach(() => {
    useWorkflowStore.getState().reset()
  })

  it('initializes with correct default state', () => {
    const state = useWorkflowStore.getState()
    expect(state.status).toBe('idle')
    expect(state.currentPhase).toBe('')
    expect(state.logs).toEqual([])
    expect(state.isConnected).toBe(false)
  })

  it('updates workflow status', () => {
    const store = useWorkflowStore.getState()
    store.setStatus('running')
    
    expect(useWorkflowStore.getState().status).toBe('running')
  })

  it('updates current phase', () => {
    const store = useWorkflowStore.getState()
    store.setCurrentPhase('test-writer')
    
    expect(useWorkflowStore.getState().currentPhase).toBe('test-writer')
  })

  it('adds log entries', () => {
    const store = useWorkflowStore.getState()
    const logEntry = {
      id: '1',
      timestamp: '2023-01-01T10:00:00Z',
      level: 'info' as const,
      message: 'Test log',
      source: 'test-writer'
    }
    
    store.addLog(logEntry)
    expect(useWorkflowStore.getState().logs).toContain(logEntry)
  })

  it('clears logs', () => {
    const store = useWorkflowStore.getState()
    store.addLog({
      id: '1',
      timestamp: '2023-01-01T10:00:00Z',
      level: 'info',
      message: 'Test log',
      source: 'test-writer'
    })
    
    store.clearLogs()
    expect(useWorkflowStore.getState().logs).toEqual([])
  })

  it('sets connection status', () => {
    const store = useWorkflowStore.getState()
    store.setConnected(true)
    
    expect(useWorkflowStore.getState().isConnected).toBe(true)
  })

  it('resets state', () => {
    const store = useWorkflowStore.getState()
    store.setStatus('running')
    store.setCurrentPhase('developer')
    store.setConnected(true)
    
    store.reset()
    const state = useWorkflowStore.getState()
    expect(state.status).toBe('idle')
    expect(state.currentPhase).toBe('')
    expect(state.isConnected).toBe(false)
  })
})