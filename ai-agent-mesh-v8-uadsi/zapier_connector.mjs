#!/usr/bin/env node
/**
 * Zapier Connector for UADSI
 * Webhooks and triggers for Zapier automation workflows
 */

import axios from 'axios';
import crypto from 'crypto';
import { EventEmitter } from 'events';

export class ZapierConnector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      webhookUrl: config.webhookUrl || process.env.ZAPIER_WEBHOOK_URL,
      secret: config.secret || process.env.ZAPIER_WEBHOOK_SECRET,
      ...config
    };
  }

  /**
   * Send trust score update to Zapier
   */
  async sendTrustUpdate(trustData) {
    try {
      const payload = {
        event_type: 'trust_score_updated',
        timestamp: new Date().toISOString(),
        data: {
          entity_id: trustData.entity_id,
          entity_type: trustData.entity_type,
          trust_score: trustData.trust_score,
          reliability_score: trustData.reliability_score,
          compliance_score: trustData.compliance_score,
          performance_score: trustData.performance_score,
          security_score: trustData.security_score,
          risk_avoided_usd: trustData.risk_avoided_usd,
          incidents_prevented: trustData.incidents_prevented,
          calculated_at: trustData.calculated_at
        }
      };

      await this.sendWebhook(payload);
      this.emit('trust:sent', trustData);
    } catch (error) {
      console.error('Zapier trust update error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send drift incident alert to Zapier
   */
  async sendDriftAlert(driftIncident) {
    try {
      const payload = {
        event_type: 'drift_incident_detected',
        timestamp: new Date().toISOString(),
        data: {
          incident_id: driftIncident.incident_id,
          severity: driftIncident.severity,
          workflow_id: driftIncident.workflow_id,
          agent_ids: driftIncident.agent_ids,
          drift_ms: driftIncident.drift_ms,
          impact_score: driftIncident.impact_score,
          root_cause: driftIncident.root_cause,
          detected_at: driftIncident.detected_at
        }
      };

      await this.sendWebhook(payload);
      this.emit('drift:sent', driftIncident);
    } catch (error) {
      console.error('Zapier drift alert error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send agent health change to Zapier
   */
  async sendAgentHealthChange(agent) {
    try {
      const payload = {
        event_type: 'agent_health_changed',
        timestamp: new Date().toISOString(),
        data: {
          agent_id: agent.agent_id,
          agent_name: agent.agent_name,
          agent_type: agent.agent_type,
          old_status: agent.old_health_status,
          new_status: agent.health_status,
          trust_score: agent.trust_score,
          last_heartbeat: agent.last_heartbeat
        }
      };

      await this.sendWebhook(payload);
      this.emit('agent:sent', agent);
    } catch (error) {
      console.error('Zapier agent health error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send compliance violation to Zapier
   */
  async sendComplianceViolation(violation) {
    try {
      const payload = {
        event_type: 'compliance_violation',
        timestamp: new Date().toISOString(),
        data: {
          violation_id: violation.violation_id,
          agent_id: violation.agent_id,
          policy_id: violation.policy_id,
          severity: violation.severity,
          description: violation.description,
          detected_at: violation.detected_at
        }
      };

      await this.sendWebhook(payload);
      this.emit('violation:sent', violation);
    } catch (error) {
      console.error('Zapier compliance violation error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send ROI milestone to Zapier
   */
  async sendROIMilestone(milestone) {
    try {
      const payload = {
        event_type: 'roi_milestone_reached',
        timestamp: new Date().toISOString(),
        data: {
          milestone_type: milestone.type,
          risk_avoided_usd: milestone.risk_avoided_usd,
          incidents_prevented: milestone.incidents_prevented,
          roi_ratio: milestone.roi_ratio,
          message: milestone.message
        }
      };

      await this.sendWebhook(payload);
      this.emit('milestone:sent', milestone);
    } catch (error) {
      console.error('Zapier ROI milestone error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send webhook with signature
   */
  async sendWebhook(payload) {
    const signature = this.generateSignature(payload);
    
    const response = await axios.post(
      this.config.webhookUrl,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-UADSI-Signature': signature,
          'X-UADSI-Timestamp': payload.timestamp
        }
      }
    );

    return response.data;
  }

  /**
   * Generate HMAC signature for webhook
   */
  generateSignature(payload) {
    if (!this.config.secret) return '';
    
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify webhook signature (for receiving webhooks from Zapier)
   */
  verifySignature(payload, signature) {
    const expectedSignature = this.generateSignature(payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Subscribe to UADSI events for Zapier
   */
  subscribeToEvents(events, callbackUrl) {
    // In a real implementation, this would register the callback with UADSI
    this.emit('subscription:created', { events, callbackUrl });
    return {
      subscription_id: `zap_sub_${Date.now()}`,
      events,
      callbackUrl,
      created_at: new Date().toISOString()
    };
  }
}

export default ZapierConnector;
