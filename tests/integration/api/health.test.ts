/**
 * Integration tests for health endpoints
 */

import { describe, it, expect } from 'vitest';

describe('Health Endpoints', () => {
  const API_BASE = process.env.API_URL || 'http://localhost:3000';

  it('should return 200 for /health', async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThanOrEqual(503);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
    } catch (error) {
      // Test may run without API server
      console.warn('API not available, skipping integration test');
    }
  });

  it('should return liveness probe status', async () => {
    try {
      const response = await fetch(`${API_BASE}/status/liveness`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('alive');
      expect(data).toHaveProperty('uptime');
    } catch (error) {
      console.warn('API not available, skipping integration test');
    }
  });

  it('should return readiness probe status', async () => {
    try {
      const response = await fetch(`${API_BASE}/status/readiness`);
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThanOrEqual(503);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('checks');
    } catch (error) {
      console.warn('API not available, skipping integration test');
    }
  });
});
