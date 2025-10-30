/**
 * Error Definitions - ORCA Core
 * Custom error classes with proper typing and error codes
 */

import { ErrorCategory } from './types';

/**
 * Base ORCA error class
 */
export class OrcaError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly category: ErrorCategory;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    category: ErrorCategory = ErrorCategory.NON_RETRYABLE,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.category = category;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends OrcaError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      ErrorCategory.NON_RETRYABLE,
      context
    );
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends OrcaError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      'AUTHENTICATION_ERROR',
      401,
      ErrorCategory.NON_RETRYABLE,
      context
    );
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends OrcaError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403,
      ErrorCategory.NON_RETRYABLE,
      context
    );
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends OrcaError {
  constructor(resource: string, id: string) {
    super(
      `${resource} with id '${id}' not found`,
      'NOT_FOUND',
      404,
      ErrorCategory.NON_RETRYABLE,
      { resource, id }
    );
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends OrcaError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      'CONFLICT_ERROR',
      409,
      ErrorCategory.COMPENSATABLE,
      context
    );
  }
}

/**
 * Policy violation error (422)
 */
export class PolicyViolationError extends OrcaError {
  constructor(
    policyId: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Policy violation: ${message}`,
      'POLICY_VIOLATION',
      422,
      ErrorCategory.NON_RETRYABLE,
      { policy_id: policyId, ...context }
    );
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends OrcaError {
  constructor(limit: number, window: string) {
    super(
      `Rate limit exceeded: ${limit} requests per ${window}`,
      'RATE_LIMIT_EXCEEDED',
      429,
      ErrorCategory.RETRYABLE,
      { limit, window }
    );
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends OrcaError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      'INTERNAL_ERROR',
      500,
      ErrorCategory.RETRYABLE,
      context
    );
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends OrcaError {
  constructor(service: string, context?: Record<string, unknown>) {
    super(
      `Service unavailable: ${service}`,
      'SERVICE_UNAVAILABLE',
      503,
      ErrorCategory.RETRYABLE,
      { service, ...context }
    );
  }
}

/**
 * Timeout error (504)
 */
export class TimeoutError extends OrcaError {
  constructor(operation: string, timeout: number) {
    super(
      `Operation timed out: ${operation}`,
      'TIMEOUT',
      504,
      ErrorCategory.RETRYABLE,
      { operation, timeout_ms: timeout }
    );
  }
}

/**
 * Database error
 */
export class DatabaseError extends OrcaError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      ErrorCategory.RETRYABLE,
      context
    );
  }
}

/**
 * External API error
 */
export class ExternalApiError extends OrcaError {
  constructor(
    service: string,
    statusCode: number,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(
      `External API error (${service}): ${message}`,
      'EXTERNAL_API_ERROR',
      statusCode,
      statusCode >= 500 ? ErrorCategory.RETRYABLE : ErrorCategory.NON_RETRYABLE,
      { service, ...context }
    );
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends OrcaError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      'CONFIGURATION_ERROR',
      500,
      ErrorCategory.NON_RETRYABLE,
      context
    );
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof OrcaError) {
    return error.category === ErrorCategory.RETRYABLE;
  }
  return false;
}

/**
 * Convert error to API response format
 */
export function errorToResponse(error: Error): {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
} {
  if (error instanceof OrcaError) {
    return {
      code: error.code,
      message: error.message,
      status: error.statusCode,
      details: error.context,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unknown error occurred',
    status: 500,
  };
}
