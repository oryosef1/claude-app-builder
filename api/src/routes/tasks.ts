import { Router } from 'express';
import { WorkflowIntegrationInterface } from '../types/workflow';
import { ApiResponse, TasksResponse, TaskCreateRequest, TaskUpdateRequest } from '../types/api';
import { validateTaskCreate, validateTaskUpdate } from '../middleware/validation';

export function createTaskRoutes(workflowIntegration: WorkflowIntegrationInterface): Router {
  const router = Router();

  // Get all tasks
  router.get('/', async (req, res) => {
    try {
      const tasks = workflowIntegration.getTasks();
      
      const tasksResponse: TasksResponse = {
        tasks,
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        completed: tasks.filter(t => t.status === 'completed').length
      };
      
      const response: ApiResponse<TasksResponse> = {
        success: true,
        data: tasksResponse
      };
      
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      res.status(500).json(response);
    }
  });

  // Get specific task
  router.get('/:id', async (req, res) => {
    try {
      const tasks = workflowIntegration.getTasks();
      const task = tasks.find(t => t.id === req.params.id);
      
      if (!task) {
        const response: ApiResponse = {
          success: false,
          error: 'Task not found'
        };
        return res.status(404).json(response);
      }
      
      const response: ApiResponse = {
        success: true,
        data: task
      };
      
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      res.status(500).json(response);
    }
  });

  // Create new task
  router.post('/', validateTaskCreate, async (req, res) => {
    try {
      const taskData: TaskCreateRequest = req.body;
      
      await workflowIntegration.addTask({
        content: taskData.content,
        status: 'pending',
        priority: taskData.priority
      });
      
      const tasks = workflowIntegration.getTasks();
      const newTask = tasks[tasks.length - 1]; // Get the last added task
      
      const response: ApiResponse = {
        success: true,
        data: newTask,
        message: 'Task created successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      res.status(500).json(response);
    }
  });

  // Update task
  router.put('/:id', validateTaskUpdate, async (req, res) => {
    try {
      const taskId = req.params.id;
      const updates: TaskUpdateRequest = req.body;
      
      await workflowIntegration.updateTask(taskId, updates);
      
      const tasks = workflowIntegration.getTasks();
      const updatedTask = tasks.find(t => t.id === taskId);
      
      const response: ApiResponse = {
        success: true,
        data: updatedTask,
        message: 'Task updated successfully'
      };
      
      res.json(response);
    } catch (error) {
      if (error instanceof Error && error.message === 'Task not found') {
        const response: ApiResponse = {
          success: false,
          error: 'Task not found'
        };
        return res.status(404).json(response);
      }
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      res.status(500).json(response);
    }
  });

  return router;
}