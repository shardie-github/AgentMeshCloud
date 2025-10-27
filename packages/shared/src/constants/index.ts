/**
 * Constants for AgentMesh Cloud
 * Centralized configuration and constant values
 */

// API Constants
export const API_VERSION = 'v1';
export const API_BASE_URL = process.env.API_BASE_URL || 'https://api.agentmesh.cloud';
export const API_TIMEOUT = 30000; // 30 seconds

// Agent Constants
export const AGENT_NAME_MAX_LENGTH = 100;
export const AGENT_DESCRIPTION_MAX_LENGTH = 500;
export const AGENT_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
export const AGENT_TAGS_MAX_COUNT = 20;
export const AGENT_TAG_MAX_LENGTH = 50;

// Workflow Constants
export const WORKFLOW_NAME_MAX_LENGTH = 100;
export const WORKFLOW_DESCRIPTION_MAX_LENGTH = 500;
export const WORKFLOW_NODES_MAX_COUNT = 100;
export const WORKFLOW_EDGES_MAX_COUNT = 200;
export const WORKFLOW_VARIABLES_MAX_COUNT = 50;
export const WORKFLOW_TRIGGERS_MAX_COUNT = 10;

// MCP Constants
export const MCP_MESSAGE_ID_LENGTH = 36; // UUID length
export const MCP_METHOD_MAX_LENGTH = 100;
export const MCP_TIMEOUT_DEFAULT = 30000;
export const MCP_TIMEOUT_MIN = 1000;
export const MCP_TIMEOUT_MAX = 300000;

// A2A Constants
export const A2A_MESSAGE_ID_LENGTH = 36; // UUID length
export const A2A_TTL_DEFAULT = 3600; // 1 hour
export const A2A_TTL_MIN = 1;
export const A2A_TTL_MAX = 86400; // 24 hours
export const A2A_PRIORITY_DEFAULT = 'normal';
export const A2A_CORRELATION_ID_LENGTH = 36; // UUID length

// Validation Constants
export const VALIDATION_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const VALIDATION_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const VALIDATION_CRON_PATTERN = /^(\*|([0-5]?\d)) (\*|([01]?\d|2[0-3])) (\*|([012]?\d|3[01])) (\*|([0]?\d|1[0-2])) (\*|([0-6]))$/;
export const VALIDATION_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
export const VALIDATION_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const VALIDATION_TAG_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const VALIDATION_RESOURCE_PATTERN = /^\d+(\.\d+)?[a-zA-Z]+$/;

// Timeout Constants
export const TIMEOUT_DEFAULT = 30000; // 30 seconds
export const TIMEOUT_MIN = 1000; // 1 second
export const TIMEOUT_MAX = 86400000; // 24 hours
export const TIMEOUT_AGENT_REQUEST = 60000; // 1 minute
export const TIMEOUT_WORKFLOW_EXECUTION = 3600000; // 1 hour
export const TIMEOUT_MCP_REQUEST = 30000; // 30 seconds
export const TIMEOUT_A2A_MESSAGE = 30000; // 30 seconds

// Retry Constants
export const RETRY_MAX_ATTEMPTS_DEFAULT = 3;
export const RETRY_MAX_ATTEMPTS_MIN = 1;
export const RETRY_MAX_ATTEMPTS_MAX = 10;
export const RETRY_BASE_DELAY_DEFAULT = 1000; // 1 second
export const RETRY_BASE_DELAY_MIN = 100; // 100ms
export const RETRY_BASE_DELAY_MAX = 60000; // 1 minute
export const RETRY_MAX_DELAY_DEFAULT = 30000; // 30 seconds
export const RETRY_MAX_DELAY_MIN = 1000; // 1 second
export const RETRY_MAX_DELAY_MAX = 300000; // 5 minutes

// Pagination Constants
export const PAGINATION_PAGE_DEFAULT = 1;
export const PAGINATION_PAGE_MIN = 1;
export const PAGINATION_LIMIT_DEFAULT = 20;
export const PAGINATION_LIMIT_MIN = 1;
export const PAGINATION_LIMIT_MAX = 100;
export const PAGINATION_ORDER_DEFAULT = 'desc';

// Rate Limiting Constants
export const RATE_LIMIT_DEFAULT = 1000; // requests per hour
export const RATE_LIMIT_BURST_DEFAULT = 100; // burst requests
export const RATE_LIMIT_WINDOW_DEFAULT = 3600; // 1 hour in seconds

// Security Constants
export const SECURITY_JWT_EXPIRY_DEFAULT = 3600; // 1 hour
export const SECURITY_JWT_REFRESH_EXPIRY_DEFAULT = 86400; // 24 hours
export const SECURITY_PASSWORD_MIN_LENGTH = 8;
export const SECURITY_PASSWORD_MAX_LENGTH = 128;
export const SECURITY_API_KEY_LENGTH = 32;
export const SECURITY_SECRET_KEY_LENGTH = 64;

// Database Constants
export const DATABASE_CONNECTION_POOL_MIN = 2;
export const DATABASE_CONNECTION_POOL_MAX = 20;
export const DATABASE_CONNECTION_TIMEOUT = 30000; // 30 seconds
export const DATABASE_QUERY_TIMEOUT = 30000; // 30 seconds
export const DATABASE_TRANSACTION_TIMEOUT = 60000; // 1 minute

// Cache Constants
export const CACHE_TTL_DEFAULT = 3600; // 1 hour
export const CACHE_TTL_MIN = 60; // 1 minute
export const CACHE_TTL_MAX = 86400; // 24 hours
export const CACHE_MAX_SIZE_DEFAULT = 1000; // items
export const CACHE_MAX_SIZE_MIN = 100;
export const CACHE_MAX_SIZE_MAX = 10000;

// Logging Constants
export const LOG_LEVEL_DEFAULT = 'info';
export const LOG_RETENTION_DEFAULT = 30; // days
export const LOG_RETENTION_MIN = 1;
export const LOG_RETENTION_MAX = 365;
export const LOG_MAX_SIZE_DEFAULT = 10485760; // 10MB
export const LOG_MAX_FILES_DEFAULT = 5;

// Monitoring Constants
export const METRICS_COLLECTION_INTERVAL = 60000; // 1 minute
export const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
export const ALERT_THRESHOLD_CPU = 80; // percentage
export const ALERT_THRESHOLD_MEMORY = 80; // percentage
export const ALERT_THRESHOLD_DISK = 90; // percentage
export const ALERT_THRESHOLD_LATENCY = 5000; // milliseconds

// File Upload Constants
export const FILE_UPLOAD_MAX_SIZE = 10485760; // 10MB
export const FILE_UPLOAD_ALLOWED_TYPES = [
  'application/json',
  'text/plain',
  'text/csv',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml'
];
export const FILE_UPLOAD_MAX_FILES = 10;

// Webhook Constants
export const WEBHOOK_TIMEOUT_DEFAULT = 30000; // 30 seconds
export const WEBHOOK_RETRY_ATTEMPTS_DEFAULT = 3;
export const WEBHOOK_RETRY_DELAY_DEFAULT = 1000; // 1 second
export const WEBHOOK_SIGNATURE_HEADER = 'X-Webhook-Signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'X-Webhook-Timestamp';

// Event Constants
export const EVENT_AGENT_REGISTERED = 'agent.registered';
export const EVENT_AGENT_UPDATED = 'agent.updated';
export const EVENT_AGENT_DELETED = 'agent.deleted';
export const EVENT_AGENT_STATUS_CHANGED = 'agent.status_changed';
export const EVENT_WORKFLOW_CREATED = 'workflow.created';
export const EVENT_WORKFLOW_UPDATED = 'workflow.updated';
export const EVENT_WORKFLOW_DELETED = 'workflow.deleted';
export const EVENT_WORKFLOW_EXECUTED = 'workflow.executed';
export const EVENT_WORKFLOW_FAILED = 'workflow.failed';
export const EVENT_MCP_REQUEST_SENT = 'mcp.request_sent';
export const EVENT_MCP_RESPONSE_RECEIVED = 'mcp.response_received';
export const EVENT_A2A_MESSAGE_SENT = 'a2a.message_sent';
export const EVENT_A2A_MESSAGE_RECEIVED = 'a2a.message_received';

// Error Codes
export const ERROR_CODES = {
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  TIMEOUT: 'TIMEOUT',
  
  // Agent errors
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_ALREADY_EXISTS: 'AGENT_ALREADY_EXISTS',
  AGENT_OFFLINE: 'AGENT_OFFLINE',
  AGENT_CAPABILITY_NOT_FOUND: 'AGENT_CAPABILITY_NOT_FOUND',
  AGENT_INVALID_CREDENTIALS: 'AGENT_INVALID_CREDENTIALS',
  
  // Workflow errors
  WORKFLOW_NOT_FOUND: 'WORKFLOW_NOT_FOUND',
  WORKFLOW_ALREADY_EXISTS: 'WORKFLOW_ALREADY_EXISTS',
  WORKFLOW_INVALID_DEFINITION: 'WORKFLOW_INVALID_DEFINITION',
  WORKFLOW_EXECUTION_FAILED: 'WORKFLOW_EXECUTION_FAILED',
  WORKFLOW_NODE_NOT_FOUND: 'WORKFLOW_NODE_NOT_FOUND',
  WORKFLOW_EDGE_NOT_FOUND: 'WORKFLOW_EDGE_NOT_FOUND',
  
  // MCP errors
  MCP_ADAPTER_NOT_FOUND: 'MCP_ADAPTER_NOT_FOUND',
  MCP_CONNECTION_FAILED: 'MCP_CONNECTION_FAILED',
  MCP_REQUEST_FAILED: 'MCP_REQUEST_FAILED',
  MCP_RESPONSE_TIMEOUT: 'MCP_RESPONSE_TIMEOUT',
  MCP_INVALID_MESSAGE: 'MCP_INVALID_MESSAGE',
  
  // A2A errors
  A2A_BROKER_NOT_FOUND: 'A2A_BROKER_NOT_FOUND',
  A2A_CONNECTION_FAILED: 'A2A_CONNECTION_FAILED',
  A2A_MESSAGE_FAILED: 'A2A_MESSAGE_FAILED',
  A2A_MESSAGE_TIMEOUT: 'A2A_MESSAGE_TIMEOUT',
  A2A_INVALID_MESSAGE: 'A2A_INVALID_MESSAGE',
  A2A_CHANNEL_NOT_FOUND: 'A2A_CHANNEL_NOT_FOUND',
  
  // Database errors
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  DATABASE_TRANSACTION_FAILED: 'DATABASE_TRANSACTION_FAILED',
  DATABASE_CONSTRAINT_VIOLATION: 'DATABASE_CONSTRAINT_VIOLATION',
  
  // File errors
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE: 'FILE_INVALID_TYPE',
  
  // Webhook errors
  WEBHOOK_DELIVERY_FAILED: 'WEBHOOK_DELIVERY_FAILED',
  WEBHOOK_INVALID_SIGNATURE: 'WEBHOOK_INVALID_SIGNATURE',
  WEBHOOK_TIMEOUT: 'WEBHOOK_TIMEOUT',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Environment Variables
export const ENV_VARS = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  API_BASE_URL: 'API_BASE_URL',
  DATABASE_URL: 'DATABASE_URL',
  REDIS_URL: 'REDIS_URL',
  JWT_SECRET: 'JWT_SECRET',
  JWT_REFRESH_SECRET: 'JWT_REFRESH_SECRET',
  SUPABASE_URL: 'SUPABASE_URL',
  SUPABASE_ANON_KEY: 'SUPABASE_ANON_KEY',
  SUPABASE_SERVICE_KEY: 'SUPABASE_SERVICE_KEY',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  GOOGLE_API_KEY: 'GOOGLE_API_KEY',
  KAFKA_BROKERS: 'KAFKA_BROKERS',
  NATS_URL: 'NATS_URL',
  PROMETHEUS_ENDPOINT: 'PROMETHEUS_ENDPOINT',
  GRAFANA_ENDPOINT: 'GRAFANA_ENDPOINT',
} as const;

// Default Values
export const DEFAULTS = {
  PORT: 3000,
  NODE_ENV: 'development',
  LOG_LEVEL: 'info',
  CACHE_TTL: 3600,
  RATE_LIMIT: 1000,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  PAGINATION_LIMIT: 20,
  PAGINATION_PAGE: 1,
  PAGINATION_ORDER: 'desc',
} as const;