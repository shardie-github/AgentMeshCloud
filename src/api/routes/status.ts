import { Router } from 'express';

export const statusRouter = Router();

statusRouter.get('/', async (req, res) => {
  try {
    const { contextBus } = req.app.locals;

    const dbHealthy = await contextBus.healthCheck();
    const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'not configured';

    res.json({
      ok: true,
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        otel: otelEndpoint !== 'not configured' ? 'configured' : 'not configured',
      },
      features: {
        self_healing: process.env.ENABLE_SELF_HEALING === 'true',
        drift_detection: process.env.ENABLE_DRIFT_DETECTION === 'true',
        trust_scoring: process.env.ENABLE_TRUST_SCORING === 'true',
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
