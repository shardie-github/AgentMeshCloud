/**
 * Salesforce Integration Connector for AI-Agent Mesh
 * Enables CRM integration for sales automation and customer management
 * 
 * @module SalesforceConnector
 * @version 1.0.0
 */

import axios from 'axios';

export class SalesforceConnector {
  constructor(config) {
    const {
      instanceUrl,
      accessToken,
      clientId,
      clientSecret,
      username,
      password,
      securityToken,
      apiVersion = 'v59.0'
    } = config;

    this.instanceUrl = instanceUrl;
    this.accessToken = accessToken;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.username = username;
    this.password = password;
    this.securityToken = securityToken;
    this.apiVersion = apiVersion;
    
    if (this.accessToken) {
      this.client = this.createAuthenticatedClient();
    }
  }

  createAuthenticatedClient() {
    return axios.create({
      baseURL: `${this.instanceUrl}/services/data/${this.apiVersion}`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Authenticate with Salesforce using username-password flow
   * @returns {Promise<Object>} Authentication response
   */
  async authenticate() {
    try {
      const { data } = await axios.post(
        `${this.instanceUrl}/services/oauth2/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          username: this.username,
          password: this.password + this.securityToken
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = data.access_token;
      this.instanceUrl = data.instance_url;
      this.client = this.createAuthenticatedClient();

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Opportunities ============

  /**
   * Create an opportunity
   * @param {Object} opportunityData - Opportunity details
   * @returns {Promise<Object>} Created opportunity
   */
  async createOpportunity(opportunityData) {
    const {
      name,
      accountId,
      amount,
      closeDate,
      stageName,
      probability,
      type,
      leadSource,
      description,
      ownerId
    } = opportunityData;

    try {
      const { data } = await this.client.post('/sobjects/Opportunity', {
        Name: name,
        AccountId: accountId,
        Amount: amount,
        CloseDate: closeDate,
        StageName: stageName || 'Prospecting',
        Probability: probability,
        Type: type,
        LeadSource: leadSource,
        Description: description,
        OwnerId: ownerId
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an opportunity
   * @param {string} opportunityId - Opportunity ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  async updateOpportunity(opportunityId, updates) {
    try {
      const { data } = await this.client.patch(
        `/sobjects/Opportunity/${opportunityId}`,
        updates
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get opportunity by ID
   * @param {string} opportunityId - Opportunity ID
   * @returns {Promise<Object>} Opportunity details
   */
  async getOpportunity(opportunityId) {
    try {
      const { data } = await this.client.get(`/sobjects/Opportunity/${opportunityId}`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Query opportunities
   * @param {string} soqlQuery - SOQL query
   * @returns {Promise<Object>} Query results
   */
  async queryOpportunities(soqlQuery) {
    try {
      const { data } = await this.client.get('/query', {
        params: { q: soqlQuery }
      });
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Leads ============

  /**
   * Create a lead
   * @param {Object} leadData - Lead details
   * @returns {Promise<Object>} Created lead
   */
  async createLead(leadData) {
    const {
      firstName,
      lastName,
      company,
      email,
      phone,
      title,
      status,
      leadSource,
      industry,
      rating,
      description
    } = leadData;

    try {
      const { data } = await this.client.post('/sobjects/Lead', {
        FirstName: firstName,
        LastName: lastName,
        Company: company,
        Email: email,
        Phone: phone,
        Title: title,
        Status: status || 'Open - Not Contacted',
        LeadSource: leadSource,
        Industry: industry,
        Rating: rating,
        Description: description
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Convert a lead
   * @param {string} leadId - Lead ID
   * @param {Object} conversionData - Conversion details
   * @returns {Promise<Object>} Conversion result
   */
  async convertLead(leadId, conversionData = {}) {
    const {
      convertedStatus = 'Closed - Converted',
      accountId,
      contactId,
      doNotCreateOpportunity = false,
      opportunityName,
      ownerId,
      sendNotificationEmail = false
    } = conversionData;

    try {
      const { data } = await this.client.post('/actions/standard/convertLead', {
        inputs: [{
          leadId,
          convertedStatus,
          accountId,
          contactId,
          doNotCreateOpportunity,
          opportunityName,
          ownerId,
          sendNotificationEmail
        }]
      });

      return data[0];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get lead by ID
   * @param {string} leadId - Lead ID
   * @returns {Promise<Object>} Lead details
   */
  async getLead(leadId) {
    try {
      const { data } = await this.client.get(`/sobjects/Lead/${leadId}`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Accounts ============

  /**
   * Create an account
   * @param {Object} accountData - Account details
   * @returns {Promise<Object>} Created account
   */
  async createAccount(accountData) {
    const {
      name,
      type,
      industry,
      website,
      phone,
      billingStreet,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
      description,
      ownerId
    } = accountData;

    try {
      const { data } = await this.client.post('/sobjects/Account', {
        Name: name,
        Type: type,
        Industry: industry,
        Website: website,
        Phone: phone,
        BillingStreet: billingStreet,
        BillingCity: billingCity,
        BillingState: billingState,
        BillingPostalCode: billingPostalCode,
        BillingCountry: billingCountry,
        Description: description,
        OwnerId: ownerId
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get account by ID
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Account details
   */
  async getAccount(accountId) {
    try {
      const { data } = await this.client.get(`/sobjects/Account/${accountId}`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Contacts ============

  /**
   * Create a contact
   * @param {Object} contactData - Contact details
   * @returns {Promise<Object>} Created contact
   */
  async createContact(contactData) {
    const {
      firstName,
      lastName,
      accountId,
      email,
      phone,
      title,
      department,
      mailingStreet,
      mailingCity,
      mailingState,
      mailingPostalCode,
      mailingCountry,
      description
    } = contactData;

    try {
      const { data } = await this.client.post('/sobjects/Contact', {
        FirstName: firstName,
        LastName: lastName,
        AccountId: accountId,
        Email: email,
        Phone: phone,
        Title: title,
        Department: department,
        MailingStreet: mailingStreet,
        MailingCity: mailingCity,
        MailingState: mailingState,
        MailingPostalCode: mailingPostalCode,
        MailingCountry: mailingCountry,
        Description: description
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get contact by ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} Contact details
   */
  async getContact(contactId) {
    try {
      const { data } = await this.client.get(`/sobjects/Contact/${contactId}`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Tasks ============

  /**
   * Create a task
   * @param {Object} taskData - Task details
   * @returns {Promise<Object>} Created task
   */
  async createTask(taskData) {
    const {
      subject,
      status,
      priority,
      whatId,
      whoId,
      ownerId,
      activityDate,
      description
    } = taskData;

    try {
      const { data } = await this.client.post('/sobjects/Task', {
        Subject: subject,
        Status: status || 'Not Started',
        Priority: priority || 'Normal',
        WhatId: whatId,
        WhoId: whoId,
        OwnerId: ownerId,
        ActivityDate: activityDate,
        Description: description
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Custom Objects ============

  /**
   * Query any Salesforce object
   * @param {string} soqlQuery - SOQL query
   * @returns {Promise<Object>} Query results
   */
  async query(soqlQuery) {
    try {
      const { data } = await this.client.get('/query', {
        params: { q: soqlQuery }
      });
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a record in any Salesforce object
   * @param {string} objectType - Object API name
   * @param {Object} recordData - Record data
   * @returns {Promise<Object>} Created record
   */
  async createRecord(objectType, recordData) {
    try {
      const { data } = await this.client.post(`/sobjects/${objectType}`, recordData);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update a record in any Salesforce object
   * @param {string} objectType - Object API name
   * @param {string} recordId - Record ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  async updateRecord(objectType, recordId, updates) {
    try {
      const { data } = await this.client.patch(
        `/sobjects/${objectType}/${recordId}`,
        updates
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Utility Methods ============

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.[0]?.message || data?.message || 'Unknown error';
      return new Error(
        `Salesforce API error (${status}): ${message}`
      );
    }
    return error;
  }

  /**
   * Transform mesh event to Salesforce task
   * @param {Object} meshEvent - AI-Agent Mesh event
   * @returns {Object} Salesforce task data
   */
  transformMeshEventToTask(meshEvent) {
    return {
      Subject: meshEvent.description || meshEvent.event,
      Description: JSON.stringify(meshEvent, null, 2),
      Status: 'Not Started',
      Priority: this.mapPriority(meshEvent.severity),
      ActivityDate: new Date().toISOString().split('T')[0]
    };
  }

  mapPriority(severity) {
    const map = {
      'critical': 'High',
      'high': 'High',
      'medium': 'Normal',
      'low': 'Low'
    };
    return map[severity?.toLowerCase()] || 'Normal';
  }
}

export default SalesforceConnector;
