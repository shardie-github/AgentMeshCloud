#!/usr/bin/env node
/**
 * MindStudio Connector for UADSI
 * Integrates UADSI trust intelligence with MindStudio AI workflows
 */

import axios from 'axios';
import { EventEmitter } from 'events';

export class MindStudioConnector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      apiKey: config.apiKey || process.env.MINDSTUDIO_API_KEY,
      workspaceId: config.workspaceId || process.env.MINDSTUDIO_WORKSPACE_ID,
      baseUrl: config.baseUrl || 'https://api.mindstudio.ai',
      ...config
    };
  }

  /**
   * Send trust intelligence to MindStudio workflow
   */
  async sendTrustIntelligence(data) {
    try {
      const payload = {
        workspaceId: this.config.workspaceId,
        data: {
          trust_score: data.trust_score,
          risk_avoided_usd: data.risk_avoided_usd,
          compliance_sla: data.compliance_sla_pct,
          agent_health: data.agent_health,
          sync_status: data.sync_status,
          recommendations: data.recommendations,
          timestamp: new Date().toISOString()
        },
        metadata: {
          source: 'uadsi',
          version: '1.0'
        }
      };

      const response = await axios.post(
        `${this.config.baseUrl}/v1/workflows/trigger`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('intelligence:sent', data);
      return response.data;
    } catch (error) {
      console.error('MindStudio intelligence send error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Create MindStudio AI assistant with UADSI context
   */
  async createTrustAssistant(config) {
    try {
      const assistant = {
        name: 'UADSI Trust Intelligence Assistant',
        description: 'AI assistant with real-time access to UADSI trust metrics and recommendations',
        systemPrompt: `
You are an AI assistant with access to UADSI (Unified Agent Diagnostics & Synchronization Intelligence) data.

You can help users:
- Interpret trust scores and identify issues
- Understand risk exposure and cost impact
- Diagnose synchronization problems
- Review compliance status
- Implement recommended actions

Always provide data-driven insights based on current UADSI metrics.
        `,
        tools: [
          {
            name: 'get_trust_score',
            description: 'Get current trust score for an entity',
            parameters: {
              entity_id: 'string',
              entity_type: 'string'
            }
          },
          {
            name: 'get_drift_incidents',
            description: 'List active synchronization drift incidents',
            parameters: {
              severity: 'string (optional)'
            }
          },
          {
            name: 'get_recommendations',
            description: 'Get actionable recommendations based on current state'
          }
        ],
        workspaceId: this.config.workspaceId
      };

      const response = await axios.post(
        `${this.config.baseUrl}/v1/assistants`,
        assistant,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('assistant:created', response.data);
      return response.data;
    } catch (error) {
      console.error('MindStudio assistant creation error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Execute MindStudio workflow with UADSI data
   */
  async executeWorkflow(workflowId, uadsiData) {
    try {
      const execution = {
        workflowId,
        inputs: {
          trust_metrics: {
            trust_score: uadsiData.trust_score,
            risk_avoided_usd: uadsiData.risk_avoided_usd,
            compliance_sla: uadsiData.compliance_sla
          },
          agent_data: uadsiData.agents,
          workflow_data: uadsiData.workflows,
          recommendations: uadsiData.recommendations
        },
        context: {
          source: 'uadsi',
          timestamp: new Date().toISOString()
        }
      };

      const response = await axios.post(
        `${this.config.baseUrl}/v1/workflows/${workflowId}/execute`,
        execution,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('workflow:executed', { workflowId, execution: response.data });
      return response.data;
    } catch (error) {
      console.error('MindStudio workflow execution error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stream UADSI updates to MindStudio
   */
  async streamUpdates(channel, data) {
    try {
      const message = {
        channel,
        event: 'uadsi_update',
        data,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(
        `${this.config.baseUrl}/v1/streams/publish`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('stream:published', message);
      return response.data;
    } catch (error) {
      console.error('MindStudio stream error:', error);
      this.emit('error', error);
      throw error;
    }
  }
}

export default MindStudioConnector;
