/**
 * AgentMesh Cloud Orchestrator Service
 * Main entry point for the orchestration service
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { config } from '@/config';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import { authMiddleware } from '@/middleware/auth';
import { metricsMiddleware } from '@/middleware/metrics';

// Import routes
import agentRoutes from '@/routes/agents';
import workflowRoutes from '@/routes/workflows';
import mcpRoutes from '@/routes/mcp';
import a2aRoutes from '@/routes/a2a';
import healthRoutes from '@/routes/health';

// Import services
import { AgentService } from '@/services/AgentService';
import { WorkflowService } from '@/services/WorkflowService';
import { MCPService } from '@/services/MCPService';
import { A2AService } from '@/services/A2AService';
import { OrchestrationService } from '@/services/OrchestrationService';

// Import workers
import { AgentWorker } from '@/workers/AgentWorker';
import { WorkflowWorker } from '@/workers/WorkflowWorker';
import { MCPWorker } from '@/workers/MCPWorker';
import { A2AWorker } from '@/workers/A2AWorker';

// Load environment variables
dotenv.config();

class OrchestratorApp {
  private app: express.Application;
  private server: any;
  private services: Map<string, any> = new Map();
  private workers: Map<string, any> = new Map();

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
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message: string) => logger.info(message.trim()) }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(rateLimiter);

    // Metrics
    this.app.use(metricsMiddleware);

    // Authentication (optional for public endpoints)
    this.app.use('/api/v1/agents', authMiddleware);
    this.app.use('/api/v1/workflows', authMiddleware);
    this.app.use('/api/v1/mcp', authMiddleware);
    this.app.use('/api/v1/a2a', authMiddleware);
  }

  private setupRoutes(): void {
    // Health check (public)
    this.app.use('/health', healthRoutes);

    // API routes
    this.app.use('/api/v1/agents', agentRoutes);
    this.app.use('/api/v1/workflows', workflowRoutes);
    this.app.use('/api/v1/mcp', mcpRoutes);
    this.app.use('/api/v1/a2a', a2aRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'AgentMesh Cloud Orchestrator',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          agents: '/api/v1/agents',
          workflows: '/api/v1/workflows',
          mcp: '/api/v1/mcp',
          a2a: '/api/v1/a2a',
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
    this.app.use(errorHandler);
  }

  private async initializeServices(): Promise<void> {
    try {
      logger.info('Initializing services...');

      // Initialize core services
      const agentService = new AgentService();
      const workflowService = new WorkflowService();
      const mcpService = new MCPService();
      const a2aService = new A2AService();
      const orchestrationService = new OrchestrationService();

      // Store services
      this.services.set('agent', agentService);
      this.services.set('workflow', workflowService);
      this.services.set('mcp', mcpService);
      this.services.set('a2a', a2aService);
      this.services.set('orchestration', orchestrationService);

      // Initialize services
      await agentService.initialize();
      await workflowService.initialize();
      await mcpService.initialize();
      await a2aService.initialize();
      await orchestrationService.initialize();

      logger.info('Services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private async initializeWorkers(): Promise<void> {
    try {
      logger.info('Initializing workers...');

      // Initialize workers
      const agentWorker = new AgentWorker(this.services.get('agent'));
      const workflowWorker = new WorkflowWorker(this.services.get('workflow'));
      const mcpWorker = new MCPWorker(this.services.get('mcp'));
      const a2aWorker = new A2AWorker(this.services.get('a2a'));

      // Store workers
      this.workers.set('agent', agentWorker);
      this.workers.set('workflow', workflowWorker);
      this.workers.set('mcp', mcpWorker);
      this.workers.set('a2a', a2aWorker);

      // Start workers
      await agentWorker.start();
      await workflowWorker.start();
      await mcpWorker.start();
      await a2aWorker.start();

      logger.info('Workers initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize workers:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting AgentMesh Cloud Orchestrator...');

      // Initialize services
      await this.initializeServices();

      // Initialize workers
      await this.initializeWorkers();

      // Start HTTP server
      this.server = this.app.listen(config.server.port, () => {
        logger.info(`Server running on port ${config.server.port}`);
        logger.info(`Environment: ${config.server.environment}`);
        logger.info(`Health check: http://localhost:${config.server.port}/health`);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start orchestrator:', error);
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

      // Stop workers
      for (const [name, worker] of this.workers) {
        try {
          await worker.stop();
          logger.info(`Worker ${name} stopped`);
        } catch (error) {
          logger.error(`Failed to stop worker ${name}:`, error);
        }
      }

      // Stop services
      for (const [name, service] of this.services) {
        try {
          await service.cleanup();
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

  public getWorker(name: string): any {
    return this.workers.get(name);
  }
}

// Create and start the application
const orchestrator = new OrchestratorApp();

// Start the orchestrator
orchestrator.start().catch((error) => {
  logger.error('Failed to start orchestrator:', error);
  process.exit(1);
});

export default orchestrator;