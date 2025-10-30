# AI-Agent Mesh Go SDK

Official Go client library for the AI-Agent Mesh platform.

[![Go Reference](https://pkg.go.dev/badge/github.com/ai-agent-mesh/sdk-go.svg)](https://pkg.go.dev/github.com/ai-agent-mesh/sdk-go)
[![Go Report Card](https://goreportcard.com/badge/github.com/ai-agent-mesh/sdk-go)](https://goreportcard.com/report/github.com/ai-agent-mesh/sdk-go)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
go get github.com/ai-agent-mesh/sdk-go
```

## Quick Start

```go
package main

import (
	"context"
	"fmt"
	"log"
	
	agentmesh "github.com/ai-agent-mesh/sdk-go"
)

func main() {
	// Initialize client
	client := agentmesh.NewClient("your-api-key")
	
	ctx := context.Background()
	
	// Create an agent
	agent, err := client.Agents.Create(ctx, &agentmesh.CreateAgentRequest{
		Name: "My AI Agent",
		Type: "conversational",
		Config: map[string]interface{}{
			"model":       "gpt-4",
			"temperature": 0.7,
		},
		Status: "active",
	})
	if err != nil {
		log.Fatal(err)
	}
	
	fmt.Printf("Created agent: %s\n", agent.ID)
	
	// Create a workflow
	workflow, err := client.Workflows.Create(ctx, &agentmesh.CreateWorkflowRequest{
		AgentID: agent.ID,
		Definition: map[string]interface{}{
			"steps": []map[string]interface{}{
				{"action": "process", "params": map[string]string{"input": "data"}},
			},
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	
	// Execute workflow
	result, err := client.Workflows.Execute(ctx, workflow.ID, map[string]interface{}{
		"message": "Hello world",
	})
	if err != nil {
		log.Fatal(err)
	}
	
	fmt.Printf("Workflow result: %+v\n", result)
}
```

## Features

### Agent Management

```go
// Create an agent
agent, err := client.Agents.Create(ctx, &agentmesh.CreateAgentRequest{
	Name: "Customer Support Agent",
	Type: "support",
	Config: map[string]interface{}{
		"model": "gpt-4-turbo",
	},
	Status: "active",
})

// List all agents
agents, err := client.Agents.List(ctx, &agentmesh.ListAgentsOptions{
	Status: "active",
	Limit:  50,
})

// Get specific agent
agent, err := client.Agents.Get(ctx, "agent_123")

// Update agent
config := map[string]interface{}{"temperature": 0.8}
agent, err := client.Agents.Update(ctx, "agent_123", &agentmesh.UpdateAgentRequest{
	Config: &config,
})

// Delete agent
err := client.Agents.Delete(ctx, "agent_123")
```

### Workflow Orchestration

```go
// Create a workflow
workflow, err := client.Workflows.Create(ctx, &agentmesh.CreateWorkflowRequest{
	AgentID: "agent_123",
	Definition: map[string]interface{}{
		"trigger": "webhook",
		"steps": []map[string]interface{}{
			{"action": "validate", "params": map[string]string{"schema": "input-schema"}},
			{"action": "process", "params": map[string]string{"model": "gpt-4"}},
			{"action": "notify", "params": map[string]string{"channel": "slack"}},
		},
	},
})

// Execute workflow
result, err := client.Workflows.Execute(ctx, workflow.ID, map[string]interface{}{
	"message": "Hello world",
})

// Get execution history
history, err := client.Workflows.GetHistory(ctx, workflow.ID, 100)
```

### Governance & Compliance

```go
// Apply a governance policy
policy, err := client.Policies.Apply(ctx, "agent_123", &agentmesh.ApplyPolicyRequest{
	Name:      "GDPR Compliance",
	Framework: "GDPR",
	Rules: map[string]interface{}{
		"data_retention":         "90days",
		"pii_handling":           "strict",
		"right_to_be_forgotten":  true,
	},
	EnforcementMode: "enforce",
})

// List policies for an agent
policies, err := client.Policies.List(ctx, "agent_123")

// Check compliance
compliance, err := client.Policies.CheckCompliance(ctx, "agent_123")
fmt.Printf("Compliant: %v\n", compliance.Compliant)
```

### Telemetry & Monitoring

```go
// Get telemetry events
events, err := client.Telemetry.Get(ctx, "agent_123", &agentmesh.TelemetryOptions{
	StartDate: "2025-10-01",
	EndDate:   "2025-10-30",
	EventType: "execution",
})

// Get agent health metrics
health, err := client.Telemetry.GetHealth(ctx, "agent_123")
fmt.Printf("Health score: %d\n", health.HealthScore)
```

### Federation & Discovery

```go
// Discover agents in the mesh
agents, err := client.Federation.Discover(ctx, &agentmesh.DiscoverOptions{
	Capabilities: []string{"nlp", "vision"},
	Region:       "us-east-1",
})

// Register agent with federation
config, err := client.Federation.Register(ctx, "agent_123", map[string]interface{}{
	"capabilities": []string{"conversational"},
	"region":       "us-east-1",
	"public":       true,
})
```

### Policy Marketplace

```go
// Browse marketplace
policies, err := client.Marketplace.Browse(ctx, &agentmesh.MarketplaceOptions{
	Category:  "compliance",
	Framework: "HIPAA",
})

// Install a policy from marketplace
policy, err := client.Marketplace.Install(ctx, "policy_marketplace_123", "agent_123")
```

### Usage & Limits

```go
// Check current usage
usage, err := client.Account.GetUsage(ctx)
fmt.Printf("API calls this month: %d\n", usage.APICalls)
fmt.Printf("Agent hours: %.2f\n", usage.AgentHours)

// Check account limits
limits, err := client.Account.GetLimits(ctx)
fmt.Printf("Max agents: %d\n", limits.Agents)
fmt.Printf("API calls remaining: %d\n", limits.APICallsRemaining)
```

## Configuration

```go
// Create client with custom options
client := agentmesh.NewClient(
	"your-api-key",
	agentmesh.WithBaseURL("https://api.custom.com"),
	agentmesh.WithTimeout(30 * time.Second),
	agentmesh.WithMaxRetries(3),
)
```

## Error Handling

```go
agent, err := client.Agents.Create(ctx, &agentmesh.CreateAgentRequest{
	Name: "My Agent",
	Type: "conversational",
	Config: map[string]interface{}{},
})

if err != nil {
	switch e := err.(type) {
	case *agentmesh.AuthenticationError:
		log.Printf("Authentication failed: %v", e)
	case *agentmesh.RateLimitError:
		log.Printf("Rate limit exceeded: %v", e)
	case *agentmesh.NotFoundError:
		log.Printf("Resource not found: %v", e)
	case *agentmesh.APIError:
		log.Printf("API error (%d): %v", e.StatusCode, e.Message)
	default:
		log.Printf("Error: %v", err)
	}
}
```

## Context Support

All API calls support context for cancellation and timeouts:

```go
// With timeout
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

agent, err := client.Agents.Get(ctx, "agent_123")

// With cancellation
ctx, cancel := context.WithCancel(context.Background())
go func() {
	// Cancel after some condition
	cancel()
}()

agents, err := client.Agents.List(ctx, nil)
```

## Testing

```go
// Mock client for testing
type mockAgentService struct {
	agentmesh.AgentService
}

func (m *mockAgentService) Create(ctx context.Context, req *agentmesh.CreateAgentRequest) (*agentmesh.Agent, error) {
	return &agentmesh.Agent{
		ID:     "mock_agent_123",
		Name:   req.Name,
		Type:   req.Type,
		Status: "active",
	}, nil
}
```

## Examples

See the [examples](examples/) directory for more comprehensive examples:

- [Basic agent management](examples/basic/main.go)
- [Workflow orchestration](examples/workflows/main.go)
- [Policy enforcement](examples/policies/main.go)
- [Real-time telemetry](examples/telemetry/main.go)

## Requirements

- Go 1.21 or higher

## Support

- **Documentation:** https://docs.ai-agent-mesh.com/sdk/go
- **API Reference:** https://api.ai-agent-mesh.com/docs
- **GitHub Issues:** https://github.com/ai-agent-mesh/sdk-go/issues
- **Community Discord:** https://discord.gg/ai-agent-mesh

## License

MIT © AI-Agent Mesh Team
