import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Employee, TaskAssignment, EmployeeStatus, EmployeeFilter, EmployeeSortOption, DepartmentStats } from '@/types/employee';
import { employeeService } from '@/services/employees';

interface EmployeeStore {
  // State
  employees: Employee[];
  selectedEmployee: Employee | null;
  departmentStats: DepartmentStats[];
  employeeStatuses: Record<string, EmployeeStatus>;
  filters: EmployeeFilter;
  sortBy: EmployeeSortOption;
  sortOrder: 'asc' | 'desc';
  loading: boolean;
  error: string | null;
  
  // UI State
  showEmployeeModal: boolean;
  showTaskAssignmentModal: boolean;
  assignmentFormData: Partial<TaskAssignment>;
  
  // Actions
  loadEmployees: () => Promise<void>;
  selectEmployee: (employee: Employee | null) => void;
  assignTask: (assignment: TaskAssignment) => Promise<boolean>;
  updateFilters: (filters: Partial<EmployeeFilter>) => void;
  setSorting: (sortBy: EmployeeSortOption, order?: 'asc' | 'desc') => void;
  refreshEmployeeStatus: (employeeId: string) => Promise<void>;
  refreshAllStatuses: () => Promise<void>;
  loadDepartmentStats: () => Promise<void>;
  
  // Modal Actions
  openEmployeeModal: (employee: Employee) => void;
  closeEmployeeModal: () => void;
  openTaskAssignmentModal: (employeeId?: string) => void;
  closeTaskAssignmentModal: () => void;
  updateAssignmentForm: (data: Partial<TaskAssignment>) => void;
  
  // Computed getters
  getFilteredEmployees: () => Employee[];
  getEmployeesByDepartment: (department: string) => Employee[];
  getAvailableEmployees: () => Employee[];
  getBusyEmployees: () => Employee[];
  getEmployeesBySkill: (skill: string) => Employee[];
}

export const useEmployeeStore = create<EmployeeStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      employees: [],
      selectedEmployee: null,
      departmentStats: [],
      employeeStatuses: {},
      filters: {},
      sortBy: 'name',
      sortOrder: 'asc',
      loading: false,
      error: null,
      
      // UI State
      showEmployeeModal: false,
      showTaskAssignmentModal: false,
      assignmentFormData: {},
      
      // Actions
      loadEmployees: async () => {
        set({ loading: true, error: null });
        try {
          const employees = await employeeService.getEmployees();
          set({ employees, loading: false });
          
          // Load initial statuses
          get().refreshAllStatuses();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load employees',
            loading: false 
          });
        }
      },
      
      selectEmployee: (employee) => {
        set({ selectedEmployee: employee });
      },
      
      assignTask: async (assignment) => {
        try {
          const success = await employeeService.assignTask(assignment);
          if (success) {
            // Refresh employee data to reflect new assignment
            const updatedEmployees = get().employees.map(emp => {
              if (emp.id === assignment.employeeId) {
                return {
                  ...emp,
                  current_projects: [...emp.current_projects, assignment.title],
                  workload: Math.min(100, emp.workload + (assignment.estimatedHours || 8))
                };
              }
              return emp;
            });
            
            set({ employees: updatedEmployees });
            get().refreshEmployeeStatus(assignment.employeeId);
          }
          return success;
        } catch (error) {
          console.error('Task assignment failed:', error);
          return false;
        }
      },
      
      updateFilters: (newFilters) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters }
        }));
      },
      
      setSorting: (sortBy, order) => {
        const currentOrder = get().sortOrder;
        const newOrder = order || (get().sortBy === sortBy && currentOrder === 'asc' ? 'desc' : 'asc');
        set({ sortBy, sortOrder: newOrder });
      },
      
      refreshEmployeeStatus: async (employeeId) => {
        try {
          const status = await employeeService.getEmployeeStatus(employeeId);
          if (status) {
            set(state => ({
              employeeStatuses: {
                ...state.employeeStatuses,
                [employeeId]: status
              }
            }));
          }
        } catch (error) {
          console.error(`Failed to refresh status for ${employeeId}:`, error);
        }
      },
      
      refreshAllStatuses: async () => {
        const { employees } = get();
        const statusPromises = employees.map(emp => 
          employeeService.getEmployeeStatus(emp.id)
        );
        
        try {
          const statuses = await Promise.all(statusPromises);
          const statusMap: Record<string, EmployeeStatus> = {};
          
          statuses.forEach((status, index) => {
            if (status) {
              statusMap[employees[index].id] = status;
            }
          });
          
          set({ employeeStatuses: statusMap });
        } catch (error) {
          console.error('Failed to refresh all statuses:', error);
        }
      },
      
      loadDepartmentStats: async () => {
        try {
          const stats = await employeeService.getDepartmentStats();
          set({ departmentStats: stats });
        } catch (error) {
          console.error('Failed to load department stats:', error);
        }
      },
      
      // Modal Actions
      openEmployeeModal: (employee) => {
        set({ 
          selectedEmployee: employee, 
          showEmployeeModal: true 
        });
      },
      
      closeEmployeeModal: () => {
        set({ 
          showEmployeeModal: false,
          selectedEmployee: null 
        });
      },
      
      openTaskAssignmentModal: (employeeId) => {
        set({ 
          showTaskAssignmentModal: true,
          assignmentFormData: employeeId ? { employeeId } : {}
        });
      },
      
      closeTaskAssignmentModal: () => {
        set({ 
          showTaskAssignmentModal: false,
          assignmentFormData: {}
        });
      },
      
      updateAssignmentForm: (data) => {
        set(state => ({
          assignmentFormData: { ...state.assignmentFormData, ...data }
        }));
      },
      
      // Computed getters
      getFilteredEmployees: () => {
        const { employees, filters, sortBy, sortOrder } = get();
        let filtered = [...employees];
        
        // Apply filters
        if (filters.department) {
          filtered = filtered.filter(emp => emp.department === filters.department);
        }
        
        if (filters.status) {
          filtered = filtered.filter(emp => emp.status === filters.status);
        }
        
        if (filters.level) {
          filtered = filtered.filter(emp => emp.level === filters.level);
        }
        
        if (filters.skills && filters.skills.length > 0) {
          filtered = filtered.filter(emp => 
            filters.skills!.some(skill => emp.skills.includes(skill))
          );
        }
        
        if (filters.workload_min !== undefined) {
          filtered = filtered.filter(emp => emp.workload >= filters.workload_min!);
        }
        
        if (filters.workload_max !== undefined) {
          filtered = filtered.filter(emp => emp.workload <= filters.workload_max!);
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
          let aValue: any;
          let bValue: any;
          
          switch (sortBy) {
            case 'name':
              aValue = a.name;
              bValue = b.name;
              break;
            case 'department':
              aValue = a.department;
              bValue = b.department;
              break;
            case 'workload':
              aValue = a.workload;
              bValue = b.workload;
              break;
            case 'performance':
              aValue = Object.values(a.performance_metrics)[0] || 0;
              bValue = Object.values(b.performance_metrics)[0] || 0;
              break;
            case 'hire_date':
              aValue = new Date(a.hire_date);
              bValue = new Date(b.hire_date);
              break;
            case 'status':
              aValue = a.status;
              bValue = b.status;
              break;
            default:
              aValue = a.name;
              bValue = b.name;
          }
          
          if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }
          
          let comparison = 0;
          if (aValue > bValue) comparison = 1;
          if (aValue < bValue) comparison = -1;
          
          return sortOrder === 'desc' ? -comparison : comparison;
        });
        
        return filtered;
      },
      
      getEmployeesByDepartment: (department) => {
        const { employees } = get();
        return employees.filter(emp => emp.department === department);
      },
      
      getAvailableEmployees: () => {
        const { employees } = get();
        return employees.filter(emp => emp.status === 'active' && emp.workload < 80);
      },
      
      getBusyEmployees: () => {
        const { employees } = get();
        return employees.filter(emp => emp.status === 'busy' || emp.workload >= 80);
      },
      
      getEmployeesBySkill: (skill) => {
        const { employees } = get();
        return employees.filter(emp => emp.skills.includes(skill));
      }
    }),
    {
      name: 'employee-store'
    }
  )
);