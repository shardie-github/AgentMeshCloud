/**
 * Error handling middleware for AgentMesh Cloud Orchestrator
 * Centralized error handling and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { config } from '@/config';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMITED');
  }
}

export class TimeoutError extends CustomError {
  constructor(message: string = 'Request timeout') {
    super(message, 408, 'TIMEOUT');
  }
}

export class ServiceUnavailableError extends CustomError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: any = undefined;

  // Handle different error types
  if (error instanceof CustomError) {
    statusCode = error.statusCode || 500;
    code = error.code || 'INTERNAL_ERROR';
    message = error.message;
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'Duplicate entry';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'AUTHENTICATION_ERROR';
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'AUTHENTICATION_ERROR';
    message = 'Token expired';
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid JSON';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'File upload error';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } else {
    logger.warn('Client error:', {
      error: error.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
      statusCode,
    });
  }

  // Prepare error response
  const errorResponse: any = {
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method,
    },
  };

  // Add details if available
  if (details) {
    errorResponse.error.details = details;
  }

  // Add stack trace in development
  if (config.server.environment === 'development' && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  // Add request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.error.requestId = req.headers['x-request-id'];
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.validate(req.body);
      if (validated.error) {
        throw new ValidationError(validated.error.details[0].message);
      }
      req.body = validated.value;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function handleAsyncError(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const next = args[args.length - 1];
    return Promise.resolve(originalMethod.apply(this, args)).catch(next);
  };

  return descriptor;
}