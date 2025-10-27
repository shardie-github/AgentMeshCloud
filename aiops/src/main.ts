/**
 * Main entry point for AIOps service
 */

import { AIOpsService } from './services/AIOpsService';
import { logger } from './utils/logger';

async function main() {
  try {
    logger.info('Starting AIOps Service...');
    
    const aiOpsService = new AIOpsService();
    await aiOpsService.initialize();
    
    logger.info('AIOps Service started successfully');
    
    // Keep the service running
    process.on('SIGINT', async () => {
      logger.info('Shutting down AIOps Service...');
      await aiOpsService.cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Shutting down AIOps Service...');
      await aiOpsService.cleanup();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start AIOps Service:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}