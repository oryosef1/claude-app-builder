import { describe, test, expect } from 'vitest';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';

describe('AgentRegistry - Discovery Tests', () => {
  test('should show all employee skills', () => {
    const registry = new AgentRegistry();
    const employees = registry.getAllEmployees();
    
    console.log('\n=== Employee Skills Discovery ===');
    employees.forEach(emp => {
      console.log(`${emp.name} (${emp.role}): ${emp.skills.join(', ')}`);
    });
    
    // Collect all unique skills
    const allSkills = new Set<string>();
    employees.forEach(emp => {
      emp.skills.forEach(skill => allSkills.add(skill));
    });
    
    console.log('\n=== All Unique Skills ===');
    console.log(Array.from(allSkills).sort().join(', '));
    
    expect(employees.length).toBe(13);
  });
});