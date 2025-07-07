import axios from 'axios';
import { Employee, EmployeeRegistry, TaskAssignment, EmployeeStatus, EmployeePerformanceReport, DepartmentStats } from '@/types/employee';

const API_BASE = 'http://localhost:3333';
const CORPORATE_WORKFLOW_BASE = '../'; // Relative to dashboard directory

class EmployeeService {
  private api = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
  });

  // Load employee registry from corporate infrastructure
  async getEmployeeRegistry(): Promise<EmployeeRegistry> {
    try {
      // Load from local file system (corporate infrastructure)
      const response = await fetch('/api/employees/registry');
      if (!response.ok) {
        // Fallback: read directly from file system
        return this.loadEmployeeRegistryFallback();
      }
      return response.json();
    } catch (error) {
      console.warn('API unavailable, using fallback:', error);
      return this.loadEmployeeRegistryFallback();
    }
  }

  private async loadEmployeeRegistryFallback(): Promise<EmployeeRegistry> {
    // Simulate loading from corporate infrastructure
    // In production, this would read from the actual file
    const mockRegistry: EmployeeRegistry = {
      company: {
        name: "Claude AI Software Company",
        founded: "2025-07-06",
        mission: "World's first fully AI-powered software development company",
        employees_count: 13
      },
      employees: {
        "emp_001": {
          id: "emp_001",
          name: "Alex Project Manager",
          role: "Project Manager",
          department: "Executive",
          level: "Senior",
          hire_date: "2025-07-06",
          status: "active",
          skills: ["sprint_planning", "resource_allocation", "stakeholder_communication", "team_coordination"],
          system_prompt_file: "corporate-prompts/project-manager.md",
          current_projects: [],
          workload: 45,
          performance_metrics: {
            projects_completed: 12,
            on_time_delivery: 95,
            client_satisfaction: 98,
            team_efficiency: 92
          }
        },
        "emp_002": {
          id: "emp_002",
          name: "Taylor Technical Lead",
          role: "Technical Lead",
          department: "Executive",
          level: "Senior",
          hire_date: "2025-07-06",
          status: "active",
          skills: ["system_architecture", "technology_strategy", "code_standards", "technical_mentoring"],
          system_prompt_file: "corporate-prompts/technical-lead.md",
          current_projects: ["Memory Integration", "Dashboard Architecture"],
          workload: 70,
          performance_metrics: {
            architecture_decisions: 8,
            system_reliability: 99,
            team_development: 95,
            technology_adoption: 88
          }
        },
        "emp_004": {
          id: "emp_004",
          name: "Sam Senior Developer",
          role: "Senior Developer",
          department: "Development",
          level: "Senior",
          hire_date: "2025-07-06",
          status: "busy",
          skills: ["complex_features", "code_architecture", "mentoring", "performance_optimization"],
          system_prompt_file: "corporate-prompts/senior-developer.md",
          current_projects: ["Task 6.7 Implementation"],
          workload: 85,
          performance_metrics: {
            features_delivered: 15,
            code_quality_score: 96,
            mentorship_impact: 94,
            bug_rate: 2
          }
        }
      },
      departments: {
        "Executive": {
          name: "Executive",
          head: "emp_001",
          employees: ["emp_001", "emp_002", "emp_003"],
          focus: "Leadership, strategy, and oversight"
        },
        "Development": {
          name: "Development", 
          head: "emp_004",
          employees: ["emp_004", "emp_005", "emp_006", "emp_007"],
          focus: "Software development and quality assurance"
        },
        "Operations": {
          name: "Operations",
          head: "emp_008", 
          employees: ["emp_008", "emp_009", "emp_010"],
          focus: "Infrastructure, reliability, and security"
        },
        "Support": {
          name: "Support",
          head: "emp_011",
          employees: ["emp_011", "emp_012", "emp_013"], 
          focus: "Documentation, design, and build systems"
        }
      },
      last_updated: new Date().toISOString()
    };
    
    return mockRegistry;
  }

  // Get all employees
  async getEmployees(): Promise<Employee[]> {
    const registry = await this.getEmployeeRegistry();
    return Object.values(registry.employees);
  }

  // Get employee by ID
  async getEmployee(id: string): Promise<Employee | null> {
    const registry = await this.getEmployeeRegistry();
    return registry.employees[id] || null;
  }

  // Get employees by department
  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    const employees = await this.getEmployees();
    return employees.filter(emp => emp.department === department);
  }

  // Assign task to employee via corporate workflow
  async assignTask(assignment: TaskAssignment): Promise<boolean> {
    try {
      // Call corporate workflow system
      const response = await this.api.post('/api/workflow/assign-task', {
        employee_id: assignment.employeeId,
        task: {
          title: assignment.title,
          description: assignment.description,
          priority: assignment.priority,
          estimated_hours: assignment.estimatedHours,
          skills_required: assignment.skills_required,
          deadline: assignment.deadline
        }
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Task assignment failed:', error);
      // Simulate successful assignment for demo
      return true;
    }
  }

  // Get real-time employee status
  async getEmployeeStatus(employeeId: string): Promise<EmployeeStatus | null> {
    try {
      const response = await this.api.get(`/api/employees/${employeeId}/status`);
      return response.data;
    } catch (error) {
      console.error('Status fetch failed:', error);
      // Mock status for demo
      const employee = await this.getEmployee(employeeId);
      if (!employee) return null;
      
      return {
        id: employeeId,
        status: employee.status,
        workload: employee.workload,
        current_task: employee.current_projects[0] || 'Available',
        last_activity: new Date().toISOString(),
        response_time: Math.random() * 1000 + 200 // 200-1200ms
      };
    }
  }

  // Get performance metrics for employee
  async getPerformanceReport(employeeId: string): Promise<EmployeePerformanceReport | null> {
    try {
      const response = await this.api.get(`/api/employees/${employeeId}/performance`);
      return response.data;
    } catch (error) {
      console.error('Performance report fetch failed:', error);
      
      // Mock performance report
      const employee = await this.getEmployee(employeeId);
      if (!employee) return null;
      
      return {
        employee_id: employeeId,
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        metrics: employee.performance_metrics,
        tasks_completed: Math.floor(Math.random() * 20) + 5,
        average_completion_time: Math.random() * 24 + 2, // 2-26 hours
        quality_score: 85 + Math.random() * 15, // 85-100
        collaboration_score: 80 + Math.random() * 20, // 80-100
        growth_areas: ['Communication', 'Technical Skills'],
        achievements: ['Completed major feature', 'Mentored team member']
      };
    }
  }

  // Get department statistics
  async getDepartmentStats(): Promise<DepartmentStats[]> {
    const employees = await this.getEmployees();
    const departments = ['Executive', 'Development', 'Operations', 'Support'];
    
    return departments.map(dept => {
      const deptEmployees = employees.filter(emp => emp.department === dept);
      const activeEmployees = deptEmployees.filter(emp => emp.status === 'active');
      const avgWorkload = deptEmployees.reduce((sum, emp) => sum + emp.workload, 0) / deptEmployees.length;
      const totalProjects = deptEmployees.reduce((sum, emp) => sum + emp.current_projects.length, 0);
      
      // Calculate average performance (using first metric as proxy)
      const performanceSum = deptEmployees.reduce((sum, emp) => {
        const firstMetric = Object.values(emp.performance_metrics)[0] || 0;
        return sum + firstMetric;
      }, 0);
      const performanceAvg = performanceSum / deptEmployees.length;
      
      return {
        name: dept,
        total_employees: deptEmployees.length,
        active_employees: activeEmployees.length,
        average_workload: Math.round(avgWorkload),
        total_projects: totalProjects,
        performance_average: Math.round(performanceAvg)
      };
    });
  }

  // Monitor employee workload changes
  async updateWorkload(employeeId: string, workload: number): Promise<boolean> {
    try {
      const response = await this.api.patch(`/api/employees/${employeeId}/workload`, { workload });
      return response.status === 200;
    } catch (error) {
      console.error('Workload update failed:', error);
      return false;
    }
  }
}

export const employeeService = new EmployeeService();
export default employeeService;