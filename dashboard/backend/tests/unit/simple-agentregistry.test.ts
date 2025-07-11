import { describe, test, expect, beforeEach } from 'vitest';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';

describe('AgentRegistry - Simple Test', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  test('should initialize with 13 employees', () => {
    const employees = registry.getAllEmployees();
    expect(employees).toHaveLength(13);
  });

  test('should get employee by ID', () => {
    const employee = registry.getEmployeeById('emp_001');
    expect(employee).toBeDefined();
    expect(employee?.name).toBe('Alex Project Manager');
  });

  test('should find employees by skill', () => {
    const testingExperts = registry.getEmployeesBySkill('testing');
    expect(testingExperts.length).toBeGreaterThan(0);
    expect(testingExperts.every(emp => emp.skills.some(s => s.toLowerCase() === 'testing'))).toBe(true);
  });
});