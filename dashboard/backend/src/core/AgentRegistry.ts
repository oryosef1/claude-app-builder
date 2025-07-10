import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  level: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'busy' | 'maintenance';
  skills: string[];
  system_prompt_file: string;
  current_projects: string[];
  workload: number;
  performance_metrics: {
    [key: string]: number;
  };
}

interface Department {
  head: string;
  employees: string[];
  focus: string;
}

interface EmployeeRegistry {
  company: {
    name: string;
    founded: string;
    mission: string;
    employees_count: number;
  };
  employees: { [key: string]: Employee };
  departments: { [key: string]: Department };
  last_updated: string;
}

export class AgentRegistry extends EventEmitter {
  private registry!: EmployeeRegistry;
  private registryPath: string;

  constructor() {
    super();
    this.registryPath = path.join(__dirname, '../../../../ai-employees/employee-registry.json');
    this.loadRegistry();
  }

  private loadRegistry(): void {
    try {
      const data = fs.readFileSync(this.registryPath, 'utf8');
      this.registry = JSON.parse(data);
    } catch (error) {
      console.error('Error loading employee registry:', error);
      throw new Error('Failed to load employee registry');
    }
  }

  private saveRegistry(): void {
    try {
      this.registry.last_updated = new Date().toISOString();
      fs.writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2));
      this.emit('registry-updated');
    } catch (error) {
      console.error('Error saving employee registry:', error);
      throw new Error('Failed to save employee registry');
    }
  }

  getAllEmployees(): Employee[] {
    return Object.values(this.registry.employees);
  }

  getEmployeeById(id: string): Employee | null {
    return this.registry.employees[id] || null;
  }

  getEmployeesByDepartment(department: string): Employee[] {
    return Object.values(this.registry.employees).filter(emp => emp.department === department);
  }

  getEmployeesBySkill(skill: string): Employee[] {
    return Object.values(this.registry.employees).filter(emp => 
      emp.skills.includes(skill) && emp.status === 'active'
    );
  }

  getAvailableEmployees(): Employee[] {
    return Object.values(this.registry.employees).filter(emp => 
      emp.status === 'active' && emp.workload < 100
    );
  }

  getEmployeesByRole(role: string): Employee[] {
    return Object.values(this.registry.employees).filter(emp => emp.role === role);
  }

  findBestEmployeeForTask(requiredSkills: string[], priority: 'low' | 'medium' | 'high' = 'medium'): Employee | null {
    const availableEmployees = this.getAvailableEmployees();
    
    // Score employees based on skill match and availability
    const scoredEmployees = availableEmployees.map(employee => {
      const skillMatch = requiredSkills.filter(skill => employee.skills.includes(skill)).length;
      const skillScore = skillMatch / requiredSkills.length;
      const availabilityScore = (100 - employee.workload) / 100;
      
      // Weight skill match higher for high priority tasks
      const priorityWeight = priority === 'high' ? 0.8 : priority === 'medium' ? 0.6 : 0.4;
      const totalScore = (skillScore * priorityWeight) + (availabilityScore * (1 - priorityWeight));
      
      return {
        employee,
        score: totalScore,
        skillMatch: skillScore
      };
    });

    // Sort by score (highest first) and return best match
    scoredEmployees.sort((a, b) => b.score - a.score);
    
    return scoredEmployees.length > 0 ? scoredEmployees[0]!.employee : null;
  }

  updateEmployeeWorkload(employeeId: string, workload: number): void {
    if (this.registry.employees[employeeId]) {
      this.registry.employees[employeeId].workload = Math.max(0, Math.min(100, workload));
      this.saveRegistry();
      this.emit('workload-updated', employeeId, workload);
    }
  }

  updateEmployeeStatus(employeeId: string, status: Employee['status']): void {
    if (this.registry.employees[employeeId]) {
      this.registry.employees[employeeId].status = status;
      this.saveRegistry();
      this.emit('status-updated', employeeId, status);
    }
  }

  assignProject(employeeId: string, projectId: string): void {
    if (this.registry.employees[employeeId]) {
      if (!this.registry.employees[employeeId].current_projects.includes(projectId)) {
        this.registry.employees[employeeId].current_projects.push(projectId);
        this.saveRegistry();
        this.emit('project-assigned', employeeId, projectId);
      }
    }
  }

  removeProject(employeeId: string, projectId: string): void {
    if (this.registry.employees[employeeId]) {
      const projects = this.registry.employees[employeeId].current_projects;
      const index = projects.indexOf(projectId);
      if (index > -1) {
        projects.splice(index, 1);
        this.saveRegistry();
        this.emit('project-removed', employeeId, projectId);
      }
    }
  }

  updatePerformanceMetric(employeeId: string, metric: string, value: number): void {
    if (this.registry.employees[employeeId]) {
      this.registry.employees[employeeId].performance_metrics[metric] = value;
      this.saveRegistry();
      this.emit('performance-updated', employeeId, metric, value);
    }
  }

  getDepartments(): { [key: string]: Department } {
    return this.registry.departments;
  }

  getDepartmentHead(department: string): Employee | null {
    const dept = this.registry.departments[department];
    return dept ? this.getEmployeeById(dept.head) : null;
  }

  getCompanyInfo() {
    return this.registry.company;
  }

  getSystemPromptPath(employeeId: string): string | null {
    const employee = this.getEmployeeById(employeeId);
    return employee ? path.join(__dirname, '../../../../', employee.system_prompt_file) : null;
  }

  // Advanced skill matching with weighted preferences
  findEmployeesForMultiAgentTask(
    requiredSkills: string[], 
    teamSize: number, 
    preferences: { department?: string; level?: string; excludeIds?: string[] } = {}
  ): Employee[] {
    let candidates = this.getAvailableEmployees();
    
    // Apply filters
    if (preferences.department) {
      candidates = candidates.filter(emp => emp.department === preferences.department);
    }
    if (preferences.level) {
      candidates = candidates.filter(emp => emp.level === preferences.level);
    }
    if (preferences.excludeIds) {
      candidates = candidates.filter(emp => !preferences.excludeIds!.includes(emp.id));
    }

    // Score and sort candidates
    const scoredCandidates = candidates.map(employee => {
      const skillMatch = requiredSkills.filter(skill => employee.skills.includes(skill)).length;
      const skillScore = skillMatch / requiredSkills.length;
      const availabilityScore = (100 - employee.workload) / 100;
      const totalScore = (skillScore * 0.7) + (availabilityScore * 0.3);
      
      return { employee, score: totalScore };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);
    
    return scoredCandidates.slice(0, teamSize).map(item => item.employee);
  }

  // Get workload distribution across departments
  getDepartmentWorkloadStats(): { [department: string]: { avgWorkload: number; totalEmployees: number; activeEmployees: number } } {
    const stats: { [department: string]: { avgWorkload: number; totalEmployees: number; activeEmployees: number } } = {};
    
    Object.keys(this.registry.departments).forEach(deptName => {
      const deptEmployees = this.getEmployeesByDepartment(deptName);
      const activeEmployees = deptEmployees.filter(emp => emp.status === 'active');
      const totalWorkload = activeEmployees.reduce((sum, emp) => sum + emp.workload, 0);
      
      stats[deptName] = {
        avgWorkload: activeEmployees.length > 0 ? totalWorkload / activeEmployees.length : 0,
        totalEmployees: deptEmployees.length,
        activeEmployees: activeEmployees.length
      };
    });
    
    return stats;
  }

  // Refresh registry from file (for external updates)
  refreshRegistry(): void {
    this.loadRegistry();
    this.emit('registry-refreshed');
  }
}