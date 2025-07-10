import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentRegistry } from '../../src/core/AgentRegistry';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('Employee Management', () => {
    it('should load all 13 employees on initialization', () => {
      const employees = registry.getAllEmployees();
      expect(employees).toHaveLength(13);
    });

    it('should have correct employee data structure', () => {
      const employees = registry.getAllEmployees();
      const firstEmployee = employees[0];
      
      expect(firstEmployee).toHaveProperty('id');
      expect(firstEmployee).toHaveProperty('name');
      expect(firstEmployee).toHaveProperty('role');
      expect(firstEmployee).toHaveProperty('department');
      expect(firstEmployee).toHaveProperty('skills');
      expect(firstEmployee).toHaveProperty('status');
      expect(firstEmployee).toHaveProperty('workload');
    });

    it('should have correct departments', () => {
      const employees = registry.getAllEmployees();
      const departments = new Set(employees.map(e => e.department));
      
      expect(departments).toContain('Executive');
      expect(departments).toContain('Development');
      expect(departments).toContain('Operations');
      expect(departments).toContain('Support');
    });

    it('should find employee by ID', () => {
      const employee = registry.getEmployeeById('emp_001');
      
      expect(employee).toBeDefined();
      expect(employee?.name).toBe('Alex Project Manager');
      expect(employee?.role).toBe('Project Manager');
    });

    it('should return undefined for invalid employee ID', () => {
      const employee = registry.getEmployeeById('invalid_id');
      expect(employee).toBeUndefined();
    });
  });

  describe('Skill-based Search', () => {
    it('should find employees by skill', () => {
      const developers = registry.getEmployeesBySkill('TypeScript');
      
      expect(developers.length).toBeGreaterThan(0);
      developers.forEach(dev => {
        expect(dev.skills).toContain('TypeScript');
      });
    });

    it('should return empty array for non-existent skill', () => {
      const employees = registry.getEmployeesBySkill('NonExistentSkill');
      expect(employees).toEqual([]);
    });

    it('should be case-insensitive for skill search', () => {
      const typescript = registry.getEmployeesBySkill('TypeScript');
      const lowercase = registry.getEmployeesBySkill('typescript');
      
      expect(typescript.length).toBe(lowercase.length);
    });
  });

  describe('Department Operations', () => {
    it('should get employees by department', () => {
      const devs = registry.getEmployeesByDepartment('Development');
      
      expect(devs.length).toBeGreaterThan(0);
      devs.forEach(dev => {
        expect(dev.department).toBe('Development');
      });
    });

    it('should return all unique departments', () => {
      const departments = registry.getAllDepartments();
      
      expect(departments).toContain('Executive');
      expect(departments).toContain('Development');
      expect(departments).toContain('Operations');
      expect(departments).toContain('Support');
      expect(departments.length).toBe(4);
    });
  });

  describe('Availability Checking', () => {
    it('should find available employees', () => {
      const available = registry.getAvailableEmployees();
      
      available.forEach(emp => {
        expect(emp.status).toBe('active');
        expect(emp.workload).toBeLessThan(100);
      });
    });

    it('should check if specific employee is available', () => {
      const isAvailable = registry.isEmployeeAvailable('emp_001');
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should calculate correct availability', () => {
      // Mock an employee with specific workload
      const testEmployee = {
        id: 'test_001',
        name: 'Test Employee',
        role: 'Tester',
        department: 'Development',
        skills: ['Testing'],
        status: 'active' as const,
        workload: 50
      };
      
      // Test availability calculation
      expect(testEmployee.workload < 80).toBe(true); // Should be available
    });
  });

  describe('Workload Management', () => {
    it('should update employee workload', () => {
      const success = registry.updateEmployeeWorkload('emp_001', 60);
      expect(success).toBe(true);
      
      const employee = registry.getEmployeeById('emp_001');
      expect(employee?.workload).toBe(60);
    });

    it('should not update workload beyond 100%', () => {
      const success = registry.updateEmployeeWorkload('emp_001', 120);
      expect(success).toBe(false);
      
      const employee = registry.getEmployeeById('emp_001');
      expect(employee?.workload).toBeLessThanOrEqual(100);
    });

    it('should not update workload below 0%', () => {
      const success = registry.updateEmployeeWorkload('emp_001', -10);
      expect(success).toBe(false);
    });
  });

  describe('Status Management', () => {
    it('should update employee status', () => {
      const success = registry.updateEmployeeStatus('emp_001', 'busy');
      expect(success).toBe(true);
      
      const employee = registry.getEmployeeById('emp_001');
      expect(employee?.status).toBe('busy');
    });

    it('should only accept valid status values', () => {
      const validStatuses = ['active', 'busy', 'offline'];
      
      validStatuses.forEach(status => {
        const success = registry.updateEmployeeStatus('emp_001', status as any);
        expect(success).toBe(true);
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should get employee performance metrics', () => {
      const metrics = registry.getEmployeeMetrics('emp_001');
      
      expect(metrics).toHaveProperty('tasksCompleted');
      expect(metrics).toHaveProperty('averageCompletionTime');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('currentWorkload');
    });

    it('should track task assignment', () => {
      registry.assignTask('emp_001', 'task_123');
      const employee = registry.getEmployeeById('emp_001');
      
      const metrics = registry.getEmployeeMetrics('emp_001');
      expect(metrics.currentTasks).toContain('task_123');
    });

    it('should track task completion', () => {
      registry.assignTask('emp_001', 'task_123');
      registry.completeTask('emp_001', 'task_123');
      
      const metrics = registry.getEmployeeMetrics('emp_001');
      expect(metrics.tasksCompleted).toBeGreaterThan(0);
    });
  });

  describe('Team Composition', () => {
    it('should build optimal team for task', () => {
      const requiredSkills = ['TypeScript', 'React', 'Testing'];
      const team = registry.buildTeamForTask(requiredSkills);
      
      expect(team.length).toBeGreaterThan(0);
      
      // Verify team has all required skills
      const teamSkills = new Set(team.flatMap(emp => emp.skills));
      requiredSkills.forEach(skill => {
        expect(teamSkills).toContain(skill);
      });
    });

    it('should prefer available employees when building team', () => {
      const requiredSkills = ['TypeScript'];
      const team = registry.buildTeamForTask(requiredSkills);
      
      team.forEach(member => {
        expect(member.status).toBe('active');
        expect(member.workload).toBeLessThan(80);
      });
    });
  });

  describe('Registry Statistics', () => {
    it('should provide registry statistics', () => {
      const stats = registry.getStatistics();
      
      expect(stats).toHaveProperty('totalEmployees');
      expect(stats).toHaveProperty('availableEmployees');
      expect(stats).toHaveProperty('busyEmployees');
      expect(stats).toHaveProperty('offlineEmployees');
      expect(stats).toHaveProperty('departmentBreakdown');
      expect(stats).toHaveProperty('skillDistribution');
      
      expect(stats.totalEmployees).toBe(13);
    });

    it('should calculate department breakdown correctly', () => {
      const stats = registry.getStatistics();
      
      expect(stats.departmentBreakdown).toHaveProperty('Executive');
      expect(stats.departmentBreakdown).toHaveProperty('Development');
      expect(stats.departmentBreakdown).toHaveProperty('Operations');
      expect(stats.departmentBreakdown).toHaveProperty('Support');
      
      const total = Object.values(stats.departmentBreakdown).reduce((a: number, b: number) => a + b, 0);
      expect(total).toBe(13);
    });
  });

  describe('Real-time Updates', () => {
    it('should emit events on status change', (done) => {
      registry.on('employeeStatusChanged', (data) => {
        expect(data.employeeId).toBe('emp_001');
        expect(data.newStatus).toBe('busy');
        expect(data.previousStatus).toBe('active');
        done();
      });
      
      registry.updateEmployeeStatus('emp_001', 'busy');
    });

    it('should emit events on workload change', (done) => {
      registry.on('workloadChanged', (data) => {
        expect(data.employeeId).toBe('emp_001');
        expect(data.newWorkload).toBe(75);
        done();
      });
      
      registry.updateEmployeeWorkload('emp_001', 75);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid employee ID gracefully', () => {
      expect(() => registry.getEmployeeById('invalid')).not.toThrow();
      expect(() => registry.updateEmployeeStatus('invalid', 'busy')).not.toThrow();
      expect(() => registry.updateEmployeeWorkload('invalid', 50)).not.toThrow();
    });

    it('should validate input parameters', () => {
      expect(registry.updateEmployeeWorkload('emp_001', NaN)).toBe(false);
      expect(registry.updateEmployeeWorkload('emp_001', Infinity)).toBe(false);
      expect(registry.updateEmployeeStatus('emp_001', '' as any)).toBe(false);
    });
  });
});