/**
 * Authentication middleware for AgentMesh Cloud Orchestrator
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@/utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication not configured'
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
};

export const optionalAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId
    };

    next();
  } catch (error) {
    // For optional auth, we just continue without setting the user
    next();
  }
};