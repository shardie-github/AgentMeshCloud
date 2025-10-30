/**
 * HubSpot Integration Connector for AI-Agent Mesh
 * Enables marketing automation and CRM integration
 * 
 * @module HubSpotConnector
 * @version 1.0.0
 */

import axios from 'axios';

export class HubSpotConnector {
  constructor(config) {
    const { accessToken, apiKey } = config;

    this.accessToken = accessToken;
    this.apiKey = apiKey;
    
    this.client = axios.create({
      baseURL: 'https://api.hubapi.com',
      headers: this.accessToken 
        ? { 'Authorization': `Bearer ${this.accessToken}` }
        : { 'Authorization': `Bearer ${this.apiKey}` },
      timeout: 30000
    });
  }

  // ============ Contacts ============

  /**
   * Create a contact
   * @param {Object} contactData - Contact details
   * @returns {Promise<Object>} Created contact
   */
  async createContact(contactData) {
    const {
      email,
      firstName,
      lastName,
      phone,
      company,
      jobTitle,
      website,
      city,
      state,
      country,
      lifecycleStage,
      leadStatus
    } = contactData;

    try {
      const { data } = await this.client.post('/crm/v3/objects/contacts', {
        properties: {
          email,
          firstname: firstName,
          lastname: lastName,
          phone,
          company,
          jobtitle: jobTitle,
          website,
          city,
          state,
          country,
          lifecyclestage: lifecycleStage,
          hs_lead_status: leadStatus
        }
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update a contact
   * @param {string} contactId - Contact ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(contactId, updates) {
    try {
      const { data } = await this.client.patch(
        `/crm/v3/objects/contacts/${contactId}`,
        { properties: updates }
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get contact by ID
   * @param {string} contactId - Contact ID
   * @param {Array} properties - Properties to retrieve
   * @returns {Promise<Object>} Contact details
   */
  async getContact(contactId, properties = []) {
    try {
      const { data } = await this.client.get(`/crm/v3/objects/contacts/${contactId}`, {
        params: properties.length > 0 ? { properties: properties.join(',') } : {}
      });
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Search contacts
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchContacts(searchParams) {
    try {
      const { data } = await this.client.post('/crm/v3/objects/contacts/search', searchParams);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Companies ============

  /**
   * Create a company
   * @param {Object} companyData - Company details
   * @returns {Promise<Object>} Created company
   */
  async createCompany(companyData) {
    const {
      name,
      domain,
      industry,
      phone,
      city,
      state,
      country,
      numberOfEmployees,
      annualRevenue,
      website,
      description
    } = companyData;

    try {
      const { data } = await this.client.post('/crm/v3/objects/companies', {
        properties: {
          name,
          domain,
          industry,
          phone,
          city,
          state,
          country,
          numberofemployees: numberOfEmployees,
          annualrevenue: annualRevenue,
          website,
          description
        }
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get company by ID
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Company details
   */
  async getCompany(companyId) {
    try {
      const { data } = await this.client.get(`/crm/v3/objects/companies/${companyId}`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Deals ============

  /**
   * Create a deal
   * @param {Object} dealData - Deal details
   * @returns {Promise<Object>} Created deal
   */
  async createDeal(dealData) {
    const {
      dealName,
      dealStage,
      pipeline,
      amount,
      closeDate,
      dealType,
      priority,
      ownerId
    } = dealData;

    try {
      const { data } = await this.client.post('/crm/v3/objects/deals', {
        properties: {
          dealname: dealName,
          dealstage: dealStage,
          pipeline,
          amount,
          closedate: closeDate,
          dealtype: dealType,
          hs_priority: priority,
          hubspot_owner_id: ownerId
        }
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update a deal
   * @param {string} dealId - Deal ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated deal
   */
  async updateDeal(dealId, updates) {
    try {
      const { data } = await this.client.patch(
        `/crm/v3/objects/deals/${dealId}`,
        { properties: updates }
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get deal by ID
   * @param {string} dealId - Deal ID
   * @returns {Promise<Object>} Deal details
   */
  async getDeal(dealId) {
    try {
      const { data } = await this.client.get(`/crm/v3/objects/deals/${dealId}`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Tickets ============

  /**
   * Create a ticket
   * @param {Object} ticketData - Ticket details
   * @returns {Promise<Object>} Created ticket
   */
  async createTicket(ticketData) {
    const {
      subject,
      content,
      priority,
      category,
      status,
      ownerId
    } = ticketData;

    try {
      const { data } = await this.client.post('/crm/v3/objects/tickets', {
        properties: {
          subject,
          content,
          hs_pipeline_stage: status || '1',
          hs_ticket_priority: priority,
          hs_ticket_category: category,
          hubspot_owner_id: ownerId
        }
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update a ticket
   * @param {string} ticketId - Ticket ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated ticket
   */
  async updateTicket(ticketId, updates) {
    try {
      const { data } = await this.client.patch(
        `/crm/v3/objects/tickets/${ticketId}`,
        { properties: updates }
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Associations ============

  /**
   * Associate two records
   * @param {string} fromObjectType - From object type
   * @param {string} fromObjectId - From object ID
   * @param {string} toObjectType - To object type
   * @param {string} toObjectId - To object ID
   * @param {string} associationType - Association type
   * @returns {Promise<Object>} Association result
   */
  async createAssociation(fromObjectType, fromObjectId, toObjectType, toObjectId, associationType) {
    try {
      const { data } = await this.client.put(
        `/crm/v3/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}/${associationType}`
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Engagement (Notes, Emails, Tasks) ============

  /**
   * Create a note
   * @param {Object} noteData - Note details
   * @returns {Promise<Object>} Created note
   */
  async createNote(noteData) {
    const { content, ownerId, timestamp } = noteData;

    try {
      const { data } = await this.client.post('/crm/v3/objects/notes', {
        properties: {
          hs_note_body: content,
          hubspot_owner_id: ownerId,
          hs_timestamp: timestamp || new Date().toISOString()
        }
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a task
   * @param {Object} taskData - Task details
   * @returns {Promise<Object>} Created task
   */
  async createTask(taskData) {
    const {
      subject,
      body,
      status,
      priority,
      taskType,
      ownerId,
      dueDate
    } = taskData;

    try {
      const { data } = await this.client.post('/crm/v3/objects/tasks', {
        properties: {
          hs_task_subject: subject,
          hs_task_body: body,
          hs_task_status: status || 'NOT_STARTED',
          hs_task_priority: priority,
          hs_task_type: taskType,
          hubspot_owner_id: ownerId,
          hs_timestamp: dueDate || new Date().toISOString()
        }
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Workflows ============

  /**
   * Enroll a contact in a workflow
   * @param {string} workflowId - Workflow ID
   * @param {string} contactEmail - Contact email
   * @returns {Promise<Object>} Enrollment result
   */
  async enrollInWorkflow(workflowId, contactEmail) {
    try {
      const { data } = await this.client.post(
        `/automation/v2/workflows/${workflowId}/enrollments/contacts/${contactEmail}`
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Analytics & Reporting ============

  /**
   * Get analytics data
   * @param {Object} analyticsParams - Analytics parameters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(analyticsParams) {
    try {
      const { data } = await this.client.get('/analytics/v2/reports', {
        params: analyticsParams
      });
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Webhooks ============

  /**
   * Verify HubSpot webhook signature
   * @param {string} signature - X-HubSpot-Signature header
   * @param {string} body - Request body
   * @param {string} clientSecret - App client secret
   * @returns {boolean} Is valid
   */
  verifyWebhook(signature, body, clientSecret) {
    const crypto = require('crypto');
    
    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  }

  // ============ Utility Methods ============

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || 'Unknown error';
      return new Error(
        `HubSpot API error (${status}): ${message}`
      );
    }
    return error;
  }

  /**
   * Transform mesh event to HubSpot note
   * @param {Object} meshEvent - AI-Agent Mesh event
   * @returns {Object} HubSpot note data
   */
  transformMeshEventToNote(meshEvent) {
    return {
      hs_note_body: `AI Agent Event: ${meshEvent.event}\n\n${JSON.stringify(meshEvent, null, 2)}`,
      hs_timestamp: meshEvent.timestamp || new Date().toISOString()
    };
  }
}

export default HubSpotConnector;
