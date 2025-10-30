/**
 * MCP Adapter for n8n
 * Enables Mesh governance for n8n workflows
 * 
 * @module N8nMCPAdapter
 * @version 1.0.0
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class N8nMCPAdapter {
  constructor(config = {}) {
    this.config = {
      meshAPIUrl: config.meshAPIUrl || process.env.MESH_API_URL,
      meshAPIKey: config.meshAPIKey || process.env.MESH_API_KEY,
      enablePolicyEnforcement: config.enablePolicyEnforcement !== false,
      enableObservability: config.enableObservability !== false,
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 60000
      },
      ...config
    };

    this.circuitBreakerState = new Map();
  }

  /**
   * Wrap n8n node execution with MCP governance
   */
  async execute(executeFunctions, items, options = {}) {
    const correlationId = executeFunctions.getNodeParameter('correlationId', 0, uuidv4());
    const idempotencyKey = this.generateIdempotencyKey(executeFunctions, items);
    const startTime = Date.now();

    try {
      // 1. Circuit breaker check
      this.checkCircuitBreaker(options.nodeName);

      // 2. Idempotency check
      const cached = await this.checkIdempotency(idempotencyKey);
      if (cached) {
        return cached.result;
      }

      // 3. Policy enforcement
      if (this.config.enablePolicyEnforcement) {
        await this.enforcePolicies({
          operation: 'n8n_node',
          node_name: options.nodeName,
          node_type: options.nodeType,
          items
        });
      }

      // 4. Execute node with retry
      const result = await this.executeWithRetry(
        () => options.nodeFunction(executeFunctions, items),
        { nodeName: options.nodeName }
      );

      // 5. Store for idempotency
      await this.storeIdempotency(idempotencyKey, result);

      // 6. Update circuit breaker (success)
      this.recordSuccess(options.nodeName);

      // 7. Telemetry
      if (this.config.enableObservability) {
        await this.sendTelemetry({
          event_type: 'n8n_node_executed',
          node_name: options.nodeName,
          node_type: options.nodeType,
          correlation_id: correlationId,
          idempotency_key: idempotencyKey,
          duration_ms: Date.now() - startTime,
          items_count: items.length,
          status: 'success'
        });
      }

      return result;

    } catch (error) {
      // Update circuit breaker (failure)
      this.recordFailure(options.nodeName);

      await this.handleError(error, {
        nodeName: options.nodeName,
        correlationId,
        items
      });

      throw error;
    }
  }

  /**
   * Check circuit breaker state
   */
  checkCircuitBreaker(nodeName) {
    const state = this.circuitBreakerState.get(nodeName);
    
    if (state?.isOpen) {
      const now = Date.now();
      if (now - state.openedAt < this.config.circuitBreaker.recoveryTimeout) {
        throw new Error(`Circuit breaker is OPEN for ${nodeName}`);
      } else {
        // Try half-open
        state.isOpen = false;
        state.isHalfOpen = true;
      }
    }
  }

  /**
   * Record successful execution
   */
  recordSuccess(nodeName) {
    const state = this.circuitBreakerState.get(nodeName);
    if (state) {
      state.failureCount = 0;
      state.isOpen = false;
      state.isHalfOpen = false;
    }
  }

  /**
   * Record failed execution
   */
  recordFailure(nodeName) {
    let state = this.circuitBreakerState.get(nodeName);
    if (!state) {
      state = { failureCount: 0, isOpen: false, isHalfOpen: false };
      this.circuitBreakerState.set(nodeName, state);
    }

    state.failureCount++;
    
    if (state.failureCount >= this.config.circuitBreaker.failureThreshold) {
      state.isOpen = true;
      state.openedAt = Date.now();
      console.warn(`[n8n MCP] Circuit breaker OPEN for ${nodeName}`);
    }
  }

  /**
   * Generate idempotency key
   */
  generateIdempotencyKey(executeFunctions, items) {
    const workflow = executeFunctions.getWorkflow();
    const node = executeFunctions.getNode();
    const execution = executeFunctions.getExecutionId();

    const keyData = JSON.stringify({
      workflowId: workflow.id,
      nodeId: node.id,
      executionId: execution,
      itemsHash: crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex')
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
      console.error(`[n8n MCP] Policy enforcement failed: ${error.message}`);
      throw error;
    }
  }

  async executeWithRetry(fn, options = {}) {
    const maxAttempts = 3;
    const baseDelay = 1000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt < maxAttempts && this.isRetryable(error)) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
          console.log(`[n8n MCP] Retry attempt ${attempt}/${maxAttempts}`);
        } else {
          throw error;
        }
      }
    }
  }

  isRetryable(error) {
    return error.httpCode >= 500 || error.code === 'ETIMEDOUT';
  }

  async checkIdempotency(key) {
    try {
      return await this.callMeshAPI(`/v3/idempotency/${key}`, 'GET');
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async storeIdempotency(key, result) {
    try {
      await this.callMeshAPI('/v3/idempotency', 'POST', { key, result, ttl: 86400 });
    } catch (error) {
      console.error(`[n8n MCP] Idempotency storage failed: ${error.message}`);
    }
  }

  async sendTelemetry(event) {
    if (!this.config.enableObservability) return;
    
    try {
      await this.callMeshAPI('/v3/telemetry', 'POST', {
        timestamp: new Date().toISOString(),
        adapter: 'n8n',
        ...event
      });
    } catch (error) {
      console.error(`[n8n MCP] Telemetry failed: ${error.message}`);
    }
  }

  async handleError(error, context) {
    await this.sendTelemetry({
      event_type: 'n8n_node_failed',
      node_name: context.nodeName,
      correlation_id: context.correlationId,
      error: error.message,
      status: 'failed'
    });

    await this.sendToDLQ({
      source: 'n8n',
      node_name: context.nodeName,
      items: context.items,
      error: error.message
    });
  }

  async sendToDLQ(job) {
    try {
      await this.callMeshAPI('/v3/dlq', 'POST', job);
    } catch (error) {
      console.error(`[n8n MCP] DLQ send failed: ${error.message}`);
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

export default N8nMCPAdapter;
