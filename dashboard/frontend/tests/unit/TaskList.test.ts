import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TaskList from '@/components/TaskList.vue';

describe('TaskList', () => {
  const mockTasks = [
    {
      id: 'task_001',
      title: 'Implement authentication',
      description: 'Add JWT authentication to the API',
      priority: 'high',
      status: 'pending',
      assignedTo: null,
      createdAt: new Date('2024-01-01'),
      skillsRequired: ['Node.js', 'Security']
    },
    {
      id: 'task_002',
      title: 'Create dashboard UI',
      description: 'Build the main dashboard interface',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'emp_012',
      createdAt: new Date('2024-01-02'),
      skillsRequired: ['Vue.js', 'CSS']
    },
    {
      id: 'task_003',
      title: 'Write documentation',
      description: 'Document the API endpoints',
      priority: 'low',
      status: 'completed',
      assignedTo: 'emp_011',
      createdAt: new Date('2024-01-03'),
      completedAt: new Date('2024-01-04'),
      skillsRequired: ['Technical Writing']
    }
  ];

  describe('Rendering', () => {
    it('should render all tasks', () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks }
      });

      const taskItems = wrapper.findAll('[data-testid="task-item"]');
      expect(taskItems).toHaveLength(3);
    });

    it('should display task information', () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks }
      });

      expect(wrapper.text()).toContain('Implement authentication');
      expect(wrapper.text()).toContain('Create dashboard UI');
      expect(wrapper.text()).toContain('Write documentation');
    });

    it('should show priority badges', () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks }
      });

      const highPriorityBadge = wrapper.find('.priority-high');
      const mediumPriorityBadge = wrapper.find('.priority-medium');
      const lowPriorityBadge = wrapper.find('.priority-low');

      expect(highPriorityBadge.exists()).toBe(true);
      expect(mediumPriorityBadge.exists()).toBe(true);
      expect(lowPriorityBadge.exists()).toBe(true);
    });

    it('should display status indicators', () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks }
      });

      expect(wrapper.find('.status-pending').exists()).toBe(true);
      expect(wrapper.find('.status-in_progress').exists()).toBe(true);
      expect(wrapper.find('.status-completed').exists()).toBe(true);
    });
  });

  describe('Filtering', () => {
    it('should filter tasks by status', async () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks, filterStatus: 'pending' }
      });

      const visibleTasks = wrapper.findAll('[data-testid="task-item"]:not(.hidden)');
      expect(visibleTasks).toHaveLength(1);
      expect(visibleTasks[0].text()).toContain('Implement authentication');
    });

    it('should filter tasks by priority', async () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks, filterPriority: 'high' }
      });

      const visibleTasks = wrapper.findAll('[data-testid="task-item"]:not(.hidden)');
      expect(visibleTasks).toHaveLength(1);
      expect(visibleTasks[0].text()).toContain('Implement authentication');
    });

    it('should filter by assigned employee', async () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks, filterAssignee: 'emp_012' }
      });

      const visibleTasks = wrapper.findAll('[data-testid="task-item"]:not(.hidden)');
      expect(visibleTasks).toHaveLength(1);
      expect(visibleTasks[0].text()).toContain('Create dashboard UI');
    });

    it('should show empty state when no tasks match filter', () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks, filterStatus: 'failed' }
      });

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('No tasks found');
    });
  });

  describe('Sorting', () => {
    it('should sort by priority', async () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks, sortBy: 'priority' }
      });

      const taskItems = wrapper.findAll('[data-testid="task-item"]');
      expect(taskItems[0].text()).toContain('Implement authentication'); // high
      expect(taskItems[1].text()).toContain('Create dashboard UI'); // medium
      expect(taskItems[2].text()).toContain('Write documentation'); // low
    });

    it('should sort by creation date', async () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks, sortBy: 'createdAt', sortOrder: 'desc' }
      });

      const taskItems = wrapper.findAll('[data-testid="task-item"]');
      expect(taskItems[0].text()).toContain('Write documentation'); // newest
      expect(taskItems[2].text()).toContain('Implement authentication'); // oldest
    });
  });

  describe('Interactions', () => {
    it('should emit task-select event when task is clicked', async () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks }
      });

      const firstTask = wrapper.find('[data-testid="task-item"]');
      await firstTask.trigger('click');

      expect(wrapper.emitted()).toHaveProperty('task-select');
      expect(wrapper.emitted('task-select')![0]).toEqual([mockTasks[0]]);
    });

    it('should emit assign-task event when assign button clicked', async () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks }
      });

      const assignButton = wrapper.find('[data-testid="assign-btn"]');
      await assignButton.trigger('click');

      expect(wrapper.emitted()).toHaveProperty('assign-task');
      expect(wrapper.emitted('assign-task')![0]).toEqual([mockTasks[0]]);
    });

    it('should show task details on hover', async () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks }
      });

      const taskItem = wrapper.find('[data-testid="task-item"]');
      await taskItem.trigger('mouseenter');

      const tooltip = wrapper.find('.task-tooltip');
      expect(tooltip.exists()).toBe(true);
      expect(tooltip.text()).toContain('Add JWT authentication to the API');
    });
  });

  describe('Batch Operations', () => {
    it('should allow selecting multiple tasks', async () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks, allowMultiSelect: true }
      });

      const checkboxes = wrapper.findAll('[data-testid="task-checkbox"]');
      await checkboxes[0].trigger('click');
      await checkboxes[1].trigger('click');

      expect(wrapper.emitted()).toHaveProperty('selection-change');
      expect(wrapper.emitted('selection-change')![1]).toEqual([
        [mockTasks[0], mockTasks[1]]
      ]);
    });

    it('should emit batch-assign event', async () => {
      const wrapper = mount(TaskList, {
        props: { 
          tasks: mockTasks, 
          allowMultiSelect: true,
          selectedTasks: [mockTasks[0], mockTasks[1]]
        }
      });

      const batchAssignBtn = wrapper.find('[data-testid="batch-assign-btn"]');
      await batchAssignBtn.trigger('click');

      expect(wrapper.emitted()).toHaveProperty('batch-assign');
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when loading', () => {
      const wrapper = mount(TaskList, {
        props: { tasks: [], loading: true }
      });

      expect(wrapper.find('.task-skeleton').exists()).toBe(true);
    });

    it('should disable interactions while loading', () => {
      const wrapper = mount(TaskList, {
        props: { tasks: mockTasks, loading: true }
      });

      const taskItems = wrapper.findAll('[data-testid="task-item"]');
      taskItems.forEach(item => {
        expect(item.classes()).toContain('disabled');
      });
    });
  });

  describe('Error States', () => {
    it('should show error message when error prop is set', () => {
      const wrapper = mount(TaskList, {
        props: { 
          tasks: [], 
          error: 'Failed to load tasks' 
        }
      });

      expect(wrapper.find('.error-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load tasks');
    });

    it('should emit retry event when retry button clicked', async () => {
      const wrapper = mount(TaskList, {
        props: { 
          tasks: [], 
          error: 'Failed to load tasks' 
        }
      });

      const retryBtn = wrapper.find('[data-testid="retry-btn"]');
      await retryBtn.trigger('click');

      expect(wrapper.emitted()).toHaveProperty('retry');
    });
  });
});