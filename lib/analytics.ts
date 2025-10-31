/**
 * Analytics SDK for ORCA AgentMesh
 * Lightweight event tracking with PII protection and no-op fallback
 */

import { createLogger } from '../src/common/logger';

const logger = createLogger('analytics');

export interface EventProperties {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface AnalyticsConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  flushInterval?: number;
  batchSize?: number;
}

export interface Event {
  name: string;
  properties: EventProperties;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
}

class AnalyticsClient {
  private config: AnalyticsConfig;
  private queue: Event[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: AnalyticsConfig) {
    this.config = {
      flushInterval: 10000, // 10 seconds
      batchSize: 50,
      ...config,
    };

    if (this.config.enabled && this.config.endpoint) {
      this.startFlushTimer();
    }
  }

  /**
   * Track an event
   */
  track(
    eventName: string,
    properties: EventProperties = {},
    context?: {
      userId?: string;
      sessionId?: string;
      correlationId?: string;
    }
  ): void {
    if (!this.config.enabled) {
      logger.debug('Analytics disabled, skipping event', { eventName });
      return;
    }

    const event: Event = {
      name: eventName,
      properties: this.sanitizeProperties(properties),
      timestamp: new Date().toISOString(),
      ...context,
    };

    this.queue.push(event);
    logger.debug('Event queued', { eventName, queueSize: this.queue.length });

    // Flush if batch size reached
    if (this.queue.length >= (this.config.batchSize || 50)) {
      this.flush();
    }
  }

  /**
   * Identify a user
   */
  identify(
    userId: string,
    traits: Record<string, string | number | boolean> = {}
  ): void {
    if (!this.config.enabled) return;

    this.track('user.identified', {
      user_id: userId,
      ...traits,
    });
  }

  /**
   * Track a page view
   */
  page(
    pageName: string,
    properties: EventProperties = {},
    context?: { userId?: string; sessionId?: string }
  ): void {
    this.track('page.viewed', {
      page_name: pageName,
      ...properties,
    }, context);
  }

  /**
   * Sanitize properties to remove PII
   */
  private sanitizeProperties(properties: EventProperties): EventProperties {
    const sanitized: EventProperties = {};
    const piiFields = ['password', 'token', 'secret', 'api_key', 'ssn', 'credit_card'];

    for (const [key, value] of Object.entries(properties)) {
      // Check if field name suggests PII
      if (piiFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Check for email patterns
      if (typeof value === 'string' && value.includes('@') && !key.toLowerCase().includes('email')) {
        sanitized[key] = '[EMAIL_REDACTED]';
        continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Flush queued events to the endpoint
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    if (!this.config.endpoint) {
      logger.warn('No analytics endpoint configured, clearing queue');
      this.queue = [];
      return;
    }

    const batch = this.queue.splice(0, this.queue.length);
    logger.info('Flushing analytics batch', { eventCount: batch.length });

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        },
        body: JSON.stringify({ events: batch }),
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      logger.info('Analytics batch sent successfully', { eventCount: batch.length });
    } catch (error) {
      logger.error('Failed to send analytics batch', { error, eventCount: batch.length });
      // Re-queue events on failure (up to a limit)
      if (this.queue.length < 1000) {
        this.queue.unshift(...batch);
      }
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop automatic flush timer and flush remaining events
   */
  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }
}

// Singleton instance
let analyticsInstance: AnalyticsClient | null = null;

/**
 * Initialize analytics client
 */
export function initAnalytics(config: AnalyticsConfig): AnalyticsClient {
  if (analyticsInstance) {
    logger.warn('Analytics already initialized, returning existing instance');
    return analyticsInstance;
  }

  analyticsInstance = new AnalyticsClient(config);
  logger.info('Analytics initialized', { enabled: config.enabled });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await analyticsInstance?.close();
  });

  process.on('SIGINT', async () => {
    await analyticsInstance?.close();
  });

  return analyticsInstance;
}

/**
 * Get analytics client (must be initialized first)
 */
export function getAnalytics(): AnalyticsClient {
  if (!analyticsInstance) {
    // Return no-op client if not initialized
    logger.warn('Analytics not initialized, returning no-op client');
    return new AnalyticsClient({ enabled: false });
  }
  return analyticsInstance;
}

/**
 * Convenience functions for common events
 */
export const analytics = {
  track: (name: string, props?: EventProperties, context?: any) =>
    getAnalytics().track(name, props, context),
  identify: (userId: string, traits?: Record<string, any>) =>
    getAnalytics().identify(userId, traits),
  page: (name: string, props?: EventProperties, context?: any) =>
    getAnalytics().page(name, props, context),
};
