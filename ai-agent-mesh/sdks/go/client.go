// Package agentmesh provides the official Go SDK for AI-Agent Mesh platform
package agentmesh

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	// DefaultBaseURL is the default API endpoint
	DefaultBaseURL = "https://api.ai-agent-mesh.com/v3"
	// SDKVersion is the current SDK version
	SDKVersion = "3.0.0"
)

// Client is the main AI-Agent Mesh SDK client
type Client struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
	
	// Resource managers
	Agents       *AgentService
	Workflows    *WorkflowService
	Policies     *PolicyService
	Telemetry    *TelemetryService
	Federation   *FederationService
	Marketplace  *MarketplaceService
	Account      *AccountService
}

// Config holds configuration for the client
type Config struct {
	APIKey     string
	BaseURL    string
	Timeout    time.Duration
	MaxRetries int
}

// NewClient creates a new AI-Agent Mesh client
func NewClient(apiKey string, opts ...Option) *Client {
	config := &Config{
		APIKey:     apiKey,
		BaseURL:    DefaultBaseURL,
		Timeout:    30 * time.Second,
		MaxRetries: 3,
	}
	
	for _, opt := range opts {
		opt(config)
	}
	
	client := &Client{
		apiKey:  config.APIKey,
		baseURL: config.BaseURL,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
	}
	
	// Initialize services
	client.Agents = &AgentService{client: client}
	client.Workflows = &WorkflowService{client: client}
	client.Policies = &PolicyService{client: client}
	client.Telemetry = &TelemetryService{client: client}
	client.Federation = &FederationService{client: client}
	client.Marketplace = &MarketplaceService{client: client}
	client.Account = &AccountService{client: client}
	
	return client
}

// Option is a functional option for configuring the client
type Option func(*Config)

// WithBaseURL sets a custom base URL
func WithBaseURL(url string) Option {
	return func(c *Config) {
		c.BaseURL = url
	}
}

// WithTimeout sets a custom timeout
func WithTimeout(timeout time.Duration) Option {
	return func(c *Config) {
		c.Timeout = timeout
	}
}

// WithMaxRetries sets max retry attempts
func WithMaxRetries(maxRetries int) Option {
	return func(c *Config) {
		c.MaxRetries = maxRetries
	}
}

// request makes an HTTP request to the API
func (c *Client) request(ctx context.Context, method, endpoint string, body interface{}, result interface{}) error {
	url := fmt.Sprintf("%s/%s", c.baseURL, endpoint)
	
	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonData)
	}
	
	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	
	// Set headers
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-SDK-Version", SDKVersion)
	req.Header.Set("X-SDK-Language", "go")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()
	
	// Handle error responses
	if resp.StatusCode >= 400 {
		return c.handleErrorResponse(resp)
	}
	
	// Decode response if result interface provided
	if result != nil && resp.ContentLength != 0 {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}
	
	return nil
}

func (c *Client) handleErrorResponse(resp *http.Response) error {
	var errorResp struct {
		Message string `json:"message"`
		Code    string `json:"code"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&errorResp); err != nil {
		return fmt.Errorf("API error: %s", resp.Status)
	}
	
	switch resp.StatusCode {
	case 401:
		return &AuthenticationError{Message: errorResp.Message}
	case 404:
		return &NotFoundError{Message: errorResp.Message}
	case 429:
		return &RateLimitError{Message: errorResp.Message}
	default:
		return &APIError{
			StatusCode: resp.StatusCode,
			Message:    errorResp.Message,
			Code:       errorResp.Code,
		}
	}
}

// AgentService handles agent-related operations
type AgentService struct {
	client *Client
}

// Create creates a new agent
func (s *AgentService) Create(ctx context.Context, req *CreateAgentRequest) (*Agent, error) {
	var agent Agent
	err := s.client.request(ctx, http.MethodPost, "agents", req, &agent)
	return &agent, err
}

// Get retrieves an agent by ID
func (s *AgentService) Get(ctx context.Context, agentID string) (*Agent, error) {
	var agent Agent
	err := s.client.request(ctx, http.MethodGet, fmt.Sprintf("agents/%s", agentID), nil, &agent)
	return &agent, err
}

// List retrieves all agents
func (s *AgentService) List(ctx context.Context, opts *ListAgentsOptions) ([]*Agent, error) {
	var agents []*Agent
	endpoint := "agents"
	if opts != nil {
		// Add query parameters if needed
		endpoint += fmt.Sprintf("?limit=%d", opts.Limit)
		if opts.Status != "" {
			endpoint += fmt.Sprintf("&status=%s", opts.Status)
		}
		if opts.Type != "" {
			endpoint += fmt.Sprintf("&type=%s", opts.Type)
		}
	}
	err := s.client.request(ctx, http.MethodGet, endpoint, nil, &agents)
	return agents, err
}

// Update updates an agent
func (s *AgentService) Update(ctx context.Context, agentID string, req *UpdateAgentRequest) (*Agent, error) {
	var agent Agent
	err := s.client.request(ctx, http.MethodPatch, fmt.Sprintf("agents/%s", agentID), req, &agent)
	return &agent, err
}

// Delete deletes an agent
func (s *AgentService) Delete(ctx context.Context, agentID string) error {
	return s.client.request(ctx, http.MethodDelete, fmt.Sprintf("agents/%s", agentID), nil, nil)
}

// WorkflowService handles workflow-related operations
type WorkflowService struct {
	client *Client
}

// Create creates a new workflow
func (s *WorkflowService) Create(ctx context.Context, req *CreateWorkflowRequest) (*Workflow, error) {
	var workflow Workflow
	err := s.client.request(ctx, http.MethodPost, "workflows", req, &workflow)
	return &workflow, err
}

// Execute executes a workflow
func (s *WorkflowService) Execute(ctx context.Context, workflowID string, input map[string]interface{}) (*WorkflowResult, error) {
	var result WorkflowResult
	req := map[string]interface{}{"input": input}
	err := s.client.request(ctx, http.MethodPost, fmt.Sprintf("workflows/%s/execute", workflowID), req, &result)
	return &result, err
}

// GetHistory retrieves workflow execution history
func (s *WorkflowService) GetHistory(ctx context.Context, workflowID string, limit int) ([]*WorkflowExecution, error) {
	var executions []*WorkflowExecution
	endpoint := fmt.Sprintf("workflows/%s/history?limit=%d", workflowID, limit)
	err := s.client.request(ctx, http.MethodGet, endpoint, nil, &executions)
	return executions, err
}

// PolicyService handles policy-related operations
type PolicyService struct {
	client *Client
}

// Apply applies a governance policy to an agent
func (s *PolicyService) Apply(ctx context.Context, agentID string, req *ApplyPolicyRequest) (*Policy, error) {
	var policy Policy
	err := s.client.request(ctx, http.MethodPost, fmt.Sprintf("agents/%s/policies", agentID), req, &policy)
	return &policy, err
}

// List retrieves policies for an agent
func (s *PolicyService) List(ctx context.Context, agentID string) ([]*Policy, error) {
	var policies []*Policy
	err := s.client.request(ctx, http.MethodGet, fmt.Sprintf("agents/%s/policies", agentID), nil, &policies)
	return policies, err
}

// CheckCompliance checks policy compliance for an agent
func (s *PolicyService) CheckCompliance(ctx context.Context, agentID string) (*ComplianceReport, error) {
	var report ComplianceReport
	err := s.client.request(ctx, http.MethodPost, fmt.Sprintf("agents/%s/compliance/check", agentID), nil, &report)
	return &report, err
}

// TelemetryService handles telemetry-related operations
type TelemetryService struct {
	client *Client
}

// Get retrieves telemetry events
func (s *TelemetryService) Get(ctx context.Context, agentID string, opts *TelemetryOptions) ([]*TelemetryEvent, error) {
	var events []*TelemetryEvent
	endpoint := fmt.Sprintf("agents/%s/telemetry", agentID)
	if opts != nil {
		endpoint += "?"
		if opts.StartDate != "" {
			endpoint += fmt.Sprintf("start_date=%s&", opts.StartDate)
		}
		if opts.EndDate != "" {
			endpoint += fmt.Sprintf("end_date=%s&", opts.EndDate)
		}
		if opts.EventType != "" {
			endpoint += fmt.Sprintf("event_type=%s", opts.EventType)
		}
	}
	err := s.client.request(ctx, http.MethodGet, endpoint, nil, &events)
	return events, err
}

// GetHealth retrieves agent health metrics
func (s *TelemetryService) GetHealth(ctx context.Context, agentID string) (*HealthMetrics, error) {
	var metrics HealthMetrics
	err := s.client.request(ctx, http.MethodGet, fmt.Sprintf("agents/%s/health", agentID), nil, &metrics)
	return &metrics, err
}

// FederationService handles federation-related operations
type FederationService struct {
	client *Client
}

// Discover discovers agents in the mesh
func (s *FederationService) Discover(ctx context.Context, opts *DiscoverOptions) ([]*Agent, error) {
	var agents []*Agent
	endpoint := "federation/discover"
	if opts != nil {
		endpoint += "?"
		if len(opts.Capabilities) > 0 {
			for i, cap := range opts.Capabilities {
				if i > 0 {
					endpoint += ","
				}
				endpoint += cap
			}
			endpoint += "&"
		}
		if opts.Region != "" {
			endpoint += fmt.Sprintf("region=%s", opts.Region)
		}
	}
	err := s.client.request(ctx, http.MethodGet, endpoint, nil, &agents)
	return agents, err
}

// Register registers an agent with federation
func (s *FederationService) Register(ctx context.Context, agentID string, config map[string]interface{}) (*FederationConfig, error) {
	var fedConfig FederationConfig
	err := s.client.request(ctx, http.MethodPost, fmt.Sprintf("federation/register/%s", agentID), config, &fedConfig)
	return &fedConfig, err
}

// MarketplaceService handles marketplace operations
type MarketplaceService struct {
	client *Client
}

// Browse browses the policy marketplace
func (s *MarketplaceService) Browse(ctx context.Context, opts *MarketplaceOptions) ([]*MarketplacePolicy, error) {
	var policies []*MarketplacePolicy
	endpoint := "marketplace/policies"
	if opts != nil {
		endpoint += "?"
		if opts.Category != "" {
			endpoint += fmt.Sprintf("category=%s&", opts.Category)
		}
		if opts.Framework != "" {
			endpoint += fmt.Sprintf("framework=%s", opts.Framework)
		}
	}
	err := s.client.request(ctx, http.MethodGet, endpoint, nil, &policies)
	return policies, err
}

// Install installs a policy from the marketplace
func (s *MarketplaceService) Install(ctx context.Context, policyID, agentID string) (*Policy, error) {
	var policy Policy
	req := map[string]string{"agent_id": agentID}
	err := s.client.request(ctx, http.MethodPost, fmt.Sprintf("marketplace/policies/%s/install", policyID), req, &policy)
	return &policy, err
}

// AccountService handles account-related operations
type AccountService struct {
	client *Client
}

// GetUsage retrieves current account usage
func (s *AccountService) GetUsage(ctx context.Context) (*Usage, error) {
	var usage Usage
	err := s.client.request(ctx, http.MethodGet, "account/usage", nil, &usage)
	return &usage, err
}

// GetLimits retrieves account limits
func (s *AccountService) GetLimits(ctx context.Context) (*Limits, error) {
	var limits Limits
	err := s.client.request(ctx, http.MethodGet, "account/limits", nil, &limits)
	return &limits, err
}
