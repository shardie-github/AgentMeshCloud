# Context Bus Specification v1.0

## Overview

The Context Bus is a federated message exchange system for agent-to-agent communication, workflow coordination, and context sharing across the ORCA AgentMesh platform.

## Design Principles

1. **Event-Driven**: Publish/subscribe pattern for loose coupling
2. **Schema-Validated**: All messages validated against JSON Schema
3. **Multi-Tenant**: Isolated message streams per tenant_id
4. **Idempotent**: Deduplication via message_id + idempotency_key
5. **Traceable**: Full correlation via trace_id and span_id
6. **Privacy-Aware**: PII classification and redaction support

## Message Envelope

All messages on the Context Bus MUST conform to this envelope:

```typescript
interface MessageEnvelope {
  // Required fields
  message_id: string;           // UUID v4
  event_type: string;           // e.g., "agent.registered", "workflow.completed"
  version: string;              // Semantic version, e.g., "1.0"
  timestamp: string;            // ISO 8601 UTC
  tenant_id: string;            // Multi-tenant isolation
  
  // Correlation & tracing
  trace_id?: string;            // OpenTelemetry trace ID
  span_id?: string;             // OpenTelemetry span ID
  parent_message_id?: string;   // For chaining messages
  correlation_id?: string;      // Business correlation
  
  // Idempotency
  idempotency_key?: string;     // Client-provided dedup key
  
  // Metadata
  source: {
    service: string;            // Producer service name
    version: string;            // Producer version
    instance_id?: string;       // Pod/instance ID
  };
  
  // Privacy & security
  classification?: 'public' | 'internal' | 'confidential' | 'restricted';
  contains_pii?: boolean;
  encryption_key_id?: string;
  
  // Delivery
  priority?: 'low' | 'normal' | 'high' | 'critical';
  ttl_seconds?: number;         // Message expiry
  
  // Payload
  payload: Record<string, any>; // Event-specific data
}
```

## Required Headers

When messages are transmitted via HTTP or message queue, these headers MUST be set:

- `X-Message-ID`: Same as `message_id` in envelope
- `X-Trace-ID`: OpenTelemetry trace ID
- `X-Tenant-ID`: Tenant identifier
- `Content-Type`: `application/json`
- `X-Signature`: HMAC-SHA256 signature for verification (adapters only)

## Event Types

Event types follow a hierarchical naming convention:

```
<domain>.<entity>.<action>
```

Examples:
- `agent.created`
- `agent.updated`
- `agent.suspended`
- `workflow.started`
- `workflow.completed`
- `workflow.failed`
- `policy.evaluated`
- `policy.violated`
- `context.shared`
- `context.invalidated`

## Schema Validation

All payloads MUST be validated against registered JSON Schemas before publishing.

Schema registry location: `/context-bus/schema.json`

Example schema reference:

```json
{
  "event_type": "agent.registered",
  "schema": "#/definitions/AgentRegisteredPayload"
}
```

## Idempotency

Consumers MUST handle duplicate messages gracefully. The Context Bus guarantees:

- **At-least-once delivery**: Messages may be delivered multiple times
- **Deduplication window**: 24 hours
- **Dedup key**: `message_id` + `idempotency_key` (if provided)

Consumers should track processed message IDs in a dedup table:

```sql
CREATE TABLE message_dedup (
  message_id TEXT PRIMARY KEY,
  idempotency_key TEXT,
  processed_at TIMESTAMP DEFAULT NOW(),
  ttl TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
);
CREATE INDEX idx_message_dedup_ttl ON message_dedup(ttl);
```

## Correlation

Messages can be correlated via:

1. **trace_id**: Links all messages in a distributed trace
2. **correlation_id**: Links messages in a business process
3. **parent_message_id**: Links request/response pairs

## PII Classification

Messages containing PII MUST set `contains_pii: true`.

Supported classification levels:
- `public`: Safe to log, export, share
- `internal`: Internal use only
- `confidential`: Restricted access, audit logged
- `restricted`: Highest sensitivity, encryption required

PII fields should be:
1. Marked in schema with `"pii": true`
2. Redacted in logs
3. Encrypted at rest if `classification = 'restricted'`

## Adapter Compliance

External adapters (Zapier, n8n, Airflow, Lambda) MUST:

1. ✅ Send properly formatted `MessageEnvelope`
2. ✅ Include `X-Signature` header with HMAC-SHA256 signature
3. ✅ Set correct `tenant_id` and `source.service`
4. ✅ Validate payload against schema before sending
5. ✅ Handle 4xx/5xx responses with exponential backoff
6. ✅ Respect rate limits (see HTTP 429 + `Retry-After` header)
7. ✅ Not include PII in public classification messages

## Error Handling

### Producer Errors

- **400 Bad Request**: Invalid envelope or payload schema
- **401 Unauthorized**: Missing or invalid credentials
- **403 Forbidden**: Insufficient permissions for event_type
- **413 Payload Too Large**: Message exceeds size limit (1 MB default)
- **422 Unprocessable Entity**: Schema validation failed
- **429 Too Many Requests**: Rate limit exceeded (check `Retry-After`)
- **503 Service Unavailable**: Bus temporarily unavailable

### Consumer Errors

Consumers should:
- Return 200/204 on successful processing
- Return 4xx for permanent failures (will NOT retry)
- Return 5xx for transient failures (will retry with backoff)

## Rate Limits

Default limits per tenant:

| Tier | Messages/sec | Burst | Daily Quota |
|------|--------------|-------|-------------|
| Free | 10 | 50 | 50,000 |
| Pro | 100 | 500 | 1,000,000 |
| Enterprise | 1,000 | 5,000 | Unlimited |

## Message Size Limits

- **Max envelope size**: 1 MB
- **Max payload size**: 512 KB (recommended)
- **Max batch size**: 100 messages

Large payloads should use external storage (S3, signed URLs).

## Retention

Messages are retained according to tenant plan:

- **Free**: 7 days
- **Pro**: 30 days
- **Enterprise**: 90 days (configurable)

## Dead Letter Queue (DLQ)

Messages that fail processing after max retries (default: 3) are moved to DLQ:

- Accessible via `/context-bus/dlq` endpoint
- Retained for 14 days
- Can be replayed manually

## Observability

All bus operations emit:

1. **Metrics**: publish_count, consume_count, error_count, latency_ms
2. **Traces**: Full OpenTelemetry spans
3. **Logs**: Structured JSON logs (PII redacted)

## Security

### Authentication

- API Key: `Authorization: Bearer <api_key>`
- JWT: Service-to-service tokens with `context_bus:publish` scope

### Authorization

- Producers need `context_bus:publish:<event_type>` permission
- Consumers need `context_bus:subscribe:<event_type>` permission

### Encryption

- TLS 1.3 in transit
- AES-256-GCM at rest for `restricted` classification

## Versioning

Event schemas are versioned. Consumers MUST handle:

- **Minor version changes**: Backward compatible (new optional fields)
- **Major version changes**: Breaking changes (different event_type suffix)

Example:
- `agent.registered` v1.0 → v1.1 (backward compatible)
- `agent.registered` v1.x → `agent.registered.v2` (breaking change)

## Example: Publishing a Message

```typescript
import { publishMessage } from '@/context-bus/publish';

await publishMessage({
  event_type: 'agent.registered',
  version: '1.0',
  tenant_id: 'tenant_abc',
  source: {
    service: 'agent-registry',
    version: '2.1.0'
  },
  classification: 'internal',
  payload: {
    agent_id: 'agent_123',
    name: 'My Agent',
    type: 'chatbot',
    owner_id: 'user_456'
  }
});
```

## Example: Subscribing to Messages

```typescript
import { subscribe } from '@/context-bus/subscribe';

subscribe('agent.registered', async (message) => {
  console.log('Agent registered:', message.payload.agent_id);
  
  // Process message idempotently
  const processed = await checkIfProcessed(message.message_id);
  if (processed) return;
  
  await handleAgentRegistration(message.payload);
  await markAsProcessed(message.message_id);
});
```

## Compliance Checklist

Use `/context-bus/adapters.compliance.ts` to validate adapter implementations:

- [ ] Envelope structure matches spec
- [ ] Required fields present
- [ ] Schema validation passes
- [ ] Signature verification works
- [ ] Rate limiting respected
- [ ] Idempotency implemented
- [ ] Error handling correct
- [ ] PII properly classified
- [ ] Tracing headers propagated

## References

- JSON Schema: `/context-bus/schema.json`
- Compliance Validator: `/context-bus/adapters.compliance.ts`
- Publisher API: `/context-bus/publish.ts`
- Subscriber API: `/context-bus/subscribe.ts`

---

**Version**: 1.0  
**Last Updated**: 2025-10-31  
**Owner**: @integration-team
