import { config } from 'dotenv';

config();

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  },
  
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  // Feedback Processing Configuration
  feedback: {
    batchSize: parseInt(process.env.FEEDBACK_BATCH_SIZE || '10', 10),
    processingInterval: parseInt(process.env.FEEDBACK_PROCESSING_INTERVAL || '30000', 10), // 30 seconds
    maxRetries: parseInt(process.env.FEEDBACK_MAX_RETRIES || '3', 10),
    similarityThreshold: parseFloat(process.env.FEEDBACK_SIMILARITY_THRESHOLD || '0.8'),
  },
  
  // AI Triager Configuration
  triager: {
    enableAutoTriaging: process.env.ENABLE_AUTO_TRIAGING === 'true',
    confidenceThreshold: parseFloat(process.env.TRIAGER_CONFIDENCE_THRESHOLD || '0.7'),
    maxThemesPerFeedback: parseInt(process.env.MAX_THEMES_PER_FEEDBACK || '5', 10),
  },
  
  // External Services
  external: {
    notionApiKey: process.env.NOTION_API_KEY || '',
    notionDatabaseId: process.env.NOTION_DATABASE_ID || '',
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    posthogApiKey: process.env.POSTHOG_API_KEY || '',
    posthogHost: process.env.POSTHOG_HOST || 'https://app.posthog.com',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};

export default config;
