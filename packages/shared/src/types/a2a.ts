/**
 * Agent-to-Agent (A2A) communication types for AgentMesh Cloud
 * Implements secure inter-agent messaging and collaboration protocols
 */

import type { RetryPolicy, AgentStatus, ClientStatus } from './common';

export interface A2AMessage {
  id: string;
  type: A2AMessageType;
  from: string;
  to: string | string[]; // Support for multicast
  payload: any;
  timestamp: Date;
  priority: MessagePriority;
  ttl?: number; // Time to live in seconds
  correlationId?: string;
  replyTo?: string;
  headers: MessageHeaders;
}

export type A2AMessageType = 
  | 'request' 
  | 'response' 
  | 'notification' 
  | 'broadcast' 
  | 'heartbeat' 
  | 'discovery' 
  | 'negotiation' 
  | 'error';

export type MessagePriority = 
  | 'low' 
  | 'normal' 
  | 'high' 
  | 'critical';

export interface MessageHeaders {
  contentType: string;
  encoding: string;
  compression?: string;
  encryption?: EncryptionInfo;
  authentication?: AuthenticationInfo;
  routing?: RoutingInfo;
  metadata?: Record<string, any>;
}

export interface EncryptionInfo {
  algorithm: string;
  keyId: string;
  iv?: string;
}

export interface AuthenticationInfo {
  method: 'jwt' | 'signature' | 'certificate';
  token?: string;
  signature?: string;
  certificate?: string;
}

export interface RoutingInfo {
  routingKey?: string;
  exchange?: string;
  queue?: string;
  persistent: boolean;
  durable: boolean;
}

export interface A2ARequest extends A2AMessage {
  type: 'request';
  method: string;
  params: Record<string, any>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface A2AResponse extends A2AMessage {
  type: 'response';
  requestId: string;
  result?: any;
  error?: A2AError;
  statusCode: number;
}

export interface A2AError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface A2ANotification extends A2AMessage {
  type: 'notification';
  event: string;
  data: any;
  persistent: boolean;
}

export interface A2ABroadcast extends A2AMessage {
  type: 'broadcast';
  scope: BroadcastScope;
  data: any;
}

export type BroadcastScope = 
  | 'global' 
  | 'tenant' 
  | 'workflow' 
  | 'agent_type' 
  | 'custom';

export interface A2AHeartbeat extends A2AMessage {
  type: 'heartbeat';
  status: AgentStatus;
  capabilities: string[];
  load: LoadMetrics;
}

export interface LoadMetrics {
  cpu: number;
  memory: number;
  activeConnections: number;
  queueSize: number;
  lastActivity: Date;
}

export interface A2ADiscovery extends A2AMessage {
  type: 'discovery';
  query: DiscoveryQuery;
  response?: DiscoveryResponse;
}

export interface DiscoveryQuery {
  agentType?: string;
  capabilities?: string[];
  status?: AgentStatus;
  location?: string;
  tags?: string[];
  limit?: number;
}

export interface DiscoveryResponse {
  agents: AgentInfo[];
  total: number;
  hasMore: boolean;
}

export interface AgentInfo {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  capabilities: string[];
  location: string;
  lastSeen: Date;
  metadata: Record<string, any>;
}

export interface A2ANegotiation extends A2AMessage {
  type: 'negotiation';
  phase: NegotiationPhase;
  proposal?: NegotiationProposal;
  acceptance?: NegotiationAcceptance;
  rejection?: NegotiationRejection;
}

export type NegotiationPhase = 
  | 'initiate' 
  | 'propose' 
  | 'counter_propose' 
  | 'accept' 
  | 'reject' 
  | 'timeout';

export interface NegotiationProposal {
  id: string;
  terms: NegotiationTerms;
  expiresAt: Date;
  nonce: string;
}

export interface NegotiationTerms {
  task: TaskDefinition;
  resources: ResourceRequirements;
  compensation: Compensation;
  constraints: Constraint[];
  sla: ServiceLevelAgreement;
}

export interface TaskDefinition {
  id: string;
  name: string;
  description: string;
  inputs: TaskInput[];
  outputs: TaskOutput[];
  estimatedDuration: number;
  complexity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TaskInput {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface TaskOutput {
  name: string;
  type: string;
  description?: string;
}

export interface ResourceRequirements {
  cpu: string;
  memory: string;
  storage?: string;
  network?: string;
  gpu?: string;
}

export interface Compensation {
  type: 'credits' | 'tokens' | 'resources' | 'data';
  amount: number;
  currency?: string;
}

export interface Constraint {
  type: 'time' | 'quality' | 'security' | 'compliance' | 'location';
  value: any;
  operator: 'eq' | 'lt' | 'gt' | 'lte' | 'gte' | 'in' | 'not_in';
}

export interface ServiceLevelAgreement {
  availability: number; // percentage
  responseTime: number; // milliseconds
  throughput: number; // requests per second
  errorRate: number; // percentage
  penalties: Penalty[];
}

export interface Penalty {
  condition: string;
  amount: number;
  type: 'credit_deduction' | 'service_reduction' | 'termination';
}

export interface NegotiationAcceptance {
  proposalId: string;
  signature: string;
  timestamp: Date;
  conditions?: string[];
}

export interface NegotiationRejection {
  proposalId: string;
  reason: string;
  counterProposal?: NegotiationProposal;
  retryAfter?: number; // seconds
}

export interface A2ABroker {
  id: string;
  type: BrokerType;
  config: BrokerConfig;
  status: BrokerStatus;
  connections: number;
  messagesPerSecond: number;
}

export type BrokerType = 
  | 'kafka' 
  | 'nats' 
  | 'rabbitmq' 
  | 'redis' 
  | 'custom';

export interface BrokerConfig {
  endpoints: string[];
  credentials: Record<string, string>;
  settings: BrokerSettings;
  security: SecurityConfig;
}

export interface BrokerSettings {
  partitions?: number;
  replicationFactor?: number;
  retentionPeriod?: number;
  compressionType?: string;
  batchSize?: number;
  lingerMs?: number;
}

export interface SecurityConfig {
  ssl: boolean;
  authentication: string;
  authorization: string;
  encryption: string;
}

export type BrokerStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'error' 
  | 'maintenance';

export interface A2AChannel {
  id: string;
  name: string;
  type: ChannelType;
  config: ChannelConfig;
  subscribers: string[];
  messageCount: number;
  lastMessageAt?: Date;
}

export type ChannelType = 
  | 'direct' 
  | 'fanout' 
  | 'topic' 
  | 'headers' 
  | 'rpc';

export interface ChannelConfig {
  durable: boolean;
  exclusive: boolean;
  autoDelete: boolean;
  arguments?: Record<string, any>;
  routingKey?: string;
  exchange?: string;
}

export interface A2AClient {
  id: string;
  agentId: string;
  broker: A2ABroker;
  channels: Map<string, A2AChannel>;
  status: ClientStatus;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(channel: string, message: A2AMessage): Promise<void>;
  subscribe(channel: string, callback: (message: A2AMessage) => void): Promise<void>;
  unsubscribe(channel: string, callback: (message: A2AMessage) => void): Promise<void>;
  request(target: string, request: A2ARequest): Promise<A2AResponse>;
  respond(requestId: string, response: A2AResponse): Promise<void>;
}