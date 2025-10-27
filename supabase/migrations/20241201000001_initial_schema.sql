-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create custom types
CREATE TYPE agent_status AS ENUM ('online', 'offline', 'processing', 'error', 'maintenance');
CREATE TYPE capability_type AS ENUM ('llm', 'tool', 'data', 'workflow', 'notification', 'analytics');
CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'archived', 'error');
CREATE TYPE execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout');
CREATE TYPE message_priority AS ENUM ('low', 'normal', 'high', 'critical');
CREATE TYPE message_type AS ENUM ('request', 'response', 'notification', 'broadcast', 'heartbeat', 'discovery', 'negotiation', 'error');

-- Create agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL CHECK (version ~ '^\d+\.\d+\.\d+$'),
    status agent_status NOT NULL DEFAULT 'offline',
    capabilities JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(tenant_id, name)
);

-- Create agent capabilities table
CREATE TABLE agent_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type capability_type NOT NULL,
    inputs JSONB NOT NULL DEFAULT '[]',
    outputs JSONB NOT NULL DEFAULT '[]',
    constraints JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, name)
);

-- Create workflows table
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL CHECK (version ~ '^\d+\.\d+\.\d+$'),
    status workflow_status NOT NULL DEFAULT 'draft',
    definition JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_executed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(tenant_id, name)
);

-- Create workflow executions table
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status execution_status NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in milliseconds
    inputs JSONB NOT NULL DEFAULT '{}',
    outputs JSONB,
    logs JSONB NOT NULL DEFAULT '[]',
    metrics JSONB NOT NULL DEFAULT '{}',
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create MCP adapters table
CREATE TABLE mcp_adapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    capabilities JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'disconnected',
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Create A2A brokers table
CREATE TABLE a2a_brokers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'disconnected',
    connections INTEGER NOT NULL DEFAULT 0,
    messages_per_second INTEGER NOT NULL DEFAULT 0,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Create A2A channels table
CREATE TABLE a2a_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    subscribers JSONB NOT NULL DEFAULT '[]',
    message_count INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    broker_id UUID NOT NULL REFERENCES a2a_brokers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(broker_id, name)
);

-- Create audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    user_id UUID,
    tenant_id UUID NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create semantic memory table
CREATE TABLE semantic_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI embedding dimension
    metadata JSONB NOT NULL DEFAULT '{}',
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_agents_tenant_id ON agents(tenant_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_created_at ON agents(created_at);

CREATE INDEX idx_workflows_tenant_id ON workflows(tenant_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_name ON workflows(name);
CREATE INDEX idx_workflows_created_at ON workflows(created_at);

CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_tenant_id ON workflow_executions(tenant_id);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at);

CREATE INDEX idx_agent_capabilities_agent_id ON agent_capabilities(agent_id);
CREATE INDEX idx_agent_capabilities_type ON agent_capabilities(type);

CREATE INDEX idx_mcp_adapters_tenant_id ON mcp_adapters(tenant_id);
CREATE INDEX idx_mcp_adapters_type ON mcp_adapters(type);
CREATE INDEX idx_mcp_adapters_status ON mcp_adapters(status);

CREATE INDEX idx_a2a_brokers_tenant_id ON a2a_brokers(tenant_id);
CREATE INDEX idx_a2a_brokers_type ON a2a_brokers(type);
CREATE INDEX idx_a2a_brokers_status ON a2a_brokers(status);

CREATE INDEX idx_a2a_channels_broker_id ON a2a_channels(broker_id);
CREATE INDEX idx_a2a_channels_tenant_id ON a2a_channels(tenant_id);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX idx_sessions_status ON sessions(status);

CREATE INDEX idx_semantic_memory_agent_id ON semantic_memory(agent_id);
CREATE INDEX idx_semantic_memory_tenant_id ON semantic_memory(tenant_id);
CREATE INDEX idx_semantic_memory_embedding ON semantic_memory USING ivfflat (embedding vector_cosine_ops);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcp_adapters_updated_at BEFORE UPDATE ON mcp_adapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_a2a_brokers_updated_at BEFORE UPDATE ON a2a_brokers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_a2a_channels_updated_at BEFORE UPDATE ON a2a_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_semantic_memory_updated_at BEFORE UPDATE ON semantic_memory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_adapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2a_brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2a_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_memory ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agents
CREATE POLICY "Users can view agents in their tenant" ON agents
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert agents in their tenant" ON agents
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update agents in their tenant" ON agents
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete agents in their tenant" ON agents
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for workflows
CREATE POLICY "Users can view workflows in their tenant" ON workflows
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert workflows in their tenant" ON workflows
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update workflows in their tenant" ON workflows
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete workflows in their tenant" ON workflows
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for workflow executions
CREATE POLICY "Users can view workflow executions in their tenant" ON workflow_executions
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert workflow executions in their tenant" ON workflow_executions
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for agent capabilities
CREATE POLICY "Users can view agent capabilities in their tenant" ON agent_capabilities
    FOR SELECT USING (agent_id IN (SELECT id FROM agents WHERE tenant_id = auth.jwt() ->> 'tenant_id'::text));

CREATE POLICY "Users can insert agent capabilities in their tenant" ON agent_capabilities
    FOR INSERT WITH CHECK (agent_id IN (SELECT id FROM agents WHERE tenant_id = auth.jwt() ->> 'tenant_id'::text));

CREATE POLICY "Users can update agent capabilities in their tenant" ON agent_capabilities
    FOR UPDATE USING (agent_id IN (SELECT id FROM agents WHERE tenant_id = auth.jwt() ->> 'tenant_id'::text));

CREATE POLICY "Users can delete agent capabilities in their tenant" ON agent_capabilities
    FOR DELETE USING (agent_id IN (SELECT id FROM agents WHERE tenant_id = auth.jwt() ->> 'tenant_id'::text));

-- Create RLS policies for MCP adapters
CREATE POLICY "Users can view MCP adapters in their tenant" ON mcp_adapters
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert MCP adapters in their tenant" ON mcp_adapters
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update MCP adapters in their tenant" ON mcp_adapters
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete MCP adapters in their tenant" ON mcp_adapters
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for A2A brokers
CREATE POLICY "Users can view A2A brokers in their tenant" ON a2a_brokers
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert A2A brokers in their tenant" ON a2a_brokers
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update A2A brokers in their tenant" ON a2a_brokers
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete A2A brokers in their tenant" ON a2a_brokers
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for A2A channels
CREATE POLICY "Users can view A2A channels in their tenant" ON a2a_channels
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert A2A channels in their tenant" ON a2a_channels
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update A2A channels in their tenant" ON a2a_channels
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete A2A channels in their tenant" ON a2a_channels
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for audit logs
CREATE POLICY "Users can view audit logs in their tenant" ON audit_logs
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert audit logs in their tenant" ON audit_logs
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for sessions
CREATE POLICY "Users can view sessions in their tenant" ON sessions
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert sessions in their tenant" ON sessions
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update sessions in their tenant" ON sessions
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for semantic memory
CREATE POLICY "Users can view semantic memory in their tenant" ON semantic_memory
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert semantic memory in their tenant" ON semantic_memory
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update semantic memory in their tenant" ON semantic_memory
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete semantic memory in their tenant" ON semantic_memory
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);