/**
 * AI Governance Marketplace API
 * Enables discovery, installation, and contribution of governance policies
 * 
 * @module MarketplaceAPI
 * @version 3.0.0
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export class MarketplaceAPI {
  constructor(supabaseUrl, supabaseKey) {
    this.db = createClient(supabaseUrl, supabaseKey);
    this.cache = new Map();
  }

  // ============ Policy Discovery ============

  /**
   * Browse marketplace policies
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Matching policies
   */
  async browsePolicies(filters = {}) {
    const {
      category,
      framework,
      tags = [],
      search,
      verified = null,
      sortBy = 'downloads',
      limit = 50,
      offset = 0
    } = filters;

    let query = this.db
      .from('marketplace_policies')
      .select('*')
      .eq('status', 'published')
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (framework) {
      query = query.eq('framework', framework);
    }

    if (verified !== null) {
      query = query.eq('verified', verified);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }

    // Apply sorting
    const sortMap = {
      downloads: 'downloads.desc',
      rating: 'rating.desc',
      recent: 'last_updated.desc',
      name: 'name.asc'
    };
    query = query.order(sortMap[sortBy] || sortMap.downloads);

    const { data, error } = await query;

    if (error) throw error;

    return data;
  }

  /**
   * Search policies with advanced filters
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async searchPolicies(query, options = {}) {
    const {
      frameworks = [],
      categories = [],
      minRating = 0,
      verifiedOnly = false
    } = options;

    const { data, error } = await this.db
      .rpc('search_marketplace_policies', {
        search_query: query,
        frameworks_filter: frameworks,
        categories_filter: categories,
        min_rating: minRating,
        verified_only: verifiedOnly
      });

    if (error) throw error;

    return data;
  }

  /**
   * Get policy details
   * @param {string} policyId - Policy ID
   * @returns {Promise<Object>} Policy details
   */
  async getPolicy(policyId) {
    // Check cache first
    if (this.cache.has(policyId)) {
      return this.cache.get(policyId);
    }

    const { data, error } = await this.db
      .from('marketplace_policies')
      .select('*, author:authors(*), reviews:policy_reviews(*)')
      .eq('id', policyId)
      .single();

    if (error) throw error;

    // Cache the result
    this.cache.set(policyId, data);

    return data;
  }

  /**
   * Get featured policies
   * @returns {Promise<Array>} Featured policies
   */
  async getFeaturedPolicies() {
    const { data, error } = await this.db
      .from('marketplace_policies')
      .select('*')
      .eq('featured', true)
      .eq('status', 'published')
      .order('downloads', { ascending: false })
      .limit(10);

    if (error) throw error;

    return data;
  }

  // ============ Policy Installation ============

  /**
   * Install policy to agent
   * @param {string} policyId - Policy ID
   * @param {string} agentId - Agent ID
   * @param {Object} customization - Policy customization
   * @returns {Promise<Object>} Installation result
   */
  async installPolicy(policyId, agentId, customization = {}) {
    // Get policy details
    const policy = await this.getPolicy(policyId);

    // Verify compatibility
    await this.verifyCompatibility(policy, agentId);

    // Apply customizations to policy rules
    const customizedRules = this.applyCustomization(policy.rules, customization);

    // Create policy instance
    const { data: installation, error } = await this.db
      .from('policy_installations')
      .insert({
        policy_id: policyId,
        agent_id: agentId,
        version: policy.version,
        rules: customizedRules,
        installed_at: new Date().toISOString(),
        customizations: customization
      })
      .select()
      .single();

    if (error) throw error;

    // Increment download counter
    await this.incrementDownloads(policyId);

    // Track installation analytics
    await this.trackInstallation(policyId, agentId);

    return installation;
  }

  /**
   * Uninstall policy from agent
   * @param {string} installationId - Installation ID
   */
  async uninstallPolicy(installationId) {
    const { error } = await this.db
      .from('policy_installations')
      .update({
        status: 'uninstalled',
        uninstalled_at: new Date().toISOString()
      })
      .eq('id', installationId);

    if (error) throw error;

    return { success: true };
  }

  /**
   * Update installed policy
   * @param {string} installationId - Installation ID
   * @param {string} newVersion - New policy version
   */
  async updatePolicy(installationId, newVersion) {
    const { data: installation } = await this.db
      .from('policy_installations')
      .select('*, policy:marketplace_policies(*)')
      .eq('id', installationId)
      .single();

    const newPolicy = await this.db
      .from('marketplace_policies')
      .select('*')
      .eq('id', installation.policy_id)
      .eq('version', newVersion)
      .single();

    // Apply update
    const { error } = await this.db
      .from('policy_installations')
      .update({
        version: newVersion,
        rules: newPolicy.data.rules,
        updated_at: new Date().toISOString()
      })
      .eq('id', installationId);

    if (error) throw error;

    return { success: true, version: newVersion };
  }

  // ============ Policy Contribution ============

  /**
   * Submit new policy to marketplace
   * @param {Object} policyData - Policy information
   * @returns {Promise<Object>} Submission result
   */
  async submitPolicy(policyData) {
    const {
      name,
      description,
      category,
      framework,
      rules,
      documentation,
      tags,
      authorId,
      license = 'MIT'
    } = policyData;

    // Validate policy structure
    this.validatePolicyStructure(rules);

    // Generate unique ID
    const policyId = `policy_${crypto.randomBytes(16).toString('hex')}`;

    // Create policy draft
    const { data, error } = await this.db
      .from('marketplace_policies')
      .insert({
        id: policyId,
        name,
        description,
        category,
        framework,
        rules,
        documentation,
        tags,
        author_id: authorId,
        license,
        version: '1.0.0',
        status: 'pending_review',
        submitted_at: new Date().toISOString(),
        downloads: 0,
        rating: 0
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger review workflow
    await this.triggerReviewProcess(policyId);

    return data;
  }

  /**
   * Update existing policy
   * @param {string} policyId - Policy ID
   * @param {Object} updates - Policy updates
   */
  async updateMarketplacePolicy(policyId, updates) {
    const { version, rules, description, documentation } = updates;

    // Increment version
    const newVersion = this.incrementVersion(version);

    const { data, error } = await this.db
      .from('marketplace_policies')
      .update({
        version: newVersion,
        rules: rules || undefined,
        description: description || undefined,
        documentation: documentation || undefined,
        last_updated: new Date().toISOString(),
        status: 'pending_review'
      })
      .eq('id', policyId)
      .select()
      .single();

    if (error) throw error;

    // Notify subscribers of update
    await this.notifySubscribers(policyId, newVersion);

    return data;
  }

  // ============ Reviews & Ratings ============

  /**
   * Submit policy review
   * @param {string} policyId - Policy ID
   * @param {Object} review - Review data
   */
  async submitReview(policyId, review) {
    const { userId, rating, comment, pros, cons } = review;

    const { data, error } = await this.db
      .from('policy_reviews')
      .insert({
        policy_id: policyId,
        user_id: userId,
        rating,
        comment,
        pros,
        cons,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Update policy average rating
    await this.updatePolicyRating(policyId);

    return data;
  }

  /**
   * Get policy reviews
   * @param {string} policyId - Policy ID
   * @param {number} limit - Max reviews to return
   */
  async getReviews(policyId, limit = 50) {
    const { data, error } = await this.db
      .from('policy_reviews')
      .select('*, user:users(name, avatar_url)')
      .eq('policy_id', policyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data;
  }

  // ============ Analytics ============

  /**
   * Get marketplace analytics
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics() {
    const [
      totalPolicies,
      totalDownloads,
      trendingPolicies,
      topContributors
    ] = await Promise.all([
      this.getTotalPolicies(),
      this.getTotalDownloads(),
      this.getTrendingPolicies(),
      this.getTopContributors()
    ]);

    return {
      totalPolicies,
      totalDownloads,
      trendingPolicies,
      topContributors,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Track policy installation
   * @param {string} policyId - Policy ID
   * @param {string} agentId - Agent ID
   */
  async trackInstallation(policyId, agentId) {
    await this.db
      .from('marketplace_analytics')
      .insert({
        event_type: 'installation',
        policy_id: policyId,
        agent_id: agentId,
        timestamp: new Date().toISOString()
      });
  }

  // Helper methods

  validatePolicyStructure(rules) {
    // TODO: Implement comprehensive validation
    if (!rules || typeof rules !== 'object') {
      throw new Error('Invalid policy structure');
    }
  }

  applyCustomization(rules, customization) {
    // Merge custom rules with base rules
    return { ...rules, ...customization };
  }

  async verifyCompatibility(policy, agentId) {
    // TODO: Check agent version compatibility
    return true;
  }

  async incrementDownloads(policyId) {
    await this.db
      .rpc('increment_policy_downloads', { policy_id: policyId });
  }

  async updatePolicyRating(policyId) {
    const { data: reviews } = await this.db
      .from('policy_reviews')
      .select('rating')
      .eq('policy_id', policyId);

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await this.db
      .from('marketplace_policies')
      .update({ rating: avgRating })
      .eq('id', policyId);
  }

  incrementVersion(version) {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  async triggerReviewProcess(policyId) {
    // TODO: Trigger automated security scan and manual review
    console.log(`Review process triggered for policy ${policyId}`);
  }

  async notifySubscribers(policyId, newVersion) {
    // TODO: Send notifications to policy subscribers
    console.log(`Notifying subscribers of policy ${policyId} update to ${newVersion}`);
  }

  async getTotalPolicies() {
    const { count } = await this.db
      .from('marketplace_policies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');
    return count;
  }

  async getTotalDownloads() {
    const { data } = await this.db
      .from('marketplace_policies')
      .select('downloads')
      .eq('status', 'published');
    return data.reduce((sum, p) => sum + p.downloads, 0);
  }

  async getTrendingPolicies() {
    const { data } = await this.db
      .from('marketplace_policies')
      .select('*')
      .eq('status', 'published')
      .order('downloads', { ascending: false })
      .limit(10);
    return data;
  }

  async getTopContributors() {
    const { data } = await this.db
      .rpc('get_top_contributors', { limit_count: 10 });
    return data;
  }
}

export default MarketplaceAPI;
