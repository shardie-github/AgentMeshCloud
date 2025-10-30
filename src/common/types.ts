/**
 * Common Type Definitions - ORCA Core
 * Shared types across all modules
 */

/**
 * Agent status enumeration
 */
export enum AgentStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEPRECATED = 'deprecated',
  QUARANTINED = 'quarantined',
}

/**
 * Agent type enumeration
 */
export enum AgentType {
  CHATBOT = 'chatbot',
  COPILOT = 'copilot',
  PIPELINE = 'pipeline',
  SERVICE = 'service',
}

/**
 * Vendor enumeration
 */
export enum Vendor {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  AZURE = 'azure',
  AWS = 'aws',
  GOOGLE = 'google',
  CUSTOM = 'custom',
}

/**
 * Compliance tier enumeration
 */
export enum ComplianceTier {
  NONE = 'none',
  STANDARD = 'standard',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Data classification levels
 */
export enum Classification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  CRITICAL = 'critical',
}

/**
 * Policy enforcement modes
 */
export enum EnforcementMode {
  BLOCKING = 'blocking',
  LOGGING = 'logging',
  ADVISORY = 'advisory',
}

/**
 * Error categories for self-healing
 */
export enum ErrorCategory {
  RETRYABLE = 'retryable',
  NON_RETRYABLE = 'non_retryable',
  COMPENSATABLE = 'compensatable',
}

/**
 * Adapter types
 */
export enum AdapterType {
  MCP = 'mcp',
  ZAPIER = 'zapier',
  MAKE = 'make',
  N8N = 'n8n',
  AIRFLOW = 'airflow',
  LAMBDA = 'lambda',
  INTERNAL = 'internal',
}

/**
 * Event types
 */
export enum EventType {
  AGENT_REGISTERED = 'agent.registered',
  AGENT_UPDATED = 'agent.updated',
  AGENT_SUSPENDED = 'agent.suspended',
  AGENT_DELETED = 'agent.deleted',
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_FAILED = 'workflow.failed',
  DATA_SYNCHRONIZED = 'data.synchronized',
  DATA_DRIFT_DETECTED = 'data.drift_detected',
  POLICY_VIOLATED = 'policy.violated',
  TRUST_SCORE_UPDATED = 'trust.score_updated',
  SECURITY_THREAT_DETECTED = 'security.threat_detected',
}

/**
 * MCP Configuration interface
 */
export interface MCPConfig {
  protocol_version: string;
  capabilities: string[];
  context_window: number;
  temperature: number;
  top_p: number;
  max_tokens: number;
  system_prompt_template?: string;
}

/**
 * Policy reference interface
 */
export interface PolicyRef {
  policy_id: string;
  version: string;
  enforcement: EnforcementMode;
}

/**
 * Agent interface
 */
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  vendor: Vendor;
  model: string;
  status: AgentStatus;
  compliance_tier: ComplianceTier;
  mcp_config?: MCPConfig;
  policies: PolicyRef[];
  context_sources?: ContextSource[];
  owners: string[];
  observability?: ObservabilityConfig;
  deployment?: DeploymentConfig;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Context source interface
 */
export interface ContextSource {
  type: 'knowledge_base' | 'database' | 'api' | 'code_repository';
  id: string;
  priority: number;
  requires_auth?: boolean;
}

/**
 * Observability configuration interface
 */
export interface ObservabilityConfig {
  tracing_enabled: boolean;
  metrics_enabled: boolean;
  log_level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  log_retention_days: number;
  alert_on_error_rate?: number;
}

/**
 * Deployment configuration interface
 */
export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  region: string;
  availability_zone?: string;
  replica_count: number;
  auto_scaling?: AutoScalingConfig;
}

/**
 * Auto-scaling configuration interface
 */
export interface AutoScalingConfig {
  enabled: boolean;
  min_replicas: number;
  max_replicas: number;
  target_cpu_percent: number;
}

/**
 * Policy interface
 */
export interface Policy {
  id: string;
  name: string;
  version: string;
  type: string;
  enabled: boolean;
  enforcement: EnforcementMode;
  rules: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Trust Score interface
 */
export interface TrustScore {
  agent_id: string;
  score: number; // 0-100
  reliability: number;
  policy_adherence: number;
  context_freshness: number;
  risk_exposure: number;
  computed_at: Date;
}

/**
 * Trust KPIs interface
 */
export interface TrustKPIs {
  trust_score: number; // Overall TS
  risk_avoided_usd: number; // RA$
  sync_freshness_percent: number;
  drift_rate_percent: number;
  compliance_sla_percent: number;
  self_resolution_ratio: number;
  roi: number; // RA$ / platform cost
  period_start: Date;
  period_end: Date;
  computed_at: Date;
}

/**
 * Mesh Event interface (from schema)
 */
export interface MeshEvent {
  event_id: string;
  correlation_id?: string;
  causation_id?: string;
  event_type: EventType | string;
  source: {
    adapter: AdapterType;
    agent_id: string;
    integration_type?: string;
    region?: string;
  };
  timestamp: Date;
  version: string;
  data: Record<string, unknown>;
  metadata?: {
    tenant_id?: string;
    user_id?: string;
    session_id?: string;
    ip_address?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    retry_count?: number;
  };
  security?: {
    signature?: string;
    signature_algorithm?: 'hmac-sha256' | 'hmac-sha512';
    classification?: Classification;
    requires_encryption?: boolean;
  };
  error?: {
    code?: string;
    message?: string;
    category?: ErrorCategory;
    stack_trace?: string;
    context?: Record<string, unknown>;
  };
  telemetry?: {
    trace_id?: string;
    span_id?: string;
    parent_span_id?: string;
    trace_flags?: string;
  };
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    timestamp: Date;
    request_id: string;
    version: string;
  };
}

/**
 * Pagination interface
 */
export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: Pagination;
}

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  checks: {
    name: string;
    status: 'up' | 'down' | 'degraded';
    message?: string;
    latency_ms?: number;
  }[];
}

/**
 * Configuration interface
 */
export interface Config {
  environment: 'development' | 'staging' | 'production';
  port: number;
  log_level: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    ssl: boolean;
  };
  redis?: {
    host: string;
    port: number;
    db: number;
  };
  opentelemetry: {
    enabled: boolean;
    endpoint: string;
  };
  security: {
    jwt_secret: string;
    api_key_header: string;
  };
}
