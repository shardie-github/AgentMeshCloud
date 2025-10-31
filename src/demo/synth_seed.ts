/**
 * Demo Mode Synthetic Data Generator
 * Generates safe, realistic demo data for sales and testing
 * NO PII - safe for demonstrations
 */

import { randomUUID } from 'crypto';

export const DEMO_MODE = process.env.DEMO_MODE === 'true';

interface DemoAgent {
  id: string;
  name: string;
  type: 'chatbot' | 'copilot' | 'pipeline' | 'service';
  vendor: string;
  model: string;
  status: 'active' | 'suspended';
  trust_level: number;
  created_at: string;
}

interface DemoWorkflow {
  id: string;
  name: string;
  source: string;
  trigger: string;
  status: 'active' | 'completed' | 'failed';
  last_run_at: string;
}

interface DemoKPIs {
  trust_score: number;
  risk_avoided_usd: number;
  sync_freshness_pct: number;
  drift_rate_pct: number;
  compliance_sla_pct: number;
  mttr_minutes: number;
  policy_coverage_pct: number;
  agent_availability_pct: number;
}

/**
 * Generate demo agents
 */
export function generateDemoAgents(count: number = 10): DemoAgent[] {
  const agents: DemoAgent[] = [];
  const names = [
    'Customer Support Bot',
    'Sales Copilot',
    'Data Pipeline Agent',
    'Code Review Assistant',
    'Documentation Generator',
    'Sentiment Analyzer',
    'Fraud Detection Service',
    'Recommendation Engine',
    'Content Moderator',
    'Invoice Processor'
  ];
  
  const vendors = ['openai', 'anthropic', 'azure', 'aws', 'google'];
  const models = ['gpt-4', 'claude-3', 'gemini-pro', 'titan', 'codex'];
  
  for (let i = 0; i < Math.min(count, names.length); i++) {
    agents.push({
      id: `demo-agent-${i + 1}`,
      name: names[i],
      type: i % 4 === 0 ? 'chatbot' : i % 4 === 1 ? 'copilot' : i % 4 === 2 ? 'pipeline' : 'service',
      vendor: vendors[i % vendors.length]!,
      model: models[i % models.length]!,
      status: i === 8 ? 'suspended' : 'active',
      trust_level: 75 + Math.random() * 20,
      created_at: new Date(Date.now() - i * 86400000).toISOString()
    });
  }
  
  return agents;
}

/**
 * Generate demo workflows
 */
export function generateDemoWorkflows(count: number = 5): DemoWorkflow[] {
  const workflows: DemoWorkflow[] = [];
  const names = [
    'Customer Inquiry Routing',
    'Lead Qualification Pipeline',
    'Compliance Check Workflow',
    'Data Sync & Transform',
    'Incident Response Automation'
  ];
  
  const sources = ['zapier', 'n8n', 'airflow', 'lambda', 'kubernetes'];
  const triggers = ['webhook', 'schedule', 'event', 'manual', 'api'];
  
  for (let i = 0; i < Math.min(count, names.length); i++) {
    workflows.push({
      id: `demo-workflow-${i + 1}`,
      name: names[i]!,
      source: sources[i % sources.length]!,
      trigger: triggers[i % triggers.length]!,
      status: i === 3 ? 'failed' : i < 2 ? 'completed' : 'active',
      last_run_at: new Date(Date.now() - Math.random() * 3600000).toISOString()
    });
  }
  
  return workflows;
}

/**
 * Generate demo KPIs with realistic values
 */
export function generateDemoKPIs(): DemoKPIs {
  return {
    trust_score: 85 + Math.random() * 10,
    risk_avoided_usd: 45000 + Math.random() * 30000,
    sync_freshness_pct: 92 + Math.random() * 6,
    drift_rate_pct: 3 + Math.random() * 4,
    compliance_sla_pct: 97 + Math.random() * 2.5,
    mttr_minutes: 12 + Math.random() * 8,
    policy_coverage_pct: 95 + Math.random() * 4,
    agent_availability_pct: 99.2 + Math.random() * 0.7
  };
}

/**
 * Generate demo telemetry metrics
 */
export function generateDemoTelemetry(agentId: string, hours: number = 24) {
  const dataPoints: any[] = [];
  const now = Date.now();
  const interval = (hours * 3600000) / 100; // 100 data points
  
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(now - (100 - i) * interval);
    dataPoints.push({
      agent_id: agentId,
      timestamp: timestamp.toISOString(),
      latency_ms: 200 + Math.random() * 300 + Math.sin(i / 10) * 100,
      requests: Math.floor(50 + Math.random() * 150),
      errors: Math.floor(Math.random() * 5),
      trust_score: 80 + Math.random() * 15
    });
  }
  
  return dataPoints;
}

/**
 * Generate demo policy violations
 */
export function generateDemoPolicyViolations(count: number = 5) {
  const violations: any[] = [];
  const types = ['unauthorized_access', 'rate_limit', 'quota_exceeded', 'data_leak', 'compliance_breach'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const actions = ['blocked', 'logged', 'alerted', 'throttled'];
  
  for (let i = 0; i < count; i++) {
    violations.push({
      id: `demo-violation-${i + 1}`,
      policy_id: `policy-${Math.floor(Math.random() * 5) + 1}`,
      policy_name: 'Demo Policy',
      violation_type: types[Math.floor(Math.random() * types.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      action_taken: actions[Math.floor(Math.random() * actions.length)],
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      agent_id: `demo-agent-${Math.floor(Math.random() * 10) + 1}`
    });
  }
  
  return violations;
}

/**
 * Generate demo anomalies
 */
export function generateDemoAnomalies(count: number = 3) {
  const anomalies: any[] = [];
  const types = ['drift', 'latency_spike', 'error_rate', 'cost_spike', 'unusual_pattern'];
  const severities = ['low', 'medium', 'high', 'critical'];
  
  for (let i = 0; i < count; i++) {
    anomalies.push({
      id: `demo-anomaly-${i + 1}`,
      anomaly_type: types[Math.floor(Math.random() * types.length)],
      confidence: 0.7 + Math.random() * 0.25,
      severity: severities[Math.floor(Math.random() * severities.length)],
      detected_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      resolved_at: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 1800000).toISOString() : null,
      affected_resources: [`demo-agent-${Math.floor(Math.random() * 10) + 1}`]
    });
  }
  
  return anomalies;
}

/**
 * Generate complete demo tenant data
 */
export function generateDemoTenant(tenantId: string = 'demo-tenant') {
  return {
    tenant_id: tenantId,
    tenant_name: 'Acme Corporation (Demo)',
    plan: 'enterprise',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    agents: generateDemoAgents(10),
    workflows: generateDemoWorkflows(5),
    kpis: generateDemoKPIs(),
    violations: generateDemoPolicyViolations(5),
    anomalies: generateDemoAnomalies(3),
    users: [
      {
        id: 'demo-user-1',
        email: 'demo-admin@example.com',
        name: 'Demo Administrator',
        role: 'admin',
        last_login: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'demo-user-2',
        email: 'demo-user@example.com',
        name: 'Demo User',
        role: 'member',
        last_login: new Date(Date.now() - 7200000).toISOString()
      }
    ]
  };
}

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return DEMO_MODE;
}

/**
 * Middleware to inject demo data if in demo mode
 */
export function demoMiddleware(req: any, res: any, next: any) {
  if (isDemoMode()) {
    req.isDemoMode = true;
    req.demoTenant = generateDemoTenant();
  }
  next();
}
