"""
AI-Agent Mesh Python SDK

Official Python client library for the AI-Agent Mesh platform.
Provides comprehensive access to agent management, workflow orchestration,
governance policies, and telemetry monitoring.

Example usage:
    >>> from agent_mesh import AgentMeshClient
    >>> client = AgentMeshClient(api_key="your-api-key")
    >>> agent = client.agents.create(name="My Agent", type="conversational")
    >>> workflow = client.workflows.create(agent_id=agent.id, definition={...})
    >>> result = client.workflows.execute(workflow.id)

For detailed documentation, visit: https://docs.ai-agent-mesh.com/sdk/python
"""

__version__ = "3.0.0"
__author__ = "AI-Agent Mesh Team"
__license__ = "MIT"

from .client import AgentMeshClient
from .models import Agent, Workflow, Policy, TelemetryEvent
from .exceptions import (
    AgentMeshError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    NotFoundError,
)

__all__ = [
    "AgentMeshClient",
    "Agent",
    "Workflow",
    "Policy",
    "TelemetryEvent",
    "AgentMeshError",
    "AuthenticationError",
    "RateLimitError",
    "ValidationError",
    "NotFoundError",
]
