import { Router } from 'express';
import { ApiResponse } from '../types/api';

export function createHealthRoutes(): Router {
  const router = Router();

  // Health check endpoint
  router.get('/', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    const healthData = {
      status: 'healthy',
      uptime,
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      },
      timestamp: new Date().toISOString(),
      version: process.version,
      platform: process.platform
    };
    
    const response: ApiResponse = {
      success: true,
      data: healthData
    };
    
    res.json(response);
  });

  return router;
}