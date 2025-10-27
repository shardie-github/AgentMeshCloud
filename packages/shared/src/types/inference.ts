/**
 * Adaptive Inference Router types for AgentMesh Cloud
 * Implements model-agnostic LLM selection with auto-fallback capabilities
 */

export interface InferenceRequest {
  id: string;
  prompt: string;
  model?: string;
  provider?: LLMProvider;
  parameters: InferenceParameters;
  context?: InferenceContext;
  tenantId: string;
  userId?: string;
  priority: RequestPriority;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  fallbackStrategy?: FallbackStrategy;
  createdAt: Date;
}

export interface InferenceParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
  seed?: number;
}

export interface InferenceContext {
  conversationId?: string;
  sessionId?: string;
  previousMessages?: Message[];
  metadata?: Record<string, any>;
  constraints?: Constraint[];
  preferences?: UserPreferences;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Constraint {
  type: 'cost' | 'latency' | 'quality' | 'privacy' | 'compliance';
  value: any;
  operator: 'eq' | 'lt' | 'gt' | 'lte' | 'gte' | 'in' | 'not_in';
  weight?: number;
}

export interface UserPreferences {
  preferredProviders?: LLMProvider[];
  qualityThreshold?: number;
  costSensitivity?: 'low' | 'medium' | 'high';
  latencySensitivity?: 'low' | 'medium' | 'high';
  privacyLevel?: 'standard' | 'enhanced' | 'maximum';
}

export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay?: number;
  retryableErrors?: string[];
}

export interface FallbackStrategy {
  enabled: boolean;
  fallbackProviders?: LLMProvider[];
  fallbackModels?: string[];
  qualityThreshold?: number;
  latencyThreshold?: number;
  costThreshold?: number;
}

export interface InferenceResponse {
  id: string;
  requestId: string;
  content: string;
  model: string;
  provider: LLMProvider;
  usage: TokenUsage;
  latency: number;
  cost: number;
  quality: QualityMetrics;
  metadata: ResponseMetadata;
  timestamp: Date;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costPerToken: number;
  totalCost: number;
}

export interface QualityMetrics {
  score: number;
  confidence: number;
  coherence: number;
  relevance: number;
  fluency: number;
  safety: number;
  bias: number;
  toxicity: number;
}

export interface ResponseMetadata {
  processingTime: number;
  retryCount: number;
  fallbackUsed: boolean;
  cacheHit: boolean;
  region: string;
  endpoint: string;
  version: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'cohere' | 'huggingface' | 'custom';
  status: ProviderStatus;
  capabilities: ProviderCapabilities;
  pricing: PricingModel;
  limits: ProviderLimits;
  regions: string[];
  endpoints: ProviderEndpoint[];
  health: HealthStatus;
  lastChecked: Date;
}

export type ProviderStatus = 'active' | 'maintenance' | 'degraded' | 'offline' | 'deprecated';

export interface ProviderCapabilities {
  models: ModelInfo[];
  features: string[];
  maxTokens: number;
  maxRequestsPerMinute: number;
  maxRequestsPerDay: number;
  supportedLanguages: string[];
  supportedFormats: string[];
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  audio: boolean;
  codeGeneration: boolean;
  reasoning: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  maxTokens: number;
  capabilities: string[];
  pricing: ModelPricing;
  performance: ModelPerformance;
  availability: ModelAvailability;
}

export interface ModelPricing {
  inputTokensPerDollar: number;
  outputTokensPerDollar: number;
  currency: string;
  tier?: string;
}

export interface ModelPerformance {
  latency: number;
  throughput: number;
  quality: number;
  reliability: number;
  accuracy: number;
}

export interface ModelAvailability {
  regions: string[];
  status: 'available' | 'limited' | 'unavailable';
  maintenanceWindows: MaintenanceWindow[];
}

export interface MaintenanceWindow {
  start: Date;
  end: Date;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

export interface PricingModel {
  type: 'per_token' | 'per_request' | 'subscription' | 'tiered';
  basePrice: number;
  currency: string;
  tiers?: PricingTier[];
  discounts?: Discount[];
}

export interface PricingTier {
  minTokens: number;
  maxTokens?: number;
  pricePerToken: number;
  discount?: number;
}

export interface Discount {
  type: 'volume' | 'commitment' | 'partnership';
  threshold: number;
  percentage: number;
  description: string;
}

export interface ProviderLimits {
  rateLimit: RateLimit;
  quotaLimit: QuotaLimit;
  concurrencyLimit: number;
  requestSizeLimit: number;
  responseSizeLimit: number;
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerMinute: number;
  tokensPerHour: number;
  tokensPerDay: number;
}

export interface QuotaLimit {
  monthlyTokens: number;
  monthlyRequests: number;
  monthlyCost: number;
  resetDate: Date;
}

export interface ProviderEndpoint {
  region: string;
  url: string;
  status: 'active' | 'maintenance' | 'offline';
  latency: number;
  lastChecked: Date;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastError?: string;
  lastErrorAt?: Date;
}

export interface RouterConfig {
  defaultProvider: LLMProvider;
  fallbackProviders: LLMProvider[];
  loadBalancing: LoadBalancingConfig;
  caching: CachingConfig;
  monitoring: MonitoringConfig;
  optimization: OptimizationConfig;
}

export interface LoadBalancingConfig {
  strategy: 'round_robin' | 'least_connections' | 'weighted' | 'latency_based' | 'cost_based' | 'quality_based';
  weights?: Record<string, number>;
  healthCheckInterval: number;
  failoverThreshold: number;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'ttl';
  keyGenerator: (request: InferenceRequest) => string;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number;
  alertThresholds: AlertThreshold[];
  logging: LoggingConfig;
}

export interface AlertThreshold {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'alert' | 'auto_failover';
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destination: 'console' | 'file' | 'remote';
  retention: number;
}

export interface OptimizationConfig {
  enabled: boolean;
  strategies: OptimizationStrategy[];
  learningRate: number;
  updateInterval: number;
}

export interface OptimizationStrategy {
  type: 'latency' | 'cost' | 'quality' | 'reliability';
  weight: number;
  threshold: number;
  action: 'reroute' | 'scale' | 'cache' | 'fallback';
}

export interface RouterMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  averageCost: number;
  averageQuality: number;
  providerDistribution: Record<string, number>;
  errorDistribution: Record<string, number>;
  cacheHitRate: number;
  fallbackRate: number;
  lastUpdated: Date;
}

export interface RouterHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providers: ProviderHealth[];
  metrics: RouterMetrics;
  lastChecked: Date;
}

export interface ProviderHealth {
  providerId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastChecked: Date;
}

export interface InferenceRouter {
  id: string;
  name: string;
  config: RouterConfig;
  status: 'active' | 'inactive' | 'maintenance';
  metrics: RouterMetrics;
  health: RouterHealth;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouterService {
  initialize(): Promise<void>;
  route(request: InferenceRequest): Promise<InferenceResponse>;
  getProviders(): Promise<LLMProvider[]>;
  getProvider(id: string): Promise<LLMProvider | null>;
  addProvider(provider: LLMProvider): Promise<void>;
  updateProvider(id: string, updates: Partial<LLMProvider>): Promise<void>;
  removeProvider(id: string): Promise<void>;
  getMetrics(): Promise<RouterMetrics>;
  getHealth(): Promise<RouterHealth>;
  updateConfig(config: Partial<RouterConfig>): Promise<void>;
  cleanup(): Promise<void>;
}