import { describe, test, expect } from 'vitest';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';

describe('AgentRegistry - Fix Discovery', () => {
  const registry = new AgentRegistry();

  test('discover employee status', () => {
    const employee = registry.getEmployeeById('emp_001');
    console.log('\n=== Employee emp_001 Status ===');
    console.log('Current status:', employee?.status);
    console.log('Employee data:', JSON.stringify(employee, null, 2));
    expect(employee).toBeDefined();
  });

  test('discover available employees for testing skill', () => {
    const availableEmployees = registry.getAvailableEmployees();
    console.log('\n=== Available Employees ===');
    console.log('Count:', availableEmployees.length);
    
    const withTestingSkill = availableEmployees.filter(emp => 
      emp.skills.some(s => s.toLowerCase() === 'testing')
    );
    console.log('With testing skill:', withTestingSkill.length);
    withTestingSkill.forEach(emp => {
      console.log(`- ${emp.name} (${emp.role}): workload=${emp.workload}, status=${emp.status}`);
    });
    
    expect(availableEmployees.length).toBeGreaterThan(0);
  });

  test('discover department heads', () => {
    const departments = registry.getAllDepartments();
    console.log('\n=== Department Heads ===');
    departments.forEach(dept => {
      const head = registry.getDepartmentHead(dept);
      console.log(`${dept}: ${head?.name} (${head?.role})`);
    });
    expect(departments.length).toBeGreaterThan(0);
  });

  test('discover skills for team building', () => {
    const availableEmployees = registry.getAvailableEmployees();
    const allSkills = new Set<string>();
    
    availableEmployees.forEach(emp => {
      emp.skills.forEach(skill => allSkills.add(skill.toLowerCase()));
    });
    
    console.log('\n=== Available Skills from Active Employees ===');
    console.log(Array.from(allSkills).sort().join(', '));
    
    // Test with actual available skills
    const testSkills = ['ci/cd', 'automation', 'testing'];
    console.log('\n=== Testing team building with:', testSkills);
    
    const team = registry.buildTeamForTask(testSkills);
    console.log('Team size:', team.length);
    team.forEach(emp => {
      console.log(`- ${emp.name}: ${emp.skills.join(', ')}`);
    });
    
    expect(availableEmployees.length).toBeGreaterThan(0);
  });
});