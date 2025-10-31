/**
 * Alert Routing System
 * 
 * Routes SLO breaches and system alerts to appropriate channels
 * Supports Slack, email, PagerDuty, and webhooks
 */

import { EventEmitter } from 'events';

export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  message: string;
  details?: any;
  runbookUrl?: string;
}

export interface NotificationChannel {
  type: 'slack' | 'email' | 'pagerduty' | 'webhook';
  enabled: boolean;
  config: any;
}

export class AlertRouter extends EventEmitter {
  private channels: Map<string, NotificationChannel> = new Map();

  constructor() {
    super();
    this.initializeChannels();
  }

  private initializeChannels(): void {
    // Slack channel
    if (process.env.SLACK_WEBHOOK_URL) {
      this.channels.set('slack', {
        type: 'slack',
        enabled: true,
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: '#orca-alerts',
          mentionOnCritical: '@oncall',
        },
      });
    }

    // Email channel
    if (process.env.ALERT_EMAIL_RECIPIENTS) {
      this.channels.set('email', {
        type: 'email',
        enabled: true,
        config: {
          recipients: process.env.ALERT_EMAIL_RECIPIENTS.split(','),
          from: 'alerts@orca-mesh.io',
        },
      });
    }

    // PagerDuty channel
    if (process.env.PAGERDUTY_INTEGRATION_KEY) {
      this.channels.set('pagerduty', {
        type: 'pagerduty',
        enabled: true,
        config: {
          integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
        },
      });
    }

    // Generic webhook
    if (process.env.ALERT_WEBHOOK_URL) {
      this.channels.set('webhook', {
        type: 'webhook',
        enabled: true,
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
        },
      });
    }
  }

  public async route(alert: Alert): Promise<void> {
    console.log(`📢 Routing alert: ${alert.severity} - ${alert.message}`);

    const channels = this.selectChannels(alert);

    for (const channelName of channels) {
      const channel = this.channels.get(channelName);
      if (!channel || !channel.enabled) continue;

      try {
        await this.sendToChannel(channel, alert);
      } catch (error: any) {
        console.error(`Failed to send alert to ${channelName}:`, error.message);
      }
    }
  }

  private selectChannels(alert: Alert): string[] {
    const channels: string[] = [];

    switch (alert.severity) {
      case 'critical':
        channels.push('slack', 'pagerduty', 'email');
        break;
      case 'high':
        channels.push('slack', 'email');
        break;
      case 'medium':
        channels.push('slack');
        break;
      case 'low':
        channels.push('webhook');
        break;
    }

    return channels.filter(c => this.channels.has(c));
  }

  private async sendToChannel(channel: NotificationChannel, alert: Alert): Promise<void> {
    switch (channel.type) {
      case 'slack':
        await this.sendToSlack(channel, alert);
        break;
      case 'email':
        await this.sendToEmail(channel, alert);
        break;
      case 'pagerduty':
        await this.sendToPagerDuty(channel, alert);
        break;
      case 'webhook':
        await this.sendToWebhook(channel, alert);
        break;
    }
  }

  private async sendToSlack(channel: NotificationChannel, alert: Alert): Promise<void> {
    const { webhookUrl, mentionOnCritical } = channel.config;

    const color = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#f59e0b',
      low: '#3b82f6',
    }[alert.severity];

    const text = alert.severity === 'critical' && mentionOnCritical
      ? `${mentionOnCritical} Critical Alert!`
      : `${alert.severity.toUpperCase()} Alert`;

    const payload = {
      text,
      attachments: [
        {
          color,
          title: alert.message,
          fields: [
            { title: 'Source', value: alert.source, short: true },
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Time', value: alert.timestamp.toISOString(), short: false },
          ],
          ...(alert.runbookUrl && {
            actions: [
              {
                type: 'button',
                text: 'View Runbook',
                url: alert.runbookUrl,
              },
            ],
          }),
        },
      ],
    };

    console.log(`  ✅ Would send to Slack: ${alert.message}`);
    // In production: await fetch(webhookUrl, { method: 'POST', body: JSON.stringify(payload) });
  }

  private async sendToEmail(channel: NotificationChannel, alert: Alert): Promise<void> {
    const { recipients, from } = channel.config;

    console.log(`  ✅ Would send email to: ${recipients.join(', ')}`);
    // In production: use nodemailer or SendGrid
  }

  private async sendToPagerDuty(channel: NotificationChannel, alert: Alert): Promise<void> {
    const { integrationKey } = channel.config;

    const event = {
      routing_key: integrationKey,
      event_action: 'trigger',
      payload: {
        summary: alert.message,
        source: alert.source,
        severity: alert.severity,
        timestamp: alert.timestamp.toISOString(),
        custom_details: alert.details,
      },
      links: alert.runbookUrl ? [{ href: alert.runbookUrl, text: 'Runbook' }] : [],
    };

    console.log(`  ✅ Would send to PagerDuty: ${alert.message}`);
    // In production: await fetch('https://events.pagerduty.com/v2/enqueue', { ... });
  }

  private async sendToWebhook(channel: NotificationChannel, alert: Alert): Promise<void> {
    const { url } = channel.config;

    console.log(`  ✅ Would send to webhook: ${url}`);
    // In production: await fetch(url, { method: 'POST', body: JSON.stringify(alert) });
  }

  public createSLOBreachAlert(
    endpoint: string,
    metric: string,
    value: number,
    threshold: number
  ): Alert {
    return {
      id: `slo-${Date.now()}`,
      timestamp: new Date(),
      severity: 'high',
      source: 'SLO Monitor',
      message: `SLO breach on ${endpoint}: ${metric} = ${value} (threshold: ${threshold})`,
      details: { endpoint, metric, value, threshold },
      runbookUrl: 'https://docs.orca-mesh.io/runbooks/slo-breach',
    };
  }

  public createDeploymentAlert(stage: string, status: 'success' | 'failed'): Alert {
    return {
      id: `deploy-${Date.now()}`,
      timestamp: new Date(),
      severity: status === 'failed' ? 'critical' : 'medium',
      source: 'Deployment System',
      message: `Deployment ${status} at stage: ${stage}`,
      details: { stage, status },
      runbookUrl: status === 'failed' 
        ? 'https://docs.orca-mesh.io/runbooks/deployment-failure'
        : undefined,
    };
  }
}

// Singleton instance
export const alertRouter = new AlertRouter();

export default alertRouter;
