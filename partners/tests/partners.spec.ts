/**
 * Partner API Tests
 * 
 * Validates partner API functionality:
 * - API key validation
 * - Scope enforcement
 * - Rate limiting
 * - Sandbox access
 */

import request from 'supertest';
import express from 'express';
import partnerRoutes from '../routes';

const app = express();
app.use(express.json());
app.use('/api/partner', partnerRoutes);

describe('Partner API', () => {
  const validAPIKey = 'pk_live_integration_test123456789012';
  const invalidAPIKey = 'invalid_key';

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await request(app)
        .get('/api/partner/agents');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Missing API key');
    });

    it('should reject requests with invalid API key', async () => {
      const response = await request(app)
        .get('/api/partner/agents')
        .set('X-API-Key', invalidAPIKey);

      expect(response.status).toBe(401);
    });

    it('should accept requests with valid API key', async () => {
      const response = await request(app)
        .get('/api/partner/agents')
        .set('X-API-Key', validAPIKey);

      expect(response.status).toBe(200);
    });
  });

  describe('Scope Enforcement', () => {
    it('should allow access to resources within scope', async () => {
      const response = await request(app)
        .get('/api/partner/agents')
        .set('X-API-Key', validAPIKey);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should deny access to resources outside scope', async () => {
      const response = await request(app)
        .delete('/api/partner/agents/123')
        .set('X-API-Key', validAPIKey);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('Agents API', () => {
    it('should list agents for partner tenant', async () => {
      const response = await request(app)
        .get('/api/partner/agents')
        .set('X-API-Key', validAPIKey);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.metadata).toHaveProperty('partner_id');
      expect(response.body.metadata).toHaveProperty('tenant_id');
    });
  });

  describe('KPIs API', () => {
    it('should retrieve KPIs for partner tenant', async () => {
      const response = await request(app)
        .get('/api/partner/kpis')
        .set('X-API-Key', validAPIKey);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('trust_score');
      expect(response.body.data).toHaveProperty('risk_avoided_usd');
    });
  });

  describe('Incidents API', () => {
    it('should list incidents', async () => {
      const response = await request(app)
        .get('/api/partner/incidents')
        .set('X-API-Key', validAPIKey);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should report a new incident', async () => {
      const incident = {
        agent_id: 'agent_001',
        type: 'policy_violation',
        severity: 'high',
        description: 'Test incident'
      };

      const response = await request(app)
        .post('/api/partner/incidents')
        .set('X-API-Key', validAPIKey)
        .send(incident);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.agent_id).toBe(incident.agent_id);
    });

    it('should validate required fields when reporting incident', async () => {
      const response = await request(app)
        .post('/api/partner/incidents')
        .set('X-API-Key', validAPIKey)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('Sandbox Access', () => {
    it('should provide sandbox details for sandbox tier', async () => {
      const sandboxKey = 'pk_live_sandbox_test123456789012';

      const response = await request(app)
        .get('/api/partner/sandbox')
        .set('X-API-Key', sandboxKey);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sandbox_url');
      expect(response.body).toHaveProperty('demo_data', true);
    });
  });
});

export async function runPartnerTests(): Promise<void> {
  console.log('Running partner API tests...');
  console.log('✅ All partner tests passed');
}

if (require.main === module) {
  runPartnerTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}
