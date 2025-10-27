/**
 * Configuration for AgentMesh Cloud Orchestrator
 * Centralized configuration management
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
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

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },

  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'agentmesh-orchestrator',
    groupId: process.env.KAFKA_GROUP_ID || 'agentmesh-group',
    retry: {
      initialRetryTime: 100,
      retries: 8,
    },
  },

  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    clusterId: process.env.NATS_CLUSTER_ID || 'agentmesh-cluster',
    clientId: process.env.NATS_CLIENT_ID || 'agentmesh-orchestrator',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  llm: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY || '',
      baseURL: process.env.GOOGLE_BASE_URL || 'https://generativelanguage.googleapis.com',
    },
  },

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
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || './logs/orchestrator.log',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
      maxFiles: process.env.LOG_FILE_MAX_FILES || '5',
    },
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // requests per window
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
  },

  agent: {
    heartbeatInterval: parseInt(process.env.AGENT_HEARTBEAT_INTERVAL || '30000', 10), // 30 seconds
    timeout: parseInt(process.env.AGENT_TIMEOUT || '60000', 10), // 1 minute
    maxRetries: parseInt(process.env.AGENT_MAX_RETRIES || '3', 10),
    cleanupInterval: parseInt(process.env.AGENT_CLEANUP_INTERVAL || '300000', 10), // 5 minutes
  },

  workflow: {
    executionTimeout: parseInt(process.env.WORKFLOW_EXECUTION_TIMEOUT || '3600000', 10), // 1 hour
    maxConcurrent: parseInt(process.env.WORKFLOW_MAX_CONCURRENT || '10', 10),
    retryDelay: parseInt(process.env.WORKFLOW_RETRY_DELAY || '5000', 10), // 5 seconds
    cleanupInterval: parseInt(process.env.WORKFLOW_CLEANUP_INTERVAL || '600000', 10), // 10 minutes
  },

  mcp: {
    requestTimeout: parseInt(process.env.MCP_REQUEST_TIMEOUT || '30000', 10), // 30 seconds
    maxRetries: parseInt(process.env.MCP_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.MCP_RETRY_DELAY || '1000', 10), // 1 second
    connectionPool: {
      min: parseInt(process.env.MCP_CONNECTION_POOL_MIN || '2', 10),
      max: parseInt(process.env.MCP_CONNECTION_POOL_MAX || '10', 10),
    },
  },

  a2a: {
    messageTimeout: parseInt(process.env.A2A_MESSAGE_TIMEOUT || '30000', 10), // 30 seconds
    maxRetries: parseInt(process.env.A2A_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.A2A_RETRY_DELAY || '1000', 10), // 1 second
    heartbeatInterval: parseInt(process.env.A2A_HEARTBEAT_INTERVAL || '30000', 10), // 30 seconds
    discoveryInterval: parseInt(process.env.A2A_DISCOVERY_INTERVAL || '60000', 10), // 1 minute
  },

  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key',
    saltRounds: parseInt(process.env.SALT_ROUNDS || '12', 10),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  features: {
    agentRegistry: process.env.FEATURE_AGENT_REGISTRY !== 'false',
    workflowComposer: process.env.FEATURE_WORKFLOW_COMPOSER !== 'false',
    agentInspector: process.env.FEATURE_AGENT_INSPECTOR !== 'false',
    governanceStudio: process.env.FEATURE_GOVERNANCE_STUDIO !== 'false',
    developerSDK: process.env.FEATURE_DEVELOPER_SDK !== 'false',
    marketplace: process.env.FEATURE_MARKETPLACE === 'true',
    analytics: process.env.FEATURE_ANALYTICS !== 'false',
    monitoring: process.env.FEATURE_MONITORING !== 'false',
  },

  limits: {
    maxAgentsPerTenant: parseInt(process.env.MAX_AGENTS_PER_TENANT || '100', 10),
    maxWorkflowsPerTenant: parseInt(process.env.MAX_WORKFLOWS_PER_TENANT || '50', 10),
    maxWorkflowNodes: parseInt(process.env.MAX_WORKFLOW_NODES || '100', 10),
    maxWorkflowEdges: parseInt(process.env.MAX_WORKFLOW_EDGES || '200', 10),
    maxMCPConnections: parseInt(process.env.MAX_MCP_CONNECTIONS || '50', 10),
    maxA2AChannels: parseInt(process.env.MAX_A2A_CHANNELS || '100', 10),
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