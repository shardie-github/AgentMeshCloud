import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3004'),
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
  },
  marketing: {
    enabled: process.env.MARKETING_ENABLED === 'true',
    conversionThreshold: parseFloat(process.env.CONVERSION_THRESHOLD || '0.05'),
    optimizationInterval: parseInt(process.env.OPTIMIZATION_INTERVAL || '3600'), // 1 hour
  },
  external: {
    notion: {
      apiKey: process.env.NOTION_API_KEY || '',
      databaseId: process.env.NOTION_DATABASE_ID || '',
    },
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    },
    posthog: {
      apiKey: process.env.POSTHOG_API_KEY || '',
      host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    },
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/marketing.log',
  },
};
