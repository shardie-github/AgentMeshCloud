/**
 * SAP Integration Connector for AI-Agent Mesh
 * Enables ERP integration for enterprise resource planning
 * 
 * @module SAPConnector
 * @version 1.0.0
 */

import axios from 'axios';

export class SAPConnector {
  constructor(config) {
    const {
      baseUrl,
      username,
      password,
      clientId,
      clientSecret,
      apiKey,
      systemId
    } = config;

    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.apiKey = apiKey;
    this.systemId = systemId;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: this.username && this.password ? {
        username: this.username,
        password: this.password
      } : undefined,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.apiKey ? { 'APIKey': this.apiKey } : {})
      },
      timeout: 60000 // SAP can be slower
    });
  }

  // ============ Purchase Orders ============

  /**
   * Create a purchase order
   * @param {Object} poData - Purchase order details
   * @returns {Promise<Object>} Created purchase order
   */
  async createPurchaseOrder(poData) {
    const {
      vendorId,
      purchasingOrganization,
      purchasingGroup,
      companyCode,
      documentType,
      currency,
      items
    } = poData;

    try {
      const { data } = await this.client.post('/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder', {
        Vendor: vendorId,
        PurchasingOrganization: purchasingOrganization,
        PurchasingGroup: purchasingGroup,
        CompanyCode: companyCode,
        DocumentType: documentType || 'NB',
        DocumentCurrency: currency || 'USD',
        to_PurchaseOrderItem: items.map((item, index) => ({
          PurchaseOrderItem: String((index + 1) * 10).padStart(5, '0'),
          Material: item.material,
          PurchaseOrderQuantity: String(item.quantity),
          PurchaseOrderQuantityUnit: item.unit,
          NetPriceAmount: String(item.netPrice),
          Plant: item.plant,
          StorageLocation: item.storageLocation
        }))
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get purchase order
   * @param {string} purchaseOrderId - Purchase order ID
   * @returns {Promise<Object>} Purchase order details
   */
  async getPurchaseOrder(purchaseOrderId) {
    try {
      const { data } = await this.client.get(
        `/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder('${purchaseOrderId}')`
      );
      return data.d || data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update purchase order
   * @param {string} purchaseOrderId - Purchase order ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  async updatePurchaseOrder(purchaseOrderId, updates) {
    try {
      const { data } = await this.client.patch(
        `/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder('${purchaseOrderId}')`,
        updates
      );
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Sales Orders ============

  /**
   * Create a sales order
   * @param {Object} soData - Sales order details
   * @returns {Promise<Object>} Created sales order
   */
  async createSalesOrder(soData) {
    const {
      soldToParty,
      salesOrganization,
      distributionChannel,
      organizationDivision,
      currency,
      items
    } = soData;

    try {
      const { data } = await this.client.post('/API_SALES_ORDER_SRV/A_SalesOrder', {
        SoldToParty: soldToParty,
        SalesOrganization: salesOrganization,
        DistributionChannel: distributionChannel,
        OrganizationDivision: organizationDivision,
        TransactionCurrency: currency || 'USD',
        to_Item: items.map((item, index) => ({
          SalesOrderItem: String((index + 1) * 10),
          Material: item.material,
          RequestedQuantity: String(item.quantity),
          RequestedQuantityUnit: item.unit,
          ItemGrossWeight: item.weight,
          ItemNetWeight: item.netWeight
        }))
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get sales order
   * @param {string} salesOrderId - Sales order ID
   * @returns {Promise<Object>} Sales order details
   */
  async getSalesOrder(salesOrderId) {
    try {
      const { data } = await this.client.get(
        `/API_SALES_ORDER_SRV/A_SalesOrder('${salesOrderId}')`
      );
      return data.d || data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Materials Management ============

  /**
   * Get material master data
   * @param {string} materialId - Material ID
   * @returns {Promise<Object>} Material details
   */
  async getMaterial(materialId) {
    try {
      const { data } = await this.client.get(
        `/API_PRODUCT_SRV/A_Product('${materialId}')`
      );
      return data.d || data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create material master
   * @param {Object} materialData - Material details
   * @returns {Promise<Object>} Created material
   */
  async createMaterial(materialData) {
    const {
      product,
      productType,
      productGroup,
      baseUnit,
      description,
      grossWeight,
      netWeight,
      weightUnit
    } = materialData;

    try {
      const { data } = await this.client.post('/API_PRODUCT_SRV/A_Product', {
        Product: product,
        ProductType: productType,
        ProductGroup: productGroup,
        BaseUnit: baseUnit,
        ProductDescription: description,
        GrossWeight: grossWeight,
        NetWeight: netWeight,
        WeightUnit: weightUnit
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get material stock
   * @param {string} materialId - Material ID
   * @param {string} plant - Plant code
   * @returns {Promise<Object>} Stock levels
   */
  async getMaterialStock(materialId, plant) {
    try {
      const { data } = await this.client.get('/API_MATERIAL_STOCK_SRV/A_MaterialStock', {
        params: {
          $filter: `Material eq '${materialId}' and Plant eq '${plant}'`
        }
      });
      return data.d?.results || data.value || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Business Partners ============

  /**
   * Create business partner
   * @param {Object} bpData - Business partner details
   * @returns {Promise<Object>} Created business partner
   */
  async createBusinessPartner(bpData) {
    const {
      businessPartnerCategory,
      businessPartnerName,
      businessPartnerFullName,
      organizationName,
      address
    } = bpData;

    try {
      const { data } = await this.client.post('/API_BUSINESS_PARTNER/A_BusinessPartner', {
        BusinessPartnerCategory: businessPartnerCategory,
        BusinessPartnerName: businessPartnerName,
        BusinessPartnerFullName: businessPartnerFullName,
        OrganizationBPName1: organizationName,
        to_BusinessPartnerAddress: address ? [{
          StreetName: address.street,
          CityName: address.city,
          Region: address.region,
          PostalCode: address.postalCode,
          Country: address.country
        }] : []
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get business partner
   * @param {string} businessPartnerId - Business partner ID
   * @returns {Promise<Object>} Business partner details
   */
  async getBusinessPartner(businessPartnerId) {
    try {
      const { data } = await this.client.get(
        `/API_BUSINESS_PARTNER/A_BusinessPartner('${businessPartnerId}')`
      );
      return data.d || data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Financial Accounting ============

  /**
   * Get general ledger account
   * @param {string} glAccount - GL account number
   * @param {string} companyCode - Company code
   * @returns {Promise<Object>} GL account details
   */
  async getGLAccount(glAccount, companyCode) {
    try {
      const { data } = await this.client.get(
        `/API_FINANCIALACCOUNTING_GL_SRV/A_GLAccountInChartOfAccounts`,
        {
          params: {
            $filter: `GLAccount eq '${glAccount}' and ChartOfAccounts eq '${companyCode}'`
          }
        }
      );
      return data.d?.results?.[0] || data.value?.[0] || null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Post financial document
   * @param {Object} docData - Document details
   * @returns {Promise<Object>} Posted document
   */
  async postFinancialDocument(docData) {
    const {
      companyCode,
      documentDate,
      postingDate,
      documentType,
      currency,
      items
    } = docData;

    try {
      const { data } = await this.client.post('/API_JOURNALENTRY_SRV/A_JournalEntry', {
        CompanyCode: companyCode,
        DocumentDate: documentDate,
        PostingDate: postingDate,
        DocumentType: documentType,
        DocumentCurrency: currency,
        to_JournalEntryItem: items.map((item, index) => ({
          JournalEntryItemLineNumber: String(index + 1),
          GLAccount: item.glAccount,
          AmountInTransactionCurrency: String(item.amount),
          DebitCreditCode: item.debitCredit
        }))
      });

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ OData Query ============

  /**
   * Execute OData query
   * @param {string} entitySet - Entity set name
   * @param {Object} queryOptions - OData query options
   * @returns {Promise<Object>} Query results
   */
  async query(entitySet, queryOptions = {}) {
    try {
      const { data } = await this.client.get(entitySet, {
        params: queryOptions
      });
      return data.d?.results || data.value || data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ Utility Methods ============

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.error?.message?.value || data?.error?.message || 'Unknown error';
      return new Error(
        `SAP API error (${status}): ${message}`
      );
    }
    return error;
  }

  /**
   * Transform mesh event to SAP notification
   * @param {Object} meshEvent - AI-Agent Mesh event
   * @returns {Object} SAP notification data
   */
  transformMeshEventToNotification(meshEvent) {
    return {
      NotificationType: 'M1',
      NotificationText: meshEvent.description || meshEvent.event,
      Priority: this.mapPriority(meshEvent.severity),
      ReportedBy: meshEvent.userId || 'SYSTEM'
    };
  }

  mapPriority(severity) {
    const map = {
      'critical': '1',
      'high': '2',
      'medium': '3',
      'low': '4'
    };
    return map[severity?.toLowerCase()] || '3';
  }
}

export default SAPConnector;
