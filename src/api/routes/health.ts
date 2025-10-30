/**
 * Health Check Routes
 */

import { Router, Request, Response } from 'express';
import { HealthCheckResponse } from '@/common/types';

export const healthRouter = Router();

/**
 * GET /health
 * Health check endpoint
 */
healthRouter.get('/', async (req: Request, res: Response) => {
  const health: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date(),
    version: '1.0.0',
    checks: [
      {
        name: 'api',
        status: 'up',
        latency_ms: 1,
      },
      {
        name: 'registry',
        status: 'up',
        latency_ms: 2,
      },
      {
        name: 'telemetry',
        status: 'up',
        latency_ms: 1,
      },
    ],
  };

  res.json(health);
});
