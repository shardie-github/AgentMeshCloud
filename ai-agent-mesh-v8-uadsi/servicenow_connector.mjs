#!/usr/bin/env node
/**
 * ServiceNow Connector for UADSI
 * Pushes agent events, trust telemetry, and incidents to ServiceNow ITSM
 */

import axios from 'axios';
import { EventEmitter } from 'events';

export class ServiceNowConnector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      instance: config.instance || process.env.SERVICENOW_INSTANCE,
      username: config.username || process.env.SERVICENOW_USER,
      password: config.password || process.env.SERVICENOW_PASS,
      apiVersion: config.apiVersion || 'v1',
      ...config
    };
    
    this.baseUrl = `https://${this.config.instance}.service-now.com/api/now/${this.config.apiVersion}`;
    this.auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
  }

  /**
   * Send agent event to ServiceNow
   */
  async sendAgentEvent(event) {
    try {
      const incident = {
        short_description: `UADSI: Agent ${event.agent_name} - ${event.event_type}`,
        description: `
Agent ID: ${event.agent_id}
Agent Type: ${event.agent_type}
Event Type: ${event.event_type}
Trust Score: ${event.trust_score || 'N/A'}
Health Status: ${event.health_status}
Timestamp: ${event.timestamp}

${event.details || ''}
        `,
        urgency: this.mapUrgency(event.severity),
        impact: this.mapImpact(event.severity),
        category: 'Agent Management',
        subcategory: 'UADSI Monitoring',
        u_source: 'UADSI',
        u_trust_score: event.trust_score,
        u_agent_id: event.agent_id
      };

      const response = await axios.post(
        `${this.baseUrl}/table/incident`,
        incident,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('event:sent', { event, serviceNowId: response.data.result.sys_id });
      return response.data.result;
    } catch (error) {
      console.error('ServiceNow event send error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send trust telemetry to ServiceNow
   */
  async sendTrustTelemetry(telemetry) {
    try {
      // Create custom metric record in ServiceNow
      const metric = {
        u_metric_name: 'UADSI Trust Score',
        u_entity_id: telemetry.entity_id,
        u_entity_type: telemetry.entity_type,
        u_trust_score: telemetry.trust_score,
        u_risk_avoided_usd: telemetry.risk_avoided_usd,
        u_compliance_sla: telemetry.compliance_sla_pct,
        u_timestamp: telemetry.timestamp,
        u_source: 'UADSI'
      };

      const response = await axios.post(
        `${this.baseUrl}/table/u_uadsi_metrics`,
        metric,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('telemetry:sent', telemetry);
      return response.data.result;
    } catch (error) {
      console.error('ServiceNow telemetry send error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Create incident for drift detection
   */
  async createDriftIncident(driftIncident) {
    try {
      const incident = {
        short_description: `UADSI: Sync Drift Detected - ${driftIncident.severity}`,
        description: `
Incident ID: ${driftIncident.incident_id}
Workflow ID: ${driftIncident.workflow_id}
Affected Agents: ${driftIncident.agent_ids.join(', ')}
Drift Duration: ${driftIncident.drift_ms}ms
Severity: ${driftIncident.severity}
Impact Score: ${driftIncident.impact_score}

Root Cause: ${driftIncident.root_cause}

Detected: ${driftIncident.detected_at}
        `,
        urgency: this.mapUrgency(driftIncident.severity),
        impact: this.mapImpact(driftIncident.severity),
        category: 'Synchronization',
        subcategory: 'Agent Drift',
        u_source: 'UADSI',
        u_drift_ms: driftIncident.drift_ms,
        u_impact_score: driftIncident.impact_score
      };

      const response = await axios.post(
        `${this.baseUrl}/table/incident`,
        incident,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('drift:reported', { driftIncident, serviceNowId: response.data.result.sys_id });
      return response.data.result;
    } catch (error) {
      console.error('ServiceNow drift incident error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Map UADSI severity to ServiceNow urgency
   */
  mapUrgency(severity) {
    const mapping = {
      critical: '1',  // High
      high: '2',      // Medium
      medium: '3',    // Low
      low: '3'        // Low
    };
    return mapping[severity] || '3';
  }

  /**
   * Map UADSI severity to ServiceNow impact
   */
  mapImpact(severity) {
    const mapping = {
      critical: '1',  // High - affects multiple users
      high: '2',      // Medium - affects department
      medium: '2',    // Medium
      low: '3'        // Low - affects individual
    };
    return mapping[severity] || '3';
  }

  /**
   * Query ServiceNow incidents
   */
  async queryIncidents(filters = {}) {
    try {
      let query = 'u_source=UADSI';
      
      if (filters.open_only) {
        query += '^active=true';
      }
      
      if (filters.since) {
        query += `^sys_created_on>${filters.since}`;
      }

      const response = await axios.get(
        `${this.baseUrl}/table/incident?sysparm_query=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.result;
    } catch (error) {
      console.error('ServiceNow query error:', error);
      throw error;
    }
  }
}

export default ServiceNowConnector;
