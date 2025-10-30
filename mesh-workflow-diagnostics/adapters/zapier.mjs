/**
 * MCP Adapter for Zapier
 * Enables Mesh governance, policy enforcement, and observability for Zapier workflows
 * 
 * @module ZapierMCPAdapter
 * @version 1.0.0
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class ZapierMCPAdapter {
  constructor(config = {}) {
    this.config = {
      meshAPIUrl: config.meshAPIUrl || process.env.MESH_API_URL,
      meshAPIKey: config.meshAPIKey || process.env.MESH_API_KEY,
      webhookSecret: config.webhookSecret || process.env.ZAPIER_WEBHOOK_SECRET,
      enablePolicyEnforcement: config.enablePolicyEnforcement !== false,
      enableObservability: config.enableObservability !== false,
      correlationIDHeader: 'X-Correlation-ID',
      ...config
    };
    
    this.policyCache = new Map();
    this.contextBus = new Map();
  }

  /**
   * Initialize adapter and register with Mesh
   */
  async initialize() {
    console.log('[Zapier MCP] Initializing adapter...');
    
    await this.registerAdapter();
    await this.syncPolicies();
    
    console.log('[Zapier MCP] Adapter initialized successfully');
  }

  /**
   * Register adapter with Mesh control plane
   */
  async registerAdapter() {
    const registration = {
      adapter_id: 'zapier-mcp-adapter',
      adapter_type: 'workflow_automation',
      platform: 'zapier',
      capabilities: [
        'policy_enforcement',
        'context_sharing',
        'observability',
        'idempotency',
        'retry_handling'
      ],
      version: '1.0.0',
      status: 'active'
    };

    try {
      const response = await this.callMeshAPI('/v3/adapters/register', 'POST', registration);
      console.log('[Zapier MCP] Adapter registered:', response.adapter_id);
    } catch (error) {
      console.error('[Zapier MCP] Failed to register adapter:', error.message);
      throw error;
    }
  }

  /**
   * Sync governance policies from Mesh
   */
  async syncPolicies() {
    try {
      const policies = await this.callMeshAPI('/v3/policies', 'GET');
      
      policies.forEach(policy => {
        this.policyCache.set(policy.id, policy);
      });
      
      console.log(`[Zapier MCP] Synced ${policies.length} policies`);
    } catch (error) {
      console.error('[Zapier MCP] Failed to sync policies:', error.message);
    }
  }

  /**
   * Wrap Zapier trigger with MCP governance
   */
  async wrapTrigger(zapierTrigger, options = {}) {
    return async (z, bundle) => {
      const correlationId = uuidv4();
      const startTime = Date.now();

      try {
        // 1. Pre-execution: Policy check
        if (this.config.enablePolicyEnforcement) {
          await this.enforcePolicies({
            operation: 'trigger',
            trigger_name: options.triggerName,
            bundle
          });
        }

        // 2. Execute Zapier trigger
        const result = await zapierTrigger(z, bundle);

        // 3. Post-execution: Telemetry
        if (this.config.enableObservability) {
          await this.sendTelemetry({
            event_type: 'zapier_trigger_executed',
            trigger_name: options.triggerName,
            correlation_id: correlationId,
            duration_ms: Date.now() - startTime,
            result_count: Array.isArray(result) ? result.length : 1,
            status: 'success'
          });
        }

        // 4. Context sharing
        if (options.shareContext && result) {
          await this.shareContext(correlationId, result);
        }

        return result;

      } catch (error) {
        // Error handling with observability
        await this.sendTelemetry({
          event_type: 'zapier_trigger_failed',
          trigger_name: options.triggerName,
          correlation_id: correlationId,
          duration_ms: Date.now() - startTime,
          error: error.message,
          status: 'failed'
        });

        throw error;
      }
    };
  }

  /**
   * Wrap Zapier action with MCP governance
   */
  async wrapAction(zapierAction, options = {}) {
    return async (z, bundle) => {
      const correlationId = bundle.meta?.correlationId || uuidv4();
      const idempotencyKey = bundle.meta?.idempotencyKey || uuidv4();
      const startTime = Date.now();

      try {
        // 1. Idempotency check
        const cached = await this.checkIdempotency(idempotencyKey);
        if (cached) {
          console.log(`[Zapier MCP] Returning cached result for ${idempotencyKey}`);
          return cached.result;
        }

        // 2. Policy enforcement
        if (this.config.enablePolicyEnforcement) {
          await this.enforcePolicies({
            operation: 'action',
            action_name: options.actionName,
            bundle
          });
        }

        // 3. Execute Zapier action with retry
        const result = await this.executeWithRetry(
          () => zapierAction(z, bundle),
          { maxAttempts: 3, actionName: options.actionName }
        );

        // 4. Store for idempotency
        await this.storeIdempotency(idempotencyKey, result);

        // 5. Telemetry
        if (this.config.enableObservability) {
          await this.sendTelemetry({
            event_type: 'zapier_action_executed',
            action_name: options.actionName,
            correlation_id: correlationId,
            idempotency_key: idempotencyKey,
            duration_ms: Date.now() - startTime,
            status: 'success'
          });
        }

        // 6. Context sharing
        if (options.shareContext && result) {
          await this.shareContext(correlationId, result);
        }

        return result;

      } catch (error) {
        // Error handling
        await this.sendTelemetry({
          event_type: 'zapier_action_failed',
          action_name: options.actionName,
          correlation_id: correlationId,
          duration_ms: Date.now() - startTime,
          error: error.message,
          status: 'failed'
        });

        // Send to DLQ if configured
        if (options.useDLQ) {
          await this.sendToDLQ({
            action_name: options.actionName,
            bundle,
            error: error.message,
            correlation_id: correlationId
          });
        }

        throw error;
      }
    };
  }

  /**
   * Validate webhook signature (HMAC-SHA256)
   */
  validateWebhookSignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Enforce governance policies
   */
  async enforcePolicies(context) {
    const applicablePolicies = Array.from(this.policyCache.values())
      .filter(policy => this.isPolicyApplicable(policy, context));

    for (const policy of applicablePolicies) {
      const decision = await this.evaluatePolicy(policy, context);
      
      if (decision.result === 'deny') {
        throw new Error(`Policy violation: ${policy.name} - ${decision.reason}`);
      }
    }
  }

  /**
   * Check if policy applies to current context
   */
  isPolicyApplicable(policy, context) {
    // Simple rule matching - extend as needed
    if (policy.scope === 'all') return true;
    if (policy.scope === 'zapier') return true;
    return false;
  }

  /**
   * Evaluate policy decision
   */
  async evaluatePolicy(policy, context) {
    // Call Mesh policy service (OPA)
    try {
      const decision = await this.callMeshAPI('/v3/policies/evaluate', 'POST', {
        policy_id: policy.id,
        context
      });
      
      return decision;
    } catch (error) {
      console.error(`[Zapier MCP] Policy evaluation failed: ${error.message}`);
      return { result: 'allow', reason: 'policy_service_unavailable' };
    }
  }

  /**
   * Execute with exponential backoff retry
   */
  async executeWithRetry(fn, options = {}) {
    const maxAttempts = options.maxAttempts || 3;
    const baseDelay = options.baseDelay || 1000;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          const jitter = Math.random() * delay * 0.1;
          await this.sleep(delay + jitter);
          
          console.log(`[Zapier MCP] Retry attempt ${attempt}/${maxAttempts} for ${options.actionName}`);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check idempotency cache
   */
  async checkIdempotency(key) {
    try {
      const cached = await this.callMeshAPI(`/v3/idempotency/${key}`, 'GET');
      return cached;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  /**
   * Store result for idempotency
   */
  async storeIdempotency(key, result) {
    try {
      await this.callMeshAPI('/v3/idempotency', 'POST', {
        key,
        result,
        ttl: 86400 // 24 hours
      });
    } catch (error) {
      console.error(`[Zapier MCP] Failed to store idempotency: ${error.message}`);
    }
  }

  /**
   * Share context with Mesh federation service
   */
  async shareContext(correlationId, data) {
    try {
      await this.callMeshAPI('/v3/context/share', 'POST', {
        correlation_id: correlationId,
        source: 'zapier',
        data
      });
    } catch (error) {
      console.error(`[Zapier MCP] Failed to share context: ${error.message}`);
    }
  }

  /**
   * Send telemetry to Mesh observability service
   */
  async sendTelemetry(event) {
    if (!this.config.enableObservability) return;

    try {
      await this.callMeshAPI('/v3/telemetry', 'POST', {
        timestamp: new Date().toISOString(),
        adapter: 'zapier',
        ...event
      });
    } catch (error) {
      // Don't fail on telemetry errors
      console.error(`[Zapier MCP] Failed to send telemetry: ${error.message}`);
    }
  }

  /**
   * Send failed job to DLQ
   */
  async sendToDLQ(job) {
    try {
      await this.callMeshAPI('/v3/dlq', 'POST', {
        source: 'zapier',
        timestamp: new Date().toISOString(),
        ...job
      });
      
      console.log(`[Zapier MCP] Job sent to DLQ: ${job.action_name}`);
    } catch (error) {
      console.error(`[Zapier MCP] Failed to send to DLQ: ${error.message}`);
    }
  }

  /**
   * Call Mesh API
   */
  async callMeshAPI(endpoint, method = 'GET', body = null) {
    const url = `${this.config.meshAPIUrl}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.meshAPIKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Zapier-MCP-Adapter/1.0.0'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = new Error(`Mesh API error: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Example usage
export function createZapierAdapter(z, bundle) {
  return new ZapierMCPAdapter({
    meshAPIUrl: process.env.MESH_API_URL,
    meshAPIKey: bundle.authData.mesh_api_key,
    webhookSecret: process.env.ZAPIER_WEBHOOK_SECRET
  });
}

export default ZapierMCPAdapter;
