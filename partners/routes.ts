/**
 * Partner API Routes
 * 
 * Scoped API endpoints for 3rd-party partners and integrations
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PartnerScope {
  id: string;
  name: string;
  resources: string[];
  rate_limit: number;
}

interface PartnerAPIKey {
  key: string;
  partner_id: string;
  tier: 'sandbox' | 'integration' | 'oem';
  scopes: string[];
  tenant_id: string;
  created_at: Date;
  expires_at?: Date;
}

const router = Router();

// Load partner configuration
const partnersConfig = yaml.load(
  readFileSync(join(__dirname, 'scopes.yaml'), 'utf8')
) as any;

/**
 * Middleware: Validate partner API key
 */
async function validatePartnerAPIKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  // TODO: Validate against database
  // For now, mock validation
  const partnerKey: PartnerAPIKey = {
    key: apiKey,
    partner_id: 'partner_001',
    tier: 'integration',
    scopes: ['agents:read', 'kpis:read', 'incidents:read', 'incidents:write'],
    tenant_id: 'tenant_partner_001',
    created_at: new Date()
  };

  (req as any).partner = partnerKey;
  next();
}

/**
 * Middleware: Check scope permission
 */
function requireScope(scopeId: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const partner = (req as any).partner as PartnerAPIKey;

    if (!partner.scopes.includes(scopeId)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required_scope: scopeId,
        available_scopes: partner.scopes
      });
    }

    next();
  };
}

/**
 * GET /api/partner/agents
 * List agents (scoped to partner's tenants)
 */
router.get('/agents', validatePartnerAPIKey, requireScope('agents:read'), async (req, res) => {
  try {
    const partner = (req as any).partner as PartnerAPIKey;

    // TODO: Query database for partner's tenant agents
    const agents = [
      {
        id: 'agent_001',
        name: 'Customer Support Bot',
        type: 'chatbot',
        trust_score: 92,
        status: 'active'
      },
      {
        id: 'agent_002',
        name: 'Sales Automation',
        type: 'workflow',
        trust_score: 88,
        status: 'active'
      }
    ];

    res.json({
      data: agents,
      metadata: {
        partner_id: partner.partner_id,
        tenant_id: partner.tenant_id,
        total: agents.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/partner/kpis
 * Get KPIs and trust scores
 */
router.get('/kpis', validatePartnerAPIKey, requireScope('kpis:read'), async (req, res) => {
  try {
    const partner = (req as any).partner as PartnerAPIKey;

    const kpis = {
      trust_score: 85,
      risk_avoided_usd: 51000,
      incidents_total: 45,
      incidents_avoided: 12,
      sync_freshness: 92,
      drift_rate: 3.5
    };

    res.json({
      data: kpis,
      metadata: {
        partner_id: partner.partner_id,
        tenant_id: partner.tenant_id,
        period: 'last_30_days'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/partner/incidents
 * List incidents
 */
router.get('/incidents', validatePartnerAPIKey, requireScope('incidents:read'), async (req, res) => {
  try {
    const partner = (req as any).partner as PartnerAPIKey;

    const incidents = [
      {
        id: 'incident_001',
        type: 'policy_violation',
        severity: 'high',
        description: 'PII exposure risk detected',
        resolved: true,
        auto_resolved: true,
        timestamp: new Date().toISOString()
      }
    ];

    res.json({
      data: incidents,
      metadata: {
        partner_id: partner.partner_id,
        tenant_id: partner.tenant_id,
        total: incidents.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/partner/incidents
 * Report an incident
 */
router.post('/incidents', validatePartnerAPIKey, requireScope('incidents:write'), async (req, res) => {
  try {
    const partner = (req as any).partner as PartnerAPIKey;
    const { agent_id, type, severity, description } = req.body;

    if (!agent_id || !type || !severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const incident = {
      id: `incident_${Date.now()}`,
      agent_id,
      type,
      severity,
      description,
      reported_by: partner.partner_id,
      timestamp: new Date().toISOString()
    };

    // TODO: Save to database

    res.status(201).json({
      data: incident,
      message: 'Incident reported successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/partner/sandbox
 * Get sandbox environment details
 */
router.get('/sandbox', validatePartnerAPIKey, async (req, res) => {
  const partner = (req as any).partner as PartnerAPIKey;

  if (partner.tier !== 'sandbox') {
    return res.status(403).json({ error: 'Sandbox access only' });
  }

  res.json({
    sandbox_url: 'https://sandbox-api.orca-mesh.io',
    tenant_id: 'sandbox_demo_001',
    demo_data: true,
    reset_schedule: 'daily',
    documentation: 'https://docs.orca-mesh.io/partners/sandbox'
  });
});

export default router;
