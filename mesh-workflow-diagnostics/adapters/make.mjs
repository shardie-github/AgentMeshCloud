/**
 * MCP Adapter for Make.com (formerly Integromat)
 * Enables Mesh governance for Make scenarios
 * 
 * @module MakeMCPAdapter
 * @version 1.0.0
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class MakeMCPAdapter {
  constructor(config = {}) {
    this.config = {
      meshAPIUrl: config.meshAPIUrl || process.env.MESH_API_URL,
      meshAPIKey: config.meshAPIKey || process.env.MESH_API_KEY,
      makeWebhookSecret: config.makeWebhookSecret || process.env.MAKE_WEBHOOK_SECRET,
      enablePolicyEnforcement: config.enablePolicyEnforcement !== false,
      enableObservability: config.enableObservability !== false,
      ...config
    };
  }

  /**
   * Wrap Make module execution with MCP governance
   */
  async wrapModule(moduleFunction, options = {}) {
    return async (bundle) => {
      const correlationId = bundle.meta?.correlationId || uuidv4();
      const idempotencyKey = bundle.meta?.idempotencyKey || this.generateIdempotencyKey(bundle);
      const startTime = Date.now();

      try {
        // 1. Idempotency check
        const cached = await this.checkIdempotency(idempotencyKey);
        if (cached) {
          return cached.result;
        }

        // 2. Policy enforcement
        if (this.config.enablePolicyEnforcement) {
          await this.enforcePolicies({
            operation: 'make_module',
            module_name: options.moduleName,
            bundle
          });
        }

        // 3. Execute module with retry
        const result = await this.executeWithRetry(
          () => moduleFunction(bundle),
          { maxAttempts: 3, moduleName: options.moduleName }
        );

        // 4. Store for idempotency
        await this.storeIdempotency(idempotencyKey, result);

        // 5. Telemetry
        if (this.config.enableObservability) {
          await this.sendTelemetry({
            event_type: 'make_module_executed',
            module_name: options.moduleName,
            correlation_id: correlationId,
            idempotency_key: idempotencyKey,
            duration_ms: Date.now() - startTime,
            status: 'success'
          });
        }

        return result;

      } catch (error) {
        await this.handleError(error, {
          moduleName: options.moduleName,
          correlationId,
          bundle
        });
        throw error;
      }
    };
  }

  /**
   * Validate Make webhook signature
   */
  validateWebhookSignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.makeWebhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generate idempotency key from bundle
   */
  generateIdempotencyKey(bundle) {
    const keyData = JSON.stringify({
      scenarioId: bundle.scenario?.id,
      moduleId: bundle.module?.id,
      executionId: bundle.execution?.id
    });
    
    return crypto.createHash('sha256').update(keyData).digest('hex');
  }

  async enforcePolicies(context) {
    try {
      const decision = await this.callMeshAPI('/v3/policies/evaluate', 'POST', { context });
      if (decision.result === 'deny') {
        throw new Error(`Policy violation: ${decision.reason}`);
      }
    } catch (error) {
      console.error(`[Make MCP] Policy enforcement failed: ${error.message}`);
      throw error;
    }
  }

  async executeWithRetry(fn, options = {}) {
    const maxAttempts = options.maxAttempts || 3;
    const baseDelay = 1000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt < maxAttempts && this.isRetryable(error)) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
          console.log(`[Make MCP] Retry attempt ${attempt}/${maxAttempts}`);
        } else {
          throw error;
        }
      }
    }
  }

  isRetryable(error) {
    return error.status >= 500 || error.code === 'ETIMEDOUT';
  }

  async checkIdempotency(key) {
    try {
      const response = await this.callMeshAPI(`/v3/idempotency/${key}`, 'GET');
      return response;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async storeIdempotency(key, result) {
    try {
      await this.callMeshAPI('/v3/idempotency', 'POST', { key, result, ttl: 86400 });
    } catch (error) {
      console.error(`[Make MCP] Idempotency storage failed: ${error.message}`);
    }
  }

  async sendTelemetry(event) {
    if (!this.config.enableObservability) return;
    
    try {
      await this.callMeshAPI('/v3/telemetry', 'POST', {
        timestamp: new Date().toISOString(),
        adapter: 'make',
        ...event
      });
    } catch (error) {
      console.error(`[Make MCP] Telemetry failed: ${error.message}`);
    }
  }

  async handleError(error, context) {
    await this.sendTelemetry({
      event_type: 'make_module_failed',
      module_name: context.moduleName,
      correlation_id: context.correlationId,
      error: error.message,
      status: 'failed'
    });

    await this.sendToDLQ({
      source: 'make',
      module_name: context.moduleName,
      bundle: context.bundle,
      error: error.message
    });
  }

  async sendToDLQ(job) {
    try {
      await this.callMeshAPI('/v3/dlq', 'POST', job);
    } catch (error) {
      console.error(`[Make MCP] DLQ send failed: ${error.message}`);
    }
  }

  async callMeshAPI(endpoint, method = 'GET', body = null) {
    const url = `${this.config.meshAPIUrl}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.meshAPIKey}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) {
      const error = new Error(`Mesh API error: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default MakeMCPAdapter;
