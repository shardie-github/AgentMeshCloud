/**
 * MCP Adapter for AWS Lambda
 * Enables Mesh governance for serverless functions
 * 
 * @module LambdaMCPAdapter
 * @version 1.0.0
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class LambdaMCPAdapter {
  constructor(config = {}) {
    this.config = {
      meshAPIUrl: config.meshAPIUrl || process.env.MESH_API_URL,
      meshAPIKey: config.meshAPIKey || process.env.MESH_API_KEY,
      enablePolicyEnforcement: config.enablePolicyEnforcement !== false,
      enableObservability: config.enableObservability !== false,
      enableXRay: config.enableXRay !== false,
      ...config
    };
  }

  /**
   * Wrap Lambda handler with MCP governance
   */
  wrapHandler(handler, options = {}) {
    const self = this;
    
    return async function mcpWrappedHandler(event, context, callback) {
      const correlationId = event.headers?.['x-correlation-id'] || 
                           event.requestContext?.requestId || 
                           uuidv4();
      const idempotencyKey = self.generateIdempotencyKey(event, context);
      const startTime = Date.now();

      // Set correlation ID in context for downstream calls
      context.correlationId = correlationId;

      try {
        // 1. Check idempotency
        const cached = await self.checkIdempotency(idempotencyKey);
        if (cached) {
          console.log(`[Lambda MCP] Returning cached result`);
          return cached.result;
        }

        // 2. Policy enforcement
        if (self.config.enablePolicyEnforcement) {
          await self.enforcePolicies({
            operation: 'lambda_invocation',
            function_name: context.functionName,
            function_version: context.functionVersion,
            event,
            source: event.source || event.requestContext?.domainName
          });
        }

        // 3. Execute Lambda handler
        const result = await handler(event, context, callback);

        // 4. Store for idempotency
        await self.storeIdempotency(idempotencyKey, result);

        // 5. Telemetry (including AWS X-Ray integration)
        if (self.config.enableObservability) {
          await self.sendTelemetry({
            event_type: 'lambda_invocation_success',
            function_name: context.functionName,
            function_version: context.functionVersion,
            correlation_id: correlationId,
            idempotency_key: idempotencyKey,
            duration_ms: Date.now() - startTime,
            memory_used_mb: process.memoryUsage().heapUsed / 1024 / 1024,
            cold_start: context.coldStart || false,
            status: 'success'
          });

          if (self.config.enableXRay) {
            await self.sendXRaySegment(correlationId, {
              functionName: context.functionName,
              duration: Date.now() - startTime,
              status: 'success'
            });
          }
        }

        return result;

      } catch (error) {
        await self.handleError(error, {
          functionName: context.functionName,
          correlationId,
          event
        });

        throw error;
      }
    };
  }

  /**
   * Wrap Lambda for Step Functions integration
   */
  wrapStepFunctionTask(handler, options = {}) {
    const self = this;
    
    return async function mcpWrappedStepFunctionTask(event, context) {
      const taskToken = event.taskToken;
      const executionArn = event.executionArn;
      const correlationId = event.correlationId || uuidv4();

      try {
        const result = await handler(event, context);

        // Report success to Step Functions
        if (taskToken) {
          await self.sendTaskSuccess(taskToken, result);
        }

        // Telemetry
        await self.sendTelemetry({
          event_type: 'step_function_task_success',
          execution_arn: executionArn,
          correlation_id: correlationId,
          status: 'success'
        });

        return result;

      } catch (error) {
        // Report failure to Step Functions
        if (taskToken) {
          await self.sendTaskFailure(taskToken, error);
        }

        await self.handleError(error, {
          executionArn,
          correlationId,
          event
        });

        throw error;
      }
    };
  }

  /**
   * Generate idempotency key
   */
  generateIdempotencyKey(event, context) {
    // For API Gateway
    if (event.requestContext?.requestId) {
      return event.requestContext.requestId;
    }

    // For SQS
    if (event.Records?.[0]?.messageId) {
      return event.Records[0].messageId;
    }

    // For S3
    if (event.Records?.[0]?.s3) {
      const record = event.Records[0].s3;
      const keyData = `${record.bucket.name}:${record.object.key}:${record.object.eTag}`;
      return crypto.createHash('sha256').update(keyData).digest('hex');
    }

    // Generic fallback
    const keyData = JSON.stringify({
      functionName: context.functionName,
      eventHash: crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex')
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
      console.error(`[Lambda MCP] Policy enforcement failed: ${error.message}`);
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
        ttl: 86400 
      });
    } catch (error) {
      console.error(`[Lambda MCP] Idempotency storage failed: ${error.message}`);
    }
  }

  async sendTelemetry(event) {
    if (!this.config.enableObservability) return;
    
    try {
      await this.callMeshAPI('/v3/telemetry', 'POST', {
        timestamp: new Date().toISOString(),
        adapter: 'lambda',
        ...event
      });
    } catch (error) {
      console.error(`[Lambda MCP] Telemetry failed: ${error.message}`);
    }
  }

  async sendXRaySegment(correlationId, metadata) {
    // Integrate with AWS X-Ray
    // This would use AWS X-Ray SDK in production
    console.log(`[Lambda MCP] X-Ray segment: ${correlationId}`, metadata);
  }

  async sendTaskSuccess(taskToken, result) {
    const AWS = require('aws-sdk');
    const stepfunctions = new AWS.StepFunctions();
    
    await stepfunctions.sendTaskSuccess({
      taskToken,
      output: JSON.stringify(result)
    }).promise();
  }

  async sendTaskFailure(taskToken, error) {
    const AWS = require('aws-sdk');
    const stepfunctions = new AWS.StepFunctions();
    
    await stepfunctions.sendTaskFailure({
      taskToken,
      error: error.name,
      cause: error.message
    }).promise();
  }

  async handleError(error, context) {
    await this.sendTelemetry({
      event_type: 'lambda_invocation_failed',
      function_name: context.functionName,
      execution_arn: context.executionArn,
      correlation_id: context.correlationId,
      error: error.message,
      status: 'failed'
    });

    await this.sendToDLQ({
      source: 'lambda',
      function_name: context.functionName,
      event: context.event,
      error: error.message
    });
  }

  async sendToDLQ(job) {
    try {
      await this.callMeshAPI('/v3/dlq', 'POST', job);
    } catch (error) {
      console.error(`[Lambda MCP] DLQ send failed: ${error.message}`);
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

export default LambdaMCPAdapter;
