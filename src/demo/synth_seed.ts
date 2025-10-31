/**
 * Synthetic Demo Data Seeder
 * 
 * Generates realistic demo data for sales presentations:
 * - 30 days of historical KPIs and incidents
 * - Multiple agents with varied trust scores
 * - Realistic event patterns
 * - Policy violations and resolutions
 * - AI-Ops automation examples
 * 
 * Usage:
 *   DEMO_MODE=true tsx src/demo/synth_seed.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

interface DemoAgent {
  id: string;
  name: string;
  type: string;
  vendor: string;
  trust_score: number;
  status: 'active' | 'suspended' | 'quarantined';
}

interface DemoIncident {
  id: string;
  agent_id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolved: boolean;
  auto_resolved: boolean;
  cost_impact: number;
  timestamp: Date;
}

interface DemoKPI {
  date: Date;
  trust_score: number;
  risk_avoided: number;
  incidents_total: number;
  incidents_avoided: number;
  sync_freshness: number;
  drift_rate: number;
}

class DemoDataSeeder {
  private supabase: SupabaseClient;
  private demoTenantId: string = 'demo_tenant_001';
  private agents: DemoAgent[] = [];
  private incidents: DemoIncident[] = [];
  private kpis: DemoKPI[] = [];

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Safety check: only run in demo mode
    if (process.env.DEMO_MODE !== 'true') {
      throw new Error('DEMO_MODE must be set to "true" to run seeder');
    }
  }

  /**
   * Main seeding workflow
   */
  async seed(): Promise<void> {
    console.log('🌱 Starting demo data seed...\n');

    try {
      // Step 1: Create demo tenant
      await this.createDemoTenant();

      // Step 2: Generate agents
      await this.generateAgents();

      // Step 3: Generate incidents (30 days)
      await this.generateIncidents();

      // Step 4: Generate KPI history
      await this.generateKPIHistory();

      // Step 5: Generate policy violations
      await this.generatePolicyViolations();

      // Step 6: Generate AI-Ops actions
      await this.generateAIActions();

      console.log('\n✅ Demo data seed completed successfully!');
      console.log(`\nDemo Tenant ID: ${this.demoTenantId}`);
      console.log(`Agents Created: ${this.agents.length}`);
      console.log(`Incidents Generated: ${this.incidents.length}`);
      console.log(`KPI Data Points: ${this.kpis.length}`);

    } catch (error) {
      console.error('❌ Seed failed:', error);
      throw error;
    }
  }

  /**
   * Create demo tenant
   */
  private async createDemoTenant(): Promise<void> {
    console.log('Creating demo tenant...');

    const { error } = await this.supabase
      .from('tenants')
      .upsert({
        id: this.demoTenantId,
        name: 'Acme Corporation (Demo)',
        plan_id: 'pro',
        demo_mode: true,
        billing_period_start: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to create demo tenant: ${error.message}`);
    }

    console.log('✅ Demo tenant created\n');
  }

  /**
   * Generate synthetic agents
   */
  private async generateAgents(): Promise<void> {
    console.log('Generating agents...');

    const agentTemplates = [
      { name: 'Customer Support Bot', type: 'chatbot', vendor: 'openai', trust_score: 92, status: 'active' },
      { name: 'Sales Automation Agent', type: 'workflow', vendor: 'zapier', trust_score: 88, status: 'active' },
      { name: 'Data Sync Connector', type: 'integration', vendor: 'make', trust_score: 76, status: 'active' },
      { name: 'Invoice Processing', type: 'rpa', vendor: 'n8n', trust_score: 95, status: 'active' },
      { name: 'Lead Enrichment', type: 'data', vendor: 'anthropic', trust_score: 82, status: 'active' },
      { name: 'Compliance Scanner', type: 'security', vendor: 'custom', trust_score: 98, status: 'active' },
      { name: 'Legacy CRM Sync', type: 'integration', vendor: 'custom', trust_score: 45, status: 'quarantined' },
      { name: 'Marketing Automation', type: 'workflow', vendor: 'zapier', trust_score: 91, status: 'active' },
      { name: 'Document Generator', type: 'rpa', vendor: 'openai', trust_score: 87, status: 'active' },
      { name: 'Sentiment Analyzer', type: 'ml', vendor: 'huggingface', trust_score: 79, status: 'active' }
    ];

    for (const template of agentTemplates) {
      const agent: DemoAgent = {
        id: `agent_demo_${randomBytes(8).toString('hex')}`,
        ...template,
        status: template.status as any
      };

      this.agents.push(agent);

      // Insert agent
      const { error } = await this.supabase
        .from('agents')
        .insert({
          id: agent.id,
          tenant_id: this.demoTenantId,
          name: agent.name,
          type: agent.type,
          vendor: agent.vendor,
          trust_score: agent.trust_score,
          status: agent.status,
          created_at: this.randomPastDate(30).toISOString()
        });

      if (error) {
        console.warn(`Failed to insert agent ${agent.name}:`, error.message);
      }
    }

    console.log(`✅ Generated ${this.agents.length} agents\n`);
  }

  /**
   * Generate incidents
   */
  private async generateIncidents(): Promise<void> {
    console.log('Generating incidents...');

    const incidentTypes = [
      'policy_violation',
      'data_freshness_lag',
      'authentication_failure',
      'rate_limit_exceeded',
      'sync_failure',
      'pii_exposure_risk',
      'unauthorized_action',
      'resource_exhaustion'
    ];

    const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];

    // Generate incidents over last 30 days
    const totalIncidents = 45;

    for (let i = 0; i < totalIncidents; i++) {
      const agent = this.randomAgent();
      const type = this.randomItem(incidentTypes);
      const severity = this.randomItem(severities);
      const autoResolved = Math.random() > 0.4; // 60% auto-resolved
      const resolved = autoResolved || Math.random() > 0.2; // 80% total resolved

      const incident: DemoIncident = {
        id: `incident_demo_${randomBytes(8).toString('hex')}`,
        agent_id: agent.id,
        type,
        severity,
        description: this.generateIncidentDescription(type, agent.name),
        resolved,
        auto_resolved: autoResolved,
        cost_impact: this.calculateCostImpact(severity),
        timestamp: this.randomPastDate(30)
      };

      this.incidents.push(incident);

      // Insert incident
      const { error } = await this.supabase
        .from('incidents')
        .insert({
          id: incident.id,
          tenant_id: this.demoTenantId,
          agent_id: incident.agent_id,
          type: incident.type,
          severity: incident.severity,
          description: incident.description,
          resolved: incident.resolved,
          auto_resolved: incident.auto_resolved,
          cost_impact: incident.cost_impact,
          timestamp: incident.timestamp.toISOString()
        });

      if (error) {
        console.warn(`Failed to insert incident:`, error.message);
      }
    }

    console.log(`✅ Generated ${this.incidents.length} incidents\n`);
  }

  /**
   * Generate KPI history
   */
  private async generateKPIHistory(): Promise<void> {
    console.log('Generating KPI history...');

    // Generate daily KPIs for last 30 days
    for (let day = 29; day >= 0; day--) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);

      // Calculate metrics with realistic trends
      const trustScore = 75 + Math.random() * 20 + (day * 0.2); // Improving trend
      const incidentsOnDay = this.incidents.filter(i => 
        this.isSameDay(i.timestamp, date)
      ).length;
      const incidentsAvoided = Math.floor(incidentsOnDay * 2.5); // 2.5x prevention ratio
      const riskAvoided = incidentsAvoided * 5000 * (trustScore / 100);
      const syncFreshness = 85 + Math.random() * 10;
      const driftRate = 5 + Math.random() * 5;

      const kpi: DemoKPI = {
        date,
        trust_score: trustScore,
        risk_avoided: riskAvoided,
        incidents_total: incidentsOnDay,
        incidents_avoided: incidentsAvoided,
        sync_freshness: syncFreshness,
        drift_rate: driftRate
      };

      this.kpis.push(kpi);

      // Insert KPI record
      const { error } = await this.supabase
        .from('kpi_daily')
        .insert({
          tenant_id: this.demoTenantId,
          date: date.toISOString().split('T')[0],
          trust_score: kpi.trust_score,
          risk_avoided: kpi.risk_avoided,
          incidents_total: kpi.incidents_total,
          incidents_avoided: kpi.incidents_avoided,
          sync_freshness: kpi.sync_freshness,
          drift_rate: kpi.drift_rate
        });

      if (error) {
        console.warn(`Failed to insert KPI for ${date.toISOString()}:`, error.message);
      }
    }

    console.log(`✅ Generated ${this.kpis.length} days of KPI data\n`);
  }

  /**
   * Generate policy violations
   */
  private async generatePolicyViolations(): Promise<void> {
    console.log('Generating policy violations...');

    const violations = [
      { agent: this.agents[2], rule: 'pii_detection', action: 'blocked', severity: 'high' },
      { agent: this.agents[3], rule: 'rate_limit', action: 'throttled', severity: 'medium' },
      { agent: this.agents[1], rule: 'data_classification', action: 'audited', severity: 'low' },
      { agent: this.agents[6], rule: 'authentication', action: 'blocked', severity: 'critical' },
      { agent: this.agents[4], rule: 'context_size_limit', action: 'truncated', severity: 'low' }
    ];

    for (const violation of violations) {
      const { error } = await this.supabase
        .from('policy_violations')
        .insert({
          tenant_id: this.demoTenantId,
          agent_id: violation.agent.id,
          rule: violation.rule,
          action: violation.action,
          severity: violation.severity,
          timestamp: this.randomPastDate(7).toISOString()
        });

      if (error) {
        console.warn('Failed to insert policy violation:', error.message);
      }
    }

    console.log(`✅ Generated ${violations.length} policy violations\n`);
  }

  /**
   * Generate AI-Ops actions
   */
  private async generateAIActions(): Promise<void> {
    console.log('Generating AI-Ops actions...');

    const actions = [
      { type: 'auto_heal', agent: this.agents[2], description: 'Automatically restarted failed sync job', success: true },
      { type: 'drift_correction', agent: this.agents[3], description: 'Corrected configuration drift', success: true },
      { type: 'resource_optimization', agent: this.agents[1], description: 'Optimized API call batching', success: true },
      { type: 'auto_quarantine', agent: this.agents[6], description: 'Quarantined agent due to repeated failures', success: true },
      { type: 'capacity_scaling', agent: this.agents[0], description: 'Scaled up capacity during peak load', success: true }
    ];

    for (const action of actions) {
      const { error } = await this.supabase
        .from('aiops_actions')
        .insert({
          tenant_id: this.demoTenantId,
          agent_id: action.agent.id,
          action_type: action.type,
          description: action.description,
          success: action.success,
          timestamp: this.randomPastDate(15).toISOString()
        });

      if (error) {
        console.warn('Failed to insert AI-Ops action:', error.message);
      }
    }

    console.log(`✅ Generated ${actions.length} AI-Ops actions\n`);
  }

  // Helper methods

  private randomAgent(): DemoAgent {
    return this.agents[Math.floor(Math.random() * this.agents.length)];
  }

  private randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomPastDate(maxDaysAgo: number): Date {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * maxDaysAgo);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  private generateIncidentDescription(type: string, agentName: string): string {
    const descriptions: Record<string, string> = {
      policy_violation: `Agent "${agentName}" violated policy: attempted unauthorized data access`,
      data_freshness_lag: `Data sync lag detected for "${agentName}" - 2 hours behind`,
      authentication_failure: `Authentication failed for "${agentName}" - invalid credentials`,
      rate_limit_exceeded: `Rate limit exceeded by "${agentName}" - 1000+ requests/min`,
      sync_failure: `Sync operation failed for "${agentName}" - connection timeout`,
      pii_exposure_risk: `PII exposure risk detected in "${agentName}" logs`,
      unauthorized_action: `Unauthorized action attempted by "${agentName}"`,
      resource_exhaustion: `Resource exhaustion detected for "${agentName}" - memory limit reached`
    };

    return descriptions[type] || `Incident detected for "${agentName}"`;
  }

  private calculateCostImpact(severity: string): number {
    const impacts: Record<string, number> = {
      low: 500,
      medium: 2000,
      high: 5000,
      critical: 15000
    };

    return impacts[severity] || 1000;
  }
}

// Run seeder
async function main() {
  const seeder = new DemoDataSeeder();
  await seeder.seed();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { DemoDataSeeder };
