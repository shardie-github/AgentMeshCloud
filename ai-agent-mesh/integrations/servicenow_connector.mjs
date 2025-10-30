/**
 * ServiceNow Integration Connector for AI-Agent Mesh
 * Enables IT Service Management and incident tracking integration
 * 
 * @module ServiceNowConnector
 * @version 1.0.0
 */

import axios from 'axios';

export class ServiceNowConnector {
  constructor(config) {
    const { instanceUrl, username, password, clientId, clientSecret } = config;

    this.instanceUrl = instanceUrl.replace(/\/$/, ''); // Remove trailing slash
    this.username = username;
    this.password = password;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    
    this.client = axios.create({
      baseURL: `${this.instanceUrl}/api/now`,
      auth: {
        username: this.username,
        password: this.password
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }

  // ============ Incident Management ============

  /**
   * Create a new incident
   * @param {Object} incidentData - Incident details
   * @returns {Promise<Object>} Created incident
   */
  async createIncident(incidentData) {
    const {
      shortDescription,
      description,
      urgency,
      impact,
      priority,
      category,
      subcategory,
      callerId,
      assignedTo,
      configurationItem
    } = incidentData;

    try {
      const { data } = await this.client.post('/table/incident', {
        short_description: shortDescription,
        description,
        urgency: urgency || '3',
        impact: impact || '3',
        priority: priority || '4',
        category,
        subcategory,
        caller_id: callerId,
        assigned_to: assignedTo,
        cmdb_ci: configurationItem,
        state: '1' // New
      });

      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an incident
   * @param {string} sysId - Incident sys_id
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated incident
   */
  async updateIncident(sysId, updates) {
    try {
      const { data } = await this.client.patch(`/table/incident/${sysId}`, updates);
      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Resolve an incident
   * @param {string} sysId - Incident sys_id
   * @param {Object} resolutionData - Resolution details
   * @returns {Promise<Object>} Resolved incident
   */
  async resolveIncident(sysId, resolutionData) {
    const { resolutionCode, resolutionNotes, closeCode } = resolutionData;

    try {
      const { data } = await this.client.patch(`/table/incident/${sysId}`, {
        state: '6', // Resolved
        resolution_code: resolutionCode,
        close_notes: resolutionNotes,
        close_code: closeCode
      });

      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get incident by sys_id
   * @param {string} sysId - Incident sys_id
   * @returns {Promise<Object>} Incident details
   */
  async getIncident(sysId) {
    try {
      const { data } = await this.client.get(`/table/incident/${sysId}`);
      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Query incidents
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Array>} List of incidents
   */
  async queryIncidents(queryParams = {}) {
    try {
      const { data } = await this.client.get('/table/incident', {
        params: {
          sysparm_query: queryParams.query,
          sysparm_limit: queryParams.limit || 100,
          sysparm_offset: queryParams.offset || 0,
          sysparm_display_value: queryParams.displayValue || 'false'
        }
      });

      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Change Management ============

  /**
   * Create a change request
   * @param {Object} changeData - Change request details
   * @returns {Promise<Object>} Created change request
   */
  async createChangeRequest(changeData) {
    const {
      shortDescription,
      description,
      type,
      risk,
      impact,
      priority,
      category,
      assignmentGroup,
      assignedTo,
      plannedStartDate,
      plannedEndDate
    } = changeData;

    try {
      const { data } = await this.client.post('/table/change_request', {
        short_description: shortDescription,
        description,
        type: type || 'normal',
        risk: risk || '3',
        impact: impact || '3',
        priority: priority || '4',
        category,
        assignment_group: assignmentGroup,
        assigned_to: assignedTo,
        start_date: plannedStartDate,
        end_date: plannedEndDate,
        state: '-5' // New
      });

      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Service Catalog ============

  /**
   * Get catalog items
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Array>} List of catalog items
   */
  async getCatalogItems(queryParams = {}) {
    try {
      const { data } = await this.client.get('/table/sc_cat_item', {
        params: {
          sysparm_query: queryParams.query,
          sysparm_limit: queryParams.limit || 100,
          sysparm_display_value: 'true'
        }
      });

      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Submit a catalog request
   * @param {Object} requestData - Request details
   * @returns {Promise<Object>} Created request
   */
  async submitCatalogRequest(requestData) {
    const { catalogItemId, variables, requestedFor } = requestData;

    try {
      const { data } = await this.client.post('/table/sc_request', {
        cat_item: catalogItemId,
        variables,
        requested_for: requestedFor
      });

      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Knowledge Base ============

  /**
   * Search knowledge base
   * @param {string} searchText - Search query
   * @returns {Promise<Array>} Knowledge articles
   */
  async searchKnowledge(searchText) {
    try {
      const { data } = await this.client.get('/table/kb_knowledge', {
        params: {
          sysparm_query: `textISNOTEMPTY^short_descriptionLIKE${searchText}^ORtextLIKE${searchText}`,
          sysparm_limit: 10,
          sysparm_display_value: 'true'
        }
      });

      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ CMDB ============

  /**
   * Get configuration item
   * @param {string} sysId - CI sys_id
   * @returns {Promise<Object>} Configuration item
   */
  async getConfigurationItem(sysId) {
    try {
      const { data } = await this.client.get(`/table/cmdb_ci/${sysId}`);
      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Query configuration items
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Array>} List of CIs
   */
  async queryConfigurationItems(queryParams = {}) {
    try {
      const { data } = await this.client.get('/table/cmdb_ci', {
        params: {
          sysparm_query: queryParams.query,
          sysparm_limit: queryParams.limit || 100,
          sysparm_display_value: 'true'
        }
      });

      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Users & Groups ============

  /**
   * Get user by sys_id
   * @param {string} sysId - User sys_id
   * @returns {Promise<Object>} User details
   */
  async getUser(sysId) {
    try {
      const { data } = await this.client.get(`/table/sys_user/${sysId}`);
      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get group by sys_id
   * @param {string} sysId - Group sys_id
   * @returns {Promise<Object>} Group details
   */
  async getGroup(sysId) {
    try {
      const { data } = await this.client.get(`/table/sys_user_group/${sysId}`);
      return data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Webhook Verification ============

  /**
   * Verify ServiceNow webhook signature
   * @param {string} signature - X-ServiceNow-Signature header
   * @param {string} body - Request body
   * @returns {boolean} Is valid
   */
  verifyWebhook(signature, body) {
    const crypto = require('crypto');
    
    if (!this.clientSecret) {
      throw new Error('Client secret not configured for webhook verification');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.clientSecret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // ============ Utility Methods ============

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.error?.message || data?.message || 'Unknown error';
      return new Error(
        `ServiceNow API error (${status}): ${message}`
      );
    }
    return error;
  }

  /**
   * Transform mesh event to ServiceNow incident
   * @param {Object} meshEvent - AI-Agent Mesh event
   * @returns {Object} ServiceNow incident data
   */
  transformMeshEventToIncident(meshEvent) {
    return {
      shortDescription: meshEvent.description || meshEvent.event,
      description: JSON.stringify(meshEvent, null, 2),
      urgency: this.mapUrgency(meshEvent.severity),
      impact: this.mapImpact(meshEvent.impact),
      category: 'AI Agent',
      subcategory: meshEvent.agentType || 'General',
      caller_id: meshEvent.userId || meshEvent.agentId
    };
  }

  mapUrgency(severity) {
    const map = {
      'critical': '1',
      'high': '2',
      'medium': '3',
      'low': '4'
    };
    return map[severity?.toLowerCase()] || '3';
  }

  mapImpact(impact) {
    const map = {
      'high': '1',
      'medium': '2',
      'low': '3'
    };
    return map[impact?.toLowerCase()] || '2';
  }
}

export default ServiceNowConnector;
