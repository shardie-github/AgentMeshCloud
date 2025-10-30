#!/usr/bin/env node
/**
 * Datadog Connector for UADSI
 * Sends trust metrics, events, and logs to Datadog monitoring
 */

import axios from 'axios';
import { EventEmitter } from 'events';

export class DatadogConnector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      apiKey: config.apiKey || process.env.DATADOG_API_KEY,
      appKey: config.appKey || process.env.DATADOG_APP_KEY,
      site: config.site || 'datadoghq.com',
      ...config
    };
    
    this.baseUrl = `https://api.${this.config.site}`;
  }

  /**
   * Send trust score metrics to Datadog
   */
  async sendMetrics(metrics) {
    try {
      const series = [{
        metric: 'uadsi.trust_score',
        type: 'gauge',
        points: [[Math.floor(Date.now() / 1000), metrics.trust_score]],
        tags: [
          `entity_id:${metrics.entity_id}`,
          `entity_type:${metrics.entity_type}`,
          'source:uadsi'
        ]
      }, {
        metric: 'uadsi.risk_avoided_usd',
        type: 'gauge',
        points: [[Math.floor(Date.now() / 1000), metrics.risk_avoided_usd]],
        tags: [
          `entity_id:${metrics.entity_id}`,
          'source:uadsi'
        ]
      }, {
        metric: 'uadsi.compliance_sla',
        type: 'gauge',
        points: [[Math.floor(Date.now() / 1000), metrics.compliance_sla_pct]],
        tags: [
          `entity_id:${metrics.entity_id}`,
          'source:uadsi'
        ]
      }];

      if (metrics.reliability_score) {
        series.push({
          metric: 'uadsi.reliability_score',
          type: 'gauge',
          points: [[Math.floor(Date.now() / 1000), metrics.reliability_score]],
          tags: [`entity_id:${metrics.entity_id}`, 'source:uadsi']
        });
      }

      const response = await axios.post(
        `${this.baseUrl}/api/v2/series`,
        { series },
        {
          headers: {
            'DD-API-KEY': this.config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('metrics:sent', metrics);
      return response.data;
    } catch (error) {
      console.error('Datadog metrics send error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send agent event to Datadog
   */
  async sendEvent(event) {
    try {
      const ddEvent = {
        title: `UADSI: ${event.event_type} - ${event.agent_name}`,
        text: `
Agent ID: ${event.agent_id}
Agent Type: ${event.agent_type}
Health Status: ${event.health_status}
Trust Score: ${event.trust_score || 'N/A'}

${event.details || ''}
        `,
        alert_type: this.mapAlertType(event.severity),
        source_type_name: 'uadsi',
        tags: [
          `agent_id:${event.agent_id}`,
          `agent_type:${event.agent_type}`,
          `event_type:${event.event_type}`,
          `severity:${event.severity || 'info'}`,
          'source:uadsi'
        ]
      };

      const response = await axios.post(
        `${this.baseUrl}/api/v1/events`,
        ddEvent,
        {
          headers: {
            'DD-API-KEY': this.config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('event:sent', event);
      return response.data;
    } catch (error) {
      console.error('Datadog event send error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send logs to Datadog
   */
  async sendLogs(logs) {
    try {
      const ddLogs = Array.isArray(logs) ? logs : [logs];
      
      const formattedLogs = ddLogs.map(log => ({
        ddsource: 'uadsi',
        ddtags: `env:production,service:uadsi,${log.tags || ''}`,
        hostname: log.hostname || 'uadsi-platform',
        message: log.message,
        status: log.level || 'info',
        service: 'uadsi',
        ...log
      }));

      const response = await axios.post(
        `${this.baseUrl}/api/v2/logs`,
        formattedLogs,
        {
          headers: {
            'DD-API-KEY': this.config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('logs:sent', formattedLogs);
      return response.data;
    } catch (error) {
      console.error('Datadog logs send error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Create Datadog monitor for trust score
   */
  async createTrustMonitor() {
    try {
      const monitor = {
        name: 'UADSI Trust Score Critical',
        type: 'metric alert',
        query: 'avg(last_5m):avg:uadsi.trust_score{*} < 60',
        message: `
@webhook-uadsi-alerts

UADSI Trust Score has fallen below critical threshold (60%).

Current trust score indicates potential reliability, compliance, or performance issues.

**Recommended Actions:**
1. Review agent health status
2. Check for compliance violations
3. Investigate performance degradation
4. Review recent changes

Dashboard: https://dashboard.uadsi.ai
        `,
        tags: ['uadsi', 'trust-score', 'critical'],
        options: {
          thresholds: {
            critical: 60,
            warning: 75
          },
          notify_no_data: true,
          no_data_timeframe: 10,
          notify_audit: true,
          require_full_window: false,
          new_group_delay: 60,
          include_tags: true,
          escalation_message: 'Trust score remains critical. Escalating to incident response.',
          locked: false
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/api/v1/monitor`,
        monitor,
        {
          headers: {
            'DD-API-KEY': this.config.apiKey,
            'DD-APPLICATION-KEY': this.config.appKey,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('monitor:created', response.data);
      return response.data;
    } catch (error) {
      console.error('Datadog monitor creation error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Map UADSI severity to Datadog alert type
   */
  mapAlertType(severity) {
    const mapping = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'info'
    };
    return mapping[severity] || 'info';
  }

  /**
   * Create custom dashboard in Datadog
   */
  async createDashboard() {
    try {
      const dashboard = {
        title: 'UADSI Trust Intelligence',
        description: 'Real-time trust scoring and agent synchronization monitoring',
        widgets: [
          {
            definition: {
              type: 'timeseries',
              requests: [{
                q: 'avg:uadsi.trust_score{*}',
                display_type: 'line',
                style: {
                  palette: 'dog_classic',
                  line_type: 'solid',
                  line_width: 'normal'
                }
              }],
              title: 'Trust Score Over Time',
              show_legend: true,
              legend_size: '0'
            }
          },
          {
            definition: {
              type: 'query_value',
              requests: [{
                q: 'avg:uadsi.trust_score{*}',
                aggregator: 'avg'
              }],
              title: 'Current Trust Score',
              precision: 2
            }
          },
          {
            definition: {
              type: 'query_value',
              requests: [{
                q: 'sum:uadsi.risk_avoided_usd{*}',
                aggregator: 'sum'
              }],
              title: 'Risk Avoided ($)',
              precision: 0
            }
          }
        ],
        layout_type: 'ordered',
        is_read_only: false,
        notify_list: [],
        template_variables: []
      };

      const response = await axios.post(
        `${this.baseUrl}/api/v1/dashboard`,
        dashboard,
        {
          headers: {
            'DD-API-KEY': this.config.apiKey,
            'DD-APPLICATION-KEY': this.config.appKey,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('dashboard:created', response.data);
      return response.data;
    } catch (error) {
      console.error('Datadog dashboard creation error:', error);
      this.emit('error', error);
      throw error;
    }
  }
}

export default DatadogConnector;
