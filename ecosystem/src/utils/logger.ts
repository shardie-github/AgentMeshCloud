/**
 * Logger utility for AgentMesh Cloud Ecosystem
 * Centralized logging with structured output and multiple destinations
 */

import winston from 'winston';
import { config } from '@/config';

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'agentmesh-ecosystem',
    version: '1.0.0',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add file transport if enabled
if (config.logging.file.enabled) {
  logger.add(new winston.transports.File({
    filename: config.logging.file.path,
    maxsize: config.logging.file.maxSize,
    maxFiles: config.logging.file.maxFiles,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }));
}

// Add request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      tenantId: req.tenantId,
    });
  });
  
  next();
};

// Add error logging middleware
export const errorLogger = (err: any, req: any, res: any, next: any) => {
  logger.error('HTTP Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    statusCode: res.statusCode || 500,
    userId: req.user?.id,
    tenantId: req.tenantId,
  });
  
  next(err);
};

// Structured logging methods
export const logRequest = (message: string, meta: any = {}) => {
  logger.info(message, { ...meta, type: 'request' });
};

export const logResponse = (message: string, meta: any = {}) => {
  logger.info(message, { ...meta, type: 'response' });
};

export const logError = (message: string, error: any, meta: any = {}) => {
  logger.error(message, { 
    ...meta, 
    type: 'error',
    error: error.message,
    stack: error.stack 
  });
};

export const logWarning = (message: string, meta: any = {}) => {
  logger.warn(message, { ...meta, type: 'warning' });
};

export const logInfo = (message: string, meta: any = {}) => {
  logger.info(message, { ...meta, type: 'info' });
};

export const logDebug = (message: string, meta: any = {}) => {
  logger.debug(message, { ...meta, type: 'debug' });
};

// Performance logging
export const logPerformance = (operation: string, duration: number, meta: any = {}) => {
  logger.info('Performance Metric', {
    ...meta,
    type: 'performance',
    operation,
    duration,
  });
};

// Business logic logging
export const logBusinessEvent = (event: string, data: any, meta: any = {}) => {
  logger.info('Business Event', {
    ...meta,
    type: 'business',
    event,
    data,
  });
};

// Security logging
export const logSecurityEvent = (event: string, data: any, meta: any = {}) => {
  logger.warn('Security Event', {
    ...meta,
    type: 'security',
    event,
    data,
  });
};

// Audit logging
export const logAudit = (action: string, resource: string, userId: string, meta: any = {}) => {
  logger.info('Audit Log', {
    ...meta,
    type: 'audit',
    action,
    resource,
    userId,
    timestamp: new Date().toISOString(),
  });
};

export { logger };
export default logger;