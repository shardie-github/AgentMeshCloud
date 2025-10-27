/**
 * AgentMesh Cloud Ecosystem Service
 * Main entry point for partner integration and federated gateway
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
import { AdaptiveInferenceRouter } from '@/services/AdaptiveInferenceRouter';
import { FederatedGatewayService } from '@/services/FederatedGatewayService';
import { KnowledgeGraphService } from '@/services/KnowledgeGraphService';
import { PartnerMarketplaceService } from '@/services/PartnerMarketplaceService';

// Import routes
import inferenceRoutes from '@/routes/inference';
import gatewayRoutes from '@/routes/gateway';
import knowledgeRoutes from '@/routes/knowledge';
import partnerRoutes from '@/routes/partners';
import healthRoutes from '@/routes/health';

// Load environment variables
dotenv.config();

class EcosystemApp {
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

    // Rate limiting
    // this.app.use(rateLimiter);

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
    this.app.use('/api/v1/inference', inferenceRoutes);
    this.app.use('/api/v1/gateway', gatewayRoutes);
    this.app.use('/api/v1/knowledge', knowledgeRoutes);
    this.app.use('/api/v1/partners', partnerRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'AgentMesh Cloud Ecosystem',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        features: {
          inferenceRouter: config.features.inferenceRouter,
          federatedGateway: config.features.federatedGateway,
          knowledgeGraph: config.features.knowledgeGraph,
          partnerMarketplace: config.features.partnerMarketplace,
        },
        endpoints: {
          health: '/health',
          inference: '/api/v1/inference',
          gateway: '/api/v1/gateway',
          knowledge: '/api/v1/knowledge',
          partners: '/api/v1/partners',
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
      logger.info('Initializing Ecosystem services...');

      // Initialize Adaptive Inference Router
      if (config.features.inferenceRouter) {
        const inferenceRouter = new AdaptiveInferenceRouter();
        await inferenceRouter.initialize();
        this.services.set('inferenceRouter', inferenceRouter);
        this.app.set('inferenceRouter', inferenceRouter);
        logger.info('Adaptive Inference Router initialized');
      }

      // Initialize Federated Gateway Service
      if (config.features.federatedGateway) {
        const gatewayService = new FederatedGatewayService();
        await gatewayService.initialize();
        this.services.set('gatewayService', gatewayService);
        this.app.set('gatewayService', gatewayService);
        logger.info('Federated Gateway Service initialized');
      }

      // Initialize Knowledge Graph Service
      if (config.features.knowledgeGraph) {
        const knowledgeService = new KnowledgeGraphService();
        await knowledgeService.initialize();
        this.services.set('knowledgeService', knowledgeService);
        this.app.set('knowledgeService', knowledgeService);
        logger.info('Knowledge Graph Service initialized');
      }

      // Initialize Partner Marketplace Service
      if (config.features.partnerMarketplace) {
        const marketplaceService = new PartnerMarketplaceService();
        await marketplaceService.initialize();
        this.services.set('marketplaceService', marketplaceService);
        this.app.set('marketplaceService', marketplaceService);
        logger.info('Partner Marketplace Service initialized');
      }

      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting AgentMesh Cloud Ecosystem...');

      // Initialize services
      await this.initializeServices();

      // Start HTTP server
      this.server = this.app.listen(config.server.port, () => {
        logger.info(`Ecosystem server running on port ${config.server.port}`);
        logger.info(`Environment: ${config.server.environment}`);
        logger.info(`Health check: http://localhost:${config.server.port}/health`);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start ecosystem service:', error);
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
const ecosystem = new EcosystemApp();

// Start the ecosystem service
ecosystem.start().catch((error) => {
  logger.error('Failed to start ecosystem service:', error);
  process.exit(1);
});

export default ecosystem;