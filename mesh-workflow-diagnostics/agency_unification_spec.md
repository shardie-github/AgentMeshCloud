# Agency Unification Specification
**Version:** 1.0.0  
**Generated:** 2025-10-30T00:00:00Z  
**Purpose:** Standardize context sharing, policy enforcement, observability, and error semantics across all agents and automations

---

## Executive Summary

This specification defines how to unify agency across heterogeneous automation platforms (MCP-native agents, Zapier, Make, n8n, Airflow, AWS Lambda, custom CRON jobs, and webhooks) under a single governance model.

**Key Principles:**
1. **Universal Context Bus** - All agents share context via MCP federation
2. **Unified Policy Enforcement** - Single OPA-based policy engine
3. **Standard Observability** - OpenTelemetry for all automations
4. **Consistent Error Taxonomy** - Retryable, non-retryable, compensatable

---

## 1. Context Sharing & Federation

### 1.1 Context Bus Architecture

```typescript
interface ContextMessage {
  correlation_id: string;         // Links related operations
  source: string;                 // Agent/automation that produced context
  timestamp: string;              // ISO 8601
  context_type: ContextType;      // 'prompt' | 'data' | 'decision' | 'event'
  payload: any;                   // The actual context
  ttl: number;                    // Seconds until expiration
  privacy_level: PrivacyLevel;    // 'public' | 'internal' | 'confidential' | 'restricted'
  embeddings?: number[];          // Vector embeddings for semantic search
}

enum ContextType {
  PROMPT = 'prompt',              // LLM prompts and system instructions
  DATA = 'data',                  // Structured data (JSON, CSV, etc.)
  DECISION = 'decision',          // Policy decisions, approvals, rejections
  EVENT = 'event'                 // State changes, triggers, notifications
}

enum PrivacyLevel {
  PUBLIC = 'public',              // No restrictions
  INTERNAL = 'internal',          // Organization-wide
  CONFIDENTIAL = 'confidential',  // Need-to-know basis
  RESTRICTED = 'restricted'       // Explicit permission required
}
```

### 1.2 Context API

All adapters must implement:

```typescript
interface ContextBus {
  // Publish context for other agents
  publish(message: ContextMessage): Promise<void>;
  
  // Subscribe to context by correlation ID
  subscribe(correlationId: string, callback: (msg: ContextMessage) => void): () => void;
  
  // Query context by filters
  query(filters: ContextQuery): Promise<ContextMessage[]>;
  
  // Get context history for a correlation ID
  getHistory(correlationId: string): Promise<ContextMessage[]>;
}

interface ContextQuery {
  correlation_id?: string;
  source?: string;
  context_type?: ContextType;
  privacy_level?: PrivacyLevel;
  since?: Date;
  limit?: number;
}
```

### 1.3 Context Deduplication

To prevent context pollution:

```typescript
interface DeduplicationConfig {
  strategy: 'hash' | 'embedding' | 'hybrid';
  embedding_threshold: number;    // Cosine similarity threshold (0.0-1.0)
  ttl: number;                    // How long to remember seen contexts
  use_distributed_lock: boolean;  // Prevent race conditions
}

// Default config
const DEFAULT_DEDUP = {
  strategy: 'hybrid',
  embedding_threshold: 0.95,
  ttl: 3600,                       // 1 hour
  use_distributed_lock: true
};
```

---

## 2. Unified Policy Enforcement

### 2.1 Policy Decision Point (PDP)

All agents must check policies before execution:

```typescript
interface PolicyEnforcementPoint {
  // Evaluate policy before action
  enforce(context: PolicyContext): Promise<PolicyDecision>;
  
  // Cache policy decisions (with TTL)
  cacheDecision(decision: PolicyDecision, ttl: number): void;
}

interface PolicyContext {
  agent_id: string;
  operation: string;              // 'read' | 'write' | 'execute' | 'delete'
  resource: string;               // Resource being accessed
  principal: string;              // User/service making request
  environment: {
    time: Date;
    ip_address: string;
    location?: string;
  };
  data_classification?: string;   // 'public' | 'internal' | 'confidential' | 'restricted'
}

interface PolicyDecision {
  result: 'allow' | 'deny';
  reason: string;
  policy_id: string;
  enforcement_action?: string;    // 'log' | 'block' | 'redact' | 'alert'
  ttl: number;                    // Cache TTL in seconds
}
```

### 2.2 Policy Evaluation Flow

```
Agent Action Request
    ↓
Check Cache (60s TTL)
    ↓ (cache miss)
Call OPA Policy Engine
    ↓
Evaluate Rules:
  - RBAC (role-based access)
  - ABAC (attribute-based access)
  - Data classification
  - Time-of-day restrictions
  - Geographic restrictions
    ↓
Return Decision (allow/deny)
    ↓
Cache Decision
    ↓
Log Audit Trail
```

### 2.3 Standard Policies

All agents must enforce:

| Policy ID | Description | Enforcement |
|-----------|-------------|-------------|
| `rbac-*` | Role-based access control | Blocking |
| `pii-redaction` | PII detection and redaction | Blocking |
| `data-classification` | Data access by classification | Blocking |
| `rate-limit-*` | Rate limiting per user/IP | Throttling |
| `content-safety` | Harmful content detection | Blocking |
| `audit-trail-*` | Audit logging requirements | Logging |

---

## 3. Standard Observability

### 3.1 OpenTelemetry Integration

All agents must export telemetry:

```typescript
interface Telemetry {
  // Traces (distributed tracing)
  startSpan(name: string, context: SpanContext): Span;
  endSpan(span: Span, status: 'success' | 'error'): void;
  
  // Metrics
  recordMetric(metric: Metric): void;
  
  // Logs (structured)
  log(level: LogLevel, message: string, attributes: Record<string, any>): void;
}

interface SpanContext {
  trace_id: string;               // Distributed trace ID
  span_id: string;                // Current span ID
  parent_span_id?: string;        // Parent span ID
  correlation_id: string;         // Business correlation ID
}

interface Metric {
  name: string;
  value: number;
  unit: string;
  labels: Record<string, string>;
  timestamp: Date;
}

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}
```

### 3.2 Standard Metrics

All agents must export:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `agent_operation_duration_ms` | Histogram | `agent_id`, `operation`, `status` | Operation latency |
| `agent_operation_count` | Counter | `agent_id`, `operation`, `status` | Total operations |
| `agent_policy_check_duration_ms` | Histogram | `agent_id`, `policy_id`, `result` | Policy check latency |
| `agent_context_shared_count` | Counter | `agent_id`, `context_type` | Contexts shared |
| `agent_retry_count` | Counter | `agent_id`, `operation`, `attempt` | Retry attempts |
| `agent_circuit_breaker_state` | Gauge | `agent_id`, `state` | Circuit breaker state (0=closed, 1=open) |
| `agent_dlq_depth` | Gauge | `agent_id` | DLQ queue depth |

### 3.3 Standard Log Attributes

All logs must include:

```typescript
interface StandardLogAttributes {
  correlation_id: string;         // Business correlation ID
  trace_id: string;               // OpenTelemetry trace ID
  span_id: string;                // OpenTelemetry span ID
  agent_id: string;               // Agent identifier
  operation: string;              // Operation name
  timestamp: string;              // ISO 8601
  status: 'success' | 'error';    // Operation status
  duration_ms?: number;           // Operation duration
  error_message?: string;         // Error details (if failed)
  error_type?: ErrorType;         // Error classification
}
```

---

## 4. Error Taxonomy & Handling

### 4.1 Error Classification

```typescript
enum ErrorType {
  // Retryable errors (transient failures)
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  
  // Non-retryable errors (permanent failures)
  INVALID_INPUT = 'invalid_input',
  AUTHENTICATION_FAILED = 'authentication_failed',
  AUTHORIZATION_FAILED = 'authorization_failed',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  
  // Compensatable errors (need rollback)
  PARTIAL_FAILURE = 'partial_failure',
  CONSTRAINT_VIOLATION = 'constraint_violation',
  SAGA_ROLLBACK_REQUIRED = 'saga_rollback_required'
}

interface AgentError {
  type: ErrorType;
  message: string;
  code: string;                   // Error code (e.g., "E001")
  is_retryable: boolean;
  requires_compensation: boolean;
  correlation_id: string;
  trace_id: string;
  metadata: Record<string, any>;
}
```

### 4.2 Error Handling Flow

```typescript
interface ErrorHandler {
  handle(error: AgentError): Promise<ErrorAction>;
}

interface ErrorAction {
  action: 'retry' | 'dlq' | 'compensate' | 'fail';
  retry_after?: number;           // Seconds to wait before retry
  max_retries?: number;
  compensation_steps?: CompensationStep[];
}

interface CompensationStep {
  name: string;
  compensate: () => Promise<void>;
}
```

### 4.3 Standard Error Handling

| Error Type | Action | Retry | DLQ | Compensation |
|------------|--------|-------|-----|--------------|
| `network_error` | Retry | 3x exponential backoff | Yes | No |
| `timeout` | Retry | 3x exponential backoff | Yes | No |
| `rate_limit` | Retry | Linear backoff | No | No |
| `service_unavailable` | Circuit breaker | No | Yes | No |
| `invalid_input` | Fail immediately | No | Yes | No |
| `authentication_failed` | Fail immediately | No | Yes | No |
| `authorization_failed` | Fail immediately | No | Yes | No |
| `partial_failure` | Compensate | No | Yes | Yes (SAGA) |
| `saga_rollback_required` | Compensate | No | Yes | Yes (SAGA) |

---

## 5. Correlation & Causality Tracking

### 5.1 Correlation ID Propagation

All agents must propagate correlation IDs:

```typescript
interface CorrelationPropagation {
  // Extract correlation ID from request
  extract(headers: Record<string, string>): string;
  
  // Inject correlation ID into outbound request
  inject(headers: Record<string, string>, correlationId: string): Record<string, string>;
}

// Standard headers
const CORRELATION_HEADERS = [
  'X-Correlation-ID',             // Primary
  'X-Request-ID',                 // Fallback
  'X-Trace-ID'                    // Fallback
];
```

### 5.2 Causality Tracking

For message ordering and causality:

```typescript
interface VectorClock {
  // Increment clock on local event
  tick(): void;
  
  // Merge clock on message receive
  merge(otherClock: VectorClock): void;
  
  // Check if event A happened before event B
  happenedBefore(other: VectorClock): boolean;
  
  // Serialize for transmission
  serialize(): string;
}

// Example: A2A messages with vector clocks
interface A2AMessage {
  correlation_id: string;
  from_agent: string;
  to_agent: string;
  payload: any;
  vector_clock: VectorClock;      // For ordering
  sequence_number: number;        // Per-sender sequence
}
```

---

## 6. Idempotency & Deduplication

### 6.1 Idempotency Keys

All mutation operations must support idempotency:

```typescript
interface IdempotencyManager {
  // Check if operation already processed
  check(key: string): Promise<{ processed: boolean; result?: any }>;
  
  // Store result for future checks
  store(key: string, result: any, ttl: number): Promise<void>;
}

// Idempotency key generation
function generateIdempotencyKey(operation: string, params: any): string {
  const data = JSON.stringify({ operation, params });
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

### 6.2 Deduplication Strategy

```typescript
interface DeduplicationStrategy {
  // Check if message is duplicate
  isDuplicate(message: any): Promise<boolean>;
  
  // Mark message as seen
  markSeen(message: any, ttl: number): Promise<void>;
}

// Example: Webhook deduplication
class WebhookDeduplication implements DeduplicationStrategy {
  async isDuplicate(webhook: any): Promise<boolean> {
    const key = this.generateKey(webhook);
    return await redis.exists(`webhook:${key}`);
  }
  
  async markSeen(webhook: any, ttl: number): Promise<void> {
    const key = this.generateKey(webhook);
    await redis.setex(`webhook:${key}`, ttl, '1');
  }
  
  private generateKey(webhook: any): string {
    // Use webhook ID, timestamp, and payload hash
    return `${webhook.id}:${webhook.timestamp}:${hash(webhook.payload)}`;
  }
}
```

---

## 7. Adapter Implementation Checklist

All platform adapters must implement:

### Core Features
- [ ] Context sharing via Context Bus API
- [ ] Policy enforcement via PEP API
- [ ] OpenTelemetry trace/metrics/logs export
- [ ] Correlation ID propagation
- [ ] Idempotency key support
- [ ] Error classification and handling
- [ ] Retry with exponential backoff
- [ ] DLQ integration for failed operations

### Advanced Features
- [ ] Circuit breaker pattern
- [ ] SAGA pattern for compensatable operations
- [ ] Vector clock for causality tracking
- [ ] Webhook signature validation
- [ ] Rate limiting integration
- [ ] Cache integration for policy decisions

### Observability
- [ ] Standard metrics exported
- [ ] Structured logging with correlation IDs
- [ ] Distributed tracing spans
- [ ] Health check endpoint
- [ ] DLQ depth monitoring

---

## 8. Integration Examples

### Example 1: Zapier to MCP Agent

```javascript
// Zapier trigger publishes context
const adapter = new ZapierMCPAdapter(config);
const correlationId = uuidv4();

// 1. Zapier receives external event
const zapierEvent = await zapierTrigger(z, bundle);

// 2. Publish to context bus
await adapter.publish({
  correlation_id: correlationId,
  source: 'zapier',
  context_type: 'event',
  payload: zapierEvent,
  ttl: 3600
});

// 3. MCP agent subscribes and receives context
mcpAgent.subscribe(correlationId, async (context) => {
  // Process event with full context
  await mcpAgent.process(context.payload);
});
```

### Example 2: Lambda to Airflow SAGA

```javascript
// Lambda initiates SAGA
const lambdaAdapter = new LambdaMCPAdapter(config);
const airflowAdapter = new AirflowMCPAdapter({ enableSAGA: true });

// Step 1: Lambda charges payment
const handler = lambdaAdapter.wrapHandler(async (event) => {
  const charge = await stripe.charges.create(...);
  return { chargeId: charge.id };
});

// Step 2: Airflow updates database (with compensation)
const task = airflowAdapter.wrapOperator(
  async (context) => {
    await db.insertOrder(...);
  },
  {
    taskId: 'update_db',
    compensate: async (result) => {
      await db.deleteOrder(result.orderId);
    }
  }
);

// If Airflow task fails, SAGA rolls back:
// 1. Airflow deletes order
// 2. Lambda refunds charge
```

---

## 9. Migration Path

### Phase 1: Foundation (Weeks 1-2)
1. Deploy Context Bus service
2. Deploy unified Policy Service (OPA)
3. Deploy Telemetry Collector (OpenTelemetry)
4. Deploy DLQ service

### Phase 2: Adapter Development (Weeks 3-4)
1. Implement Zapier adapter
2. Implement Make adapter
3. Implement n8n adapter
4. Implement Airflow adapter
5. Implement Lambda adapter

### Phase 3: Integration (Weeks 5-6)
1. Integrate existing MCP agents
2. Migrate Zapier workflows
3. Migrate Make scenarios
4. Migrate n8n workflows
5. Migrate Airflow DAGs
6. Migrate Lambda functions

### Phase 4: Validation (Weeks 7-8)
1. Validate context sharing
2. Validate policy enforcement
3. Validate observability
4. Validate error handling
5. Performance testing
6. Security audit

---

## 10. Success Metrics

| Metric | Baseline | Target | Impact |
|--------|----------|--------|--------|
| **Context Sharing Coverage** | 0% | 100% | Full agent awareness |
| **Policy Enforcement Coverage** | 60% | 100% | Consistent governance |
| **Observability Coverage** | 70% | 100% | Full visibility |
| **Correlation ID Coverage** | 20% | 100% | End-to-end tracing |
| **Idempotency Coverage** | 40% | 100% | No duplicates |
| **Error Handling Coverage** | 55% | 100% | Resilient operations |
| **MTTR** | 47 min | 8 min | -83% |
| **Policy Violations** | 12/month | <2/month | -83% |

---

**Next Steps:**
1. Review and approve specification
2. Deploy foundation services
3. Develop and test adapters
4. Migrate automations in phases
5. Monitor metrics and iterate

**Specification Owner:** platform@example.com, ops@example.com  
**Last Updated:** 2025-10-30
