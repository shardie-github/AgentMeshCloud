# AI-Agent Mesh Python SDK

Official Python client library for the AI-Agent Mesh platform.

[![PyPI version](https://badge.fury.io/py/ai-agent-mesh.svg)](https://pypi.org/project/ai-agent-mesh/)
[![Python versions](https://img.shields.io/pypi/pyversions/ai-agent-mesh.svg)](https://pypi.org/project/ai-agent-mesh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
pip install ai-agent-mesh
```

## Quick Start

```python
from agent_mesh import AgentMeshClient

# Initialize client
client = AgentMeshClient(api_key="your-api-key")

# Create an agent
agent = client.agents.create(
    name="My AI Agent",
    type="conversational",
    config={"model": "gpt-4", "temperature": 0.7}
)

# Create and execute a workflow
workflow = client.workflows.create(
    agent_id=agent.id,
    definition={
        "steps": [
            {"action": "process", "params": {"input": "data"}}
        ]
    }
)

result = client.workflows.execute(workflow.id)
print(f"Workflow result: {result}")
```

## Features

### Agent Management

```python
# Create an agent
agent = client.agents.create(
    name="Customer Support Agent",
    type="support",
    config={"model": "gpt-4-turbo"},
    status="active"
)

# List all agents
agents = client.agents.list(status="active", limit=50)

# Get specific agent
agent = client.agents.get("agent_123")

# Update agent
agent = client.agents.update("agent_123", config={"temperature": 0.8})

# Delete agent
client.agents.delete("agent_123")
```

### Workflow Orchestration

```python
# Create a workflow
workflow = client.workflows.create(
    agent_id="agent_123",
    definition={
        "trigger": "webhook",
        "steps": [
            {"action": "validate", "params": {"schema": "input-schema"}},
            {"action": "process", "params": {"model": "gpt-4"}},
            {"action": "notify", "params": {"channel": "slack"}}
        ]
    }
)

# Execute workflow with input
result = client.workflows.execute(
    workflow.id,
    input={"message": "Hello world"}
)

# Get execution history
history = client.workflows.get_history(workflow.id, limit=100)
```

### Governance & Compliance

```python
# Apply a governance policy
policy = client.policies.apply(
    agent_id="agent_123",
    name="GDPR Compliance",
    framework="GDPR",
    rules={
        "data_retention": "90days",
        "pii_handling": "strict",
        "right_to_be_forgotten": True
    },
    enforcement_mode="enforce"
)

# List policies for an agent
policies = client.policies.list("agent_123")

# Check compliance
compliance = client.policies.check_compliance("agent_123")
print(f"Compliance status: {compliance}")
```

### Telemetry & Monitoring

```python
# Get telemetry events
events = client.telemetry.get(
    agent_id="agent_123",
    start_date="2025-10-01",
    end_date="2025-10-30",
    event_type="execution"
)

# Get agent health metrics
health = client.telemetry.get_health("agent_123")
print(f"Health score: {health['score']}")
```

### Federation & Discovery

```python
# Discover agents in the mesh
agents = client.federation.discover(
    capabilities=["nlp", "vision"],
    region="us-east-1"
)

# Register agent with federation
config = client.federation.register(
    agent_id="agent_123",
    config={
        "capabilities": ["conversational"],
        "region": "us-east-1",
        "public": True
    }
)
```

### Policy Marketplace

```python
# Browse marketplace
policies = client.marketplace.browse(
    category="compliance",
    framework="HIPAA"
)

# Install a policy from marketplace
policy = client.marketplace.install(
    policy_id="policy_marketplace_123",
    agent_id="agent_123"
)
```

### Usage & Limits

```python
# Check current usage
usage = client.account.get_usage()
print(f"API calls this month: {usage['api_calls']}")
print(f"Agent hours: {usage['agent_hours']}")

# Check account limits
limits = client.account.get_limits()
print(f"Max agents: {limits['agents']}")
print(f"API calls remaining: {limits['api_calls_remaining']}")
```

## Configuration

```python
client = AgentMeshClient(
    api_key="your-api-key",              # Required
    base_url="https://api.custom.com",   # Optional
    timeout=30,                          # Optional, in seconds
    max_retries=3                        # Optional
)
```

## Error Handling

```python
from agent_mesh import (
    AgentMeshError,
    AuthenticationError,
    RateLimitError,
    NotFoundError
)

try:
    agent = client.agents.create(name="My Agent", type="conversational", config={})
except AuthenticationError:
    print("Invalid API key")
except RateLimitError:
    print("Rate limit exceeded")
except NotFoundError:
    print("Resource not found")
except AgentMeshError as e:
    print(f"API error: {e}")
```

## Async Support

Install with async support:

```bash
pip install ai-agent-mesh[async]
```

Use async client:

```python
from agent_mesh import AsyncAgentMeshClient

async def main():
    client = AsyncAgentMeshClient(api_key="your-api-key")
    
    agent = await client.agents.create(
        name="My Agent",
        type="conversational",
        config={}
    )
    
    result = await client.workflows.execute(workflow_id)

# Run with asyncio
import asyncio
asyncio.run(main())
```

## Development

```bash
# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black src/ tests/
isort src/ tests/

# Type checking
mypy src/

# Linting
flake8 src/
```

## Requirements

- Python 3.8+
- requests >= 2.31.0
- pydantic >= 2.5.0

## Support

- **Documentation:** https://docs.ai-agent-mesh.com/sdk/python
- **API Reference:** https://api.ai-agent-mesh.com/docs
- **GitHub Issues:** https://github.com/ai-agent-mesh/sdk-python/issues
- **Community Discord:** https://discord.gg/ai-agent-mesh

## License

MIT © AI-Agent Mesh Team
