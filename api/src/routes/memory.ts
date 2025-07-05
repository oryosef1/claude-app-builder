import { Router } from 'express';
import { WorkflowIntegrationInterface } from '../types/workflow';
import { ApiResponse, MemoryUpdateRequest } from '../types/api';
import { validateMemoryUpdate } from '../middleware/validation';

export function createMemoryRoutes(workflowIntegration: WorkflowIntegrationInterface): Router {
  const router = Router();

  // Get memory content
  router.get('/', async (req, res) => {
    try {
      const content = await workflowIntegration.getMemoryContent();
      
      const response: ApiResponse = {
        success: true,
        data: { content }
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

  // Update memory content
  router.put('/', validateMemoryUpdate, async (req, res) => {
    try {
      const { content }: MemoryUpdateRequest = req.body;
      
      await workflowIntegration.updateMemoryContent(content);
      
      const response: ApiResponse = {
        success: true,
        message: 'Memory updated successfully'
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