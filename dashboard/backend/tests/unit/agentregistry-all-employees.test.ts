import { describe, test, expect } from 'vitest';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';

describe('AgentRegistry - All Employees Status', () => {
  test('discover all employee statuses and workloads', () => {
    const registry = new AgentRegistry();
    const employees = registry.getAllEmployees();
    
    console.log('\n=== All Employees Status ===');
    employees.forEach(emp => {
      console.log(`${emp.id}: ${emp.name} - status=${emp.status}, workload=${emp.workload}`);
    });
    
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    const availableEmployees = employees.filter(emp => emp.status === 'active' && emp.workload < 80);
    
    console.log('\n=== Summary ===');
    console.log('Total employees:', employees.length);
    console.log('Active employees:', activeEmployees.length);
    console.log('Available employees (active & workload < 80):', availableEmployees.length);
    
    expect(employees.length).toBe(13);
  });
});