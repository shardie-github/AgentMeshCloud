import pg from 'pg';

const { Pool } = pg;

export interface ContextBusConfig {
  connectionString: string;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  owner?: string;
  model?: string;
  prompt_hash?: string;
  access_tier: string;
  trust_level: number;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface Workflow {
  id: string;
  name: string;
  source: string;
  trigger?: string;
  status: string;
  last_run_at?: Date;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface Event {
  id: string;
  workflow_id?: string;
  ts: Date;
  kind: string;
  correlation_id?: string;
  idempotency_key?: string;
  payload: Record<string, unknown>;
  created_at: Date;
}

export interface Telemetry {
  id: string;
  agent_id?: string;
  ts: Date;
  latency_ms?: number;
  errors: number;
  policy_violations: number;
  success_count: number;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface Metric {
  id: string;
  ts: Date;
  trust_score?: number;
  risk_avoided_usd?: number;
  sync_freshness_pct?: number;
  drift_rate_pct?: number;
  compliance_sla_pct?: number;
  active_agents: number;
  active_workflows: number;
  total_events: number;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export class ContextBus {
  private pool: pg.Pool;

  constructor(config: ContextBusConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Agent operations
  async createAgent(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at'>): Promise<Agent> {
    const result = await this.pool.query(
      `INSERT INTO agents (name, type, owner, model, prompt_hash, access_tier, trust_level, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        agent.name,
        agent.type,
        agent.owner,
        agent.model,
        agent.prompt_hash,
        agent.access_tier,
        agent.trust_level,
        JSON.stringify(agent.metadata || {}),
      ]
    );
    return result.rows[0] as Agent;
  }

  async getAgents(): Promise<Agent[]> {
    const result = await this.pool.query('SELECT * FROM agents ORDER BY created_at DESC');
    return result.rows as Agent[];
  }

  async getAgentById(id: string): Promise<Agent | null> {
    const result = await this.pool.query('SELECT * FROM agents WHERE id = $1', [id]);
    return (result.rows[0] as Agent) || null;
  }

  async updateAgentTrustLevel(id: string, trustLevel: number): Promise<void> {
    await this.pool.query('UPDATE agents SET trust_level = $1 WHERE id = $2', [trustLevel, id]);
  }

  // Workflow operations
  async createWorkflow(
    workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Workflow> {
    const result = await this.pool.query(
      `INSERT INTO workflows (name, source, trigger, status, last_run_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        workflow.name,
        workflow.source,
        workflow.trigger,
        workflow.status,
        workflow.last_run_at,
        JSON.stringify(workflow.metadata || {}),
      ]
    );
    return result.rows[0] as Workflow;
  }

  async getWorkflows(): Promise<Workflow[]> {
    const result = await this.pool.query('SELECT * FROM workflows ORDER BY created_at DESC');
    return result.rows as Workflow[];
  }

  async getWorkflowById(id: string): Promise<Workflow | null> {
    const result = await this.pool.query('SELECT * FROM workflows WHERE id = $1', [id]);
    return (result.rows[0] as Workflow) || null;
  }

  async updateWorkflowStatus(id: string, status: string): Promise<void> {
    await this.pool.query('UPDATE workflows SET status = $1, last_run_at = CURRENT_TIMESTAMP WHERE id = $2', [
      status,
      id,
    ]);
  }

  // Event operations
  async createEvent(event: Omit<Event, 'id' | 'created_at'>): Promise<Event> {
    const result = await this.pool.query(
      `INSERT INTO events (workflow_id, ts, kind, correlation_id, idempotency_key, payload)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        event.workflow_id,
        event.ts,
        event.kind,
        event.correlation_id,
        event.idempotency_key,
        JSON.stringify(event.payload),
      ]
    );
    return result.rows[0] as Event;
  }

  async getEvents(limit = 100): Promise<Event[]> {
    const result = await this.pool.query('SELECT * FROM events ORDER BY ts DESC LIMIT $1', [
      limit,
    ]);
    return result.rows as Event[];
  }

  async getEventsByWorkflow(workflowId: string, limit = 100): Promise<Event[]> {
    const result = await this.pool.query(
      'SELECT * FROM events WHERE workflow_id = $1 ORDER BY ts DESC LIMIT $2',
      [workflowId, limit]
    );
    return result.rows as Event[];
  }

  // Telemetry operations
  async createTelemetry(telemetry: Omit<Telemetry, 'id' | 'created_at'>): Promise<Telemetry> {
    const result = await this.pool.query(
      `INSERT INTO telemetry (agent_id, ts, latency_ms, errors, policy_violations, success_count, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        telemetry.agent_id,
        telemetry.ts,
        telemetry.latency_ms,
        telemetry.errors,
        telemetry.policy_violations,
        telemetry.success_count,
        JSON.stringify(telemetry.metadata || {}),
      ]
    );
    return result.rows[0] as Telemetry;
  }

  async getTelemetryByAgent(agentId: string, limit = 100): Promise<Telemetry[]> {
    const result = await this.pool.query(
      'SELECT * FROM telemetry WHERE agent_id = $1 ORDER BY ts DESC LIMIT $2',
      [agentId, limit]
    );
    return result.rows as Telemetry[];
  }

  // Metrics operations
  async createMetric(metric: Omit<Metric, 'id' | 'created_at'>): Promise<Metric> {
    const result = await this.pool.query(
      `INSERT INTO metrics (ts, trust_score, risk_avoided_usd, sync_freshness_pct, drift_rate_pct, 
                           compliance_sla_pct, active_agents, active_workflows, total_events, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        metric.ts,
        metric.trust_score,
        metric.risk_avoided_usd,
        metric.sync_freshness_pct,
        metric.drift_rate_pct,
        metric.compliance_sla_pct,
        metric.active_agents,
        metric.active_workflows,
        metric.total_events,
        JSON.stringify(metric.metadata || {}),
      ]
    );
    return result.rows[0] as Metric;
  }

  async getLatestMetric(): Promise<Metric | null> {
    const result = await this.pool.query('SELECT * FROM metrics ORDER BY ts DESC LIMIT 1');
    return (result.rows[0] as Metric) || null;
  }

  async getMetrics(limit = 100): Promise<Metric[]> {
    const result = await this.pool.query('SELECT * FROM metrics ORDER BY ts DESC LIMIT $1', [
      limit,
    ]);
    return result.rows as Metric[];
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  // Get pool for raw queries
  getPool(): pg.Pool {
    return this.pool;
  }
}

export function createContextBus(config: ContextBusConfig): ContextBus {
  return new ContextBus(config);
}
