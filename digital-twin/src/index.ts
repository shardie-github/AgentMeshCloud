/**
 * AgentMesh Cloud Digital Twin Service
 * Main entry point for system simulation and stress testing
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { config } from '@/config';
import { logger } from '@/utils/logger';
import { requestLogger, errorLogger } from '@/utils/logger';

// Import services
import { DigitalTwinService } from '@/services/DigitalTwinService';

// Import routes
import twinRoutes from '@/routes/twins';
import simulationRoutes from '@/routes/simulation';
import testingRoutes from '@/routes/testing';
import monitoringRoutes from '@/routes/monitoring';
import healthRoutes from '@/routes/health';

// Load environment variables
dotenv.config();

class DigitalTwinApp {
  private app: express.Application;
  private server: any;
  private services: Map<string, any> = new Map();

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.server.cors.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-ID'],
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message: string) => logger.info(message.trim()) }
    }));

    // Request logging
    this.app.use(requestLogger);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Tenant isolation middleware
    this.app.use((req, res, next) => {
      req.tenantId = req.headers['x-tenant-id'] as string;
      next();
    });
  }

  private setupRoutes(): void {
    // Health check (public)
    this.app.use('/health', healthRoutes);

    // API routes
    this.app.use('/api/v1/twins', twinRoutes);
    this.app.use('/api/v1/simulation', simulationRoutes);
    this.app.use('/api/v1/testing', testingRoutes);
    this.app.use('/api/v1/monitoring', monitoringRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'AgentMesh Cloud Digital Twin',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        features: {
          digitalTwin: config.features.digitalTwin,
          simulation: config.features.simulation,
          testing: config.features.testing,
          loadTesting: config.features.loadTesting,
          stressTesting: config.features.stressTesting,
          monitoring: config.features.monitoring,
          scaling: config.features.scaling,
          compliance: config.features.compliance,
        },
        endpoints: {
          health: '/health',
          twins: '/api/v1/twins',
          simulation: '/api/v1/simulation',
          testing: '/api/v1/testing',
          monitoring: '/api/v1/monitoring',
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorLogger);
  }

  private async initializeServices(): Promise<void> {
    try {
      logger.info('Initializing Digital Twin services...');

      // Initialize Digital Twin Service
      if (config.features.digitalTwin) {
        const digitalTwinService = new DigitalTwinService();
        await digitalTwinService.initialize();
        this.services.set('digitalTwinService', digitalTwinService);
        this.app.set('digitalTwinService', digitalTwinService);
        logger.info('Digital Twin Service initialized');
      }

      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting AgentMesh Cloud Digital Twin...');

      // Initialize services
      await this.initializeServices();

      // Start HTTP server
      this.server = this.app.listen(config.server.port, () => {
        logger.info(`Digital Twin server running on port ${config.server.port}`);
        logger.info(`Environment: ${config.server.environment}`);
        logger.info(`Health check: http://localhost:${config.server.port}/health`);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start digital twin service:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      // Stop accepting new connections
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Stop services
      for (const [name, service] of this.services) {
        try {
          if (service.cleanup) {
            await service.cleanup();
          }
          logger.info(`Service ${name} cleaned up`);
        } catch (error) {
          logger.error(`Failed to cleanup service ${name}:`, error);
        }
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getService(name: string): any {
    return this.services.get(name);
  }
}

// Create and start the application
const digitalTwin = new DigitalTwinApp();

// Start the digital twin service
digitalTwin.start().catch((error) => {
  logger.error('Failed to start digital twin service:', error);
  process.exit(1);
});

export default digitalTwin;