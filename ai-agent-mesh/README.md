# AI-Agent Mesh (MCP-Aligned)

A unified framework to discover, classify, normalize, and govern enterprise AI agents (copilots, chatbots, pipelines, services) under a single secure, observable mesh.

## Contents
- `research_findings.md` — market/problem validation with citations and competitor scan.
- `value_drivers.md` — product strategy, Pain→Risk→Resolution, and KPIs.
- `architecture_blueprint.png` — architecture diagram (placeholder). Also see diagram in this README.
- `mcp_registry.yaml` — canonical agent registry (MCP-aligned schema).
- `mesh_diagnosis.mjs` — CLI to discover and classify agents.
- `policy_enforcer.mjs` — policy engine for RBAC, allowlists, PII redaction.
- `iteration_notes.md` — hypotheses, statuses, risks.
- `MODEL_SPEC.md` — entity model, APIs, and guardrails.
- `ethics_sustainability_guidelines.md` — trust, observability, carbon.
- `go_to_market_plan.md` — deployment, monetization, partners.

## Quick Start
```bash
# 1) Inventory discovery (JSON to stdout)
node ai-agent-mesh/mesh_diagnosis.mjs --root /workspace --registry /workspace/ai-agent-mesh/mcp_registry.yaml --format json

# 2) Policy enforcement example (reads JSON from stdin)
cat <<'EOF' | node ai-agent-mesh/policy_enforcer.mjs --stdin
{
  "user": {"id": "u123", "roles": ["engineer"], "department": "platform", "region": "us"},
  "agent": {"id": "aiops-incident-copilot", "name": "AIOps Copilot", "tags": ["oncall"]},
  "request": {"model": "gpt-4o", "prompt": "My email is user@example.com", "maxTokens": 10000, "temperature": 2.0, "tools": []},
  "context": {"classification": "internal"}
}
EOF
```

## Mermaid Architecture (for rendering)
```mermaid
graph TD;
  subgraph Discovery
    A[Agent Discovery Daemon]
  end
  subgraph Registry
    B[MCP Registry Service]
  end
  subgraph Federation
    C[Context Federation Bus]
    D[Prompt Normalization Layer]
  end
  subgraph Governance
    E[Policy Enforcer]\nRBAC/DLP/Residency
    F[Data Governance Trail]\nImmutable Audit
  end
  subgraph Observability
    G[Observability Hub]\nOTel
  end
  subgraph Integration
    H[Integration Gateway]\nREST/GraphQL/SDK
  end

  A --> B
  B --> C
  C --> D
  D --> E
  E --> F
  C --> G
  D --> G
  E --> G
  H --> C
  H --> D
  H --> E
```

## Notes
- The PNG is a placeholder due to tool constraints. Render the Mermaid diagram above locally or in your docs system, or replace `architecture_blueprint.png` with a generated image.
- Aligns with [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol) and OWASP/NIST/ISO guardrails referenced in `research_findings.md` and `MODEL_SPEC.md`.
