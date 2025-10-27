/**
 * Configuration for AgentMesh Cloud Ecosystem
 * Centralized configuration management for partner integration and federated gateway
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.ECOSYSTEM_PORT || '3002', 10),
    environment: process.env.NODE_ENV || 'development',
    host: process.env.HOST || '0.0.0.0',
    cors: {
      allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    },
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/agentmesh',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    },
    ssl: process.env.DB_SSL === 'true',
  },

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },

  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'agentmesh-ecosystem',
    groupId: process.env.KAFKA_GROUP_ID || 'agentmesh-ecosystem-group',
    retry: {
      initialRetryTime: 100,
      retries: 8,
    },
  },

  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    clusterId: process.env.NATS_CLUSTER_ID || 'agentmesh-cluster',
    clientId: process.env.NATS_CLIENT_ID || 'agentmesh-ecosystem',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // LLM Provider configurations
  llm: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      organization: process.env.OPENAI_ORGANIZATION || '',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY || '',
      baseURL: process.env.GOOGLE_BASE_URL || 'https://generativelanguage.googleapis.com',
    },
    cohere: {
      apiKey: process.env.COHERE_API_KEY || '',
      baseURL: process.env.COHERE_BASE_URL || 'https://api.cohere.ai',
    },
    huggingface: {
      apiKey: process.env.HUGGINGFACE_API_KEY || '',
      baseURL: process.env.HUGGINGFACE_BASE_URL || 'https://api-inference.huggingface.co',
    },
  },

  // Partner ecosystem configuration
  partners: {
    marketplace: {
      enabled: process.env.PARTNER_MARKETPLACE_ENABLED === 'true',
      baseURL: process.env.PARTNER_MARKETPLACE_URL || 'https://marketplace.agentmesh.cloud',
      apiVersion: process.env.PARTNER_API_VERSION || 'v1',
    },
    revenueSharing: {
      enabled: process.env.REVENUE_SHARING_ENABLED === 'true',
      defaultRate: parseFloat(process.env.REVENUE_SHARING_RATE || '0.1'), // 10%
      minimumPayout: parseFloat(process.env.MINIMUM_PAYOUT || '10.0'),
      payoutSchedule: process.env.PAYOUT_SCHEDULE || 'monthly',
    },
    approval: {
      autoApprove: process.env.AUTO_APPROVE_PARTNERS === 'true',
      reviewRequired: process.env.PARTNER_REVIEW_REQUIRED === 'true',
      approvalTimeout: parseInt(process.env.PARTNER_APPROVAL_TIMEOUT || '86400', 10), // 24 hours
    },
  },

  // Federated gateway configuration
  gateway: {
    enabled: process.env.FEDERATED_GATEWAY_ENABLED === 'true',
    baseURL: process.env.FEDERATED_GATEWAY_URL || 'https://gateway.agentmesh.cloud',
    apiVersion: process.env.GATEWAY_API_VERSION || 'v1',
    rateLimit: {
      requestsPerMinute: parseInt(process.env.GATEWAY_RATE_LIMIT || '1000', 10),
      requestsPerHour: parseInt(process.env.GATEWAY_HOUR_LIMIT || '10000', 10),
      requestsPerDay: parseInt(process.env.GATEWAY_DAY_LIMIT || '100000', 10),
    },
    security: {
      requireAuth: process.env.GATEWAY_REQUIRE_AUTH === 'true',
      tokenValidation: process.env.GATEWAY_TOKEN_VALIDATION === 'true',
      ipWhitelist: process.env.GATEWAY_IP_WHITELIST?.split(',') || [],
    },
    monitoring: {
      enabled: process.env.GATEWAY_MONITORING_ENABLED === 'true',
      metricsInterval: parseInt(process.env.GATEWAY_METRICS_INTERVAL || '60000', 10),
      alertThresholds: {
        errorRate: parseFloat(process.env.GATEWAY_ERROR_RATE_THRESHOLD || '0.05'),
        latency: parseInt(process.env.GATEWAY_LATENCY_THRESHOLD || '5000', 10),
        throughput: parseInt(process.env.GATEWAY_THROUGHPUT_THRESHOLD || '1000', 10),
      },
    },
  },

  // Knowledge graph configuration
  knowledgeGraph: {
    enabled: process.env.KNOWLEDGE_GRAPH_ENABLED === 'true',
    vectorDatabase: {
      provider: process.env.VECTOR_DB_PROVIDER || 'supabase',
      url: process.env.VECTOR_DB_URL || process.env.SUPABASE_URL || '',
      apiKey: process.env.VECTOR_DB_API_KEY || process.env.SUPABASE_ANON_KEY || '',
      dimensions: parseInt(process.env.VECTOR_DIMENSIONS || '1536', 10),
      similarityThreshold: parseFloat(process.env.VECTOR_SIMILARITY_THRESHOLD || '0.7'),
    },
    indexing: {
      enabled: process.env.KNOWLEDGE_INDEXING_ENABLED === 'true',
      batchSize: parseInt(process.env.KNOWLEDGE_BATCH_SIZE || '100', 10),
      interval: parseInt(process.env.KNOWLEDGE_INDEXING_INTERVAL || '300000', 10), // 5 minutes
      maxRetries: parseInt(process.env.KNOWLEDGE_MAX_RETRIES || '3', 10),
    },
    search: {
      maxResults: parseInt(process.env.KNOWLEDGE_MAX_RESULTS || '10', 10),
      timeout: parseInt(process.env.KNOWLEDGE_SEARCH_TIMEOUT || '5000', 10),
      cache: {
        enabled: process.env.KNOWLEDGE_CACHE_ENABLED === 'true',
        ttl: parseInt(process.env.KNOWLEDGE_CACHE_TTL || '300000', 10), // 5 minutes
        maxSize: parseInt(process.env.KNOWLEDGE_CACHE_MAX_SIZE || '1000', 10),
      },
    },
  },

  // Inference router configuration
  inference: {
    router: {
      enabled: process.env.INFERENCE_ROUTER_ENABLED === 'true',
      defaultProvider: process.env.INFERENCE_DEFAULT_PROVIDER || 'openai',
      fallbackProviders: process.env.INFERENCE_FALLBACK_PROVIDERS?.split(',') || ['anthropic', 'google'],
      loadBalancing: {
        strategy: process.env.INFERENCE_LOAD_BALANCING || 'quality_based',
        healthCheckInterval: parseInt(process.env.INFERENCE_HEALTH_CHECK_INTERVAL || '30000', 10),
        failoverThreshold: parseFloat(process.env.INFERENCE_FAILOVER_THRESHOLD || '0.1'),
      },
      caching: {
        enabled: process.env.INFERENCE_CACHING_ENABLED === 'true',
        ttl: parseInt(process.env.INFERENCE_CACHE_TTL || '300000', 10), // 5 minutes
        maxSize: parseInt(process.env.INFERENCE_CACHE_MAX_SIZE || '1000', 10),
        strategy: process.env.INFERENCE_CACHE_STRATEGY || 'lru',
      },
      optimization: {
        enabled: process.env.INFERENCE_OPTIMIZATION_ENABLED === 'true',
        learningRate: parseFloat(process.env.INFERENCE_LEARNING_RATE || '0.1'),
        updateInterval: parseInt(process.env.INFERENCE_UPDATE_INTERVAL || '300000', 10), // 5 minutes
      },
    },
    providers: {
      openai: {
        enabled: process.env.OPENAI_ENABLED === 'true',
        priority: parseInt(process.env.OPENAI_PRIORITY || '1', 10),
        weight: parseFloat(process.env.OPENAI_WEIGHT || '1.0'),
      },
      anthropic: {
        enabled: process.env.ANTHROPIC_ENABLED === 'true',
        priority: parseInt(process.env.ANTHROPIC_PRIORITY || '2', 10),
        weight: parseFloat(process.env.ANTHROPIC_WEIGHT || '1.0'),
      },
      google: {
        enabled: process.env.GOOGLE_ENABLED === 'true',
        priority: parseInt(process.env.GOOGLE_PRIORITY || '3', 10),
        weight: parseFloat(process.env.GOOGLE_WEIGHT || '1.0'),
      },
      cohere: {
        enabled: process.env.COHERE_ENABLED === 'true',
        priority: parseInt(process.env.COHERE_PRIORITY || '4', 10),
        weight: parseFloat(process.env.COHERE_WEIGHT || '1.0'),
      },
      huggingface: {
        enabled: process.env.HUGGINGFACE_ENABLED === 'true',
        priority: parseInt(process.env.HUGGINGFACE_PRIORITY || '5', 10),
        weight: parseFloat(process.env.HUGGINGFACE_WEIGHT || '1.0'),
      },
    },
  },

  // Monitoring and observability
  monitoring: {
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
      port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
      path: process.env.PROMETHEUS_PATH || '/metrics',
    },
    grafana: {
      enabled: process.env.GRAFANA_ENABLED === 'true',
      url: process.env.GRAFANA_URL || 'http://localhost:3000',
    },
    jaeger: {
      enabled: process.env.JAEGER_ENABLED === 'true',
      url: process.env.JAEGER_URL || 'http://localhost:14268',
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || './logs/ecosystem.log',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
      maxFiles: process.env.LOG_FILE_MAX_FILES || '5',
    },
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // requests per window
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
  },

  // Security configuration
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key',
    saltRounds: parseInt(process.env.SALT_ROUNDS || '12', 10),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    apiKeyValidation: process.env.API_KEY_VALIDATION === 'true',
    tenantIsolation: process.env.TENANT_ISOLATION === 'true',
  },

  // Feature flags
  features: {
    partnerMarketplace: process.env.FEATURE_PARTNER_MARKETPLACE !== 'false',
    federatedGateway: process.env.FEATURE_FEDERATED_GATEWAY !== 'false',
    knowledgeGraph: process.env.FEATURE_KNOWLEDGE_GRAPH !== 'false',
    inferenceRouter: process.env.FEATURE_INFERENCE_ROUTER !== 'false',
    revenueSharing: process.env.FEATURE_REVENUE_SHARING !== 'false',
    partnerAnalytics: process.env.FEATURE_PARTNER_ANALYTICS !== 'false',
    apiPublisher: process.env.FEATURE_API_PUBLISHER !== 'false',
    sdkGenerator: process.env.FEATURE_SDK_GENERATOR !== 'false',
  },

  // Limits and quotas
  limits: {
    maxPartnersPerTenant: parseInt(process.env.MAX_PARTNERS_PER_TENANT || '50', 10),
    maxAPIsPerPartner: parseInt(process.env.MAX_APIS_PER_PARTNER || '20', 10),
    maxRequestsPerPartner: parseInt(process.env.MAX_REQUESTS_PER_PARTNER || '1000000', 10),
    maxKnowledgeNodes: parseInt(process.env.MAX_KNOWLEDGE_NODES || '1000000', 10),
    maxInferenceRequests: parseInt(process.env.MAX_INFERENCE_REQUESTS || '10000000', 10),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '10485760', 10), // 10MB
  },
};

// Validation
export function validateConfig(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JWT_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate configuration on startup
validateConfig();