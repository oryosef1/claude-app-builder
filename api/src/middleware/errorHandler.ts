import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/api';
import { logger } from '../utils/logger';

export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Unhandled error:', error);
  
  const response: ApiResponse = {
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  };
  
  res.status(500).json(response);
}