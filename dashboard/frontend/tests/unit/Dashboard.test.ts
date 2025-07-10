import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Dashboard from '@/views/Dashboard.vue';
import { createPinia, setActivePinia } from 'pinia';

// Mock API responses
const mockEmployees = [
  {
    id: 'emp_001',
    name: 'Alex Project Manager',
    role: 'Project Manager',
    department: 'Executive',
    availability: 'available',
    skills: ['Project Management'],
    currentTasks: 2,
    maxTasks: 5,
    performanceScore: 92
  },
  {
    id: 'emp_004',
    name: 'Sam Senior Developer',
    role: 'Senior Developer',
    department: 'Development',
    availability: 'busy',
    skills: ['JavaScript', 'TypeScript'],
    currentTasks: 4,
    maxTasks: 5,
    performanceScore: 88
  }
];

const mockTasks = [
  {
    id: 'task_001',
    title: 'Implement authentication',
    priority: 'high',
    status: 'pending',
    skillsRequired: ['Node.js']
  }
];

// Mock fetch
global.fetch = vi.fn();

describe('Dashboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    
    // Setup default fetch responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/employees')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockEmployees })
        });
      }
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockTasks })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });
    });
  });

  describe('Initial Load', () => {
    it('should load employees and tasks on mount', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/employees'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks'),
        expect.any(Object)
      );
    });

    it('should display loading state initially', () => {
      const wrapper = mount(Dashboard);
      
      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
    });

    it('should display data after loading', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      expect(wrapper.find('.loading-spinner').exists()).toBe(false);
      expect(wrapper.text()).toContain('Alex Project Manager');
      expect(wrapper.text()).toContain('Implement authentication');
    });
  });

  describe('Statistics Display', () => {
    it('should show team statistics', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      const stats = wrapper.find('[data-testid="team-stats"]');
      expect(stats.exists()).toBe(true);
      expect(stats.text()).toContain('Total Employees: 2');
      expect(stats.text()).toContain('Available: 1');
      expect(stats.text()).toContain('Busy: 1');
    });

    it('should show task statistics', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      const taskStats = wrapper.find('[data-testid="task-stats"]');
      expect(taskStats.exists()).toBe(true);
      expect(taskStats.text()).toContain('Pending Tasks: 1');
    });

    it('should calculate department breakdown', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      const deptStats = wrapper.find('[data-testid="dept-stats"]');
      expect(deptStats.text()).toContain('Executive: 1');
      expect(deptStats.text()).toContain('Development: 1');
    });
  });

  describe('Task Assignment', () => {
    it('should open assignment modal when task is selected', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      const taskItem = wrapper.find('[data-testid="task-item"]');
      await taskItem.trigger('click');

      const modal = wrapper.find('[data-testid="assignment-modal"]');
      expect(modal.exists()).toBe(true);
    });

    it('should show suitable employees for task', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      const assignBtn = wrapper.find('[data-testid="assign-task-btn"]');
      await assignBtn.trigger('click');

      const employeeOptions = wrapper.findAll('[data-testid="employee-option"]');
      expect(employeeOptions.length).toBeGreaterThan(0);
    });

    it('should assign task to selected employee', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      // Mock assignment API
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      );

      const assignBtn = wrapper.find('[data-testid="quick-assign-btn"]');
      await assignBtn.trigger('click');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/task_001/assign'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('Real-time Updates', () => {
    it('should connect to WebSocket on mount', async () => {
      const mockSocket = {
        on: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn()
      };
      
      // Mock socket.io
      (global as any).io = vi.fn(() => mockSocket);
      
      const wrapper = mount(Dashboard);
      await flushPromises();

      expect((global as any).io).toHaveBeenCalled();
      expect(mockSocket.on).toHaveBeenCalledWith('employee-update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('task-update', expect.any(Function));
    });

    it('should update employee status on WebSocket event', async () => {
      const mockSocket = {
        on: vi.fn((event, handler) => {
          if (event === 'employee-update') {
            setTimeout(() => {
              handler({
                employeeId: 'emp_001',
                changes: { availability: 'busy' }
              });
            }, 100);
          }
        }),
        emit: vi.fn(),
        disconnect: vi.fn()
      };
      
      (global as any).io = vi.fn(() => mockSocket);
      
      const wrapper = mount(Dashboard);
      await flushPromises();
      await new Promise(resolve => setTimeout(resolve, 150));

      const employee = wrapper.find('[data-testid="employee-emp_001"]');
      expect(employee.find('.status-busy').exists()).toBe(true);
    });
  });

  describe('Filtering and Search', () => {
    it('should filter employees by department', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      const deptFilter = wrapper.find('[data-testid="dept-filter"]');
      await deptFilter.setValue('Development');

      const visibleEmployees = wrapper.findAll('[data-testid^="employee-"]:not(.hidden)');
      expect(visibleEmployees).toHaveLength(1);
      expect(visibleEmployees[0].text()).toContain('Sam Senior Developer');
    });

    it('should search employees by name', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      const searchInput = wrapper.find('[data-testid="employee-search"]');
      await searchInput.setValue('Alex');

      const visibleEmployees = wrapper.findAll('[data-testid^="employee-"]:not(.hidden)');
      expect(visibleEmployees).toHaveLength(1);
      expect(visibleEmployees[0].text()).toContain('Alex Project Manager');
    });

    it('should filter tasks by status', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      const statusFilter = wrapper.find('[data-testid="task-status-filter"]');
      await statusFilter.setValue('pending');

      const visibleTasks = wrapper.findAll('[data-testid^="task-"]:not(.hidden)');
      expect(visibleTasks).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should show error when API fails', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Internal Server Error'
        })
      );

      const wrapper = mount(Dashboard);
      await flushPromises();

      expect(wrapper.find('.error-message').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load');
    });

    it('should allow retry on error', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      );

      const wrapper = mount(Dashboard);
      await flushPromises();

      const retryBtn = wrapper.find('[data-testid="retry-btn"]');
      expect(retryBtn.exists()).toBe(true);

      // Mock successful retry
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/employees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockEmployees })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] })
        });
      });

      await retryBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.error-message').exists()).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      const wrapper = mount(Dashboard);
      await flushPromises();

      const searchInput = wrapper.find('[data-testid="employee-search"]');
      
      // Type quickly
      await searchInput.setValue('A');
      await searchInput.setValue('Al');
      await searchInput.setValue('Ale');
      await searchInput.setValue('Alex');

      // Should only trigger one search after debounce
      await new Promise(resolve => setTimeout(resolve, 350));
      
      const visibleEmployees = wrapper.findAll('[data-testid^="employee-"]:not(.hidden)');
      expect(visibleEmployees).toHaveLength(1);
    });

    it('should paginate large employee lists', async () => {
      // Mock many employees
      const manyEmployees = Array.from({ length: 50 }, (_, i) => ({
        ...mockEmployees[0],
        id: `emp_${i}`,
        name: `Employee ${i}`
      }));

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/employees')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: manyEmployees })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] })
        });
      });

      const wrapper = mount(Dashboard);
      await flushPromises();

      const pagination = wrapper.find('[data-testid="pagination"]');
      expect(pagination.exists()).toBe(true);
      
      const employeeCards = wrapper.findAll('[data-testid^="employee-"]');
      expect(employeeCards.length).toBeLessThanOrEqual(20); // Default page size
    });
  });
});