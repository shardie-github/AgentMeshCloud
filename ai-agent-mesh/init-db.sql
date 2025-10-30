-- AI-Agent Mesh Database Initialization
-- PostgreSQL 14+

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- AGENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('chatbot', 'copilot', 'pipeline', 'service')),
    vendor VARCHAR(50) NOT NULL,
    model VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deprecated', 'quarantined')),
    compliance_tier VARCHAR(50) DEFAULT 'standard' CHECK (compliance_tier IN ('none', 'standard', 'high', 'critical')),
    mcp_config JSONB,
    policies JSONB,
    context_sources JSONB,
    owners TEXT[],
    observability JSONB,
    deployment JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_vendor ON agents(vendor);
CREATE INDEX idx_agents_compliance ON agents(compliance_tier);
CREATE INDEX idx_agents_created ON agents(created_at);

-- ============================================================================
-- POLICIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS policies (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    version VARCHAR(50) NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    framework VARCHAR(255),
    rules JSONB,
    enforcement VARCHAR(50) DEFAULT 'blocking' CHECK (enforcement IN ('blocking', 'logging', 'advisory')),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_policies_type ON policies(type);
CREATE INDEX idx_policies_enabled ON policies(enabled);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    request_id VARCHAR(255),
    agent_id VARCHAR(255) REFERENCES agents(id),
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    request_data JSONB,
    policy_evaluation JSONB,
    response_data JSONB,
    metadata JSONB,
    signature VARCHAR(500)
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_agent ON audit_logs(agent_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_request ON audit_logs(request_id);

-- ============================================================================
-- TELEMETRY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS telemetry_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    agent_id VARCHAR(255) REFERENCES agents(id),
    metric_type VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    labels JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telemetry_timestamp ON telemetry_metrics(timestamp);
CREATE INDEX idx_telemetry_agent ON telemetry_metrics(agent_id);
CREATE INDEX idx_telemetry_type ON telemetry_metrics(metric_type);

-- ============================================================================
-- DRIFT MEASUREMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS drift_measurements (
    measurement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) REFERENCES agents(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    drift_scores JSONB,
    overall_drift NUMERIC,
    alert_triggered BOOLEAN DEFAULT FALSE,
    baseline_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drift_timestamp ON drift_measurements(timestamp);
CREATE INDEX idx_drift_agent ON drift_measurements(agent_id);
CREATE INDEX idx_drift_alert ON drift_measurements(alert_triggered);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default policies
INSERT INTO policies (id, name, version, type, description, framework, rules, enforcement)
VALUES 
    ('pii-redaction', 'PII Detection and Redaction', '1.5', 'data_protection', 
     'Automatically redacts PII from prompts and logs', 'GDPR Article 32, CCPA',
     '{"detect_pii": true, "pii_types": ["ssn", "email", "credit_card"], "action": "redact"}',
     'blocking'),
    
    ('rate-limit-per-user', 'Per-User Rate Limiting', '1.0', 'rate_limiting',
     'Prevents abuse and manages costs', 'Internal Policy',
     '{"max_requests_per_minute": 60, "max_requests_per_hour": 1000}',
     'blocking'),
    
    ('content-safety-customer-facing', 'Content Safety for Customer Interactions', '2.1', 'content_safety',
     'Blocks harmful content in customer-facing agents', 'OWASP LLM Top 10',
     '{"block_harmful_content": true, "categories": ["violence", "hate_speech"], "threshold": 0.7}',
     'blocking')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mesh;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mesh;
