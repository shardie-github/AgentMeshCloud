/**
 * License Validator for AI-Agent Mesh
 * Enforces feature gating, usage limits, and license compliance
 * 
 * @module LicenseValidator
 * @version 3.0.0
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export class LicenseValidator {
  constructor(supabaseUrl, supabaseKey, signingSecret) {
    this.db = createClient(supabaseUrl, supabaseKey);
    this.signingSecret = signingSecret;
    this.licenseCache = new Map();
  }

  /**
   * Generate a signed license key for a tenant
   * @param {string} tenantId - Tenant identifier
   * @param {string} tier - License tier
   * @param {Object} options - License options
   * @returns {Promise<Object>} License details
   */
  async generateLicense(tenantId, tier, options = {}) {
    const {
      expiresAt = null,
      features = [],
      maxAgents = null,
      customLimits = {}
    } = options;

    const licenseData = {
      licenseId: `lic_${crypto.randomBytes(16).toString('hex')}`,
      tenantId,
      tier,
      features: this.getFeaturesByTier(tier, features),
      limits: this.getLimitsByTier(tier, customLimits),
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt || this.calculateExpiry(tier),
      version: '3.0.0'
    };

    // Sign the license
    const signature = this.signLicense(licenseData);
    const license = {
      ...licenseData,
      signature
    };

    // Store in database
    await this.db
      .from('licenses')
      .insert({
        license_id: licenseData.licenseId,
        tenant_id: tenantId,
        tier,
        features: licenseData.features,
        limits: licenseData.limits,
        signature,
        issued_at: licenseData.issuedAt,
        expires_at: licenseData.expiresAt,
        status: 'active'
      });

    // Cache the license
    this.licenseCache.set(tenantId, license);

    return license;
  }

  /**
   * Validate license and check feature access
   * @param {string} tenantId - Tenant identifier
   * @param {string} feature - Feature to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateLicense(tenantId, feature = null) {
    // Check cache first
    if (this.licenseCache.has(tenantId)) {
      const license = this.licenseCache.get(tenantId);
      return this.checkLicense(license, feature);
    }

    // Fetch from database
    const { data: license, error } = await this.db
      .from('licenses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();

    if (error || !license) {
      throw new Error('No active license found for tenant');
    }

    // Verify signature
    const isValid = this.verifySignature(license);
    if (!isValid) {
      throw new Error('License signature verification failed');
    }

    // Check expiry
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      throw new Error('License has expired');
    }

    // Cache the license
    this.licenseCache.set(tenantId, license);

    return this.checkLicense(license, feature);
  }

  /**
   * Check if specific feature is enabled
   * @param {Object} license - License object
   * @param {string} feature - Feature name
   * @returns {Object} Feature access result
   */
  checkLicense(license, feature) {
    const result = {
      isValid: true,
      tier: license.tier,
      features: license.features,
      limits: license.limits,
      expiresAt: license.expires_at
    };

    if (feature) {
      result.hasFeature = license.features.includes(feature) || 
                          license.features.includes('all_features');
      
      if (!result.hasFeature) {
        result.upgradeRequired = this.getUpgradePathForFeature(feature, license.tier);
      }
    }

    return result;
  }

  /**
   * Enforce usage limits based on license
   * @param {string} tenantId - Tenant identifier
   * @param {string} resource - Resource type (agents, api_calls, storage)
   * @param {number} requested - Requested amount
   * @returns {Promise<boolean>} Whether request is within limits
   */
  async enforceLimit(tenantId, resource, requested = 1) {
    const license = await this.validateLicense(tenantId);
    const currentUsage = await this.getCurrentUsage(tenantId, resource);
    
    const limit = license.limits[resource];
    
    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, remaining: -1 };
    }

    const newTotal = currentUsage + requested;
    
    if (newTotal > limit) {
      return {
        allowed: false,
        limit,
        current: currentUsage,
        requested,
        exceeded: newTotal - limit,
        upgradeRequired: this.getUpgradePathForResource(resource, license.tier)
      };
    }

    return {
      allowed: true,
      limit,
      current: currentUsage,
      remaining: limit - newTotal
    };
  }

  /**
   * Get features available by tier
   * @param {string} tier - License tier
   * @param {Array} additionalFeatures - Extra features
   * @returns {Array} List of enabled features
   */
  getFeaturesByTier(tier, additionalFeatures = []) {
    const baseFeatures = {
      free: [
        'basic_agents',
        'basic_workflows',
        'community_support',
        'standard_telemetry',
        'basic_policies'
      ],
      pro: [
        'advanced_agents',
        'complex_workflows',
        'priority_support',
        'advanced_telemetry',
        'custom_policies',
        'webhooks',
        'api_access',
        'team_collaboration',
        'audit_logs',
        'data_export'
      ],
      enterprise: [
        'all_features',
        'dedicated_support',
        'sla_guarantee',
        'custom_deployment',
        'advanced_security',
        'sso',
        'compliance_packages',
        'dedicated_instance',
        'white_label',
        'custom_integrations',
        'advanced_analytics',
        'multicloud_deployment'
      ]
    };

    const features = baseFeatures[tier] || baseFeatures.free;
    return [...new Set([...features, ...additionalFeatures])];
  }

  /**
   * Get resource limits by tier
   * @param {string} tier - License tier
   * @param {Object} customLimits - Custom limit overrides
   * @returns {Object} Resource limits
   */
  getLimitsByTier(tier, customLimits = {}) {
    const baseLimits = {
      free: {
        agents: 5,
        apiCallsPerMonth: 10000,
        storageGB: 1,
        teamMembers: 3,
        workflowsPerAgent: 10,
        telemetryRetentionDays: 7,
        customPolicies: 5,
        webhooks: 0,
        dataExports: 1
      },
      pro: {
        agents: 50,
        apiCallsPerMonth: 500000,
        storageGB: 50,
        teamMembers: 25,
        workflowsPerAgent: 100,
        telemetryRetentionDays: 90,
        customPolicies: 50,
        webhooks: 10,
        dataExports: -1
      },
      enterprise: {
        agents: -1,
        apiCallsPerMonth: -1,
        storageGB: 1000,
        teamMembers: -1,
        workflowsPerAgent: -1,
        telemetryRetentionDays: 365,
        customPolicies: -1,
        webhooks: -1,
        dataExports: -1
      }
    };

    const limits = baseLimits[tier] || baseLimits.free;
    return { ...limits, ...customLimits };
  }

  /**
   * Sign license data with HMAC
   * @param {Object} licenseData - License data to sign
   * @returns {string} Signature
   */
  signLicense(licenseData) {
    const payload = JSON.stringify({
      licenseId: licenseData.licenseId,
      tenantId: licenseData.tenantId,
      tier: licenseData.tier,
      issuedAt: licenseData.issuedAt,
      expiresAt: licenseData.expiresAt
    });

    return crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify license signature
   * @param {Object} license - License to verify
   * @returns {boolean} Whether signature is valid
   */
  verifySignature(license) {
    const expectedSignature = this.signLicense(license);
    return crypto.timingSafeEqual(
      Buffer.from(license.signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Revoke a license
   * @param {string} tenantId - Tenant identifier
   * @param {string} reason - Revocation reason
   */
  async revokeLicense(tenantId, reason) {
    await this.db
      .from('licenses')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revocation_reason: reason
      })
      .eq('tenant_id', tenantId);

    // Remove from cache
    this.licenseCache.delete(tenantId);

    return { success: true, reason };
  }

  /**
   * Renew expired license
   * @param {string} tenantId - Tenant identifier
   * @param {number} extensionDays - Days to extend
   */
  async renewLicense(tenantId, extensionDays = 365) {
    const { data: license } = await this.db
      .from('licenses')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + extensionDays);

    await this.db
      .from('licenses')
      .update({
        expires_at: newExpiry.toISOString(),
        status: 'active',
        renewed_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId);

    // Clear cache to force refresh
    this.licenseCache.delete(tenantId);

    return { success: true, expiresAt: newExpiry };
  }

  // Helper methods
  calculateExpiry(tier) {
    const days = tier === 'enterprise' ? 365 : tier === 'pro' ? 30 : 365;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry.toISOString();
  }

  async getCurrentUsage(tenantId, resource) {
    // TODO: Integrate with real-time usage tracking system
    const { data } = await this.db
      .from('usage_metrics')
      .select(resource)
      .eq('tenant_id', tenantId)
      .eq('period_start', this.getCurrentPeriodStart())
      .single();

    return data?.[resource] || 0;
  }

  getCurrentPeriodStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  getUpgradePathForFeature(feature, currentTier) {
    const featureTiers = {
      webhooks: 'pro',
      sso: 'enterprise',
      white_label: 'enterprise',
      advanced_analytics: 'enterprise',
      dedicated_instance: 'enterprise'
    };

    return {
      feature,
      currentTier,
      requiredTier: featureTiers[feature] || 'pro',
      contactSales: featureTiers[feature] === 'enterprise'
    };
  }

  getUpgradePathForResource(resource, currentTier) {
    if (currentTier === 'free') return 'pro';
    if (currentTier === 'pro') return 'enterprise';
    return null;
  }
}

export default LicenseValidator;
