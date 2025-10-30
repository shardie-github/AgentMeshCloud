package agentmesh

import "time"

// Agent represents an AI agent
type Agent struct {
	ID        string                 `json:"id"`
	Name      string                 `json:"name"`
	Type      string                 `json:"type"`
	Config    map[string]interface{} `json:"config"`
	Status    string                 `json:"status"`
	CreatedAt time.Time              `json:"createdAt"`
	UpdatedAt time.Time              `json:"updatedAt"`
}

// CreateAgentRequest is the request for creating an agent
type CreateAgentRequest struct {
	Name   string                 `json:"name"`
	Type   string                 `json:"type"`
	Config map[string]interface{} `json:"config"`
	Status string                 `json:"status,omitempty"`
}

// UpdateAgentRequest is the request for updating an agent
type UpdateAgentRequest struct {
	Name   *string                 `json:"name,omitempty"`
	Type   *string                 `json:"type,omitempty"`
	Config *map[string]interface{} `json:"config,omitempty"`
	Status *string                 `json:"status,omitempty"`
}

// ListAgentsOptions contains options for listing agents
type ListAgentsOptions struct {
	Status string
	Type   string
	Limit  int
}

// Workflow represents a workflow
type Workflow struct {
	ID             string                 `json:"id"`
	AgentID        string                 `json:"agentId"`
	Definition     map[string]interface{} `json:"definition"`
	ExecutionCount int                    `json:"executionCount"`
	LastExecuted   *time.Time             `json:"lastExecuted,omitempty"`
}

// CreateWorkflowRequest is the request for creating a workflow
type CreateWorkflowRequest struct {
	AgentID    string                 `json:"agent_id"`
	Definition map[string]interface{} `json:"definition"`
}

// WorkflowResult represents the result of a workflow execution
type WorkflowResult struct {
	ID        string                 `json:"id"`
	Status    string                 `json:"status"`
	Output    map[string]interface{} `json:"output"`
	ExecutedAt time.Time             `json:"executedAt"`
}

// WorkflowExecution represents a workflow execution record
type WorkflowExecution struct {
	ID         string                 `json:"id"`
	WorkflowID string                 `json:"workflowId"`
	Status     string                 `json:"status"`
	Input      map[string]interface{} `json:"input"`
	Output     map[string]interface{} `json:"output"`
	ExecutedAt time.Time              `json:"executedAt"`
	Duration   int                    `json:"duration"` // milliseconds
}

// Policy represents a governance policy
type Policy struct {
	ID              string                 `json:"id"`
	Name            string                 `json:"name"`
	Framework       string                 `json:"framework"`
	Rules           map[string]interface{} `json:"rules"`
	EnforcementMode string                 `json:"enforcementMode"`
}

// ApplyPolicyRequest is the request for applying a policy
type ApplyPolicyRequest struct {
	Name            string                 `json:"name"`
	Framework       string                 `json:"framework"`
	Rules           map[string]interface{} `json:"rules"`
	EnforcementMode string                 `json:"enforcement_mode"`
}

// ComplianceReport represents a compliance check result
type ComplianceReport struct {
	AgentID     string              `json:"agentId"`
	Compliant   bool                `json:"compliant"`
	Violations  []PolicyViolation   `json:"violations"`
	CheckedAt   time.Time           `json:"checkedAt"`
}

// PolicyViolation represents a policy violation
type PolicyViolation struct {
	PolicyName string                 `json:"policyName"`
	Severity   string                 `json:"severity"`
	Details    map[string]interface{} `json:"details"`
}

// TelemetryEvent represents a telemetry event
type TelemetryEvent struct {
	ID        string                 `json:"id"`
	AgentID   string                 `json:"agentId"`
	EventType string                 `json:"eventType"`
	Payload   map[string]interface{} `json:"payload"`
	Timestamp time.Time              `json:"timestamp"`
}

// TelemetryOptions contains options for querying telemetry
type TelemetryOptions struct {
	StartDate string
	EndDate   string
	EventType string
}

// HealthMetrics represents agent health metrics
type HealthMetrics struct {
	AgentID      string    `json:"agentId"`
	HealthScore  int       `json:"healthScore"`
	Status       string    `json:"status"`
	Uptime       float64   `json:"uptime"`
	LastChecked  time.Time `json:"lastChecked"`
}

// DiscoverOptions contains options for discovering agents
type DiscoverOptions struct {
	Capabilities []string
	Region       string
}

// FederationConfig represents federation configuration
type FederationConfig struct {
	AgentID      string   `json:"agentId"`
	Capabilities []string `json:"capabilities"`
	Region       string   `json:"region"`
	Public       bool     `json:"public"`
}

// MarketplacePolicy represents a policy in the marketplace
type MarketplacePolicy struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Framework   string                 `json:"framework"`
	Category    string                 `json:"category"`
	Rules       map[string]interface{} `json:"rules"`
	Downloads   int                    `json:"downloads"`
	Rating      float64                `json:"rating"`
}

// MarketplaceOptions contains options for browsing marketplace
type MarketplaceOptions struct {
	Category  string
	Framework string
}

// Usage represents account usage metrics
type Usage struct {
	APICalls       int     `json:"apiCalls"`
	AgentHours     float64 `json:"agentHours"`
	StorageGB      float64 `json:"storageGB"`
	DataTransferGB float64 `json:"dataTransferGB"`
}

// Limits represents account limits
type Limits struct {
	Agents                int `json:"agents"`
	APICallsPerMonth      int `json:"apiCallsPerMonth"`
	StorageGB             int `json:"storageGB"`
	TeamMembers           int `json:"teamMembers"`
	WorkflowsPerAgent     int `json:"workflowsPerAgent"`
	APICallsRemaining     int `json:"apiCallsRemaining"`
}
