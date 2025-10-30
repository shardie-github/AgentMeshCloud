/**
 * Oracle ERP Cloud Integration Connector for AI-Agent Mesh
 * Enables Oracle Fusion ERP integration
 * 
 * @module OracleERPConnector
 * @version 1.0.0
 */

import axios from 'axios';

export class OracleERPConnector {
  constructor(config) {
    const {
      baseUrl,
      username,
      password,
      clientId,
      clientSecret
    } = config;

    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: this.username,
        password: this.password
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 60000
    });
  }

  // ============ Sales Orders ============

  /**
   * Create a sales order
   * @param {Object} orderData - Sales order details
   * @returns {Promise<Object>} Created sales order
   */
  async createSalesOrder(orderData) {
    const {
      customerId,
      orderNumber,
      orderType,
      orderDate,
      requestedShipDate,
      currency,
      lines
    } = orderData;

    try {
      const { data } = await this.client.post('/fscmRestApi/resources/11.13.18.05/salesOrders', {
        BuyingPartyId: customerId,
        OrderNumber: orderNumber,
        OrderTypeCode: orderType || 'Standard',
        OrderedDate: orderDate || new Date().toISOString(),
        RequestedShipDate: requestedShipDate,
        TransactionCurrencyCode: currency || 'USD',
        lines: lines.map(line => ({
          ProductNumber: line.itemNumber,
          OrderedQuantity: line.quantity,
          OrderedUOM: line.unitOfMeasure,
          UnitSellingPrice: line.unitPrice
        }))
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get sales order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Sales order details
   */
  async getSalesOrder(orderId) {
    try {
      const { data } = await this.client.get(
        `/fscmRestApi/resources/11.13.18.05/salesOrders/${orderId}`
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update sales order
   * @param {string} orderId - Order ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated order
   */
  async updateSalesOrder(orderId, updates) {
    try {
      const { data } = await this.client.patch(
        `/fscmRestApi/resources/11.13.18.05/salesOrders/${orderId}`,
        updates
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Purchase Orders ============

  /**
   * Create a purchase order
   * @param {Object} poData - Purchase order details
   * @returns {Promise<Object>} Created purchase order
   */
  async createPurchaseOrder(poData) {
    const {
      supplierId,
      buyerId,
      currency,
      description,
      lines
    } = poData;

    try {
      const { data } = await this.client.post('/fscmRestApi/resources/11.13.18.05/purchaseOrders', {
        SupplierId: supplierId,
        BuyerId: buyerId,
        CurrencyCode: currency || 'USD',
        Description: description,
        lines: lines.map(line => ({
          ItemDescription: line.itemDescription,
          Quantity: line.quantity,
          UnitOfMeasure: line.unitOfMeasure,
          Price: line.unitPrice
        }))
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get purchase order
   * @param {string} poId - Purchase order ID
   * @returns {Promise<Object>} Purchase order details
   */
  async getPurchaseOrder(poId) {
    try {
      const { data } = await this.client.get(
        `/fscmRestApi/resources/11.13.18.05/purchaseOrders/${poId}`
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Invoices ============

  /**
   * Create an invoice
   * @param {Object} invoiceData - Invoice details
   * @returns {Promise<Object>} Created invoice
   */
  async createInvoice(invoiceData) {
    const {
      supplierId,
      supplierSiteId,
      invoiceNumber,
      invoiceAmount,
      invoiceDate,
      invoiceCurrency,
      lines
    } = invoiceData;

    try {
      const { data } = await this.client.post('/fscmRestApi/resources/11.13.18.05/invoices', {
        SupplierId: supplierId,
        SupplierSiteId: supplierSiteId,
        InvoiceNumber: invoiceNumber,
        InvoiceAmount: invoiceAmount,
        InvoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
        InvoiceCurrency: invoiceCurrency || 'USD',
        lines: lines.map(line => ({
          LineNumber: line.lineNumber,
          LineAmount: line.lineAmount,
          Description: line.description
        }))
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Invoice details
   */
  async getInvoice(invoiceId) {
    try {
      const { data } = await this.client.get(
        `/fscmRestApi/resources/11.13.18.05/invoices/${invoiceId}`
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Customers ============

  /**
   * Create a customer account
   * @param {Object} customerData - Customer details
   * @returns {Promise<Object>} Created customer
   */
  async createCustomer(customerData) {
    const {
      partyName,
      organizationName,
      taxPayerId,
      address,
      contact
    } = customerData;

    try {
      const { data } = await this.client.post('/crmRestApi/resources/11.13.18.05/accounts', {
        PartyName: partyName,
        OrganizationName: organizationName,
        TaxpayerIdentificationNumber: taxPayerId,
        PrimaryAddress: address ? {
          Address1: address.line1,
          City: address.city,
          State: address.state,
          PostalCode: address.postalCode,
          Country: address.country
        } : undefined,
        PrimaryContact: contact ? {
          FirstName: contact.firstName,
          LastName: contact.lastName,
          EmailAddress: contact.email,
          PhoneNumber: contact.phone
        } : undefined
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get customer account
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Customer details
   */
  async getCustomer(customerId) {
    try {
      const { data } = await this.client.get(
        `/crmRestApi/resources/11.13.18.05/accounts/${customerId}`
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Suppliers ============

  /**
   * Create a supplier
   * @param {Object} supplierData - Supplier details
   * @returns {Promise<Object>} Created supplier
   */
  async createSupplier(supplierData) {
    const {
      supplierName,
      taxOrganizationType,
      address,
      contact
    } = supplierData;

    try {
      const { data } = await this.client.post('/fscmRestApi/resources/11.13.18.05/suppliers', {
        Supplier: supplierName,
        TaxOrganizationType: taxOrganizationType,
        addresses: address ? [{
          AddressLine1: address.line1,
          City: address.city,
          State: address.state,
          PostalCode: address.postalCode,
          Country: address.country
        }] : [],
        contacts: contact ? [{
          FirstName: contact.firstName,
          LastName: contact.lastName,
          EmailAddress: contact.email,
          PhoneNumber: contact.phone
        }] : []
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get supplier
   * @param {string} supplierId - Supplier ID
   * @returns {Promise<Object>} Supplier details
   */
  async getSupplier(supplierId) {
    try {
      const { data } = await this.client.get(
        `/fscmRestApi/resources/11.13.18.05/suppliers/${supplierId}`
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Items/Products ============

  /**
   * Get item details
   * @param {string} itemNumber - Item number
   * @returns {Promise<Object>} Item details
   */
  async getItem(itemNumber) {
    try {
      const { data } = await this.client.get('/fscmRestApi/resources/11.13.18.05/items', {
        params: {
          q: `ItemNumber=${itemNumber}`
        }
      });
      return data.items?.[0] || null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Inventory ============

  /**
   * Get item quantity
   * @param {string} itemNumber - Item number
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Quantity details
   */
  async getItemQuantity(itemNumber, organizationId) {
    try {
      const { data } = await this.client.get('/fscmRestApi/resources/11.13.18.05/itemQuantities', {
        params: {
          q: `ItemNumber=${itemNumber};OrganizationId=${organizationId}`
        }
      });
      return data.items || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ General Ledger ============

  /**
   * Create journal entry
   * @param {Object} journalData - Journal entry details
   * @returns {Promise<Object>} Created journal
   */
  async createJournalEntry(journalData) {
    const {
      ledgerId,
      journalName,
      journalDescription,
      accountingDate,
      currency,
      lines
    } = journalData;

    try {
      const { data } = await this.client.post('/fscmRestApi/resources/11.13.18.05/journals', {
        LedgerId: ledgerId,
        Name: journalName,
        Description: journalDescription,
        AccountingDate: accountingDate,
        CurrencyCode: currency,
        lines: lines.map(line => ({
          LineNumber: line.lineNumber,
          AccountCombination: line.accountCombination,
          EnteredDebit: line.debit || 0,
          EnteredCredit: line.credit || 0,
          Description: line.description
        }))
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ REST Query ============

  /**
   * Execute REST query
   * @param {string} resource - Resource path
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} Query results
   */
  async query(resource, queryParams = {}) {
    try {
      const { data } = await this.client.get(resource, {
        params: queryParams
      });
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Utility Methods ============

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.detail || data?.title || 'Unknown error';
      return new Error(
        `Oracle ERP API error (${status}): ${message}`
      );
    }
    return error;
  }

  /**
   * Transform mesh event to Oracle notification
   * @param {Object} meshEvent - AI-Agent Mesh event
   * @returns {Object} Oracle notification data
   */
  transformMeshEventToNotification(meshEvent) {
    return {
      Subject: meshEvent.description || meshEvent.event,
      Body: JSON.stringify(meshEvent, null, 2),
      Priority: this.mapPriority(meshEvent.severity),
      Category: 'AI Agent Event'
    };
  }

  mapPriority(severity) {
    const map = {
      'critical': 'High',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    return map[severity?.toLowerCase()] || 'Medium';
  }
}

export default OracleERPConnector;
