import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/api';

export function validateTaskCreate(req: Request, res: Response, next: NextFunction) {
  const { content, priority } = req.body;
  
  if (!content || typeof content !== 'string' || content.trim() === '') {
    const response: ApiResponse = {
      success: false,
      error: 'Task content is required and must be a non-empty string'
    };
    return res.status(400).json(response);
  }
  
  if (!priority || !['low', 'medium', 'high'].includes(priority)) {
    const response: ApiResponse = {
      success: false,
      error: 'Priority must be one of: low, medium, high'
    };
    return res.status(400).json(response);
  }
  
  next();
}

export function validateTaskUpdate(req: Request, res: Response, next: NextFunction) {
  const { content, status, priority } = req.body;
  
  if (content !== undefined && (typeof content !== 'string' || content.trim() === '')) {
    const response: ApiResponse = {
      success: false,
      error: 'Content must be a non-empty string if provided'
    };
    return res.status(400).json(response);
  }
  
  if (status !== undefined && !['pending', 'in_progress', 'completed'].includes(status)) {
    const response: ApiResponse = {
      success: false,
      error: 'Status must be one of: pending, in_progress, completed'
    };
    return res.status(400).json(response);
  }
  
  if (priority !== undefined && !['low', 'medium', 'high'].includes(priority)) {
    const response: ApiResponse = {
      success: false,
      error: 'Priority must be one of: low, medium, high'
    };
    return res.status(400).json(response);
  }
  
  next();
}

export function validateMemoryUpdate(req: Request, res: Response, next: NextFunction) {
  const { content } = req.body;
  
  if (!content || typeof content !== 'string' || content.trim() === '') {
    const response: ApiResponse = {
      success: false,
      error: 'Memory content is required and must be a non-empty string'
    };
    return res.status(400).json(response);
  }
  
  next();
}