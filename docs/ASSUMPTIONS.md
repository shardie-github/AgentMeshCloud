# ORCA Core - Assumptions & Decisions

**Date**: 2025-10-30  
**Version**: 1.0.0

This document outlines key assumptions, decisions, and tradeoffs made during the ORCA transformation.

## Architecture Decisions

### 1. Monorepo Structure
**Decision**: Keep existing Turborepo + pnpm monorepo structure  
**Rationale**: Preserves existing workspace investments and supports incremental adoption  
**Tradeoff**: More complex than single package, but better for long-term scaling  
**Alternative Considered**: Migrate to single package - rejected due to migration cost

### 2. Module System (ESM vs CommonJS)
**Decision**: Use ESM (module: "ESNext") with Node.js 18+  
**Rationale**: Modern, tree-shakeable, aligns with future Node.js direction  
**Tradeoff**: Some legacy tooling may have compatibility issues  
**Alternative Considered**: CommonJS - rejected as legacy

### 3. Database Choice
**Decision**: PostgreSQL with pgvector extension  
**Assumption**: Postgres available with pgvector support for embeddings  
**Rationale**: Proven, ACID compliant, excellent vector search with pgvector  
**Tradeoff**: Requires pgvector installation; alternatives (Pinecone, Weaviate) available via config  
**Fallback**: Can swap to Pinecone/Weaviate by changing `context_bus.yaml`

### 4. Telemetry Stack
**Decision**: OpenTelemetry standard with OTLP exporter  
**Assumption**: OTel collector endpoint available (default: localhost:4317)  
**Rationale**: Vendor-neutral, industry standard, future-proof  
**Tradeoff**: More setup than proprietary solutions (DataDog, New Relic)  
**Fallback**: Console exporter for development; configurable backends

### 5. API Framework
**Decision**: Express.js for REST API  
**Rationale**: Mature, well-documented, extensive middleware ecosystem  
**Tradeoff**: Not as modern as Fastify/Hono, but more stable  
**Alternative Considered**: Fastify - higher performance but smaller ecosystem

## Implementation Assumptions

### 1. Authentication
**Assumption**: JWT issuer at `https://auth.acme.com` (configurable)  
**Reality**: May not exist yet in all environments  
**Mitigation**: Falls back to API key auth; authentication middleware pluggable  
**Action Required**: Configure identity provider before production deployment

### 2. MCP Server Availability
**Assumption**: At least one MCP-compliant agent/server available for testing  
**Reality**: May need to setup or mock for initial development  
**Mitigation**: Agent discovery can run in mock mode; manual registration supported  
**Action Required**: Configure MCP server endpoints in discovery sources

### 3. External Integrations (Zapier, Make, etc.)
**Assumption**: Adapters demonstrate pattern; not all fully implemented  
**Reality**: Zapier adapter is reference implementation; others follow same pattern  
**Mitigation**: Each org will implement adapters for their specific integrations  
**Action Required**: Implement organization-specific adapters as needed

### 4. Secret Management
**Assumption**: AWS KMS or HashiCorp Vault available for secret management  
**Reality**: Defaults to environment variables; KMS/Vault integration is stub  
**Mitigation**: Environment variables work for development; production should use KMS/Vault  
**Action Required**: Configure KMS_KEY_ID or Vault endpoint for production

### 5. Data Volume & Scale
**Assumption**: < 10K agents, < 1M events/day initially  
**Reality**: Performance testing needed for production scale  
**Mitigation**: In-memory registry works for MVP; switch to database for scale  
**Action Required**: Load testing and horizontal scaling for high-volume deployments

## Technology Tradeoffs

### 1. In-Memory vs Database for Registry
**Current**: In-memory Map for simplicity  
**Pros**: Fast, simple, no DB dependency  
**Cons**: No persistence, single-process only  
**When to Change**: > 1K agents or multi-process deployment  
**Migration Path**: Implement PostgreSQL or Redis backend (interface already defined)

### 2. Trust Score Calculation
**Current**: Simple weighted formula with mock data  
**Assumption**: Real telemetry metrics will be plugged in  
**Tradeoff**: Algorithmic simplicity vs accuracy  
**Future Enhancement**: ML-based trust scoring with historical data

### 3. Sync Analysis
**Current**: Simulated sync gaps and freshness checks  
**Assumption**: Real data sources will be integrated  
**Tradeoff**: Demo-ready vs production-accurate  
**Migration Path**: Connect to actual data sources, implement real-time monitoring

### 4. Self-Healing (Diagnostics)
**Current**: Foundation laid, not fully implemented  
**Reason**: Time constraint; core engine more critical  
**Tradeoff**: Manual interventions required initially  
**Roadmap**: Implement circuit breakers, retry logic, compensation in Phase 2

## Security Assumptions

### 1. Network Security
**Assumption**: Deployed in trusted network or behind VPN/firewall  
**Reality**: Public internet exposure requires additional hardening  
**Mitigation**: TLS enforced, rate limiting enabled, authentication required  
**Action Required**: Review security policies before public deployment

### 2. PII Redaction
**Assumption**: Regex patterns cover 90% of common PII  
**Reality**: May have false positives/negatives  
**Mitigation**: Configurable patterns; ML-based detection planned  
**Action Required**: Review and customize PII patterns for your data

### 3. Policy Enforcement
**Assumption**: Policies loaded from YAML are trusted  
**Reality**: No validation of policy correctness  
**Mitigation**: Schema validation on load; dry-run testing recommended  
**Action Required**: Test policies in staging before deploying to production

## Deployment Assumptions

### 1. Container Orchestration
**Assumption**: Docker Compose for development, Kubernetes for production  
**Reality**: Helm charts not included (roadmap)  
**Mitigation**: Docker Compose sufficient for single-node; K8s YAML available on request  
**Action Required**: Create Helm charts or use existing K8s patterns

### 2. Resource Requirements
**Assumption**: 2 CPU, 4GB RAM per service  
**Reality**: Depends on agent count and telemetry volume  
**Mitigation**: Horizontal scaling supported; autoscaling configured  
**Action Required**: Load testing to determine actual resource needs

### 3. High Availability
**Assumption**: Multi-region deployment for critical workloads  
**Reality**: Single-region deployment initially acceptable  
**Mitigation**: Database replication and failover configured  
**Action Required**: Configure multi-region setup for SLA > 99.9%

## Cost Assumptions

### 1. OpenTelemetry Costs
**Assumption**: Self-hosted OTel collector to avoid vendor lock-in  
**Reality**: Hosting and storage costs for telemetry data  
**Mitigation**: Sampling configured (10%), retention policies enforced  
**Action Required**: Monitor telemetry costs and adjust sampling as needed

### 2. Cloud Resources
**Assumption**: ~$500-1000/month for small deployment (< 10K agents)  
**Components**: PostgreSQL RDS, Redis ElastiCache, ECS/EKS, load balancer  
**Reality**: Scales with agent count and telemetry volume  
**Action Required**: Set up cost monitoring and budgets

## Testing Assumptions

### 1. Test Coverage
**Assumption**: 80% code coverage target  
**Reality**: Initial transformation prioritizes functionality over test coverage  
**Mitigation**: Test framework configured; tests can be added incrementally  
**Action Required**: Add unit tests, integration tests, E2E tests in follow-up PRs

### 2. Load Testing
**Assumption**: k6 or similar for performance testing  
**Reality**: Load tests not included in initial transformation  
**Mitigation**: Scripts folder includes placeholder  
**Action Required**: Develop load test scenarios based on production patterns

## Data Assumptions

### 1. Agent Metadata
**Assumption**: Agent metadata fits in reasonable JSON (< 10KB)  
**Reality**: Large context sources may require optimization  
**Mitigation**: Metadata stored as JSONB; can be optimized if needed

### 2. Telemetry Retention
**Assumption**: 90 days for logs, 1 year for metrics  
**Reality**: Compliance may require longer (7 years for SOX)  
**Mitigation**: Configurable retention per policy  
**Action Required**: Review compliance requirements and adjust retention

## Integration Assumptions

### 1. Third-Party APIs
**Assumption**: External APIs (Zapier, MCP servers) have reasonable rate limits  
**Reality**: May hit rate limits under high load  
**Mitigation**: Rate limiting and backoff implemented  
**Action Required**: Monitor API usage and upgrade plans if needed

### 2. Webhook Reliability
**Assumption**: Webhooks are generally reliable  
**Reality**: Webhooks can fail or be delayed  
**Mitigation**: Retry logic and DLQ configured  
**Action Required**: Monitor webhook delivery rates

## Documentation Assumptions

### 1. Audience
**Assumption**: Readers are experienced platform engineers familiar with TypeScript, Node.js, OpenTelemetry  
**Reality**: May need to provide more basic tutorials  
**Mitigation**: Comprehensive README and CONTRIBUTING.md  
**Action Required**: Add tutorials and video walkthroughs as needed

### 2. Maintenance
**Assumption**: Documentation kept up-to-date with code  
**Reality**: Docs can drift from implementation  
**Mitigation**: Docs in same repo as code; CI checks for broken links  
**Action Required**: Regular documentation reviews

## Known Limitations

1. **Context Bus**: Foundation only; full pgvector integration pending
2. **Diagnostics**: Self-healing engine planned but not fully implemented
3. **GraphQL**: REST API only; GraphQL planned for v1.1
4. **Multi-Tenancy**: Single-tenant initially; multi-tenant support in roadmap
5. **Real-Time**: Polling-based; WebSocket subscriptions in roadmap

## Future Considerations

### Phase 2 (Next 3 Months)
- Complete context bus with pgvector
- Implement full self-healing diagnostics
- Add GraphQL API
- Comprehensive test suite
- Performance benchmarks
- Helm charts

### Phase 3 (6-12 Months)
- Multi-tenant support
- Advanced ML-based trust scoring
- Real-time WebSocket subscriptions
- Advanced anomaly detection
- Complete adapter library (Make, n8n, Airflow, Lambda)

---

**Document Maintenance**: Update this document when assumptions change or decisions are revisited.  
**Last Review**: 2025-10-30  
**Next Review**: 2025-11-30
