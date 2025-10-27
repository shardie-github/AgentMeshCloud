/**
 * Core agent types for AgentMesh Cloud
 * Defines the structure and capabilities of AI agents in the system
 */

export interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  status: AgentStatus;
  capabilities: AgentCapability[];
  metadata: AgentMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt?: Date;
}

export type AgentStatus = 
  | 'online' 
  | 'offline' 
  | 'processing' 
  | 'error' 
  | 'maintenance';

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  type: CapabilityType;
  inputs: CapabilityInput[];
  outputs: CapabilityOutput[];
  constraints?: CapabilityConstraint[];
}

export type CapabilityType = 
  | 'llm' 
  | 'tool' 
  | 'data' 
  | 'workflow' 
  | 'notification' 
  | 'analytics';

export interface CapabilityInput {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  validation?: ValidationRule[];
}

export interface CapabilityOutput {
  name: string;
  type: string;
  description?: string;
}

export interface CapabilityConstraint {
  type: 'rate_limit' | 'timeout' | 'resource' | 'security';
  value: string | number;
  description?: string;
}

export interface AgentMetadata {
  author: string;
  tags: string[];
  category: string;
  documentation?: string;
  repository?: string;
  license?: string;
  nandaCredentials?: NandaCredentials;
  mcpCompliant: boolean;
  a2aCompliant: boolean;
}

export interface NandaCredentials {
  agentId: string;
  publicKey: string;
  certificate: string;
  issuedAt: Date;
  expiresAt: Date;
  issuer: string;
}

export interface AgentRegistration {
  agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>;
  credentials: AgentCredentials;
  policies: AgentPolicy[];
}

export interface AgentCredentials {
  apiKey: string;
  secretKey: string;
  permissions: string[];
  scopes: string[];
}

export interface AgentPolicy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  enforcement: 'strict' | 'warning' | 'audit';
}

export interface PolicyRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'require_approval';
  metadata?: Record<string, any>;
}