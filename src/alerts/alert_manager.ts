/**
 * Alert Manager - Centralized alerting for SLA breaches, drift, and trust score issues
 */

import { createLogger } from '../common/logger.js';

const logger = createLogger('alert-manager');

export interface Alert {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface AlertChannel {
  name: string;
  send(alert: Alert): Promise<void>;
}

/**
 * Console logger channel (always enabled)
 */
class ConsoleChannel implements AlertChannel {
  name = 'console';

  async send(alert: Alert): Promise<void> {
    const emoji = { critical: '🚨', warning: '⚠️', info: 'ℹ️' }[alert.severity];
    logger.warn(`${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`, {
      message: alert.message,
      ...alert.metadata,
    });
  }
}

/**
 * Webhook channel for Slack/Teams/PagerDuty
 */
class WebhookChannel implements AlertChannel {
  name = 'webhook';

  constructor(private webhookUrl: string) {}

  async send(alert: Alert): Promise<void> {
    try {
      const payload = {
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
        metadata: alert.metadata,
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send webhook alert', error as Error, { alert });
    }
  }
}

/**
 * Alert Manager - Singleton service
 */
export class AlertManager {
  private channels: AlertChannel[] = [];
  private alertHistory: Alert[] = [];
  private maxHistorySize = 1000;

  constructor() {
    // Always add console channel
    this.channels.push(new ConsoleChannel());

    // Add webhook channel if configured
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      this.channels.push(new WebhookChannel(webhookUrl));
      logger.info('Alert webhook configured', { url: webhookUrl });
    }
  }

  /**
   * Send alert to all configured channels
   */
  async sendAlert(alert: Alert): Promise<void> {
    // Store in history
    this.alertHistory.push(alert);
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }

    // Send to all channels in parallel
    await Promise.allSettled(
      this.channels.map(channel => channel.send(alert))
    );
  }

  /**
   * Alert for SLA breach
   */
  async alertSLABreach(metric: string, current: number, threshold: number): Promise<void> {
    await this.sendAlert({
      severity: 'critical',
      title: 'SLA Breach Detected',
      message: `${metric} is ${current}%, below threshold of ${threshold}%`,
      metadata: { metric, current, threshold },
      timestamp: new Date(),
    });
  }

  /**
   * Alert for high drift rate
   */
  async alertHighDrift(driftRate: number, threshold: number): Promise<void> {
    await this.sendAlert({
      severity: 'warning',
      title: 'High Drift Rate Detected',
      message: `Drift rate is ${driftRate}%, above threshold of ${threshold}%`,
      metadata: { driftRate, threshold },
      timestamp: new Date(),
    });
  }

  /**
   * Alert for low trust score
   */
  async alertLowTrustScore(agentId: string, score: number, threshold: number): Promise<void> {
    await this.sendAlert({
      severity: 'warning',
      title: 'Low Trust Score',
      message: `Agent ${agentId} has trust score ${score}, below threshold of ${threshold}`,
      metadata: { agentId, score, threshold },
      timestamp: new Date(),
    });
  }

  /**
   * Alert for adapter failure
   */
  async alertAdapterFailure(adapter: string, error: string): Promise<void> {
    await this.sendAlert({
      severity: 'critical',
      title: 'Adapter Failure',
      message: `${adapter} adapter failed: ${error}`,
      metadata: { adapter, error },
      timestamp: new Date(),
    });
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }
}

// Singleton instance
export const alertManager = new AlertManager();
