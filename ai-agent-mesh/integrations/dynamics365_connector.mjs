/**
 * Microsoft Dynamics 365 Integration Connector for AI-Agent Mesh
 * Enables CRM and ERP integration with Dynamics 365
 * 
 * @module Dynamics365Connector
 * @version 1.0.0
 */

import axios from 'axios';

export class Dynamics365Connector {
  constructor(config) {
    const {
      instanceUrl,
      tenantId,
      clientId,
      clientSecret,
      accessToken,
      apiVersion = '9.2'
    } = config;

    this.instanceUrl = instanceUrl.replace(/\/$/, '');
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;
    
    if (this.accessToken) {
      this.client = this.createAuthenticatedClient();
    }
  }

  createAuthenticatedClient() {
    return axios.create({
      baseURL: `${this.instanceUrl}/api/data/v${this.apiVersion}`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      },
      timeout: 30000
    });
  }

  /**
   * Authenticate with Dynamics 365 using client credentials
   * @returns {Promise<Object>} Authentication response
   */
  async authenticate() {
    try {
      const { data } = await axios.post(
        `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: `${this.instanceUrl}/.default`,
          grant_type: 'client_credentials'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = data.access_token;
      this.client = this.createAuthenticatedClient();

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
      accountNumber,
      telephone1,
      emailAddress1,
      websiteUrl,
      industryCode,
      address1_line1,
      address1_city,
      address1_stateOrProvince,
      address1_postalCode,
      address1_country,
      numberOfEmployees,
      revenue,
      ownerId
    } = accountData;

    try {
      const { data, headers } = await this.client.post('/accounts', {
        name,
        accountnumber: accountNumber,
        telephone1,
        emailaddress1: emailAddress1,
        websiteurl: websiteUrl,
        industrycode: industryCode,
        address1_line1,
        address1_city,
        address1_stateorprovince: address1_stateOrProvince,
        address1_postalcode: address1_postalCode,
        address1_country,
        numberofemployees: numberOfEmployees,
        revenue,
        'ownerid@odata.bind': ownerId ? `/systemusers(${ownerId})` : undefined
      });

      // Extract ID from location header
      const id = headers['odata-entityid']?.match(/\(([^)]+)\)/)?.[1];
      return { id, ...data };
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
      const { data } = await this.client.get(`/accounts(${accountId})`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an account
   * @param {string} accountId - Account ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>} Update result
   */
  async updateAccount(accountId, updates) {
    try {
      await this.client.patch(`/accounts(${accountId})`, updates);
      return { success: true };
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
      emailAddress1,
      telephone1,
      mobilePhone,
      jobTitle,
      address1_line1,
      address1_city,
      address1_stateOrProvince,
      address1_postalCode,
      address1_country,
      parentCustomerId,
      ownerId
    } = contactData;

    try {
      const { data, headers } = await this.client.post('/contacts', {
        firstname: firstName,
        lastname: lastName,
        emailaddress1: emailAddress1,
        telephone1,
        mobilephone: mobilePhone,
        jobtitle: jobTitle,
        address1_line1,
        address1_city,
        address1_stateorprovince: address1_stateOrProvince,
        address1_postalcode: address1_postalCode,
        address1_country,
        'parentcustomerid_account@odata.bind': parentCustomerId ? `/accounts(${parentCustomerId})` : undefined,
        'ownerid@odata.bind': ownerId ? `/systemusers(${ownerId})` : undefined
      });

      const id = headers['odata-entityid']?.match(/\(([^)]+)\)/)?.[1];
      return { id, ...data };
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
      const { data } = await this.client.get(`/contacts(${contactId})`);
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
      customerId,
      estimatedValue,
      estimatedCloseDate,
      actualValue,
      actualCloseDate,
      probability,
      rating,
      salesStage,
      description,
      ownerId
    } = opportunityData;

    try {
      const { data, headers } = await this.client.post('/opportunities', {
        name,
        'customerid_account@odata.bind': customerId ? `/accounts(${customerId})` : undefined,
        estimatedvalue: estimatedValue,
        estimatedclosedate: estimatedCloseDate,
        actualvalue: actualValue,
        actualclosedate: actualCloseDate,
        closeprobability: probability,
        opportunityratingcode: rating,
        salesstagecode: salesStage,
        description,
        'ownerid@odata.bind': ownerId ? `/systemusers(${ownerId})` : undefined
      });

      const id = headers['odata-entityid']?.match(/\(([^)]+)\)/)?.[1];
      return { id, ...data };
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
      const { data } = await this.client.get(`/opportunities(${opportunityId})`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an opportunity
   * @param {string} opportunityId - Opportunity ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>} Update result
   */
  async updateOpportunity(opportunityId, updates) {
    try {
      await this.client.patch(`/opportunities(${opportunityId})`, updates);
      return { success: true };
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
      subject,
      firstName,
      lastName,
      companyName,
      emailAddress1,
      telephone1,
      jobTitle,
      industryCode,
      leadSourceCode,
      ownerId
    } = leadData;

    try {
      const { data, headers } = await this.client.post('/leads', {
        subject,
        firstname: firstName,
        lastname: lastName,
        companyname: companyName,
        emailaddress1: emailAddress1,
        telephone1,
        jobtitle: jobTitle,
        industrycode: industryCode,
        leadsourcecode: leadSourceCode,
        'ownerid@odata.bind': ownerId ? `/systemusers(${ownerId})` : undefined
      });

      const id = headers['odata-entityid']?.match(/\(([^)]+)\)/)?.[1];
      return { id, ...data };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Qualify a lead
   * @param {string} leadId - Lead ID
   * @param {Object} qualifyData - Qualification details
   * @returns {Promise<Object>} Qualification result
   */
  async qualifyLead(leadId, qualifyData = {}) {
    const {
      createAccount = true,
      createContact = true,
      createOpportunity = true,
      opportunityCustomerId,
      opportunityCurrencyId,
      sourceProcessCode
    } = qualifyData;

    try {
      const { data } = await this.client.post(`/leads(${leadId})/Microsoft.Dynamics.CRM.QualifyLead`, {
        CreateAccount: createAccount,
        CreateContact: createContact,
        CreateOpportunity: createOpportunity,
        OpportunityCustomerId: opportunityCustomerId,
        OpportunityCurrencyId: opportunityCurrencyId,
        SourceCampaignId: null,
        Status: 3, // Qualified
        SourceProcessCode: sourceProcessCode || 0
      });

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
      description,
      priorityCode,
      scheduledStart,
      scheduledEnd,
      regardingObjectId,
      regardingObjectType,
      ownerId
    } = taskData;

    try {
      const { data, headers } = await this.client.post('/tasks', {
        subject,
        description,
        prioritycode: priorityCode,
        scheduledstart: scheduledStart,
        scheduledend: scheduledEnd,
        [`regardingobjectid_${regardingObjectType}@odata.bind`]: regardingObjectId 
          ? `/${regardingObjectType}s(${regardingObjectId})` 
          : undefined,
        'ownerid@odata.bind': ownerId ? `/systemusers(${ownerId})` : undefined
      });

      const id = headers['odata-entityid']?.match(/\(([^)]+)\)/)?.[1];
      return { id, ...data };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Incidents (Cases) ============

  /**
   * Create an incident (case)
   * @param {Object} incidentData - Incident details
   * @returns {Promise<Object>} Created incident
   */
  async createIncident(incidentData) {
    const {
      title,
      description,
      customerId,
      priorityCode,
      caseTypeCode,
      caseOriginCode,
      ownerId
    } = incidentData;

    try {
      const { data, headers } = await this.client.post('/incidents', {
        title,
        description,
        'customerid_account@odata.bind': customerId ? `/accounts(${customerId})` : undefined,
        prioritycode: priorityCode,
        casetypecode: caseTypeCode,
        caseorigincode: caseOriginCode,
        'ownerid@odata.bind': ownerId ? `/systemusers(${ownerId})` : undefined
      });

      const id = headers['odata-entityid']?.match(/\(([^)]+)\)/)?.[1];
      return { id, ...data };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Query ============

  /**
   * Execute FetchXML query
   * @param {string} entityName - Entity name
   * @param {string} fetchXml - FetchXML query
   * @returns {Promise<Object>} Query results
   */
  async queryFetchXml(entityName, fetchXml) {
    try {
      const { data } = await this.client.get(`/${entityName}`, {
        params: {
          fetchXml: fetchXml
        }
      });
      return data.value || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Execute OData query
   * @param {string} entityName - Entity name
   * @param {Object} queryOptions - OData query options ($filter, $select, etc.)
   * @returns {Promise<Array>} Query results
   */
  async query(entityName, queryOptions = {}) {
    try {
      const { data } = await this.client.get(`/${entityName}`, {
        params: queryOptions
      });
      return data.value || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Custom Actions ============

  /**
   * Execute a custom action
   * @param {string} actionName - Action name
   * @param {Object} parameters - Action parameters
   * @param {string} entitySetName - Entity set name (optional)
   * @param {string} entityId - Entity ID (optional)
   * @returns {Promise<Object>} Action result
   */
  async executeAction(actionName, parameters = {}, entitySetName = null, entityId = null) {
    try {
      const url = entitySetName && entityId
        ? `/${entitySetName}(${entityId})/Microsoft.Dynamics.CRM.${actionName}`
        : `/Microsoft.Dynamics.CRM.${actionName}`;

      const { data } = await this.client.post(url, parameters);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Utility Methods ============

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.error?.message || 'Unknown error';
      return new Error(
        `Dynamics 365 API error (${status}): ${message}`
      );
    }
    return error;
  }

  /**
   * Transform mesh event to Dynamics task
   * @param {Object} meshEvent - AI-Agent Mesh event
   * @returns {Object} Dynamics task data
   */
  transformMeshEventToTask(meshEvent) {
    return {
      subject: meshEvent.description || meshEvent.event,
      description: JSON.stringify(meshEvent, null, 2),
      prioritycode: this.mapPriority(meshEvent.severity),
      scheduledstart: new Date().toISOString(),
      scheduledend: new Date(Date.now() + 86400000).toISOString() // +1 day
    };
  }

  mapPriority(severity) {
    const map = {
      'critical': 0, // High
      'high': 0,
      'medium': 1, // Normal
      'low': 2 // Low
    };
    return map[severity?.toLowerCase()] ?? 1;
  }
}

export default Dynamics365Connector;
