# ORCA Catalog System

## Overview

The ORCA Catalog System provides a **single source of truth** for all schemas, APIs, events, policies, and dependencies across the platform. Catalogs are automatically generated from source code and kept synchronized via CI/CD.

## Generated Catalogs

### 1. Schema Registry (`catalog/schema.registry.json`)

Contains all TypeScript interfaces, types, SQL tables, and Zod schemas.

**Use cases:**
- Type checking and validation
- Documentation generation
- SDK generation
- Schema migration tracking

**Example entry:**
```json
{
  "name": "Agent",
  "type": "interface",
  "source": "src/registry/agent-registry.ts",
  "properties": {
    "id": { "type": "string", "required": true },
    "name": { "type": "string", "required": true },
    "type": { "type": "string", "required": true }
  }
}
```

### 2. API Registry (`catalog/api.registry.json`)

Contains all REST API endpoints from OpenAPI specifications.

**Use cases:**
- API documentation
- Client SDK generation
- Contract testing
- Deprecation tracking

**Example entry:**
```json
{
  "operationId": "listAgents",
  "method": "GET",
  "path": "/agents",
  "tags": ["agents"],
  "requestSchema": null,
  "responseSchema": "#/components/schemas/Agent",
  "deprecated": false,
  "since": "1.0.0"
}
```

### 3. Event Registry (`catalog/event.registry.json`)

Contains all Context Bus event types and their schemas.

**Use cases:**
- Event-driven architecture documentation
- Producer/consumer mapping
- Schema validation
- Event replay and debugging

**Example entry:**
```json
{
  "name": "agent.registered",
  "version": "1.0",
  "schema": "{...}",
  "producers": ["agent-registry"],
  "consumers": ["trust-scoring", "telemetry"],
  "deprecated": false
}
```

### 4. Policy Registry (`catalog/policy.registry.json`)

Contains all OPA Rego policies and YAML policy definitions.

**Use cases:**
- Policy coverage analysis
- Security audits
- Compliance reporting
- Route protection verification

**Example entry:**
```json
{
  "id": "agent.rbac",
  "name": "agent_rbac",
  "type": "rego",
  "source": "security/opa_policies.rego",
  "routes": ["/agents", "/agents/{id}"],
  "resources": ["agent"],
  "enabled": true
}
```

### 5. Dependency Registry (`catalog/dependency.registry.json`)

Contains all npm packages and external service dependencies.

**Use cases:**
- Security vulnerability scanning
- License compliance
- Upgrade planning
- Dependency graph visualization

**Example entry:**
```json
{
  "name": "@supabase/supabase-js",
  "version": "^2.38.4",
  "type": "npm",
  "usedBy": ["src/api", "src/registry"],
  "criticality": "critical",
  "lastUpdated": "2025-10-31T00:00:00Z"
}
```

## Generating Catalogs

### Manual Generation

```bash
npm run catalog:gen
```

This scans the entire codebase and regenerates all catalog files.

### Automatic Generation (CI)

Catalogs are automatically regenerated on every pull request via GitHub Actions:

```yaml
- name: Generate Catalogs
  run: npm run catalog:gen
  
- name: Check for Drift
  run: npm run catalog:check
```

The `catalog:check` script fails the build if catalogs are out of sync with code.

## Consuming Catalogs

### TypeScript

```typescript
import schemaRegistry from '../catalog/schema.registry.json';
import apiRegistry from '../catalog/api.registry.json';

// Find schema by name
const agentSchema = schemaRegistry.schemas.find(s => s.name === 'Agent');

// Find API endpoint
const listAgentsAPI = apiRegistry.apis.find(a => a.operationId === 'listAgents');
```

### UI Components

```typescript
// Fetch catalog via API
const response = await fetch('/api/catalogs/schema');
const { schemas } = await response.json();

// Render dynamic forms, documentation, etc.
```

### CLI Tools

```bash
# Search schemas
cat catalog/schema.registry.json | jq '.schemas[] | select(.name == "Agent")'

# Find deprecated APIs
cat catalog/api.registry.json | jq '.apis[] | select(.deprecated == true)'

# Count policies
cat catalog/policy.registry.json | jq '.policies | length'
```

## Drift Detection

The system detects three types of drift:

1. **Schema Drift**: TypeScript types don't match SQL tables
2. **API Drift**: OpenAPI spec doesn't match route handlers
3. **Policy Drift**: Routes exist without policy coverage

**CI Enforcement:**
```bash
npm run catalog:check || exit 1
```

This command:
- ✅ Passes if catalogs match source code
- ❌ Fails with clear error if drift detected

## Versioning

Catalogs follow semantic versioning:

- **Major**: Breaking changes (removed fields, changed types)
- **Minor**: Additions (new fields, new endpoints)
- **Patch**: Documentation updates, metadata changes

Example:
```json
{
  "version": "2.1.0",
  "generatedAt": "2025-10-31T12:00:00Z"
}
```

## Best Practices

### 1. Always Regenerate After Schema Changes

```bash
# After editing types or SQL migrations
npm run catalog:gen
git add catalog/
git commit -m "chore: update catalogs"
```

### 2. Review Catalog Diffs in PRs

Check `catalog/*.json` changes to understand API surface impact.

### 3. Use Catalogs for Documentation

Reference catalog entries in docs instead of hardcoding:

```markdown
See [Agent Schema](../catalog/schema.registry.json#Agent) for full details.
```

### 4. Validate External Contracts

Use catalogs to generate Pact contracts:

```typescript
import { generatePactFromCatalog } from '@/contracts/pact-generator';

const pact = generatePactFromCatalog(apiRegistry);
```

## Maintenance

### Adding New Catalog Types

1. Create generator function in `scripts/generate_catalogs.ts`
2. Add registry file to `catalog/`
3. Update CI workflow to check new catalog
4. Document in this README

### Handling Breaking Changes

When making breaking changes:

1. Increment major version in catalog
2. Mark old version as deprecated
3. Provide migration guide
4. Keep both versions for grace period

Example:
```json
{
  "name": "agent.registered",
  "version": "2.0",
  "deprecated": false,
  "migration_from": "1.0",
  "migration_guide": "https://docs.orca.dev/migrations/agent-registered-v2"
}
```

## Related

- [Integration Report](../alignment/INTEGRATION_REPORT.md)
- [OpenAPI Spec](../openapi.orca.yaml)
- [Context Bus Spec](../context-bus/spec.md)
- [Policy Coverage Report](../alignment/wiring_report.json)

## Support

For questions or issues with the catalog system:
- **Slack**: #platform
- **Owner**: @platform-team
- **Docs**: https://docs.orca.dev/catalogs
