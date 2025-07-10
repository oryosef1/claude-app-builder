import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import EmployeeCard from '@/components/EmployeeCard.vue';

describe('EmployeeCard', () => {
  const mockEmployee = {
    id: 'emp_001',
    name: 'Alex Project Manager',
    role: 'Project Manager',
    department: 'Executive',
    availability: 'available',
    skills: ['Project Management', 'Agile', 'Communication'],
    currentTasks: 2,
    maxTasks: 5,
    performanceScore: 92
  };

  describe('Rendering', () => {
    it('should render employee information', () => {
      const wrapper = mount(EmployeeCard, {
        props: { employee: mockEmployee }
      });

      expect(wrapper.text()).toContain('Alex Project Manager');
      expect(wrapper.text()).toContain('Project Manager');
      expect(wrapper.text()).toContain('Executive');
    });

    it('should display availability status', () => {
      const wrapper = mount(EmployeeCard, {
        props: { employee: mockEmployee }
      });

      const statusElement = wrapper.find('[data-testid="availability-status"]');
      expect(statusElement.exists()).toBe(true);
      expect(statusElement.classes()).toContain('status-available');
    });

    it('should show task progress', () => {
      const wrapper = mount(EmployeeCard, {
        props: { employee: mockEmployee }
      });

      expect(wrapper.text()).toContain('2/5');
      const progressBar = wrapper.find('[data-testid="task-progress"]');
      expect(progressBar.exists()).toBe(true);
    });

    it('should display performance score', () => {
      const wrapper = mount(EmployeeCard, {
        props: { employee: mockEmployee }
      });

      expect(wrapper.text()).toContain('92%');
    });

    it('should list employee skills', () => {
      const wrapper = mount(EmployeeCard, {
        props: { employee: mockEmployee }
      });

      mockEmployee.skills.forEach(skill => {
        expect(wrapper.text()).toContain(skill);
      });
    });
  });

  describe('Availability States', () => {
    it('should show green indicator for available', () => {
      const wrapper = mount(EmployeeCard, {
        props: { employee: { ...mockEmployee, availability: 'available' } }
      });

      const status = wrapper.find('[data-testid="availability-status"]');
      expect(status.classes()).toContain('status-available');
    });

    it('should show yellow indicator for busy', () => {
      const wrapper = mount(EmployeeCard, {
        props: { employee: { ...mockEmployee, availability: 'busy' } }
      });

      const status = wrapper.find('[data-testid="availability-status"]');
      expect(status.classes()).toContain('status-busy');
    });

    it('should show red indicator for offline', () => {
      const wrapper = mount(EmployeeCard, {
        props: { employee: { ...mockEmployee, availability: 'offline' } }
      });

      const status = wrapper.find('[data-testid="availability-status"]');
      expect(status.classes()).toContain('status-offline');
    });
  });

  describe('Interactions', () => {
    it('should emit select event when clicked', async () => {
      const wrapper = mount(EmployeeCard, {
        props: { employee: mockEmployee }
      });

      await wrapper.trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('select');
      expect(wrapper.emitted('select')![0]).toEqual([mockEmployee]);
    });

    it('should show hover state', async () => {
      const wrapper = mount(EmployeeCard, {
        props: { employee: mockEmployee }
      });

      await wrapper.trigger('mouseenter');
      expect(wrapper.classes()).toContain('hover');
    });
  });

  describe('Performance Indicators', () => {
    it('should show warning for low performance', () => {
      const lowPerformanceEmployee = {
        ...mockEmployee,
        performanceScore: 45
      };

      const wrapper = mount(EmployeeCard, {
        props: { employee: lowPerformanceEmployee }
      });

      const performanceElement = wrapper.find('[data-testid="performance-score"]');
      expect(performanceElement.classes()).toContain('performance-low');
    });

    it('should show success for high performance', () => {
      const highPerformanceEmployee = {
        ...mockEmployee,
        performanceScore: 95
      };

      const wrapper = mount(EmployeeCard, {
        props: { employee: highPerformanceEmployee }
      });

      const performanceElement = wrapper.find('[data-testid="performance-score"]');
      expect(performanceElement.classes()).toContain('performance-high');
    });
  });

  describe('Task Overload', () => {
    it('should indicate when employee is overloaded', () => {
      const overloadedEmployee = {
        ...mockEmployee,
        currentTasks: 5,
        maxTasks: 5
      };

      const wrapper = mount(EmployeeCard, {
        props: { employee: overloadedEmployee }
      });

      expect(wrapper.find('.overloaded-indicator').exists()).toBe(true);
    });

    it('should not assign tasks when at capacity', async () => {
      const overloadedEmployee = {
        ...mockEmployee,
        currentTasks: 5,
        maxTasks: 5
      };

      const wrapper = mount(EmployeeCard, {
        props: { employee: overloadedEmployee }
      });

      const assignButton = wrapper.find('[data-testid="assign-task-btn"]');
      expect(assignButton.attributes('disabled')).toBeDefined();
    });
  });
});

describe('EmployeeCard Accessibility', () => {
  const mockEmployee = {
    id: 'emp_001',
    name: 'Alex Project Manager',
    role: 'Project Manager',
    department: 'Executive',
    availability: 'available',
    skills: ['Project Management'],
    currentTasks: 2,
    maxTasks: 5,
    performanceScore: 92
  };

  it('should have proper ARIA labels', () => {
    const wrapper = mount(EmployeeCard, {
      props: { employee: mockEmployee }
    });

    expect(wrapper.attributes('role')).toBe('article');
    expect(wrapper.attributes('aria-label')).toContain('Alex Project Manager');
  });

  it('should be keyboard navigable', async () => {
    const wrapper = mount(EmployeeCard, {
      props: { employee: mockEmployee }
    });

    expect(wrapper.attributes('tabindex')).toBe('0');
    
    await wrapper.trigger('keydown.enter');
    expect(wrapper.emitted()).toHaveProperty('select');
  });
});