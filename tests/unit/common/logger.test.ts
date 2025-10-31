/**
 * Unit tests for logger utility
 */

import { describe, it, expect } from 'vitest';
import { createLogger } from '../../../src/common/logger';

describe('Logger', () => {
  it('should create a logger instance', () => {
    const logger = createLogger('test');
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('should log info messages', () => {
    const logger = createLogger('test');
    expect(() => logger.info('test message')).not.toThrow();
  });

  it('should log with structured data', () => {
    const logger = createLogger('test');
    expect(() => logger.info('test message', { key: 'value' })).not.toThrow();
  });

  it('should handle errors', () => {
    const logger = createLogger('test');
    const error = new Error('Test error');
    expect(() => logger.error('error occurred', { error })).not.toThrow();
  });
});
