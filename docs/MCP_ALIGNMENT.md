# MCP Alignment Guide

## Overview

ORCA AgentMesh aligns with the **Model Context Protocol (MCP)** by:
- Discovering MCP servers from a registry
- Registering them as first-class agents
- Tracking their capabilities and health
- Providing unified observability

## MCP Registry

### Location

`src/registry/mcp_registry.schema.yaml`

### Format

```yaml
version: "1.0.0"
servers:
  <server-name>:
    name: string           # Display name
    command: string        # Executable command
    args: string[]         # Command arguments
    env:                   # Environment variables
      KEY: value
    capabilities: string[] # MCP capabilities
    description: string    # Human description
```

### Example

```yaml
version: "1.0.0"
servers:
  filesystem:
    name: filesystem
    command: npx
    args:
      - "-y"
      - "@modelcontextprotocol/server-filesystem"
      - "/workspace"
    capabilities:
      - read
      - write
      - list
    description: "MCP server for filesystem operations"
```

## Discovery Process

### 1. Registry Loading

On API startup:
```typescript
const registry = new RegistryService(contextBus);
registry.loadMCPRegistry();
```

### 2. Agent Synchronization

```typescript
const mcpAgents = await registry.syncMCPAgents();
```

For each MCP server:
- Check if agent already exists (by name + type)
- Create agent record if missing
- Set initial trust level (0.75)
- Store metadata (command, args, capabilities)

### 3. Agent Record

```typescript
{
  id: uuid,
  name: "filesystem",
  type: "mcp",
  owner: "system",
  model: "npx",
  trust_level: 0.75,
  access_tier: "standard",
  metadata: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
    capabilities: ["read", "write", "list"],
    description: "MCP server for filesystem operations"
  }
}
```

## Capability Tracking

MCP capabilities are stored in agent metadata:

```typescript
const agent = await contextBus.getAgentById(agentId);
const capabilities = agent.metadata?.capabilities as string[];

if (capabilities?.includes('read')) {
  // Agent can read
}
```

## Health Monitoring

MCP agents are monitored like all other agents:

### Telemetry Collection

(Future) When MCP server operations occur:
```typescript
await contextBus.createTelemetry({
  agent_id: mcpAgent.id,
  ts: new Date(),
  latency_ms: operationLatency,
  errors: operationFailed ? 1 : 0,
  policy_violations: 0,
  success_count: operationFailed ? 0 : 1,
});
```

### Health Scoring

```bash
GET /agents/:id
```

Returns:
```json
{
  "id": "...",
  "name": "filesystem",
  "type": "mcp",
  "health": {
    "health_score": 0.95,
    "status": "healthy",
    "metrics": {
      "avg_latency_ms": 45,
      "total_errors": 0,
      "success_rate": 1.0
    }
  }
}
```

## Trust Scoring

MCP agents participate in system-wide trust scoring:

- **Agent Uptime**: Success rate of MCP operations
- **Policy Adherence**: Compliance with data classification rules
- **Risk Exposure**: MCP agent trust level contributes to avg

## MCP Server Management

### Adding a New MCP Server

1. Edit `mcp_registry.schema.yaml`:
```yaml
servers:
  my-new-server:
    name: my-new-server
    command: npx
    args: ["-y", "@vendor/mcp-server-package"]
    capabilities: ["custom-cap"]
    description: "My custom MCP server"
```

2. Restart API:
```bash
docker compose restart api
```

3. Verify:
```bash
curl http://localhost:3000/agents | jq '.agents[] | select(.name=="my-new-server")'
```

### Removing an MCP Server

1. Remove from `mcp_registry.schema.yaml`
2. Restart API
3. Agent record remains in database (soft delete model)

### Updating MCP Server Config

1. Modify registry YAML
2. Restart API
3. Metadata updated on next sync (future: auto-sync)

## MCP Protocol Integration

### Current State (MVP)

- **Registry-based discovery**: ✅
- **Agent registration**: ✅
- **Metadata tracking**: ✅
- **Health monitoring**: ✅ (via telemetry)
- **Trust scoring**: ✅

### Future Enhancements

- **Direct MCP protocol support**: Spawn and manage MCP servers
- **Tool invocation**: Call MCP tools via ORCA API
- **Resource access**: Proxy MCP resource requests
- **Prompt management**: Store and version prompts
- **Sampling coordination**: Multi-agent MCP sampling

## Security

### MCP Server Isolation

- MCP servers run in separate processes (not managed by ORCA MVP)
- Environment variables passed securely
- File system access controlled by MCP server config

### Trust Levels

MCP servers default to `trust_level: 0.75`:
- **0.90+**: Highly trusted, privileged access
- **0.75-0.90**: Standard trust, normal operations
- **0.50-0.75**: Lower trust, monitoring required
- **< 0.50**: Critical, may require intervention

Trust levels update automatically based on telemetry.

## Example: Filesystem MCP

### Registry Entry

```yaml
filesystem:
  name: filesystem
  command: npx
  args:
    - "-y"
    - "@modelcontextprotocol/server-filesystem"
    - "/workspace"
  capabilities:
    - read
    - write
    - list
  description: "MCP server for filesystem operations"
```

### Agent Record

```json
{
  "id": "a1b2c3d4-...",
  "name": "filesystem",
  "type": "mcp",
  "owner": "system",
  "model": "npx",
  "trust_level": 0.85,
  "access_tier": "standard",
  "metadata": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
    "capabilities": ["read", "write", "list"],
    "description": "MCP server for filesystem operations"
  },
  "created_at": "2023-12-01T10:00:00Z"
}
```

### Health Check

```bash
curl http://localhost:3000/agents/a1b2c3d4-... | jq '.health'
```

```json
{
  "health_score": 0.95,
  "status": "healthy",
  "metrics": {
    "avg_latency_ms": 45,
    "total_errors": 0,
    "total_policy_violations": 0,
    "success_rate": 1.0
  }
}
```

## Best Practices

1. **Capability Documentation**: Clearly document what each MCP server can do
2. **Environment Variables**: Use `.env` for secrets, reference in registry
3. **Resource Limits**: Configure MCP servers with appropriate constraints
4. **Monitoring**: Actively monitor MCP agent health and trust levels
5. **Version Pinning**: Pin MCP server versions in package.json or use exact npx versions

## Troubleshooting

### MCP Server Not Appearing

**Check**:
1. Registry syntax: `yaml-lint mcp_registry.schema.yaml`
2. API logs: `docker compose logs api | grep MCP`
3. Agent list: `curl http://localhost:3000/agents`

### Low Trust Level

**Check**:
1. Telemetry errors: `/agents/:id/telemetry`
2. Policy violations: Check policy_violations table
3. Recent changes: Compare with baseline

### MCP Server Fails to Start

**Check**:
1. Command executable: `npx <package> --version`
2. Environment variables: Ensure secrets are set
3. Resource access: Check file permissions
4. Logs: Application-level MCP server logs

## References

- [MCP Specification](https://modelcontextprotocol.io)
- [MCP Server Packages](https://github.com/modelcontextprotocol)
- [ORCA Registry Service](../src/registry/registry.service.ts)
- [Agent Discovery](../src/uadsi/agent_discovery.ts)
