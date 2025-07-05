import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from './api';

// Simple mock for apiService (available if needed in future tests)

describe('ApiService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('has health check method', () => {
    expect(typeof apiService.checkHealth).toBe('function');
  });

  it('has workflow control methods', () => {
    expect(typeof apiService.startWorkflow).toBe('function');
    expect(typeof apiService.stopWorkflow).toBe('function');
    expect(typeof apiService.pauseWorkflow).toBe('function');
    expect(typeof apiService.resumeWorkflow).toBe('function');
  });

  it('has status monitoring methods', () => {
    expect(typeof apiService.getWorkflowStatus).toBe('function');
  });

  it('has task management methods', () => {
    expect(typeof apiService.getTasks).toBe('function');
    expect(typeof apiService.createTask).toBe('function');
    expect(typeof apiService.updateTask).toBe('function');
  });

  it('has memory management methods', () => {
    expect(typeof apiService.getMemory).toBe('function');
    expect(typeof apiService.updateMemory).toBe('function');
  });
});