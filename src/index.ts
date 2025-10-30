/**
 * ORCA Core - Main Entry Point
 * Production-ready agent mesh with UADSI
 */

import { createLogger } from './common/logger';
import { initializeTracing } from './telemetry/tracer';
import { orcaMetrics } from './telemetry/metrics';
import { startServer } from './api/server';
import { agentRegistry } from './registry';
import { agentDiscovery } from './uadsi';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';

const logger = createLogger('orca-main');

/**
 * Initialize ORCA Core
 */
async function initialize(): Promise<void> {
  logger.info('Initializing ORCA Core...');

  // Initialize telemetry
  initializeTracing({
    serviceName: 'orca-mesh',
    serviceVersion: '1.0.0',
    environment: process.env.ENVIRONMENT || 'development',
  });

  orcaMetrics.initialize({
    serviceName: 'orca-mesh',
    serviceVersion: '1.0.0',
    environment: process.env.ENVIRONMENT || 'development',
  });

  // Load agent registry from config
  try {
    const configPath = process.env.MCP_REGISTRY_PATH || './mcp_registry.yaml';
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = yaml.load(configContent) as { agents: unknown[] };
    
    await agentRegistry.loadFromConfig(config);
    logger.info('Agent registry loaded', { count: config.agents.length });
  } catch (error) {
    logger.warn('Failed to load agent registry config', { error: (error as Error).message });
  }

  // Start agent discovery (if configured)
  if (process.env.ENABLE_DISCOVERY === 'true') {
    agentDiscovery.startAutoScan();
    logger.info('Agent discovery enabled');
  }

  logger.info('ORCA Core initialized successfully');
}

/**
 * Start ORCA Core
 */
async function start(): Promise<void> {
  try {
    await initialize();

    // Start API server
    const port = parseInt(process.env.PORT || '3000');
    await startServer({ port });

    logger.info('ORCA Core started', { port });
  } catch (error) {
    logger.fatal('Failed to start ORCA Core', error as Error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  logger.info('Shutting down ORCA Core...');

  agentDiscovery.stopAutoScan();
  await orcaMetrics.shutdown();

  logger.info('ORCA Core shutdown complete');
  process.exit(0);
}

// Handle process signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start if running directly
if (require.main === module) {
  start().catch((error) => {
    logger.fatal('Unhandled error during startup', error);
    process.exit(1);
  });
}

export { initialize, start, shutdown };
