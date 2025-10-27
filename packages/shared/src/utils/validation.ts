/**
 * Validation utilities for AgentMesh Cloud
 * Provides helper functions for data validation and sanitization
 */

import { z } from 'zod';
import { Schemas } from '../schemas/validation';

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ValidationService {
  /**
   * Validates data against a Zod schema
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new ValidationError(
          firstError.message,
          firstError.path.join('.'),
          firstError.code,
          error.errors
        );
      }
      throw error;
    }
  }

  /**
   * Safely validates data and returns result with error handling
   */
  static safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    error?: ValidationError;
  } {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return {
          success: false,
          error: new ValidationError(
            firstError.message,
            firstError.path.join('.'),
            firstError.code,
            error.errors
          )
        };
      }
      return {
        success: false,
        error: new ValidationError(
          'Unknown validation error',
          'unknown',
          'UNKNOWN_ERROR'
        )
      };
    }
  }

  /**
   * Validates agent data
   */
  static validateAgent(data: unknown) {
    return this.validate(Schemas.Agent, data);
  }

  /**
   * Validates workflow data
   */
  static validateWorkflow(data: unknown) {
    return this.validate(Schemas.Workflow, data);
  }

  /**
   * Validates MCP request
   */
  static validateMCPRequest(data: unknown) {
    return this.validate(Schemas.MCPRequest, data);
  }

  /**
   * Validates A2A message
   */
  static validateA2AMessage(data: unknown) {
    return this.validate(Schemas.A2AMessage, data);
  }

  /**
   * Validates pagination parameters
   */
  static validatePagination(data: unknown) {
    return this.validate(Schemas.Pagination, data);
  }

  /**
   * Validates search query
   */
  static validateSearchQuery(data: unknown) {
    return this.validate(Schemas.SearchQuery, data);
  }

  /**
   * Sanitizes string input to prevent XSS
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validates email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates UUID format
   */
  static validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validates URL format
   */
  static validateURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates JSON string
   */
  static validateJSON(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates cron expression
   */
  static validateCronExpression(cron: string): boolean {
    const cronRegex = /^(\*|([0-5]?\d)) (\*|([01]?\d|2[0-3])) (\*|([012]?\d|3[01])) (\*|([0]?\d|1[0-2])) (\*|([0-6]))$/;
    return cronRegex.test(cron);
  }

  /**
   * Validates version string (semantic versioning)
   */
  static validateVersion(version: string): boolean {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    return versionRegex.test(version);
  }

  /**
   * Validates agent name (alphanumeric with hyphens and underscores)
   */
  static validateAgentName(name: string): boolean {
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    return nameRegex.test(name) && name.length >= 1 && name.length <= 100;
  }

  /**
   * Validates workflow name
   */
  static validateWorkflowName(name: string): boolean {
    return this.validateAgentName(name); // Same rules apply
  }

  /**
   * Validates capability name
   */
  static validateCapabilityName(name: string): boolean {
    return this.validateAgentName(name); // Same rules apply
  }

  /**
   * Validates tag format
   */
  static validateTag(tag: string): boolean {
    const tagRegex = /^[a-zA-Z0-9_-]+$/;
    return tagRegex.test(tag) && tag.length >= 1 && tag.length <= 50;
  }

  /**
   * Validates array of tags
   */
  static validateTags(tags: string[]): boolean {
    return tags.length <= 20 && tags.every(tag => this.validateTag(tag));
  }

  /**
   * Validates resource requirements string (e.g., "100m", "1Gi")
   */
  static validateResourceRequirement(resource: string): boolean {
    const resourceRegex = /^\d+(\.\d+)?[a-zA-Z]+$/;
    return resourceRegex.test(resource);
  }

  /**
   * Validates timeout value (in milliseconds)
   */
  static validateTimeout(timeout: number): boolean {
    return timeout >= 1000 && timeout <= 86400000; // 1 second to 24 hours
  }

  /**
   * Validates retry policy
   */
  static validateRetryPolicy(policy: {
    maxAttempts: number;
    backoffStrategy: string;
    baseDelay: number;
    maxDelay?: number;
  }): boolean {
    return (
      policy.maxAttempts >= 1 &&
      policy.maxAttempts <= 10 &&
      ['linear', 'exponential', 'fixed'].includes(policy.backoffStrategy) &&
      policy.baseDelay >= 100 &&
      policy.baseDelay <= 60000 &&
      (policy.maxDelay === undefined || 
       (policy.maxDelay >= 1000 && policy.maxDelay <= 300000))
    );
  }

  /**
   * Validates priority level
   */
  static validatePriority(priority: string): boolean {
    return ['low', 'normal', 'high', 'critical'].includes(priority);
  }

  /**
   * Validates message TTL (time to live)
   */
  static validateTTL(ttl: number): boolean {
    return ttl >= 1 && ttl <= 86400; // 1 second to 24 hours
  }

  /**
   * Validates correlation ID format
   */
  static validateCorrelationId(correlationId: string): boolean {
    return this.validateUUID(correlationId);
  }

  /**
   * Validates agent status
   */
  static validateAgentStatus(status: string): boolean {
    return ['online', 'offline', 'processing', 'error', 'maintenance'].includes(status);
  }

  /**
   * Validates workflow status
   */
  static validateWorkflowStatus(status: string): boolean {
    return ['draft', 'active', 'paused', 'archived', 'error'].includes(status);
  }

  /**
   * Validates execution status
   */
  static validateExecutionStatus(status: string): boolean {
    return ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'].includes(status);
  }

  /**
   * Validates capability type
   */
  static validateCapabilityType(type: string): boolean {
    return ['llm', 'tool', 'data', 'workflow', 'notification', 'analytics'].includes(type);
  }

  /**
   * Validates node type
   */
  static validateNodeType(type: string): boolean {
    return [
      'agent', 'condition', 'parallel', 'merge', 'delay',
      'webhook', 'data_transform', 'notification'
    ].includes(type);
  }

  /**
   * Validates trigger type
   */
  static validateTriggerType(type: string): boolean {
    return ['schedule', 'webhook', 'event', 'manual', 'api'].includes(type);
  }

  /**
   * Validates adapter type
   */
  static validateAdapterType(type: string): boolean {
    return ['llm', 'database', 'api', 'file', 'message_queue', 'storage'].includes(type);
  }

  /**
   * Validates LLM provider
   */
  static validateLLMProvider(provider: string): boolean {
    return ['openai', 'anthropic', 'google', 'cohere', 'huggingface', 'custom'].includes(provider);
  }

  /**
   * Validates database provider
   */
  static validateDatabaseProvider(provider: string): boolean {
    return ['postgresql', 'mysql', 'mongodb', 'redis', 'supabase', 'custom'].includes(provider);
  }

  /**
   * Validates broker type
   */
  static validateBrokerType(type: string): boolean {
    return ['kafka', 'nats', 'rabbitmq', 'redis', 'custom'].includes(type);
  }

  /**
   * Validates channel type
   */
  static validateChannelType(type: string): boolean {
    return ['direct', 'fanout', 'topic', 'headers', 'rpc'].includes(type);
  }

  /**
   * Validates broadcast scope
   */
  static validateBroadcastScope(scope: string): boolean {
    return ['global', 'tenant', 'workflow', 'agent_type', 'custom'].includes(scope);
  }

  /**
   * Validates negotiation phase
   */
  static validateNegotiationPhase(phase: string): boolean {
    return ['initiate', 'propose', 'counter_propose', 'accept', 'reject', 'timeout'].includes(phase);
  }

  /**
   * Validates error handling strategy
   */
  static validateErrorHandlingStrategy(strategy: string): boolean {
    return ['stop', 'continue', 'retry', 'fallback'].includes(strategy);
  }

  /**
   * Validates log level
   */
  static validateLogLevel(level: string): boolean {
    return ['debug', 'info', 'warn', 'error'].includes(level);
  }

  /**
   * Validates complexity level
   */
  static validateComplexityLevel(complexity: string): boolean {
    return ['low', 'medium', 'high', 'critical'].includes(complexity);
  }

  /**
   * Validates HTTP method
   */
  static validateHTTPMethod(method: string): boolean {
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  }

  /**
   * Validates authentication method
   */
  static validateAuthenticationMethod(method: string): boolean {
    return ['bearer', 'basic', 'api_key', 'oauth2', 'jwt', 'signature', 'certificate'].includes(method);
  }

  /**
   * Validates compression type
   */
  static validateCompressionType(type: string): boolean {
    return ['gzip', 'deflate', 'brotli', 'lz4', 'snappy'].includes(type);
  }

  /**
   * Validates encryption algorithm
   */
  static validateEncryptionAlgorithm(algorithm: string): boolean {
    return ['AES-256-GCM', 'AES-256-CBC', 'ChaCha20-Poly1305', 'RSA-OAEP'].includes(algorithm);
  }
}