export interface Employee {
  id: string;
  name: string;
  role: string;
  department: 'Executive' | 'Development' | 'Operations' | 'Support';
  level: 'Junior' | 'Mid' | 'Senior';
  hire_date: string;
  status: 'active' | 'busy' | 'offline';
  skills: string[];
  system_prompt_file: string;
  current_projects: string[];
  workload: number; // 0-100 percentage
  performance_metrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
  [key: string]: number;
}

export interface Department {
  name: string;
  head: string;
  employees: string[];
  focus: string;
}

export interface TaskAssignment {
  id?: string;
  employeeId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours?: number;
  skills_required?: string[];
  deadline?: string;
  created_at?: string;
  assigned_by?: string;
}

export interface EmployeeRegistry {
  company: {
    name: string;
    founded: string;
    mission: string;
    employees_count: number;
  };
  employees: Record<string, Employee>;
  departments: Record<string, Department>;
  last_updated: string;
}

export interface EmployeeStatus {
  id: string;
  status: Employee['status'];
  workload: number;
  current_task?: string;
  last_activity: string;
  response_time?: number;
}

export interface EmployeePerformanceReport {
  employee_id: string;
  period: {
    start: string;
    end: string;
  };
  metrics: PerformanceMetrics;
  tasks_completed: number;
  average_completion_time: number;
  quality_score: number;
  collaboration_score: number;
  growth_areas: string[];
  achievements: string[];
}

export type EmployeeFilter = {
  department?: string;
  status?: string;
  level?: string;
  skills?: string[];
  workload_min?: number;
  workload_max?: number;
}

export type EmployeeSortOption = 
  | 'name'
  | 'department'
  | 'workload'
  | 'performance'
  | 'hire_date'
  | 'status';

export interface DepartmentStats {
  name: string;
  total_employees: number;
  active_employees: number;
  average_workload: number;
  total_projects: number;
  performance_average: number;
}