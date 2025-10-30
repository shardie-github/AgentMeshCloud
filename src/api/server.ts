/**
 * API Server - ORCA Core
 * Express-based REST API with OpenTelemetry instrumentation
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createLogger } from '@/common/logger';
import { errorToResponse, OrcaError } from '@/common/errors';
import { orcaMetrics } from '@/telemetry/metrics';
import { withSpan } from '@/telemetry/tracer';
import { agentRouter } from './routes/agents';
import { trustRouter } from './routes/trust';
import { healthRouter } from './routes/health';

const logger = createLogger('api-server');

export interface ServerConfig {
  port: number;
  host?: string;
  corsOrigins?: string[];
}

/**
 * Create and configure Express app
 */
export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  }));

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging and metrics
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Record metrics
      orcaMetrics.recordRequest(req.method, req.path, res.statusCode);
      orcaMetrics.recordRequestDuration(req.method, req.path, duration);

      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: duration,
      });
    });

    next();
  });

  // API routes
  app.use('/api/v1/agents', agentRouter);
  app.use('/api/v1/trust', trustRouter);
  app.use('/health', healthRouter);
  app.use('/ready', healthRouter);
  app.use('/status', healthRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  });

  // Error handler
  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', error, {
      method: req.method,
      path: req.path,
    });

    const errorResponse = errorToResponse(error);
    
    // Record error metric
    orcaMetrics.recordError(
      error.name,
      error instanceof OrcaError ? error.code : 'UNKNOWN_ERROR'
    );

    res.status(errorResponse.status).json({
      success: false,
      error: {
        code: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details,
      },
    });
  });

  return app;
}

/**
 * Start API server
 */
export async function startServer(config: ServerConfig): Promise<void> {
  const app = createApp();

  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host || '0.0.0.0', () => {
      logger.info('API server started', {
        port: config.port,
        host: config.host || '0.0.0.0',
      });
      resolve();
    });

    server.on('error', (error) => {
      logger.error('Failed to start server', error);
      reject(error);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  });
}
