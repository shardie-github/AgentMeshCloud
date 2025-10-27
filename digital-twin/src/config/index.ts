/**
 * Configuration for AgentMesh Cloud Digital Twin
 * Centralized configuration management for system simulation and testing
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.DIGITAL_TWIN_PORT || '3003', 10),
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
    clientId: process.env.KAFKA_CLIENT_ID || 'agentmesh-digital-twin',
    groupId: process.env.KAFKA_GROUP_ID || 'agentmesh-digital-twin-group',
    retry: {
      initialRetryTime: 100,
      retries: 8,
    },
  },

  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    clusterId: process.env.NATS_CLUSTER_ID || 'agentmesh-cluster',
    clientId: process.env.NATS_CLIENT_ID || 'agentmesh-digital-twin',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Digital Twin specific configuration
  digitalTwin: {
    enabled: process.env.DIGITAL_TWIN_ENABLED !== 'false',
    syncInterval: parseInt(process.env.DIGITAL_TWIN_SYNC_INTERVAL || '60000', 10), // 1 minute
    maxTwins: parseInt(process.env.DIGITAL_TWIN_MAX_TWINS || '100', 10),
    simulationSpeed: parseFloat(process.env.DIGITAL_TWIN_SIMULATION_SPEED || '1.0'),
    testTimeout: parseInt(process.env.DIGITAL_TWIN_TEST_TIMEOUT || '300000', 10), // 5 minutes
    scenarioTimeout: parseInt(process.env.DIGITAL_TWIN_SCENARIO_TIMEOUT || '600000', 10), // 10 minutes
  },

  // Simulation configuration
  simulation: {
    enabled: process.env.SIMULATION_ENABLED !== 'false',
    maxConcurrent: parseInt(process.env.SIMULATION_MAX_CONCURRENT || '10', 10),
    defaultSpeed: parseFloat(process.env.SIMULATION_DEFAULT_SPEED || '1.0'),
    timeStep: parseInt(process.env.SIMULATION_TIME_STEP || '1000', 10), // 1 second
    maxDuration: parseInt(process.env.SIMULATION_MAX_DURATION || '3600000', 10), // 1 hour
  },

  // Testing configuration
  testing: {
    enabled: process.env.TESTING_ENABLED !== 'false',
    frameworks: process.env.TESTING_FRAMEWORKS?.split(',') || ['jest', 'mocha', 'cypress'],
    parallel: process.env.TESTING_PARALLEL === 'true',
    maxConcurrent: parseInt(process.env.TESTING_MAX_CONCURRENT || '5', 10),
    timeout: parseInt(process.env.TESTING_TIMEOUT || '300000', 10), // 5 minutes
    retries: parseInt(process.env.TESTING_RETRIES || '3', 10),
    coverage: {
      enabled: process.env.TESTING_COVERAGE_ENABLED === 'true',
      threshold: parseFloat(process.env.TESTING_COVERAGE_THRESHOLD || '80.0'),
      reporters: process.env.TESTING_COVERAGE_REPORTERS?.split(',') || ['text', 'html', 'lcov'],
    },
  },

  // Load testing configuration
  loadTesting: {
    enabled: process.env.LOAD_TESTING_ENABLED === 'true',
    tools: process.env.LOAD_TESTING_TOOLS?.split(',') || ['artillery', 'k6', 'jmeter'],
    maxUsers: parseInt(process.env.LOAD_TESTING_MAX_USERS || '1000', 10),
    rampUpTime: parseInt(process.env.LOAD_TESTING_RAMP_UP_TIME || '60', 10), // 1 minute
    duration: parseInt(process.env.LOAD_TESTING_DURATION || '300', 10), // 5 minutes
    thresholds: {
      latency: parseInt(process.env.LOAD_TESTING_LATENCY_THRESHOLD || '2000', 10), // 2 seconds
      errorRate: parseFloat(process.env.LOAD_TESTING_ERROR_RATE_THRESHOLD || '0.01'), // 1%
      throughput: parseInt(process.env.LOAD_TESTING_THROUGHPUT_THRESHOLD || '100', 10), // 100 req/s
    },
  },

  // Stress testing configuration
  stressTesting: {
    enabled: process.env.STRESS_TESTING_ENABLED === 'true',
    maxLoad: parseInt(process.env.STRESS_TESTING_MAX_LOAD || '10000', 10),
    spikeDuration: parseInt(process.env.STRESS_TESTING_SPIKE_DURATION || '60', 10), // 1 minute
    recoveryTime: parseInt(process.env.STRESS_TESTING_RECOVERY_TIME || '300', 10), // 5 minutes
    scenarios: process.env.STRESS_TESTING_SCENARIOS?.split(',') || ['cpu_spike', 'memory_spike', 'network_spike'],
  },

  // Monitoring configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    metrics: {
      enabled: process.env.MONITORING_METRICS_ENABLED !== 'false',
      interval: parseInt(process.env.MONITORING_METRICS_INTERVAL || '10000', 10), // 10 seconds
      retention: parseInt(process.env.MONITORING_METRICS_RETENTION || '7', 10), // 7 days
    },
    alerts: {
      enabled: process.env.MONITORING_ALERTS_ENABLED === 'true',
      channels: process.env.MONITORING_ALERT_CHANNELS?.split(',') || ['email', 'slack'],
      thresholds: {
        cpu: parseFloat(process.env.MONITORING_CPU_THRESHOLD || '80.0'),
        memory: parseFloat(process.env.MONITORING_MEMORY_THRESHOLD || '80.0'),
        latency: parseInt(process.env.MONITORING_LATENCY_THRESHOLD || '5000', 10),
        errorRate: parseFloat(process.env.MONITORING_ERROR_RATE_THRESHOLD || '0.05'),
      },
    },
    dashboards: {
      enabled: process.env.MONITORING_DASHBOARDS_ENABLED !== 'false',
      refresh: parseInt(process.env.MONITORING_DASHBOARD_REFRESH || '30000', 10), // 30 seconds
      panels: process.env.MONITORING_DASHBOARD_PANELS?.split(',') || ['performance', 'resources', 'business'],
    },
  },

  // Scaling configuration
  scaling: {
    enabled: process.env.SCALING_ENABLED === 'true',
    strategy: process.env.SCALING_STRATEGY || 'cpu_based',
    minInstances: parseInt(process.env.SCALING_MIN_INSTANCES || '1', 10),
    maxInstances: parseInt(process.env.SCALING_MAX_INSTANCES || '10', 10),
    scaleUpThreshold: parseFloat(process.env.SCALING_UP_THRESHOLD || '70.0'),
    scaleDownThreshold: parseFloat(process.env.SCALING_DOWN_THRESHOLD || '30.0'),
    cooldown: parseInt(process.env.SCALING_COOLDOWN || '300', 10), // 5 minutes
  },

  // Security configuration
  security: {
    enabled: process.env.SECURITY_ENABLED !== 'false',
    authentication: {
      enabled: process.env.SECURITY_AUTH_ENABLED === 'true',
      methods: process.env.SECURITY_AUTH_METHODS?.split(',') || ['jwt', 'oauth2'],
    },
    encryption: {
      enabled: process.env.SECURITY_ENCRYPTION_ENABLED === 'true',
      algorithm: process.env.SECURITY_ENCRYPTION_ALGORITHM || 'aes-256-gcm',
      keyRotation: parseInt(process.env.SECURITY_KEY_ROTATION || '86400', 10), // 24 hours
    },
    network: {
      enabled: process.env.SECURITY_NETWORK_ENABLED === 'true',
      firewall: process.env.SECURITY_FIREWALL_ENABLED === 'true',
      vpn: process.env.SECURITY_VPN_ENABLED === 'true',
    },
  },

  // Compliance configuration
  compliance: {
    enabled: process.env.COMPLIANCE_ENABLED === 'true',
    standards: process.env.COMPLIANCE_STANDARDS?.split(',') || ['soc2', 'iso27001'],
    auditing: {
      enabled: process.env.COMPLIANCE_AUDITING_ENABLED === 'true',
      level: process.env.COMPLIANCE_AUDIT_LEVEL || 'standard',
      retention: parseInt(process.env.COMPLIANCE_AUDIT_RETENTION || '2555', 10), // 7 years
    },
    reporting: {
      enabled: process.env.COMPLIANCE_REPORTING_ENABLED === 'true',
      schedule: process.env.COMPLIANCE_REPORT_SCHEDULE || 'monthly',
      formats: process.env.COMPLIANCE_REPORT_FORMATS?.split(',') || ['pdf', 'html'],
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || './logs/digital-twin.log',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
      maxFiles: process.env.LOG_FILE_MAX_FILES || '5',
    },
    structured: process.env.LOG_STRUCTURED === 'true',
    correlation: process.env.LOG_CORRELATION === 'true',
  },

  // Feature flags
  features: {
    digitalTwin: process.env.FEATURE_DIGITAL_TWIN !== 'false',
    simulation: process.env.FEATURE_SIMULATION !== 'false',
    testing: process.env.FEATURE_TESTING !== 'false',
    loadTesting: process.env.FEATURE_LOAD_TESTING === 'true',
    stressTesting: process.env.FEATURE_STRESS_TESTING === 'true',
    monitoring: process.env.FEATURE_MONITORING !== 'false',
    scaling: process.env.FEATURE_SCALING === 'true',
    compliance: process.env.FEATURE_COMPLIANCE === 'true',
    reporting: process.env.FEATURE_REPORTING !== 'false',
  },

  // Limits and quotas
  limits: {
    maxTwinsPerTenant: parseInt(process.env.MAX_TWINS_PER_TENANT || '10', 10),
    maxScenariosPerTwin: parseInt(process.env.MAX_SCENARIOS_PER_TWIN || '50', 10),
    maxTestsPerTwin: parseInt(process.env.MAX_TESTS_PER_TWIN || '100', 10),
    maxConcurrentSimulations: parseInt(process.env.MAX_CONCURRENT_SIMULATIONS || '5', 10),
    maxConcurrentTests: parseInt(process.env.MAX_CONCURRENT_TESTS || '10', 10),
    maxSimulationDuration: parseInt(process.env.MAX_SIMULATION_DURATION || '3600000', 10), // 1 hour
    maxTestDuration: parseInt(process.env.MAX_TEST_DURATION || '1800000', 10), // 30 minutes
    maxDataSize: parseInt(process.env.MAX_DATA_SIZE || '104857600', 10), // 100MB
    maxLogSize: parseInt(process.env.MAX_LOG_SIZE || '10485760', 10), // 10MB
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