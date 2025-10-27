/**
 * Workflow types for AgentMesh Cloud
 * Defines the structure and execution of multi-agent workflows
 */

export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  status: WorkflowStatus;
  definition: WorkflowDefinition;
  metadata: WorkflowMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
}

export type WorkflowStatus = 
  | 'draft' 
  | 'active' 
  | 'paused' 
  | 'archived' 
  | 'error';

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  triggers: WorkflowTrigger[];
  settings: WorkflowSettings;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  position: Position;
  config: NodeConfig;
  agentId?: string;
  capabilities?: string[];
}

export type NodeType = 
  | 'agent' 
  | 'condition' 
  | 'parallel' 
  | 'merge' 
  | 'delay' 
  | 'webhook' 
  | 'data_transform' 
  | 'notification';

export interface Position {
  x: number;
  y: number;
}

export interface NodeConfig {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  settings: Record<string, any>;
  retryPolicy?: RetryPolicy;
  timeout?: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay?: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

export interface WorkflowVariable {
  name: string;
  type: string;
  value: any;
  description?: string;
  required: boolean;
}

export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  config: TriggerConfig;
  enabled: boolean;
}

export type TriggerType = 
  | 'schedule' 
  | 'webhook' 
  | 'event' 
  | 'manual' 
  | 'api';

export interface TriggerConfig {
  schedule?: string; // Cron expression
  webhook?: WebhookConfig;
  event?: EventConfig;
  api?: ApiConfig;
}

export interface WebhookConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authentication?: AuthenticationConfig;
  validation?: ValidationRule[];
}

export interface EventConfig {
  eventType: string;
  source: string;
  filters?: Record<string, any>;
}

export interface ApiConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authentication?: AuthenticationConfig;
}

export interface AuthenticationConfig {
  type: 'bearer' | 'basic' | 'api_key' | 'oauth2';
  credentials: Record<string, string>;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  value?: any;
  message?: string;
}

export interface WorkflowSettings {
  timeout: number;
  retryPolicy: RetryPolicy;
  concurrency: number;
  errorHandling: ErrorHandlingStrategy;
  logging: LoggingConfig;
}

export type ErrorHandlingStrategy = 
  | 'stop' 
  | 'continue' 
  | 'retry' 
  | 'fallback';

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  retention: number; // days
  includePayloads: boolean;
}

export interface WorkflowMetadata {
  author: string;
  tags: string[];
  category: string;
  documentation?: string;
  estimatedDuration?: number;
  resourceRequirements?: ResourceRequirements;
}

export interface ResourceRequirements {
  cpu: string;
  memory: string;
  storage?: string;
  network?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  logs: ExecutionLog[];
  metrics: ExecutionMetrics;
}

export type ExecutionStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'timeout';

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionMetrics {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  averageLatency: number;
  totalLatency: number;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  network?: number;
  storage?: number;
}