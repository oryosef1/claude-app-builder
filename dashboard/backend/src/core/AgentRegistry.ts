import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// Using a workaround for CommonJS compatibility
const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w):/, '$1:');

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  level: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'busy' | 'maintenance' | 'offline';
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
    // Fix path to handle Hebrew characters and go up to project root
    const projectRoot = path.resolve(process.cwd(), '../..');
    this.registryPath = path.join(projectRoot, 'ai-employees/employee-registry.json');
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

  getEmployeeById(id: string): Employee | undefined {
    return this.registry.employees[id];
  }

  getEmployeesByDepartment(department: string): Employee[] {
    return Object.values(this.registry.employees).filter(emp => emp.department === department);
  }

  getEmployeesBySkill(skill: string): Employee[] {
    const lowerSkill = skill.toLowerCase();
    return Object.values(this.registry.employees).filter(emp => 
      emp.skills.some(s => s.toLowerCase() === lowerSkill)
    );
  }

  getAvailableEmployees(): Employee[] {
    return Object.values(this.registry.employees).filter(emp => 
      emp.status === 'active' && emp.workload < 80
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

  updateEmployeeWorkload(employeeId: string, workload: number): boolean {
    if (!this.registry.employees[employeeId] || 
        isNaN(workload) || 
        !isFinite(workload) || 
        workload < 0 || 
        workload > 100) {
      return false;
    }
    
    const previousWorkload = this.registry.employees[employeeId].workload;
    this.registry.employees[employeeId].workload = workload;
    this.saveRegistry();
    this.emit('workloadChanged', { 
      employeeId, 
      newWorkload: workload, 
      previousWorkload 
    });
    return true;
  }

  updateEmployeeStatus(employeeId: string, status: Employee['status']): boolean {
    if (!this.registry.employees[employeeId] || !status) {
      return false;
    }
    
    const validStatuses: Employee['status'][] = ['active', 'inactive', 'busy', 'maintenance', 'offline'];
    if (!validStatuses.includes(status)) {
      return false;
    }
    
    const previousStatus = this.registry.employees[employeeId].status;
    this.registry.employees[employeeId].status = status;
    this.saveRegistry();
    this.emit('employeeStatusChanged', { 
      employeeId, 
      newStatus: status, 
      previousStatus 
    });
    return true;
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
    return dept ? (this.getEmployeeById(dept.head) || null) : null;
  }

  getAllDepartments(): string[] {
    return Object.keys(this.registry.departments);
  }

  isEmployeeAvailable(employeeId: string): boolean {
    const employee = this.getEmployeeById(employeeId);
    return employee ? employee.status === 'active' && employee.workload < 80 : false;
  }

  currentTasks: Map<string, string[]> = new Map();

  assignTask(employeeId: string, taskId: string): void {
    if (!this.currentTasks.has(employeeId)) {
      this.currentTasks.set(employeeId, []);
    }
    const tasks = this.currentTasks.get(employeeId)!;
    if (!tasks.includes(taskId)) {
      tasks.push(taskId);
    }
  }

  completeTask(employeeId: string, taskId: string): void {
    const tasks = this.currentTasks.get(employeeId);
    if (tasks) {
      const index = tasks.indexOf(taskId);
      if (index > -1) {
        tasks.splice(index, 1);
        // Update performance metrics
        const employee = this.getEmployeeById(employeeId);
        if (employee) {
          if (!employee.performance_metrics) {
            employee.performance_metrics = {};
          }
          employee.performance_metrics['projects_completed'] = 
            (employee.performance_metrics['projects_completed'] || 0) + 1;
        }
      }
    }
  }

  getEmployeeMetrics(employeeId: string): any {
    const employee = this.getEmployeeById(employeeId);
    if (!employee) {
      return null;
    }
    
    const tasks = this.currentTasks.get(employeeId) || [];
    return {
      tasksCompleted: employee.performance_metrics?.['projects_completed'] || 0,
      averageCompletionTime: employee.performance_metrics?.['average_completion_time'] || 0,
      successRate: employee.performance_metrics?.['success_rate'] || 0,
      currentWorkload: employee.workload,
      currentTasks: tasks
    };
  }

  buildTeamForTask(requiredSkills: string[]): Employee[] {
    const availableEmployees = this.getAvailableEmployees();
    const team: Employee[] = [];
    const coveredSkills = new Set<string>();
    
    // First pass: try to cover all skills
    for (const skill of requiredSkills) {
      if (!coveredSkills.has(skill)) {
        const employeesWithSkill = availableEmployees
          .filter(emp => !team.includes(emp) && emp.skills.some(s => s.toLowerCase() === skill.toLowerCase()))
          .sort((a, b) => a.workload - b.workload);
        
        if (employeesWithSkill.length > 0) {
          const selected = employeesWithSkill[0];
          if (selected) {
            team.push(selected);
            selected.skills.forEach(s => coveredSkills.add(s.toLowerCase()));
          }
        }
      }
    }
    
    return team;
  }

  getStatistics(): any {
    const employees = this.getAllEmployees();
    const availableEmployees = employees.filter(emp => emp.status === 'active' && emp.workload < 80);
    const busyEmployees = employees.filter(emp => emp.status === 'busy');
    const offlineEmployees = employees.filter(emp => emp.status === 'offline' || emp.status === 'inactive');
    
    const departmentBreakdown: Record<string, number> = {};
    const skillDistribution: Record<string, number> = {};
    
    employees.forEach(emp => {
      departmentBreakdown[emp.department] = (departmentBreakdown[emp.department] || 0) + 1;
      emp.skills.forEach(skill => {
        skillDistribution[skill] = (skillDistribution[skill] || 0) + 1;
      });
    });
    
    return {
      totalEmployees: employees.length,
      availableEmployees: availableEmployees.length,
      busyEmployees: busyEmployees.length,
      offlineEmployees: offlineEmployees.length,
      departmentBreakdown,
      skillDistribution
    };
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