/**
 * Federated Gateway types for AgentMesh Cloud
 * Implements third-party agent integration with tenant-scoped tokens
 */

export interface FederatedAgent {
  id: string;
  name: string;
  description: string;
  version: string;
  provider: AgentProvider;
  capabilities: AgentCapability[];
  endpoints: AgentEndpoint[];
  authentication: AuthenticationConfig;
  pricing: PricingConfig;
  status: AgentStatus;
  health: HealthStatus;
  metadata: AgentMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt?: Date;
}

export interface AgentProvider {
  id: string;
  name: string;
  type: ProviderType;
  contact: ContactInfo;
  support: SupportInfo;
  compliance: ComplianceInfo;
  reputation: ReputationScore;
  verified: boolean;
  certified: boolean;
}

export type ProviderType = 
  | 'enterprise' 
  | 'startup' 
  | 'individual' 
  | 'academic' 
  | 'government' 
  | 'nonprofit';

export interface ContactInfo {
  email: string;
  website?: string;
  phone?: string;
  address?: Address;
  socialMedia?: SocialMedia;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface SocialMedia {
  twitter?: string;
  linkedin?: string;
  github?: string;
  discord?: string;
}

export interface SupportInfo {
  documentation: string;
  apiReference: string;
  tutorials: string[];
  community: string;
  supportEmail: string;
  responseTime: string;
  availability: string;
}

export interface ComplianceInfo {
  certifications: string[];
  dataResidency: string[];
  privacyPolicy: string;
  termsOfService: string;
  gdprCompliant: boolean;
  soc2Compliant: boolean;
  hipaaCompliant: boolean;
  iso27001Compliant: boolean;
}

export interface ReputationScore {
  overall: number;
  reliability: number;
  performance: number;
  security: number;
  support: number;
  innovation: number;
  totalReviews: number;
  lastUpdated: Date;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  type: CapabilityType;
  inputs: CapabilityInput[];
  outputs: CapabilityOutput[];
  constraints: CapabilityConstraint[];
  examples: CapabilityExample[];
  documentation: string;
}

export type CapabilityType = 
  | 'llm' 
  | 'nlp' 
  | 'computer_vision' 
  | 'speech' 
  | 'data_processing' 
  | 'analytics' 
  | 'automation' 
  | 'integration' 
  | 'custom';

export interface CapabilityInput {
  name: string;
  type: string;
  required: boolean;
  description: string;
  validation: ValidationRule[];
  examples: any[];
}

export interface CapabilityOutput {
  name: string;
  type: string;
  description: string;
  examples: any[];
}

export interface CapabilityConstraint {
  type: 'rate_limit' | 'timeout' | 'resource' | 'security' | 'compliance';
  value: string | number;
  description: string;
  enforcement: 'strict' | 'warning' | 'audit';
}

export interface CapabilityExample {
  name: string;
  description: string;
  input: any;
  output: any;
  code?: string;
}

export interface AgentEndpoint {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  authentication: EndpointAuth;
  rateLimit: RateLimit;
  timeout: number;
  retryPolicy: RetryPolicy;
  healthCheck: HealthCheckConfig;
  monitoring: MonitoringConfig;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

export interface EndpointAuth {
  type: 'api_key' | 'oauth2' | 'jwt' | 'basic' | 'bearer' | 'custom';
  config: AuthConfig;
  scopes?: string[];
  permissions?: string[];
}

export interface AuthConfig {
  headerName?: string;
  headerValue?: string;
  queryParam?: string;
  bodyField?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  custom?: Record<string, any>;
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  windowSize: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  endpoint: string;
  expectedStatus: number;
  expectedResponse?: any;
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: string[];
  alerts: AlertConfig[];
  logging: LoggingConfig;
}

export interface AlertConfig {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'alert' | 'disable' | 'escalate';
  notification: NotificationConfig;
}

export interface NotificationConfig {
  email: string[];
  webhook?: string;
  slack?: string;
  teams?: string;
  custom?: Record<string, any>;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destination: 'console' | 'file' | 'remote';
  retention: number;
}

export interface AuthenticationConfig {
  type: 'api_key' | 'oauth2' | 'jwt' | 'basic' | 'custom';
  credentials: CredentialConfig;
  scopes: string[];
  permissions: string[];
  expiration?: Date;
  refreshToken?: string;
}

export interface CredentialConfig {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  token?: string;
  custom?: Record<string, any>;
}

export interface PricingConfig {
  model: PricingModel;
  tiers: PricingTier[];
  discounts: Discount[];
  currency: string;
  billing: BillingConfig;
  freeTier?: FreeTierConfig;
}

export type PricingModel = 
  | 'per_request' 
  | 'per_token' 
  | 'per_minute' 
  | 'per_hour' 
  | 'per_day' 
  | 'per_month' 
  | 'subscription' 
  | 'tiered' 
  | 'freemium';

export interface PricingTier {
  name: string;
  description: string;
  price: number;
  unit: string;
  limits: TierLimits;
  features: string[];
  popular?: boolean;
}

export interface TierLimits {
  requests?: number;
  tokens?: number;
  time?: number;
  storage?: number;
  bandwidth?: number;
  users?: number;
  custom?: Record<string, number>;
}

export interface Discount {
  type: 'volume' | 'commitment' | 'early_bird' | 'loyalty' | 'partnership';
  name: string;
  description: string;
  percentage: number;
  conditions: DiscountCondition[];
  validFrom: Date;
  validTo: Date;
}

export interface DiscountCondition {
  type: 'min_usage' | 'min_commitment' | 'min_users' | 'custom';
  value: number;
  operator: 'gte' | 'gt' | 'eq' | 'lt' | 'lte';
}

export interface BillingConfig {
  cycle: 'monthly' | 'quarterly' | 'yearly';
  currency: string;
  taxIncluded: boolean;
  paymentMethods: string[];
  invoicing: boolean;
  autoRenewal: boolean;
}

export interface FreeTierConfig {
  enabled: boolean;
  limits: TierLimits;
  duration?: number;
  features: string[];
  restrictions: string[];
}

export type AgentStatus = 
  | 'active' 
  | 'inactive' 
  | 'maintenance' 
  | 'deprecated' 
  | 'suspended' 
  | 'error';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastChecked: Date;
  lastError?: string;
  metrics: HealthMetrics;
}

export interface HealthMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  custom?: Record<string, number>;
}

export interface AgentMetadata {
  tags: string[];
  categories: string[];
  languages: string[];
  regions: string[];
  timezone: string;
  lastUpdated: Date;
  version: string;
  changelog: ChangelogEntry[];
  custom?: Record<string, any>;
}

export interface ChangelogEntry {
  version: string;
  date: Date;
  changes: string[];
  breaking: boolean;
  migration?: string;
}

export interface TenantToken {
  id: string;
  tenantId: string;
  agentId: string;
  token: string;
  scopes: string[];
  permissions: string[];
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  usage: TokenUsage;
  metadata: TokenMetadata;
}

export interface TokenUsage {
  requests: number;
  tokens: number;
  cost: number;
  lastReset: Date;
  limits: UsageLimits;
}

export interface UsageLimits {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerMinute: number;
  tokensPerHour: number;
  tokensPerDay: number;
  costPerDay: number;
  costPerMonth: number;
}

export interface TokenMetadata {
  createdBy: string;
  purpose: string;
  environment: 'development' | 'staging' | 'production';
  ipWhitelist?: string[];
  userAgentWhitelist?: string[];
  custom?: Record<string, any>;
}

export interface FederatedRequest {
  id: string;
  tenantId: string;
  agentId: string;
  endpoint: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  timeout?: number;
  retries?: number;
  priority: RequestPriority;
  metadata: RequestMetadata;
  createdAt: Date;
}

export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';

export interface RequestMetadata {
  userId?: string;
  sessionId?: string;
  workflowId?: string;
  traceId?: string;
  tags?: string[];
  custom?: Record<string, any>;
}

export interface FederatedResponse {
  id: string;
  requestId: string;
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  latency: number;
  cost: number;
  usage: ResponseUsage;
  metadata: ResponseMetadata;
  timestamp: Date;
}

export interface ResponseUsage {
  tokens: number;
  requests: number;
  cost: number;
  duration: number;
}

export interface ResponseMetadata {
  agentVersion: string;
  providerName: string;
  region: string;
  cacheHit: boolean;
  retryCount: number;
  custom?: Record<string, any>;
}

export interface FederatedGateway {
  id: string;
  name: string;
  description: string;
  version: string;
  status: GatewayStatus;
  configuration: GatewayConfig;
  statistics: GatewayStatistics;
  health: GatewayHealth;
  createdAt: Date;
  updatedAt: Date;
}

export type GatewayStatus = 'active' | 'inactive' | 'maintenance' | 'error';

export interface GatewayConfig {
  authentication: GatewayAuthConfig;
  rateLimiting: RateLimitingConfig;
  loadBalancing: LoadBalancingConfig;
  caching: CachingConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
  routing: RoutingConfig;
}

export interface GatewayAuthConfig {
  enabled: boolean;
  methods: string[];
  tokenValidation: boolean;
  apiKeyValidation: boolean;
  oauth2Validation: boolean;
  customValidation?: string;
}

export interface RateLimitingConfig {
  enabled: boolean;
  global: RateLimit;
  perTenant: RateLimit;
  perAgent: RateLimit;
  perUser: RateLimit;
  strategy: 'fixed_window' | 'sliding_window' | 'token_bucket';
}

export interface LoadBalancingConfig {
  enabled: boolean;
  strategy: 'round_robin' | 'least_connections' | 'weighted' | 'latency_based' | 'random';
  healthCheck: HealthCheckConfig;
  failover: FailoverConfig;
}

export interface FailoverConfig {
  enabled: boolean;
  threshold: number;
  timeout: number;
  retryAttempts: number;
  fallbackAgents: string[];
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'ttl' | 'fifo';
  keyGenerator: string;
  invalidation: InvalidationConfig;
}

export interface InvalidationConfig {
  strategy: 'time_based' | 'event_based' | 'manual' | 'hybrid';
  events: string[];
  patterns: string[];
}

export interface SecurityConfig {
  encryption: EncryptionConfig;
  authentication: AuthenticationConfig;
  authorization: AuthorizationConfig;
  audit: AuditConfig;
  compliance: ComplianceConfig;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keySize: number;
  inTransit: boolean;
  atRest: boolean;
  keyRotation: number;
}

export interface AuthorizationConfig {
  enabled: boolean;
  rbac: boolean;
  abac: boolean;
  custom: boolean;
  policies: Policy[];
}

export interface Policy {
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

export interface AuditConfig {
  enabled: boolean;
  level: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
  retention: number;
  destinations: string[];
  realTime: boolean;
}

export interface ComplianceConfig {
  gdpr: boolean;
  ccpa: boolean;
  hipaa: boolean;
  soc2: boolean;
  iso27001: boolean;
  pci: boolean;
  custom: string[];
}

export interface RoutingConfig {
  enabled: boolean;
  strategy: 'direct' | 'proxy' | 'load_balanced' | 'intelligent';
  rules: RoutingRule[];
  fallback: FallbackConfig;
}

export interface RoutingRule {
  id: string;
  condition: string;
  target: string;
  weight: number;
  priority: number;
  enabled: boolean;
}

export interface FallbackConfig {
  enabled: boolean;
  strategy: 'failover' | 'circuit_breaker' | 'retry' | 'degraded';
  timeout: number;
  retries: number;
  threshold: number;
}

export interface GatewayStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  averageCost: number;
  totalCost: number;
  activeAgents: number;
  activeTenants: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface GatewayHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastChecked: Date;
  components: ComponentHealth[];
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastChecked: Date;
}

export interface FederatedGatewayService {
  initialize(): Promise<void>;
  registerAgent(agent: Omit<FederatedAgent, 'id' | 'createdAt' | 'updatedAt'>): Promise<FederatedAgent>;
  getAgent(id: string): Promise<FederatedAgent | null>;
  updateAgent(id: string, updates: Partial<FederatedAgent>): Promise<FederatedAgent>;
  deleteAgent(id: string): Promise<void>;
  listAgents(filters?: AgentFilters): Promise<FederatedAgent[]>;
  createTenantToken(tenantId: string, agentId: string, config: TokenConfig): Promise<TenantToken>;
  validateToken(token: string): Promise<TenantToken | null>;
  revokeToken(tokenId: string): Promise<void>;
  makeRequest(request: FederatedRequest): Promise<FederatedResponse>;
  getGatewayStatus(): Promise<GatewayStatus>;
  getGatewayStatistics(): Promise<GatewayStatistics>;
  getGatewayHealth(): Promise<GatewayHealth>;
  cleanup(): Promise<void>;
}

export interface AgentFilters {
  status?: AgentStatus[];
  capabilities?: string[];
  providers?: string[];
  pricing?: PricingFilter;
  compliance?: string[];
  regions?: string[];
  verified?: boolean;
  certified?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PricingFilter {
  min?: number;
  max?: number;
  currency?: string;
  model?: PricingModel;
}

export interface TokenConfig {
  scopes: string[];
  permissions: string[];
  expiresIn: number;
  metadata: TokenMetadata;
}