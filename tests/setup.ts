/**
 * Vitest global setup
 * Runs before all tests
 */

import { beforeAll, afterAll, vi } from 'vitest';
import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/orca_test';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = ''; // Disable telemetry in tests

// Mock console methods to reduce test noise
beforeAll(() => {
  global.console = {
    ...console,
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    // Keep error for debugging
    error: console.error,
  };
});

// Cleanup
afterAll(() => {
  vi.clearAllMocks();
});

// Global test timeout
vi.setConfig({ testTimeout: 10000 });
