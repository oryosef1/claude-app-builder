import { Router } from 'express';
import { WorkflowIntegrationInterface } from '../types/workflow';
import { createWorkflowRoutes } from './workflow';
import { createTaskRoutes } from './tasks';
import { createMemoryRoutes } from './memory';
import { createHealthRoutes } from './health';

export function createRoutes(workflowIntegration: WorkflowIntegrationInterface): Router {
  const router = Router();

  // Health check routes
  router.use('/health', createHealthRoutes());

  // Workflow control routes
  router.use('/workflow', createWorkflowRoutes(workflowIntegration));

  // Task management routes
  router.use('/tasks', createTaskRoutes(workflowIntegration));

  // Memory management routes
  router.use('/memory', createMemoryRoutes(workflowIntegration));

  return router;
}