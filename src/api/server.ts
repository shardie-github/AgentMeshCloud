#!/usr/bin/env node
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createContextBus } from '../context-bus/context_bus.js';
import { RegistryService } from '../registry/registry.service.js';
import { AgentDiscovery } from '../uadsi/agent_discovery.js';
import { SyncAnalyzer } from '../uadsi/sync_analyzer.js';
import { TrustScoring } from '../uadsi/trust_scoring.js';
import { ReportEngine } from '../uadsi/report_engine.js';
import { SelfHealingEngine } from '../diagnostics/self_healing_engine.js';
import { ZapierAdapter } from '../adapters/zapier.js';
import { N8NAdapter } from '../adapters/n8n.js';
import { initTelemetry } from '../telemetry/otel.js';
import { policyEnforcerMiddleware } from '../policy/policy_enforcer.js';
import { statusRouter } from './routes/status.js';
import { agentsRouter } from './routes/agents.js';
import { workflowsRouter } from './routes/workflows.js';
import { trustRouter } from './routes/trust.js';
import { reportsRouter } from './routes/reports.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.API_HOST || '0.0.0.0';

// Initialize telemetry
const telemetryEnabled = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? true : false;
if (telemetryEnabled) {
  initTelemetry({
    serviceName: process.env.OTEL_SERVICE_NAME || 'orca-agentmesh',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
    enabled: telemetryEnabled,
  });
}

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID'],
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting
import { createRateLimiter, ipThrottle } from '../security/rate-limiter.js';

app.use(ipThrottle);
app.use(createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000,
  keyPrefix: 'global',
}));

// Correlation ID middleware
import { correlationMiddleware } from '../telemetry/correlation.js';
app.use(correlationMiddleware);

// Request logging
import { createLogger } from '../common/logger.js';
const logger = createLogger('api-server');
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    method: req.method, 
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Initialize services
const contextBus = createContextBus({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/orcamesh',
});

const registry = new RegistryService(contextBus);
const agentDiscovery = new AgentDiscovery(contextBus, registry);
const syncAnalyzer = new SyncAnalyzer(
  contextBus,
  parseInt(process.env.SYNC_FRESHNESS_SLO_HOURS || '24', 10)
);
const trustScoring = new TrustScoring(
  contextBus,
  syncAnalyzer,
  parseInt(process.env.RISK_BASELINE_COST_USD || '10000', 10)
);
const reportEngine = new ReportEngine(contextBus, trustScoring, syncAnalyzer, agentDiscovery);
const selfHealingEngine = new SelfHealingEngine(
  contextBus,
  syncAnalyzer,
  trustScoring,
  process.env.ENABLE_SELF_HEALING === 'true'
);
const zapierAdapter = new ZapierAdapter(contextBus, registry);
const n8nAdapter = new N8NAdapter(contextBus, registry);

// Store services on app.locals for route access
app.locals.contextBus = contextBus;
app.locals.registry = registry;
app.locals.agentDiscovery = agentDiscovery;
app.locals.syncAnalyzer = syncAnalyzer;
app.locals.trustScoring = trustScoring;
app.locals.reportEngine = reportEngine;
app.locals.selfHealingEngine = selfHealingEngine;
app.locals.zapierAdapter = zapierAdapter;
app.locals.n8nAdapter = n8nAdapter;

// Apply policy enforcement
app.use(policyEnforcerMiddleware());

// Routes
app.use('/status', statusRouter);
app.use('/agents', agentsRouter);
app.use('/workflows', workflowsRouter);
app.use('/trust', trustRouter);
app.use('/reports', reportsRouter);

// Adapter webhook routes
app.post('/adapters/zapier/webhook', async (req, res) => {
  await zapierAdapter.handleWebhook(req, res);
});

app.post('/adapters/n8n/webhook', async (req, res) => {
  await n8nAdapter.handleWebhook(req, res);
});

// Health check endpoints
app.get('/health', async (_req, res) => {
  const dbHealthy = await contextBus.healthCheck();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe (lightweight - just checks if server is running)
app.get('/status/liveness', (_req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness probe (full stack check)
app.get('/status/readiness', async (_req, res) => {
  try {
    const dbHealthy = await contextBus.healthCheck();
    
    const checks = {
      database: dbHealthy,
      telemetry: telemetryEnabled,
      selfHealing: process.env.ENABLE_SELF_HEALING === 'true',
    };

    const allHealthy = Object.values(checks).every(v => v === true);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Startup sequence
async function startup() {
  try {
    console.log('🚀 ORCA AgentMesh starting...');

    // Wait for database
    console.log('📊 Checking database connection...');
    let retries = 10;
    while (retries > 0) {
      const healthy = await contextBus.healthCheck();
      if (healthy) {
        console.log('✅ Database connected');
        break;
      }
      retries--;
      if (retries === 0) {
        throw new Error('Database connection failed');
      }
      console.log(`⏳ Waiting for database... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Run migrations
    console.log('🔄 Running migrations...');
    try {
      await execAsync('tsx scripts/migrate.ts');
      console.log('✅ Migrations completed');
    } catch (error) {
      console.warn('⚠️  Migration script failed, assuming schema exists:', error);
    }

    // Seed database if SEED=true
    if (process.env.SEED === 'true') {
      console.log('🌱 Seeding database...');
      try {
        await execAsync('tsx scripts/seed.ts');
        console.log('✅ Database seeded');
      } catch (error) {
        console.warn('⚠️  Seed script failed:', error);
      }
    }

    // Sync MCP agents
    console.log('🔄 Syncing MCP agents from registry...');
    try {
      const mcpAgents = await registry.syncMCPAgents();
      console.log(`✅ Synced ${mcpAgents.length} MCP agents`);
    } catch (error) {
      console.warn('⚠️  MCP sync failed:', error);
    }

    // Start server
    app.listen(PORT, HOST, () => {
      console.log(`✅ ORCA AgentMesh API running on http://${HOST}:${PORT}`);
      console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
      console.log(`📈 Status: http://${HOST}:${PORT}/status`);
    });

    // Run initial self-healing check
    if (process.env.ENABLE_SELF_HEALING === 'true') {
      console.log('🔧 Running initial self-healing check...');
      setTimeout(async () => {
        try {
          await selfHealingEngine.diagnoseAndHeal();
          console.log('✅ Self-healing check completed');
        } catch (error) {
          console.warn('⚠️  Self-healing check failed:', error);
        }
      }, 5000);
    }
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📊 SIGTERM received, shutting down gracefully...');
  await contextBus.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📊 SIGINT received, shutting down gracefully...');
  await contextBus.close();
  process.exit(0);
});

// Start the server
startup().catch(console.error);
