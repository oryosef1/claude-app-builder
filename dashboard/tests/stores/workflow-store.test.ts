import { describe, it, expect, beforeEach } from 'vitest'
import useWorkflowStore from '../../src/stores/workflowStore'

describe('WorkflowStore', () => {
  beforeEach(() => {
    useWorkflowStore.getState().reset()
  })

  it('initializes with correct default state', () => {
    const state = useWorkflowStore.getState()
    expect(state.status).toBe('idle')
    expect(state.isRunning).toBe(false)
    expect(state.logs).toEqual([])
    expect(state.currentRole).toBeUndefined()
  })

  it('starts workflow', () => {
    const store = useWorkflowStore.getState()
    store.start()
    
    const state = useWorkflowStore.getState()
    expect(state.isRunning).toBe(true)
    expect(state.status).toBe('running')
  })

  it('stops workflow', () => {
    const store = useWorkflowStore.getState()
    store.start()
    store.stop()
    
    const state = useWorkflowStore.getState()
    expect(state.isRunning).toBe(false)
    expect(state.status).toBe('idle')
  })

  it('pauses workflow', () => {
    const store = useWorkflowStore.getState()
    store.start()
    store.pause()
    
    const state = useWorkflowStore.getState()
    expect(state.isRunning).toBe(false)
    expect(state.status).toBe('paused')
  })

  it('resumes workflow', () => {
    const store = useWorkflowStore.getState()
    store.start()
    store.pause()
    store.resume()
    
    const state = useWorkflowStore.getState()
    expect(state.isRunning).toBe(true)
    expect(state.status).toBe('running')
  })

  it('updates workflow status', () => {
    const store = useWorkflowStore.getState()
    store.setStatus('error')
    
    expect(useWorkflowStore.getState().status).toBe('error')
  })

  it('adds log entries', () => {
    const store = useWorkflowStore.getState()
    const logInput = {
      level: 'info' as const,
      message: 'Test log',
      role: 'test-writer'
    }
    
    store.addLog(logInput)
    const logs = useWorkflowStore.getState().logs
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject(logInput)
    expect(logs[0].id).toBeDefined()
    expect(logs[0].timestamp).toBeDefined()
  })

  it('clears logs', () => {
    const store = useWorkflowStore.getState()
    store.addLog({
      level: 'info',
      message: 'Test log',
      role: 'test-writer'
    })
    
    store.clearLogs()
    expect(useWorkflowStore.getState().logs).toEqual([])
  })

  it('resets state', () => {
    const store = useWorkflowStore.getState()
    store.start()
    store.setStatus('error')
    store.addLog({ level: 'info', message: 'Test', role: 'test' })
    
    store.reset()
    const state = useWorkflowStore.getState()
    expect(state.status).toBe('idle')
    expect(state.isRunning).toBe(false)
    expect(state.logs).toEqual([])
    expect(state.currentRole).toBeUndefined()
  })
})