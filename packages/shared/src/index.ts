/**
 * AgentMesh Cloud Shared Package
 * Centralized types, schemas, and utilities
 */

// Export all common types
export * from './types/common';

// Export specific type modules (only unique types)
export type { Agent, AgentCapability, AgentMetadata, CapabilityType } from './types/agent';
export type { Workflow, WorkflowStatus, WorkflowDefinition, WorkflowNode, NodeType } from './types/workflow';
export type { MCPAdapter, MCPMessage, MCPTool, MCPDataSource } from './types/mcp';
export type { A2ABroker, A2AChannel, A2AMessage, A2AClient } from './types/a2a';

// Export specific federated types (avoiding conflicts)
export type {
  FederatedAgent,
  TenantToken,
  FederatedRequest,
  FederatedResponse,
  AgentFilters,
  TokenConfig,
  FederatedGatewayService,
  GatewayStatus,
  GatewayStatistics,
  GatewayHealth,
  RequestPriority,
  ResponseUsage
} from './types/federated';

// Export specific inference types (avoiding conflicts)
export type {
  InferenceRequest,
  InferenceResponse,
  LLMProvider,
  RouterConfig,
  RouterMetrics,
  RouterHealth,
  RouterService,
  ProviderStatus,
  LoadBalancingConfig,
  CachingConfig,
  OptimizationConfig,
  TokenUsage,
  QualityMetrics,
  ResponseMetadata,
  ModelInfo,
  HealthStatus
} from './types/inference';

// Export specific knowledge types (avoiding conflicts)
export type {
  KnowledgeNode,
  KnowledgeQuery,
  KnowledgeSearchResponse,
  KnowledgeSearchResult,
  Relationship,
  GraphStatistics,
  RelationshipType,
  QueryType,
  KnowledgeService
} from './types/knowledge';

// Export specific digital-twin types (avoiding conflicts)
export type {
  DigitalTwin,
  TwinStatus,
  TwinConfiguration,
  TwinState,
  TwinMetrics,
  TwinHealth,
  TwinFilters,
  ScenarioResult,
  TestResult,
  DigitalTwinService,
  ResourceMetrics,
  BusinessMetrics,
  CustomMetrics,
  HealthCheck,
  ErrorLog,
  WarningLog,
  ScenarioMetrics,
  ScenarioLog,
  AssertionResult,
  CoverageMetrics,
  TestLog
} from './types/digital-twin';

// Export schemas
export * from './schemas/validation';

// Export utilities
export * from './utils/helpers';

// Export constants
export * from './constants';

// Export database clients
export * from './lib/prisma';
export * from './lib/supabase';