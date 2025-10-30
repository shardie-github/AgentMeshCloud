/**
 * Mesh OS Partner SDK - JavaScript/Node.js
 * 
 * Provides programmatic access to partner portal functionality
 */

import https from 'https';
import { createHash, randomBytes } from 'crypto';

class MeshOSPartnerSDK {
  constructor(apiKey, partnerId, options = {}) {
    this.apiKey = apiKey;
    this.partnerId = partnerId;
    this.baseUrl = options.baseUrl || 'https://partner-api.meshos.io';
    this.version = 'v1';
    this.timeout = options.timeout || 30000;
  }

  /**
   * Deploy a new tenant instance
   */
  async deployTenant(config) {
    const {
      name,
      region = 'us-east-1',
      plan = 'professional',
      domain = null,
      branding = {}
    } = config;

    return this._request('POST', '/tenants', {
      name,
      region,
      plan,
      domain,
      branding,
      partnerId: this.partnerId
    });
  }

  /**
   * Get tenant details
   */
  async getTenant(tenantId) {
    return this._request('GET', `/tenants/${tenantId}`);
  }

  /**
   * List all partner tenants
   */
  async listTenants(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this._request('GET', `/tenants?${query}`);
  }

  /**
   * Update tenant configuration
   */
  async updateTenant(tenantId, updates) {
    return this._request('PATCH', `/tenants/${tenantId}`, updates);
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId, reason) {
    return this._request('POST', `/tenants/${tenantId}/suspend`, { reason });
  }

  /**
   * Resume tenant
   */
  async resumeTenant(tenantId) {
    return this._request('POST', `/tenants/${tenantId}/resume`);
  }

  /**
   * Delete tenant
   */
  async deleteTenant(tenantId) {
    return this._request('DELETE', `/tenants/${tenantId}`);
  }

  /**
   * Issue license
   */
  async issueLicense(tenantId, licenseConfig) {
    return this._request('POST', `/licenses`, {
      tenantId,
      ...licenseConfig
    });
  }

  /**
   * Revoke license
   */
  async revokeLicense(licenseKey) {
    return this._request('DELETE', `/licenses/${licenseKey}`);
  }

  /**
   * Update tenant branding
   */
  async updateBranding(tenantId, branding) {
    return this._request('PUT', `/tenants/${tenantId}/branding`, branding);
  }

  /**
   * Get partner metrics
   */
  async getMetrics(period = 'current_month') {
    return this._request('GET', `/metrics?period=${period}`);
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(tenantId, startDate, endDate) {
    return this._request('GET', `/tenants/${tenantId}/usage`, {
      startDate,
      endDate
    });
  }

  /**
   * Get billing information
   */
  async getBilling(tenantId) {
    return this._request('GET', `/tenants/${tenantId}/billing`);
  }

  /**
   * Generate invoice
   */
  async generateInvoice(tenantId, period) {
    return this._request('POST', `/tenants/${tenantId}/invoices`, { period });
  }

  /**
   * List webhooks
   */
  async listWebhooks() {
    return this._request('GET', '/webhooks');
  }

  /**
   * Create webhook
   */
  async createWebhook(config) {
    return this._request('POST', '/webhooks', config);
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    return this._request('DELETE', `/webhooks/${webhookId}`);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = createHash('sha256')
      .update(`${payload}${secret}`)
      .digest('hex');
    
    return signature === expectedSignature;
  }

  /**
   * Get available regions
   */
  async getRegions() {
    return this._request('GET', '/regions');
  }

  /**
   * Get available plans
   */
  async getPlans() {
    return this._request('GET', '/plans');
  }

  /**
   * Internal request handler
   */
  async _request(method, path, data = null) {
    const url = `${this.baseUrl}/${this.version}${path}`;
    
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Partner-ID': this.partnerId,
        'Content-Type': 'application/json',
        'User-Agent': 'MeshOS-Partner-SDK-JS/1.0.0'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject(new Error(response.error || 'Request failed'));
            }
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(this.timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }
}

export default MeshOSPartnerSDK;

// Example usage
export const example = async () => {
  const sdk = new MeshOSPartnerSDK('your-api-key', 'your-partner-id');

  try {
    // Deploy new tenant
    const tenant = await sdk.deployTenant({
      name: 'Acme Corp',
      region: 'us-east-1',
      plan: 'enterprise',
      branding: {
        primaryColor: '#FF6B6B',
        companyName: 'Acme Corporation'
      }
    });

    console.log('Tenant deployed:', tenant.id);

    // Issue license
    const license = await sdk.issueLicense(tenant.id, {
      type: 'enterprise',
      duration: 365,
      features: ['multi-region', 'sso', 'advanced-analytics']
    });

    console.log('License issued:', license.key);

    // Get metrics
    const metrics = await sdk.getMetrics();
    console.log('MRR:', metrics.revenue.mrr);

  } catch (error) {
    console.error('SDK Error:', error.message);
  }
};
