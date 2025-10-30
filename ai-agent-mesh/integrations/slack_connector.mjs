/**
 * Slack Integration Connector for AI-Agent Mesh
 * Enables team collaboration and real-time agent notifications
 * 
 * @module SlackConnector
 * @version 3.0.0
 */

import axios from 'axios';

export class SlackConnector {
  constructor(config) {
    const { botToken, appToken, signingSecret } = config;

    this.botToken = botToken;
    this.appToken = appToken;
    this.signingSecret = signingSecret;
    
    this.client = axios.create({
      baseURL: 'https://slack.com/api',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  // ============ Messaging ============

  /**
   * Send agent notification to Slack channel
   * @param {Object} messageConfig - Message configuration
   * @returns {Promise<Object>} Message result
   */
  async sendMessage(messageConfig) {
    const { channel, text, blocks, attachments, threadTs } = messageConfig;

    try {
      const { data } = await this.client.post('/chat.postMessage', {
        channel,
        text,
        blocks,
        attachments,
        thread_ts: threadTs,
        unfurl_links: false,
        unfurl_media: false
      });

      if (!data.ok) {
        throw new Error(`Slack error: ${data.error}`);
      }

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Send agent execution notification
   * @param {string} channel - Channel ID
   * @param {Object} execution - Execution details
   */
  async notifyAgentExecution(channel, execution) {
    const { agentName, workflowId, status, duration, output } = execution;
    
    const color = status === 'success' ? 'good' : status === 'failed' ? 'danger' : 'warning';
    const emoji = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⚠️';

    return this.sendMessage({
      channel,
      text: `${emoji} Agent Execution: ${agentName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} Agent Execution Complete`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Agent:*\n${agentName}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n${status.toUpperCase()}`
            },
            {
              type: 'mrkdwn',
              text: `*Workflow ID:*\n${workflowId}`
            },
            {
              type: 'mrkdwn',
              text: `*Duration:*\n${duration}ms`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Output:*\n\`\`\`${JSON.stringify(output, null, 2)}\`\`\``
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Details'
              },
              url: `https://mesh.ai/dashboard/workflows/${workflowId}`
            }
          ]
        }
      ]
    });
  }

  /**
   * Send policy violation alert
   * @param {string} channel - Channel ID
   * @param {Object} violation - Violation details
   */
  async notifyPolicyViolation(channel, violation) {
    const { agentId, agentName, policyName, severity, details } = violation;

    return this.sendMessage({
      channel,
      text: `🚨 Policy Violation: ${policyName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Policy Violation Detected'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Agent:*\n${agentName}`
            },
            {
              type: 'mrkdwn',
              text: `*Severity:*\n${severity.toUpperCase()}`
            },
            {
              type: 'mrkdwn',
              text: `*Policy:*\n${policyName}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n<!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|Now>`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n${details}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Agent'
              },
              url: `https://mesh.ai/dashboard/agents/${agentId}`,
              style: 'danger'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Acknowledge'
              },
              action_id: 'acknowledge_violation'
            }
          ]
        }
      ]
    });
  }

  /**
   * Send agent health alert
   * @param {string} channel - Channel ID
   * @param {Object} healthData - Health metrics
   */
  async notifyHealthAlert(channel, healthData) {
    const { agentId, agentName, healthScore, status, issues } = healthData;

    return this.sendMessage({
      channel,
      text: `⚠️ Agent Health Alert: ${agentName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ Agent Health Alert'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Agent:*\n${agentName}`
            },
            {
              type: 'mrkdwn',
              text: `*Health Score:*\n${healthScore}/100`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n${status}`
            },
            {
              type: 'mrkdwn',
              text: `*Issues Found:*\n${issues.length}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Issues:*\n${issues.map(i => `• ${i}`).join('\n')}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Investigate'
              },
              url: `https://mesh.ai/dashboard/agents/${agentId}/health`
            }
          ]
        }
      ]
    });
  }

  // ============ Interactive Components ============

  /**
   * Create slash command handler for agent control
   * @param {Object} command - Slash command data
   * @returns {Promise<Object>} Command response
   */
  async handleSlashCommand(command) {
    const { command: cmd, text, user_id, channel_id } = command;

    // /mesh-agent create|list|execute|status
    const [action, ...args] = text.split(' ');

    switch (action) {
      case 'list':
        return this.handleListAgents();
      case 'execute':
        return this.handleExecuteWorkflow(args[0]);
      case 'status':
        return this.handleAgentStatus(args[0]);
      default:
        return {
          response_type: 'ephemeral',
          text: 'Usage: /mesh-agent [list|execute|status] [args]'
        };
    }
  }

  async handleListAgents() {
    // TODO: Fetch agents from AI-Agent Mesh API
    return {
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Active Agents:*\n• Agent 1\n• Agent 2\n• Agent 3'
          }
        }
      ]
    };
  }

  /**
   * Create interactive dashboard in Slack
   * @param {string} channel - Channel ID
   * @param {Object} dashboardData - Dashboard metrics
   */
  async createDashboard(channel, dashboardData) {
    const {
      activeAgents,
      todayExecutions,
      avgHealthScore,
      policyViolations
    } = dashboardData;

    return this.sendMessage({
      channel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📊 AI-Agent Mesh Dashboard'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Active Agents:*\n${activeAgents}`
            },
            {
              type: 'mrkdwn',
              text: `*Today's Executions:*\n${todayExecutions}`
            },
            {
              type: 'mrkdwn',
              text: `*Avg Health Score:*\n${avgHealthScore}/100`
            },
            {
              type: 'mrkdwn',
              text: `*Policy Violations:*\n${policyViolations}`
            }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🔄 Refresh'
              },
              action_id: 'refresh_dashboard'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📈 Full Dashboard'
              },
              url: 'https://mesh.ai/dashboard'
            }
          ]
        }
      ]
    });
  }

  // ============ User & Channel Management ============

  /**
   * Get user information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async getUser(userId) {
    try {
      const { data } = await this.client.get('/users.info', {
        params: { user: userId }
      });

      if (!data.ok) {
        throw new Error(`Slack error: ${data.error}`);
      }

      return data.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * List channels
   * @returns {Promise<Array>} Channels list
   */
  async listChannels() {
    try {
      const { data } = await this.client.get('/conversations.list', {
        params: {
          types: 'public_channel,private_channel',
          limit: 1000
        }
      });

      if (!data.ok) {
        throw new Error(`Slack error: ${data.error}`);
      }

      return data.channels;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Webhook Verification ============

  /**
   * Verify Slack webhook signature
   * @param {string} signature - X-Slack-Signature header
   * @param {string} timestamp - X-Slack-Request-Timestamp header
   * @param {string} body - Request body
   * @returns {boolean} Is valid
   */
  verifyWebhook(signature, timestamp, body) {
    const crypto = require('crypto');
    
    // Prevent replay attacks (timestamp should be within 5 minutes)
    const time = Math.floor(new Date().getTime() / 1000);
    if (Math.abs(time - timestamp) > 300) {
      return false;
    }

    const sigBasestring = `v0:${timestamp}:${body}`;
    const mySignature = 'v0=' + crypto
      .createHmac('sha256', this.signingSecret)
      .update(sigBasestring, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  }

  // ============ Utility Methods ============

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      return new Error(
        `Slack API error (${status}): ${data.error || 'Unknown error'}`
      );
    }
    return error;
  }
}

export default SlackConnector;
