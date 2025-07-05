import { Router } from 'express';
import { WorkflowIntegrationInterface } from '../types/workflow';
import { ApiResponse, WorkflowStatusResponse } from '../types/api';

export function createWorkflowRoutes(workflowIntegration: WorkflowIntegrationInterface): Router {
  const router = Router();

  // Start workflow
  router.post('/start', async (req, res) => {
    try {
      await workflowIntegration.startWorkflow();
      const state = workflowIntegration.getWorkflowState();
      
      const response: ApiResponse = {
        success: true,
        data: state,
        message: 'Workflow started successfully'
      };
      
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      res.status(400).json(response);
    }
  });

  // Stop workflow
  router.post('/stop', async (req, res) => {
    try {
      await workflowIntegration.stopWorkflow();
      const state = workflowIntegration.getWorkflowState();
      
      const response: ApiResponse = {
        success: true,
        data: state,
        message: 'Workflow stopped successfully'
      };
      
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      res.status(400).json(response);
    }
  });

  // Pause workflow
  router.post('/pause', async (req, res) => {
    try {
      await workflowIntegration.pauseWorkflow();
      const state = workflowIntegration.getWorkflowState();
      
      const response: ApiResponse = {
        success: true,
        data: state,
        message: 'Workflow paused successfully'
      };
      
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      res.status(400).json(response);
    }
  });

  // Resume workflow
  router.post('/resume', async (req, res) => {
    try {
      await workflowIntegration.resumeWorkflow();
      const state = workflowIntegration.getWorkflowState();
      
      const response: ApiResponse = {
        success: true,
        data: state,
        message: 'Workflow resumed successfully'
      };
      
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      res.status(400).json(response);
    }
  });

  // Get workflow status
  router.get('/status', async (req, res) => {
    try {
      const state = workflowIntegration.getWorkflowState();
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      const statusResponse: WorkflowStatusResponse = {
        state,
        uptime,
        memoryUsage
      };
      
      const response: ApiResponse<WorkflowStatusResponse> = {
        success: true,
        data: statusResponse
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

  return router;
}