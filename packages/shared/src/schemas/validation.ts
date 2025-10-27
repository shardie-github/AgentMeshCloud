/**
 * Zod validation schemas for AgentMesh Cloud
 * Provides runtime type validation for all API endpoints and data structures
 */

import { z } from 'zod';

// Base schemas
export const AgentStatusSchema = z.enum(['online', 'offline', 'processing', 'error', 'maintenance']);
export const CapabilityTypeSchema = z.enum(['llm', 'tool', 'data', 'workflow', 'notification', 'analytics']);
export const WorkflowStatusSchema = z.enum(['draft', 'active', 'paused', 'archived', 'error']);
export const ExecutionStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout']);

// Agent schemas
export const AgentCapabilitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  type: CapabilityTypeSchema,
  inputs: z.array(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    required: z.boolean(),
    description: z.string().optional(),
    validation: z.array(z.any()).optional(),
  })),
  outputs: z.array(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    description: z.string().optional(),
  })),
  constraints: z.array(z.object({
    type: z.enum(['rate_limit', 'timeout', 'resource', 'security']),
    value: z.union([z.string(), z.number()]),
    description: z.string().optional(),
  })).optional(),
});

export const AgentMetadataSchema = z.object({
  author: z.string().min(1).max(100),
  tags: z.array(z.string().max(50)).max(20),
  category: z.string().min(1).max(50),
  documentation: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().max(50).optional(),
  nandaCredentials: z.object({
    agentId: z.string().uuid(),
    publicKey: z.string().min(1),
    certificate: z.string().min(1),
    issuedAt: z.date(),
    expiresAt: z.date(),
    issuer: z.string().min(1),
  }).optional(),
  mcpCompliant: z.boolean(),
  a2aCompliant: z.boolean(),
});

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: AgentStatusSchema,
  capabilities: z.array(AgentCapabilitySchema),
  metadata: AgentMetadataSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  lastSeenAt: z.date().optional(),
});

// Workflow schemas
export const PositionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
});

export const NodeTypeSchema = z.enum([
  'agent', 'condition', 'parallel', 'merge', 'delay', 
  'webhook', 'data_transform', 'notification'
]);

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().min(1).max(10),
  backoffStrategy: z.enum(['linear', 'exponential', 'fixed']),
  baseDelay: z.number().min(100).max(60000),
  maxDelay: z.number().min(1000).max(300000).optional(),
});

export const NodeConfigSchema = z.object({
  inputs: z.record(z.any()),
  outputs: z.record(z.any()),
  settings: z.record(z.any()),
  retryPolicy: RetryPolicySchema.optional(),
  timeout: z.number().min(1000).max(3600000).optional(),
});

export const WorkflowNodeSchema = z.object({
  id: z.string().uuid(),
  type: NodeTypeSchema,
  name: z.string().min(1).max(100),
  position: PositionSchema,
  config: NodeConfigSchema,
  agentId: z.string().uuid().optional(),
  capabilities: z.array(z.string()).optional(),
});

export const WorkflowEdgeSchema = z.object({
  id: z.string().uuid(),
  source: z.string().uuid(),
  target: z.string().uuid(),
  condition: z.string().optional(),
  label: z.string().max(100).optional(),
});

export const WorkflowVariableSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.string().min(1),
  value: z.any(),
  description: z.string().max(200).optional(),
  required: z.boolean(),
});

export const TriggerTypeSchema = z.enum(['schedule', 'webhook', 'event', 'manual', 'api']);

export const WebhookConfigSchema = z.object({
  path: z.string().min(1).max(200),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  authentication: z.object({
    type: z.enum(['bearer', 'basic', 'api_key', 'oauth2']),
    credentials: z.record(z.string()),
  }).optional(),
  validation: z.array(z.any()).optional(),
});

export const TriggerConfigSchema = z.object({
  schedule: z.string().optional(),
  webhook: WebhookConfigSchema.optional(),
  event: z.object({
    eventType: z.string().min(1),
    source: z.string().min(1),
    filters: z.record(z.any()).optional(),
  }).optional(),
  api: z.object({
    endpoint: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    authentication: z.object({
      type: z.enum(['bearer', 'basic', 'api_key', 'oauth2']),
      credentials: z.record(z.string()),
    }).optional(),
  }).optional(),
});

export const WorkflowTriggerSchema = z.object({
  id: z.string().uuid(),
  type: TriggerTypeSchema,
  config: TriggerConfigSchema,
  enabled: z.boolean(),
});

export const WorkflowSettingsSchema = z.object({
  timeout: z.number().min(1000).max(86400000),
  retryPolicy: RetryPolicySchema,
  concurrency: z.number().min(1).max(100),
  errorHandling: z.enum(['stop', 'continue', 'retry', 'fallback']),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']),
    retention: z.number().min(1).max(365),
    includePayloads: z.boolean(),
  }),
});

export const WorkflowDefinitionSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  variables: z.array(WorkflowVariableSchema),
  triggers: z.array(WorkflowTriggerSchema),
  settings: WorkflowSettingsSchema,
});

export const WorkflowMetadataSchema = z.object({
  author: z.string().min(1).max(100),
  tags: z.array(z.string().max(50)).max(20),
  category: z.string().min(1).max(50),
  documentation: z.string().url().optional(),
  estimatedDuration: z.number().min(0).optional(),
  resourceRequirements: z.object({
    cpu: z.string().min(1),
    memory: z.string().min(1),
    storage: z.string().optional(),
    network: z.string().optional(),
  }).optional(),
});

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: WorkflowStatusSchema,
  definition: WorkflowDefinitionSchema,
  metadata: WorkflowMetadataSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  lastExecutedAt: z.date().optional(),
});

// MCP schemas
export const MCPMessageTypeSchema = z.enum(['request', 'response', 'notification', 'error']);
export const AdapterTypeSchema = z.enum(['llm', 'database', 'api', 'file', 'message_queue', 'storage']);
export const LLMProviderSchema = z.enum(['openai', 'anthropic', 'google', 'cohere', 'huggingface', 'custom']);

export const MCPErrorSchema = z.object({
  code: z.number().int().min(1000).max(5999),
  message: z.string().min(1).max(500),
  data: z.any().optional(),
});

export const MCPRequestSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('request'),
  method: z.string().min(1).max(100),
  params: z.record(z.any()),
  timeout: z.number().min(1000).max(300000).optional(),
  timestamp: z.date(),
  source: z.string().min(1),
  target: z.string().min(1).optional(),
  correlationId: z.string().uuid().optional(),
});

export const MCPResponseSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('response'),
  requestId: z.string().uuid(),
  result: z.any().optional(),
  error: MCPErrorSchema.optional(),
  timestamp: z.date(),
  source: z.string().min(1),
  target: z.string().min(1).optional(),
  correlationId: z.string().uuid().optional(),
});

// A2A schemas
export const MessagePrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);
export const A2AMessageTypeSchema = z.enum([
  'request', 'response', 'notification', 'broadcast', 
  'heartbeat', 'discovery', 'negotiation', 'error'
]);

export const MessageHeadersSchema = z.object({
  contentType: z.string().min(1).max(100),
  encoding: z.string().min(1).max(50),
  compression: z.string().max(50).optional(),
  encryption: z.object({
    algorithm: z.string().min(1),
    keyId: z.string().min(1),
    iv: z.string().optional(),
  }).optional(),
  authentication: z.object({
    method: z.enum(['jwt', 'signature', 'certificate']),
    token: z.string().optional(),
    signature: z.string().optional(),
    certificate: z.string().optional(),
  }).optional(),
  routing: z.object({
    routingKey: z.string().optional(),
    exchange: z.string().optional(),
    queue: z.string().optional(),
    persistent: z.boolean(),
    durable: z.boolean(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

export const A2AMessageSchema = z.object({
  id: z.string().uuid(),
  type: A2AMessageTypeSchema,
  from: z.string().min(1),
  to: z.union([z.string().min(1), z.array(z.string().min(1))]),
  payload: z.any(),
  timestamp: z.date(),
  priority: MessagePrioritySchema,
  ttl: z.number().min(1).max(86400).optional(),
  correlationId: z.string().uuid().optional(),
  replyTo: z.string().min(1).optional(),
  headers: MessageHeadersSchema,
});

// API Request/Response schemas
export const CreateAgentRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  capabilities: z.array(AgentCapabilitySchema),
  metadata: AgentMetadataSchema,
});

export const UpdateAgentRequestSchema = CreateAgentRequestSchema.partial();

export const CreateWorkflowRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  definition: WorkflowDefinitionSchema,
  metadata: WorkflowMetadataSchema,
});

export const UpdateWorkflowRequestSchema = CreateWorkflowRequestSchema.partial();

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z.string().max(100).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200).optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  ...PaginationSchema.shape,
});

// Export all schemas
export const Schemas = {
  Agent: AgentSchema,
  AgentCapability: AgentCapabilitySchema,
  AgentMetadata: AgentMetadataSchema,
  Workflow: WorkflowSchema,
  WorkflowDefinition: WorkflowDefinitionSchema,
  WorkflowNode: WorkflowNodeSchema,
  WorkflowEdge: WorkflowEdgeSchema,
  MCPRequest: MCPRequestSchema,
  MCPResponse: MCPResponseSchema,
  A2AMessage: A2AMessageSchema,
  CreateAgentRequest: CreateAgentRequestSchema,
  UpdateAgentRequest: UpdateAgentRequestSchema,
  CreateWorkflowRequest: CreateWorkflowRequestSchema,
  UpdateWorkflowRequest: UpdateWorkflowRequestSchema,
  Pagination: PaginationSchema,
  SearchQuery: SearchQuerySchema,
};