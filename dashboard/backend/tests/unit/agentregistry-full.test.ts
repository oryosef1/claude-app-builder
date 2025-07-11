import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';

describe('AgentRegistry - Comprehensive Tests', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('Basic Employee Operations', () => {
    test('should initialize with 13 employees', () => {
      const employees = registry.getAllEmployees();
      expect(employees).toHaveLength(13);
    });

    test('should get employee by ID', () => {
      const employee = registry.getEmployeeById('emp_001');
      expect(employee).toBeDefined();
      expect(employee?.name).toBe('Alex Project Manager');
      expect(employee?.role).toBe('Project Manager');
    });

    test('should return undefined for non-existent employee ID', () => {
      const employee = registry.getEmployeeById('emp_999');
      expect(employee).toBeUndefined();
    });

    test('should get all departments', () => {
      const departments = registry.getAllDepartments();
      expect(departments).toContain('Executive');
      expect(departments).toContain('Development');
      expect(departments).toContain('Operations');
      expect(departments).toContain('Support');
    });
  });

  describe('Employee Filtering', () => {
    test('should get employees by department', () => {
      const executiveEmployees = registry.getEmployeesByDepartment('Executive');
      expect(executiveEmployees.length).toBeGreaterThan(0);
      expect(executiveEmployees.every(emp => emp.department === 'Executive')).toBe(true);
    });

    test('should get employees by skill', () => {
      const testingExperts = registry.getEmployeesBySkill('testing');
      expect(testingExperts.length).toBeGreaterThan(0);
      expect(testingExperts.every(emp => 
        emp.skills.some(s => s.toLowerCase() === 'testing')
      )).toBe(true);
    });

    test('should handle skill search case-insensitively', () => {
      const upperCase = registry.getEmployeesBySkill('TESTING');
      const lowerCase = registry.getEmployeesBySkill('testing');
      expect(upperCase.length).toBe(lowerCase.length);
    });

    test('should get employees by role', () => {
      const projectManagers = registry.getEmployeesByRole('Project Manager');
      expect(projectManagers.length).toBeGreaterThan(0);
      expect(projectManagers.every(emp => emp.role === 'Project Manager')).toBe(true);
    });

    test('should get available employees', () => {
      const availableEmployees = registry.getAvailableEmployees();
      expect(availableEmployees.every(emp => 
        emp.status === 'active' && emp.workload < 80
      )).toBe(true);
    });
  });

  describe('Employee Status Management', () => {
    test('should update employee status', () => {
      const result = registry.updateEmployeeStatus('emp_001', 'busy');
      expect(result).toBe(true);
      
      const employee = registry.getEmployeeById('emp_001');
      expect(employee?.status).toBe('busy');
    });

    test('should reject invalid status', () => {
      const result = registry.updateEmployeeStatus('emp_001', 'invalid' as any);
      expect(result).toBe(false);
    });

    test('should reject status update for non-existent employee', () => {
      const result = registry.updateEmployeeStatus('emp_999', 'active');
      expect(result).toBe(false);
    });

    test('should emit event when status changes', () => {
      const eventSpy = vi.fn();
      registry.on('employeeStatusChanged', eventSpy);
      
      // Get current status first
      const employee = registry.getEmployeeById('emp_001');
      const previousStatus = employee?.status || 'active';
      
      // Change to a different status
      const newStatus = previousStatus === 'active' ? 'busy' : 'active';
      registry.updateEmployeeStatus('emp_001', newStatus);
      
      expect(eventSpy).toHaveBeenCalledWith({
        employeeId: 'emp_001',
        newStatus: newStatus,
        previousStatus: previousStatus
      });
    });
  });

  describe('Workload Management', () => {
    test('should update employee workload', () => {
      const result = registry.updateEmployeeWorkload('emp_001', 75);
      expect(result).toBe(true);
      
      const employee = registry.getEmployeeById('emp_001');
      expect(employee?.workload).toBe(75);
    });

    test('should reject invalid workload values', () => {
      expect(registry.updateEmployeeWorkload('emp_001', -10)).toBe(false);
      expect(registry.updateEmployeeWorkload('emp_001', 150)).toBe(false);
      expect(registry.updateEmployeeWorkload('emp_001', NaN)).toBe(false);
      expect(registry.updateEmployeeWorkload('emp_001', Infinity)).toBe(false);
    });

    test('should reject workload update for non-existent employee', () => {
      const result = registry.updateEmployeeWorkload('emp_999', 50);
      expect(result).toBe(false);
    });

    test('should emit event when workload changes', () => {
      const eventSpy = vi.fn();
      registry.on('workloadChanged', eventSpy);
      
      const employee = registry.getEmployeeById('emp_001');
      const previousWorkload = employee?.workload || 0;
      
      registry.updateEmployeeWorkload('emp_001', 75);
      
      expect(eventSpy).toHaveBeenCalledWith({
        employeeId: 'emp_001',
        newWorkload: 75,
        previousWorkload
      });
    });
  });

  describe('Task Assignment', () => {
    test('should find best employee for task', () => {
      // First make some employees available
      registry.updateEmployeeStatus('emp_006', 'active'); // QA Engineer with testing skills
      registry.updateEmployeeWorkload('emp_006', 30);
      
      const requiredSkills = ['testing', 'automation'];
      const employee = registry.findBestEmployeeForTask(requiredSkills);
      
      expect(employee).toBeDefined();
      // Check that employee has at least one of the required skills
      const hasMatchingSkill = employee?.skills.some(skill => 
        requiredSkills.some(reqSkill => skill.toLowerCase() === reqSkill.toLowerCase())
      );
      expect(hasMatchingSkill).toBe(true);
    });

    test('should return null when no available employees', () => {
      // Reset all employees to ensure consistent state
      const allEmployees = registry.getAllEmployees();
      
      // Set all employees to either busy or high workload
      allEmployees.forEach((emp, index) => {
        if (index % 2 === 0) {
          registry.updateEmployeeStatus(emp.id, 'busy');
        } else {
          registry.updateEmployeeStatus(emp.id, 'active');
          registry.updateEmployeeWorkload(emp.id, 85); // Above 80 threshold
        }
      });
      
      // Now all employees are either busy or have high workload
      const employee = registry.findBestEmployeeForTask(['testing']);
      expect(employee).toBeNull();
    });

    test('should prioritize skill match for high priority tasks', () => {
      // First make employees available - QA Engineer has testing skills
      registry.updateEmployeeStatus('emp_006', 'active'); // QA Engineer
      registry.updateEmployeeStatus('emp_007', 'active'); // Test Engineer
      registry.updateEmployeeWorkload('emp_006', 30);
      registry.updateEmployeeWorkload('emp_007', 20);
      
      const employee = registry.findBestEmployeeForTask(['testing'], 'high');
      expect(employee).toBeDefined();
      // Employee should have testing-related skills
      const hasTestingSkill = employee?.skills.some(s => 
        s.toLowerCase().includes('test') || s.toLowerCase() === 'testing'
      );
      expect(hasTestingSkill).toBe(true);
    });
  });

  describe('Project Management', () => {
    test('should assign project to employee', () => {
      const eventSpy = vi.fn();
      registry.on('project-assigned', eventSpy);
      
      registry.assignProject('emp_001', 'project-123');
      
      const employee = registry.getEmployeeById('emp_001');
      expect(employee?.current_projects).toContain('project-123');
      expect(eventSpy).toHaveBeenCalledWith('emp_001', 'project-123');
    });

    test('should not duplicate project assignment', () => {
      registry.assignProject('emp_001', 'project-123');
      const projectCount = registry.getEmployeeById('emp_001')?.current_projects.length || 0;
      
      registry.assignProject('emp_001', 'project-123');
      const newCount = registry.getEmployeeById('emp_001')?.current_projects.length || 0;
      
      expect(newCount).toBe(projectCount);
    });

    test('should remove project from employee', () => {
      const eventSpy = vi.fn();
      registry.on('project-removed', eventSpy);
      
      registry.assignProject('emp_001', 'project-123');
      registry.removeProject('emp_001', 'project-123');
      
      const employee = registry.getEmployeeById('emp_001');
      expect(employee?.current_projects).not.toContain('project-123');
      expect(eventSpy).toHaveBeenCalledWith('emp_001', 'project-123');
    });
  });

  describe('Performance Metrics', () => {
    test('should update performance metric', () => {
      const eventSpy = vi.fn();
      registry.on('performance-updated', eventSpy);
      
      registry.updatePerformanceMetric('emp_001', 'success_rate', 95);
      
      const employee = registry.getEmployeeById('emp_001');
      expect(employee?.performance_metrics['success_rate']).toBe(95);
      expect(eventSpy).toHaveBeenCalledWith('emp_001', 'success_rate', 95);
    });

    test('should get employee metrics', () => {
      registry.assignTask('emp_001', 'task-1');
      registry.assignTask('emp_001', 'task-2');
      
      const metrics = registry.getEmployeeMetrics('emp_001');
      
      expect(metrics).toBeDefined();
      expect(metrics.currentTasks).toHaveLength(2);
      expect(metrics).toHaveProperty('tasksCompleted');
      expect(metrics).toHaveProperty('currentWorkload');
    });

    test('should return null for non-existent employee metrics', () => {
      const metrics = registry.getEmployeeMetrics('emp_999');
      expect(metrics).toBeNull();
    });
  });

  describe('Department Operations', () => {
    test('should get department info', () => {
      const departments = registry.getDepartments();
      expect(departments).toBeDefined();
      expect(departments).toHaveProperty('Executive');
      expect(departments).toHaveProperty('Development');
    });

    test('should get department head', () => {
      const head = registry.getDepartmentHead('Executive');
      expect(head).toBeDefined();
      // The head of Executive is Project Manager, not Director
      expect(head?.role).toBe('Project Manager');
    });

    test('should return null for non-existent department head', () => {
      const head = registry.getDepartmentHead('NonExistent');
      expect(head).toBeNull();
    });
  });

  describe('Team Building', () => {
    test('should build team for task with required skills', () => {
      // First make some employees available
      registry.updateEmployeeStatus('emp_006', 'active'); // QA Engineer
      registry.updateEmployeeStatus('emp_008', 'active'); // DevOps Engineer
      registry.updateEmployeeWorkload('emp_006', 30);
      registry.updateEmployeeWorkload('emp_008', 40);
      
      const requiredSkills = ['testing', 'automation', 'ci/cd'];
      const team = registry.buildTeamForTask(requiredSkills);
      
      expect(team.length).toBeGreaterThan(0);
      
      // Check that team covers some of the required skills
      const teamSkills = new Set(team.flatMap(emp => emp.skills.map(s => s.toLowerCase())));
      const coveredSkills = requiredSkills.filter(skill => teamSkills.has(skill.toLowerCase()));
      expect(coveredSkills.length).toBeGreaterThan(0);
    });

    test('should find employees for multi-agent task', () => {
      // First make some employees available
      registry.updateEmployeeStatus('emp_006', 'active'); // QA Engineer  
      registry.updateEmployeeStatus('emp_007', 'active'); // Test Engineer
      registry.updateEmployeeWorkload('emp_006', 30);
      registry.updateEmployeeWorkload('emp_007', 20);
      
      const employees = registry.findEmployeesForMultiAgentTask(['testing'], 2);
      expect(employees).toHaveLength(2);
      expect(employees.every(emp => emp.status === 'active')).toBe(true);
    });

    test('should respect department preference in team building', () => {
      const employees = registry.findEmployeesForMultiAgentTask(
        ['development'], 
        2, 
        { department: 'Development' }
      );
      
      expect(employees.every(emp => emp.department === 'Development')).toBe(true);
    });

    test('should exclude specified employees from team', () => {
      const employees = registry.findEmployeesForMultiAgentTask(
        ['testing'], 
        2, 
        { excludeIds: ['emp_001'] }
      );
      
      expect(employees.every(emp => emp.id !== 'emp_001')).toBe(true);
    });
  });

  describe('Statistics and Analytics', () => {
    test('should get system statistics', () => {
      const stats = registry.getStatistics();
      
      expect(stats).toHaveProperty('totalEmployees', 13);
      expect(stats).toHaveProperty('availableEmployees');
      expect(stats).toHaveProperty('busyEmployees');
      expect(stats).toHaveProperty('offlineEmployees');
      expect(stats).toHaveProperty('departmentBreakdown');
      expect(stats).toHaveProperty('skillDistribution');
    });

    test('should get department workload statistics', () => {
      const stats = registry.getDepartmentWorkloadStats();
      
      expect(stats).toHaveProperty('Executive');
      expect(stats).toHaveProperty('Development');
      expect(stats.Executive).toHaveProperty('avgWorkload');
      expect(stats.Executive).toHaveProperty('totalEmployees');
      expect(stats.Executive).toHaveProperty('activeEmployees');
    });
  });

  describe('Utility Methods', () => {
    test('should check employee availability', () => {
      const isAvailable = registry.isEmployeeAvailable('emp_001');
      expect(typeof isAvailable).toBe('boolean');
    });

    test('should return false for non-existent employee availability', () => {
      const isAvailable = registry.isEmployeeAvailable('emp_999');
      expect(isAvailable).toBe(false);
    });

    test('should get company info', () => {
      const companyInfo = registry.getCompanyInfo();
      expect(companyInfo).toBeDefined();
      expect(companyInfo).toHaveProperty('name');
      expect(companyInfo).toHaveProperty('mission');
      expect(companyInfo).toHaveProperty('employees_count');
    });

    test('should get system prompt path', () => {
      const path = registry.getSystemPromptPath('emp_001');
      expect(path).toBeDefined();
      expect(path).toContain('corporate-prompts');
    });

    test('should return null for non-existent employee prompt path', () => {
      const path = registry.getSystemPromptPath('emp_999');
      expect(path).toBeNull();
    });
  });

  describe('Task Management', () => {
    test('should assign and complete tasks', () => {
      registry.assignTask('emp_001', 'task-1');
      registry.assignTask('emp_001', 'task-2');
      
      const metrics1 = registry.getEmployeeMetrics('emp_001');
      expect(metrics1.currentTasks).toHaveLength(2);
      
      registry.completeTask('emp_001', 'task-1');
      
      const metrics2 = registry.getEmployeeMetrics('emp_001');
      expect(metrics2.currentTasks).toHaveLength(1);
      expect(metrics2.currentTasks).not.toContain('task-1');
    });

    test('should update performance metrics on task completion', () => {
      const initialMetrics = registry.getEmployeeMetrics('emp_001');
      const initialCompleted = initialMetrics.tasksCompleted;
      
      registry.assignTask('emp_001', 'task-1');
      registry.completeTask('emp_001', 'task-1');
      
      const updatedMetrics = registry.getEmployeeMetrics('emp_001');
      expect(updatedMetrics.tasksCompleted).toBe(initialCompleted + 1);
    });
  });

  describe('Event System', () => {
    test('should emit registry-updated event on save', () => {
      const eventSpy = vi.fn();
      registry.on('registry-updated', eventSpy);
      
      registry.updateEmployeeStatus('emp_001', 'busy');
      
      expect(eventSpy).toHaveBeenCalled();
    });

    test('should refresh registry', () => {
      const eventSpy = vi.fn();
      registry.on('registry-refreshed', eventSpy);
      
      registry.refreshRegistry();
      
      expect(eventSpy).toHaveBeenCalled();
    });
  });
});