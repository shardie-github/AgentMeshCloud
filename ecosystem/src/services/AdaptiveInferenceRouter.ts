/**
 * Adaptive Inference Router Service for AgentMesh Cloud
 * Implements model-agnostic LLM selection with auto-fallback capabilities
 */

import { logger } from '@/utils/logger';
import { config } from '@/config';
import {
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
  MonitoringConfig,
  OptimizationConfig,
  TokenUsage,
  QualityMetrics,
  ResponseMetadata,
  ModelInfo,
  HealthStatus
} from '@agentmesh/shared';

export class AdaptiveInferenceRouter implements RouterService {
  private providers: Map<string, LLMProvider> = new Map();
  private config: RouterConfig;
  private metrics: RouterMetrics;
  private health: RouterHealth;
  private cache: Map<string, InferenceResponse> = new Map();
  private isInitialized = false;

  constructor() {
    this.config = this.getDefaultConfig();
    this.metrics = this.getInitialMetrics();
    this.health = this.getInitialHealth();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing Adaptive Inference Router...');

      // Initialize default providers
      await this.initializeDefaultProviders();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start metrics collection
      this.startMetricsCollection();

      // Start optimization
      this.startOptimization();

      this.isInitialized = true;
      logger.info('Adaptive Inference Router initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Adaptive Inference Router:', error);
      throw error;
    }
  }

  private getDefaultConfig(): RouterConfig {
    return {
      defaultProvider: null as any, // Will be set during initialization
      fallbackProviders: [],
      loadBalancing: {
        strategy: 'quality_based',
        healthCheckInterval: 30000,
        failoverThreshold: 0.1
      },
      caching: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 1000,
        strategy: 'lru',
        keyGenerator: (request) => this.generateCacheKey(request)
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60000, // 1 minute
        alertThresholds: [
          {
            metric: 'error_rate',
            threshold: 0.05,
            operator: 'gt',
            severity: 'high',
            action: 'auto_failover'
          },
          {
            metric: 'latency',
            threshold: 5000,
            operator: 'gt',
            severity: 'medium',
            action: 'alert'
          }
        ],
        logging: {
          level: 'info',
          format: 'json',
          destination: 'console',
          retention: 7
        }
      },
      optimization: {
        enabled: true,
        strategies: [
          { type: 'latency', weight: 0.3, threshold: 2000, action: 'reroute' },
          { type: 'cost', weight: 0.2, threshold: 0.01, action: 'reroute' },
          { type: 'quality', weight: 0.3, threshold: 0.8, action: 'reroute' },
          { type: 'reliability', weight: 0.2, threshold: 0.95, action: 'fallback' }
        ],
        learningRate: 0.1,
        updateInterval: 300000 // 5 minutes
      }
    };
  }

  private getInitialMetrics(): RouterMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      averageCost: 0,
      averageQuality: 0,
      providerDistribution: {},
      errorDistribution: {},
      cacheHitRate: 0,
      fallbackRate: 0,
      lastUpdated: new Date()
    };
  }

  private getInitialHealth(): RouterHealth {
    return {
      status: 'healthy',
      providers: [],
      metrics: this.metrics,
      lastChecked: new Date()
    };
  }

  private async initializeDefaultProviders(): Promise<void> {
    // Initialize OpenAI provider
    const openaiProvider: LLMProvider = {
      id: 'openai',
      name: 'OpenAI',
      type: 'openai',
      status: 'active',
      capabilities: {
        models: [
          {
            id: 'gpt-4',
            name: 'GPT-4',
            description: 'Most capable GPT-4 model',
            contextLength: 8192,
            maxTokens: 4096,
            capabilities: ['text', 'function_calling', 'reasoning'],
            pricing: {
              inputTokensPerDollar: 0.00003,
              outputTokensPerDollar: 0.00006,
              currency: 'USD'
            },
            performance: {
              latency: 1500,
              throughput: 100,
              quality: 0.95,
              reliability: 0.99,
              accuracy: 0.92
            },
            availability: {
              regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
              status: 'available',
              maintenanceWindows: []
            }
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            description: 'Fast and efficient GPT-3.5 model',
            contextLength: 4096,
            maxTokens: 4096,
            capabilities: ['text', 'function_calling'],
            pricing: {
              inputTokensPerDollar: 0.0000015,
              outputTokensPerDollar: 0.000002,
              currency: 'USD'
            },
            performance: {
              latency: 800,
              throughput: 200,
              quality: 0.85,
              reliability: 0.98,
              accuracy: 0.88
            },
            availability: {
              regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
              status: 'available',
              maintenanceWindows: []
            }
          }
        ],
        features: ['text', 'function_calling', 'streaming'],
        maxTokens: 4096,
        maxRequestsPerMinute: 1000,
        maxRequestsPerDay: 100000,
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'],
        supportedFormats: ['text', 'json', 'markdown'],
        streaming: true,
        functionCalling: true,
        vision: false,
        audio: false,
        codeGeneration: true,
        reasoning: true
      },
      pricing: {
        type: 'per_token',
        basePrice: 0.00003,
        currency: 'USD'
      },
      limits: {
        rateLimit: {
          requestsPerMinute: 1000,
          requestsPerHour: 10000,
          requestsPerDay: 100000,
          tokensPerMinute: 100000,
          tokensPerHour: 1000000,
          tokensPerDay: 10000000
        },
        quotaLimit: {
          monthlyTokens: 10000000,
          monthlyRequests: 100000,
          monthlyCost: 1000,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        concurrencyLimit: 10,
        requestSizeLimit: 100000,
        responseSizeLimit: 100000
      },
      regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
      endpoints: [
        {
          region: 'us-east-1',
          url: 'https://api.openai.com/v1',
          status: 'active',
          latency: 50,
          lastChecked: new Date()
        }
      ],
      health: {
        status: 'healthy',
        uptime: 99.9,
        responseTime: 1500,
        errorRate: 0.01,
        lastChecked: new Date()
      },
      lastChecked: new Date()
    };

    // Initialize Anthropic provider
    const anthropicProvider: LLMProvider = {
      id: 'anthropic',
      name: 'Anthropic',
      type: 'anthropic',
      status: 'active',
      capabilities: {
        models: [
          {
            id: 'claude-3-opus',
            name: 'Claude 3 Opus',
            description: 'Most powerful Claude model',
            contextLength: 200000,
            maxTokens: 4096,
            capabilities: ['text', 'reasoning', 'analysis'],
            pricing: {
              inputTokensPerDollar: 0.000015,
              outputTokensPerDollar: 0.000075,
              currency: 'USD'
            },
            performance: {
              latency: 2000,
              throughput: 80,
              quality: 0.97,
              reliability: 0.99,
              accuracy: 0.94
            },
            availability: {
              regions: ['us-east-1', 'us-west-2'],
              status: 'available',
              maintenanceWindows: []
            }
          }
        ],
        features: ['text', 'reasoning', 'analysis'],
        maxTokens: 4096,
        maxRequestsPerMinute: 500,
        maxRequestsPerDay: 50000,
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'],
        supportedFormats: ['text', 'json', 'markdown'],
        streaming: true,
        functionCalling: false,
        vision: false,
        audio: false,
        codeGeneration: true,
        reasoning: true
      },
      pricing: {
        type: 'per_token',
        basePrice: 0.000015,
        currency: 'USD'
      },
      limits: {
        rateLimit: {
          requestsPerMinute: 500,
          requestsPerHour: 5000,
          requestsPerDay: 50000,
          tokensPerMinute: 50000,
          tokensPerHour: 500000,
          tokensPerDay: 5000000
        },
        quotaLimit: {
          monthlyTokens: 5000000,
          monthlyRequests: 50000,
          monthlyCost: 500,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        concurrencyLimit: 5,
        requestSizeLimit: 200000,
        responseSizeLimit: 100000
      },
      regions: ['us-east-1', 'us-west-2'],
      endpoints: [
        {
          region: 'us-east-1',
          url: 'https://api.anthropic.com/v1',
          status: 'active',
          latency: 60,
          lastChecked: new Date()
        }
      ],
      health: {
        status: 'healthy',
        uptime: 99.8,
        responseTime: 2000,
        errorRate: 0.02,
        lastChecked: new Date()
      },
      lastChecked: new Date()
    };

    // Initialize Google provider
    const googleProvider: LLMProvider = {
      id: 'google',
      name: 'Google',
      type: 'google',
      status: 'active',
      capabilities: {
        models: [
          {
            id: 'gemini-pro',
            name: 'Gemini Pro',
            description: 'Google\'s most capable model',
            contextLength: 32768,
            maxTokens: 8192,
            capabilities: ['text', 'reasoning', 'multimodal'],
            pricing: {
              inputTokensPerDollar: 0.0000005,
              outputTokensPerDollar: 0.0000015,
              currency: 'USD'
            },
            performance: {
              latency: 1200,
              throughput: 150,
              quality: 0.90,
              reliability: 0.97,
              accuracy: 0.89
            },
            availability: {
              regions: ['us-central1', 'europe-west1', 'asia-southeast1'],
              status: 'available',
              maintenanceWindows: []
            }
          }
        ],
        features: ['text', 'reasoning', 'multimodal'],
        maxTokens: 8192,
        maxRequestsPerMinute: 2000,
        maxRequestsPerDay: 200000,
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'],
        supportedFormats: ['text', 'json', 'markdown'],
        streaming: true,
        functionCalling: true,
        vision: true,
        audio: false,
        codeGeneration: true,
        reasoning: true
      },
      pricing: {
        type: 'per_token',
        basePrice: 0.0000005,
        currency: 'USD'
      },
      limits: {
        rateLimit: {
          requestsPerMinute: 2000,
          requestsPerHour: 20000,
          requestsPerDay: 200000,
          tokensPerMinute: 200000,
          tokensPerHour: 2000000,
          tokensPerDay: 20000000
        },
        quotaLimit: {
          monthlyTokens: 20000000,
          monthlyRequests: 200000,
          monthlyCost: 2000,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        concurrencyLimit: 20,
        requestSizeLimit: 32768,
        responseSizeLimit: 8192
      },
      regions: ['us-central1', 'europe-west1', 'asia-southeast1'],
      endpoints: [
        {
          region: 'us-central1',
          url: 'https://generativelanguage.googleapis.com/v1',
          status: 'active',
          latency: 40,
          lastChecked: new Date()
        }
      ],
      health: {
        status: 'healthy',
        uptime: 99.5,
        responseTime: 1200,
        errorRate: 0.05,
        lastChecked: new Date()
      },
      lastChecked: new Date()
    };

    // Add providers
    this.providers.set(openaiProvider.id, openaiProvider);
    this.providers.set(anthropicProvider.id, anthropicProvider);
    this.providers.set(googleProvider.id, googleProvider);

    // Set default provider
    this.config.defaultProvider = openaiProvider;
    this.config.fallbackProviders = [anthropicProvider, googleProvider];

    logger.info('Default providers initialized');
  }

  async route(request: InferenceRequest): Promise<InferenceResponse> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (this.config.caching.enabled) {
        const cacheKey = this.generateCacheKey(request);
        const cachedResponse = this.cache.get(cacheKey);
        if (cachedResponse) {
          this.metrics.cacheHitRate = (this.metrics.cacheHitRate * this.metrics.totalRequests + 1) / (this.metrics.totalRequests + 1);
          logger.info(`Cache hit for request ${request.id}`);
          return cachedResponse;
        }
      }

      // Select provider
      const provider = await this.selectProvider(request);
      
      // Execute request
      const response = await this.executeRequest(provider, request);
      
      // Update metrics
      this.updateMetrics(request, response, Date.now() - startTime);
      
      // Cache response
      if (this.config.caching.enabled) {
        const cacheKey = this.generateCacheKey(request);
        this.cache.set(cacheKey, response);
        this.cleanupCache();
      }

      return response;
    } catch (error) {
      logger.error(`Failed to route request ${request.id}:`, error);
      
      // Try fallback providers
      if (this.config.fallbackProviders.length > 0) {
        return await this.tryFallbackProviders(request, error);
      }
      
      throw error;
    }
  }

  private async selectProvider(request: InferenceRequest): Promise<LLMProvider> {
    // If specific provider requested, use it
    if (request.provider) {
      const provider = this.providers.get(request.provider);
      if (provider && provider.status === 'active') {
        return provider;
      }
    }

    // If specific model requested, find provider that supports it
    if (request.model) {
      for (const provider of this.providers.values()) {
        if (provider.status === 'active' && 
            provider.capabilities.models.some(m => m.id === request.model)) {
          return provider;
        }
      }
    }

    // Use load balancing strategy
    return this.selectProviderByStrategy(request);
  }

  private selectProviderByStrategy(request: InferenceRequest): LLMProvider {
    const activeProviders = Array.from(this.providers.values())
      .filter(p => p.status === 'active');

    if (activeProviders.length === 0) {
      throw new Error('No active providers available');
    }

    switch (this.config.loadBalancing.strategy) {
      case 'round_robin':
        return this.selectRoundRobin(activeProviders);
      case 'least_connections':
        return this.selectLeastConnections(activeProviders);
      case 'weighted':
        return this.selectWeighted(activeProviders);
      case 'latency_based':
        return this.selectLatencyBased(activeProviders);
      case 'cost_based':
        return this.selectCostBased(activeProviders, request);
      case 'quality_based':
        return this.selectQualityBased(activeProviders, request);
      default:
        return this.config.defaultProvider;
    }
  }

  private selectRoundRobin(providers: LLMProvider[]): LLMProvider {
    const index = this.metrics.totalRequests % providers.length;
    return providers[index];
  }

  private selectLeastConnections(providers: LLMProvider[]): LLMProvider {
    return providers.reduce((min, provider) => 
      provider.limits.concurrencyLimit < min.limits.concurrencyLimit ? provider : min
    );
  }

  private selectWeighted(providers: LLMProvider[]): LLMProvider {
    const weights = this.config.loadBalancing.weights || {};
    const totalWeight = providers.reduce((sum, provider) => 
      sum + (weights[provider.id] || 1), 0
    );
    
    let random = Math.random() * totalWeight;
    for (const provider of providers) {
      random -= (weights[provider.id] || 1);
      if (random <= 0) {
        return provider;
      }
    }
    
    return providers[0];
  }

  private selectLatencyBased(providers: LLMProvider[]): LLMProvider {
    return providers.reduce((min, provider) => 
      provider.health.responseTime < min.health.responseTime ? provider : min
    );
  }

  private selectCostBased(providers: LLMProvider[], request: InferenceRequest): LLMProvider {
    return providers.reduce((min, provider) => {
      const minCost = this.estimateCost(min, request);
      const providerCost = this.estimateCost(provider, request);
      return providerCost < minCost ? provider : min;
    });
  }

  private selectQualityBased(providers: LLMProvider[], request: InferenceRequest): LLMProvider {
    return providers.reduce((max, provider) => {
      const maxQuality = this.getProviderQuality(max);
      const providerQuality = this.getProviderQuality(provider);
      return providerQuality > maxQuality ? provider : max;
    });
  }

  private estimateCost(provider: LLMProvider, request: InferenceRequest): number {
    const estimatedTokens = request.prompt.length / 4; // Rough estimation
    const model = provider.capabilities.models[0]; // Use first model for estimation
    return estimatedTokens * model.pricing.inputTokensPerDollar;
  }

  private getProviderQuality(provider: LLMProvider): number {
    const model = provider.capabilities.models[0];
    return model.performance.quality * provider.health.uptime / 100;
  }

  private async executeRequest(provider: LLMProvider, request: InferenceRequest): Promise<InferenceResponse> {
    const startTime = Date.now();
    
    try {
      // Simulate API call based on provider type
      let content: string;
      let usage: TokenUsage;
      
      switch (provider.type) {
        case 'openai':
          content = await this.callOpenAI(provider, request);
          break;
        case 'anthropic':
          content = await this.callAnthropic(provider, request);
          break;
        case 'google':
          content = await this.callGoogle(provider, request);
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      const latency = Date.now() - startTime;
      const cost = this.calculateCost(provider, usage);
      const quality = this.assessQuality(content, request);

      const response: InferenceResponse = {
        id: this.generateId(),
        requestId: request.id,
        content,
        model: request.model || provider.capabilities.models[0].id,
        provider: provider.id,
        usage,
        latency,
        cost,
        quality,
        metadata: {
          processingTime: latency,
          retryCount: 0,
          fallbackUsed: false,
          cacheHit: false,
          region: provider.regions[0],
          endpoint: provider.endpoints[0].url,
          version: '1.0.0'
        },
        timestamp: new Date()
      };

      return response;
    } catch (error) {
      logger.error(`Failed to execute request with provider ${provider.id}:`, error);
      throw error;
    }
  }

  private async callOpenAI(provider: LLMProvider, request: InferenceRequest): Promise<string> {
    // Simulate OpenAI API call
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    return `OpenAI response for: ${request.prompt.substring(0, 100)}...`;
  }

  private async callAnthropic(provider: LLMProvider, request: InferenceRequest): Promise<string> {
    // Simulate Anthropic API call
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    return `Anthropic response for: ${request.prompt.substring(0, 100)}...`;
  }

  private async callGoogle(provider: LLMProvider, request: InferenceRequest): Promise<string> {
    // Simulate Google API call
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 800));
    
    return `Google response for: ${request.prompt.substring(0, 100)}...`;
  }

  private calculateCost(provider: LLMProvider, usage: TokenUsage): number {
    const model = provider.capabilities.models[0];
    return usage.promptTokens * model.pricing.inputTokensPerDollar + 
           usage.completionTokens * model.pricing.outputTokensPerDollar;
  }

  private assessQuality(content: string, request: InferenceRequest): QualityMetrics {
    // Simple quality assessment based on content length and complexity
    const length = content.length;
    const complexity = this.analyzeComplexity(content);
    const coherence = Math.min(1, length / 100);
    
    return {
      score: (coherence + complexity) / 2,
      confidence: 0.8,
      coherence,
      relevance: 0.85,
      fluency: 0.9,
      safety: 0.95,
      bias: 0.1,
      toxicity: 0.05
    };
  }

  private analyzeComplexity(content: string): number {
    const words = content.split(' ').length;
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
    
    return Math.min(1, avgWordsPerSentence / 20);
  }

  private async tryFallbackProviders(request: InferenceRequest, originalError: any): Promise<InferenceResponse> {
    for (const provider of this.config.fallbackProviders) {
      try {
        logger.info(`Trying fallback provider: ${provider.id}`);
        const response = await this.executeRequest(provider, request);
        response.metadata.fallbackUsed = true;
        this.metrics.fallbackRate = (this.metrics.fallbackRate * this.metrics.totalRequests + 1) / (this.metrics.totalRequests + 1);
        return response;
      } catch (error) {
        logger.warn(`Fallback provider ${provider.id} failed:`, error);
        continue;
      }
    }
    
    throw new Error(`All providers failed. Original error: ${originalError.message}`);
  }

  private generateCacheKey(request: InferenceRequest): string {
    const key = `${request.prompt}-${request.model}-${request.provider}-${JSON.stringify(request.parameters)}`;
    return Buffer.from(key).toString('base64');
  }

  private cleanupCache(): void {
    if (this.cache.size > this.config.caching.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
      
      const toRemove = entries.slice(0, entries.length - this.config.caching.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  private updateMetrics(request: InferenceRequest, response: InferenceResponse, latency: number): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.averageLatency = (this.metrics.averageLatency * (this.metrics.totalRequests - 1) + latency) / this.metrics.totalRequests;
    this.metrics.averageCost = (this.metrics.averageCost * (this.metrics.totalRequests - 1) + response.cost) / this.metrics.totalRequests;
    this.metrics.averageQuality = (this.metrics.averageQuality * (this.metrics.totalRequests - 1) + response.quality.score) / this.metrics.totalRequests;
    
    // Update provider distribution
    const currentCount = this.metrics.providerDistribution[response.provider] || 0;
    this.metrics.providerDistribution[response.provider] = currentCount + 1;
    
    this.metrics.lastUpdated = new Date();
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.checkProviderHealth();
    }, this.config.loadBalancing.healthCheckInterval);
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.metricsInterval);
  }

  private startOptimization(): void {
    if (!this.config.optimization.enabled) return;
    
    setInterval(() => {
      this.optimizeRouting();
    }, this.config.optimization.updateInterval);
  }

  private async checkProviderHealth(): Promise<void> {
    for (const provider of this.providers.values()) {
      try {
        // Simulate health check
        const startTime = Date.now();
        await this.pingProvider(provider);
        const latency = Date.now() - startTime;
        
        provider.health.responseTime = latency;
        provider.health.status = 'healthy';
        provider.lastChecked = new Date();
      } catch (error) {
        provider.health.status = 'unhealthy';
        provider.health.lastError = error.message;
        provider.health.lastErrorAt = new Date();
        provider.status = 'degraded';
      }
    }
    
    this.updateHealthStatus();
  }

  private async pingProvider(provider: LLMProvider): Promise<void> {
    // Simulate ping
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }

  private updateHealthStatus(): void {
    const healthyProviders = Array.from(this.providers.values())
      .filter(p => p.health.status === 'healthy').length;
    const totalProviders = this.providers.size;
    
    if (healthyProviders === totalProviders) {
      this.health.status = 'healthy';
    } else if (healthyProviders > totalProviders / 2) {
      this.health.status = 'degraded';
    } else {
      this.health.status = 'unhealthy';
    }
    
    this.health.lastChecked = new Date();
  }

  private collectMetrics(): void {
    // Update cache hit rate
    if (this.metrics.totalRequests > 0) {
      this.metrics.cacheHitRate = this.metrics.cacheHitRate;
    }
    
    // Update error distribution
    this.metrics.errorDistribution = {};
    
    this.metrics.lastUpdated = new Date();
  }

  private optimizeRouting(): void {
    // Implement routing optimization based on collected metrics
    logger.info('Optimizing routing based on metrics...');
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Public API methods
  async getProviders(): Promise<LLMProvider[]> {
    return Array.from(this.providers.values());
  }

  async getProvider(id: string): Promise<LLMProvider | null> {
    return this.providers.get(id) || null;
  }

  async addProvider(provider: LLMProvider): Promise<void> {
    this.providers.set(provider.id, provider);
    logger.info(`Added provider: ${provider.name}`);
  }

  async updateProvider(id: string, updates: Partial<LLMProvider>): Promise<void> {
    const provider = this.providers.get(id);
    if (provider) {
      Object.assign(provider, updates);
      this.providers.set(id, provider);
      logger.info(`Updated provider: ${provider.name}`);
    }
  }

  async removeProvider(id: string): Promise<void> {
    this.providers.delete(id);
    logger.info(`Removed provider: ${id}`);
  }

  async getMetrics(): Promise<RouterMetrics> {
    return { ...this.metrics };
  }

  async getHealth(): Promise<RouterHealth> {
    return { ...this.health };
  }

  async updateConfig(config: Partial<RouterConfig>): Promise<void> {
    Object.assign(this.config, config);
    logger.info('Router configuration updated');
  }

  async cleanup(): Promise<void> {
    this.providers.clear();
    this.cache.clear();
    this.isInitialized = false;
    logger.info('Adaptive Inference Router cleaned up');
  }
}