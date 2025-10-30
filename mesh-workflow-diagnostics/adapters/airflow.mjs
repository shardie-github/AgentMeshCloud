/**
 * MCP Adapter for Apache Airflow
 * Enables Mesh governance for Airflow DAGs
 * 
 * @module AirflowMCPAdapter
 * @version 1.0.0
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class AirflowMCPAdapter {
  constructor(config = {}) {
    this.config = {
      meshAPIUrl: config.meshAPIUrl || process.env.MESH_API_URL,
      meshAPIKey: config.meshAPIKey || process.env.MESH_API_KEY,
      enablePolicyEnforcement: config.enablePolicyEnforcement !== false,
      enableObservability: config.enableObservability !== false,
      enableSAGA: config.enableSAGA || false,
      ...config
    };

    this.sagaSteps = new Map();
  }

  /**
   * Wrap Airflow PythonOperator with MCP governance
   */
  wrapOperator(pythonCallable, options = {}) {
    const self = this;
    
    return async function mcpWrappedOperator(...args) {
      const context = args[0]; // Airflow context is first arg
      const correlationId = context.get('dag_run').conf?.correlation_id || uuidv4();
      const idempotencyKey = self.generateIdempotencyKey(context);
      const startTime = Date.now();

      try {
        // 1. Check idempotency
        const cached = await self.checkIdempotency(idempotencyKey);
        if (cached) {
          console.log(`[Airflow MCP] Returning cached result for ${options.taskId}`);
          return cached.result;
        }

        // 2. Policy enforcement
        if (self.config.enablePolicyEnforcement) {
          await self.enforcePolicies({
            operation: 'airflow_task',
            dag_id: context.get('dag').dag_id,
            task_id: context.get('task').task_id,
            context
          });
        }

        // 3. Execute task with retry (Airflow handles this, but we add observability)
        const result = await pythonCallable(...args);

        // 4. Store for idempotency
        await self.storeIdempotency(idempotencyKey, result);

        // 5. SAGA checkpoint (if enabled)
        if (self.config.enableSAGA && options.compensate) {
          await self.registerSAGAStep(correlationId, {
            taskId: options.taskId,
            result,
            compensate: options.compensate
          });
        }

        // 6. Telemetry
        if (self.config.enableObservability) {
          await self.sendTelemetry({
            event_type: 'airflow_task_executed',
            dag_id: context.get('dag').dag_id,
            task_id: context.get('task').task_id,
            correlation_id: correlationId,
            idempotency_key: idempotencyKey,
            duration_ms: Date.now() - startTime,
            status: 'success'
          });
        }

        return result;

      } catch (error) {
        // SAGA rollback (if enabled)
        if (self.config.enableSAGA) {
          await self.executeSAGARollback(correlationId);
        }

        await self.handleError(error, {
          dagId: context.get('dag').dag_id,
          taskId: context.get('task').task_id,
          correlationId,
          context
        });

        throw error;
      }
    };
  }

  /**
   * Register SAGA step for potential rollback
   */
  async registerSAGAStep(correlationId, step) {
    if (!this.sagaSteps.has(correlationId)) {
      this.sagaSteps.set(correlationId, []);
    }
    
    this.sagaSteps.get(correlationId).push(step);
    
    console.log(`[Airflow MCP] SAGA step registered: ${step.taskId}`);
  }

  /**
   * Execute SAGA rollback
   */
  async executeSAGARollback(correlationId) {
    const steps = this.sagaSteps.get(correlationId) || [];
    
    console.log(`[Airflow MCP] Starting SAGA rollback for ${correlationId} (${steps.length} steps)`);

    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      try {
        console.log(`[Airflow MCP] Compensating step: ${step.taskId}`);
        await step.compensate(step.result);
      } catch (compensateError) {
        console.error(`[Airflow MCP] Compensation failed for ${step.taskId}:`, compensateError);
        
        // Send to DLQ for manual intervention
        await this.sendToDLQ({
          source: 'airflow_saga',
          task_id: step.taskId,
          correlation_id: correlationId,
          compensation_error: compensateError.message
        });
      }
    }

    // Clean up SAGA state
    this.sagaSteps.delete(correlationId);
    console.log(`[Airflow MCP] SAGA rollback complete for ${correlationId}`);
  }

  /**
   * Generate idempotency key from Airflow context
   */
  generateIdempotencyKey(context) {
    const dagId = context.get('dag').dag_id;
    const taskId = context.get('task').task_id;
    const executionDate = context.get('execution_date').toISOString();
    const tryNumber = context.get('task_instance').try_number;

    const keyData = JSON.stringify({
      dag_id: dagId,
      task_id: taskId,
      execution_date: executionDate,
      try_number: tryNumber
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
      console.error(`[Airflow MCP] Policy enforcement failed: ${error.message}`);
      throw error;
    }
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
      await this.callMeshAPI('/v3/idempotency', 'POST', { 
        key, 
        result, 
        ttl: 604800 // 7 days for batch jobs
      });
    } catch (error) {
      console.error(`[Airflow MCP] Idempotency storage failed: ${error.message}`);
    }
  }

  async sendTelemetry(event) {
    if (!this.config.enableObservability) return;
    
    try {
      await this.callMeshAPI('/v3/telemetry', 'POST', {
        timestamp: new Date().toISOString(),
        adapter: 'airflow',
        ...event
      });
    } catch (error) {
      console.error(`[Airflow MCP] Telemetry failed: ${error.message}`);
    }
  }

  async handleError(error, context) {
    await this.sendTelemetry({
      event_type: 'airflow_task_failed',
      dag_id: context.dagId,
      task_id: context.taskId,
      correlation_id: context.correlationId,
      error: error.message,
      status: 'failed'
    });

    await this.sendToDLQ({
      source: 'airflow',
      dag_id: context.dagId,
      task_id: context.taskId,
      context: context.context,
      error: error.message
    });
  }

  async sendToDLQ(job) {
    try {
      await this.callMeshAPI('/v3/dlq', 'POST', job);
    } catch (error) {
      console.error(`[Airflow MCP] DLQ send failed: ${error.message}`);
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
}

export default AirflowMCPAdapter;
