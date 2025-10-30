-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'mcp', 'zapier', 'n8n', etc.
  owner VARCHAR(255),
  model VARCHAR(100),
  prompt_hash VARCHAR(64),
  access_tier VARCHAR(20) DEFAULT 'standard', -- 'public', 'standard', 'privileged'
  trust_level DECIMAL(3,2) DEFAULT 0.50, -- 0.00 to 1.00
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_trust_level ON agents(trust_level);
CREATE INDEX idx_agents_created_at ON agents(created_at);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'zapier', 'n8n', 'manual', etc.
  trigger VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'error'
  last_run_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflows_source ON workflows(source);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_last_run_at ON workflows(last_run_at);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  ts TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  kind VARCHAR(50) NOT NULL, -- 'execution', 'error', 'webhook', etc.
  correlation_id VARCHAR(100),
  idempotency_key VARCHAR(100),
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_workflow_id ON events(workflow_id);
CREATE INDEX idx_events_ts ON events(ts);
CREATE INDEX idx_events_kind ON events(kind);
CREATE INDEX idx_events_correlation_id ON events(correlation_id);
CREATE INDEX idx_events_idempotency_key ON events(idempotency_key);

-- Telemetry table
CREATE TABLE IF NOT EXISTS telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  ts TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  latency_ms INTEGER,
  errors INTEGER DEFAULT 0,
  policy_violations INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telemetry_agent_id ON telemetry(agent_id);
CREATE INDEX idx_telemetry_ts ON telemetry(ts);

-- Metrics table (aggregated KPIs)
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  trust_score DECIMAL(5,4), -- 0.0000 to 1.0000
  risk_avoided_usd DECIMAL(12,2),
  sync_freshness_pct DECIMAL(5,2), -- 0.00 to 100.00
  drift_rate_pct DECIMAL(5,2), -- 0.00 to 100.00
  compliance_sla_pct DECIMAL(5,2), -- 0.00 to 100.00
  active_agents INTEGER DEFAULT 0,
  active_workflows INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_ts ON metrics(ts);
CREATE INDEX idx_metrics_trust_score ON metrics(trust_score);

-- Embeddings table (for context bus vector search)
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  vector vector(1536), -- OpenAI ada-002 dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_embeddings_agent_id ON embeddings(agent_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);

-- Policy violations table
CREATE TABLE IF NOT EXISTS policy_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  rule_name VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  description TEXT,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_policy_violations_agent_id ON policy_violations(agent_id);
CREATE INDEX idx_policy_violations_severity ON policy_violations(severity);
CREATE INDEX idx_policy_violations_resolved ON policy_violations(resolved);

-- Drift detections table
CREATE TABLE IF NOT EXISTS drift_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  drift_type VARCHAR(50) NOT NULL, -- 'config', 'behavior', 'performance'
  drift_score DECIMAL(5,2), -- 0.00 to 100.00
  description TEXT,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_drift_detections_workflow_id ON drift_detections(workflow_id);
CREATE INDEX idx_drift_detections_drift_type ON drift_detections(drift_type);
CREATE INDEX idx_drift_detections_resolved ON drift_detections(resolved);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE OR REPLACE VIEW agent_health AS
SELECT 
  a.id,
  a.name,
  a.type,
  a.trust_level,
  COUNT(DISTINCT t.id) as telemetry_count,
  AVG(t.latency_ms) as avg_latency_ms,
  SUM(t.errors) as total_errors,
  SUM(t.policy_violations) as total_policy_violations,
  MAX(t.ts) as last_telemetry_at
FROM agents a
LEFT JOIN telemetry t ON a.id = t.agent_id
GROUP BY a.id, a.name, a.type, a.trust_level;

CREATE OR REPLACE VIEW workflow_health AS
SELECT 
  w.id,
  w.name,
  w.source,
  w.status,
  w.last_run_at,
  COUNT(DISTINCT e.id) as event_count,
  COUNT(DISTINCT CASE WHEN e.kind = 'error' THEN e.id END) as error_count,
  MAX(e.ts) as last_event_at
FROM workflows w
LEFT JOIN events e ON w.id = e.workflow_id
GROUP BY w.id, w.name, w.source, w.status, w.last_run_at;
