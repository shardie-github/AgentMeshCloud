/**
 * Privacy Redactor Middleware
 * Automatically redacts PII from logs, responses, and audit trails
 * Supports GDPR, CCPA, and other privacy regulations
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/common/logger.js';

/**
 * PII patterns for detection and redaction
 */
const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (various formats)
  phone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  
  // SSN (US)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Credit card numbers
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  
  // IP addresses
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  
  // API keys and tokens (common patterns)
  apiKey: /\b(sk|pk)_live_[a-zA-Z0-9]{24,}\b/g,
  bearerToken: /\b(Bearer|bearer)\s+[a-zA-Z0-9_-]{20,}\b/g,
  
  // Passwords in URLs or bodies
  password: /(password|passwd|pwd)["']?\s*[:=]\s*["']?[^\s"',}]{8,}/gi,
};

/**
 * Fields that should always be redacted
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'apiKey',
  'api_key',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'privateKey',
  'private_key',
  'ssn',
  'creditCard',
  'credit_card',
  'cvv',
  'pin',
]);

/**
 * Redaction modes
 */
export type RedactionMode = 'mask' | 'hash' | 'remove';

export interface RedactorOptions {
  mode?: RedactionMode;
  preserveLength?: boolean;
  maskChar?: string;
  logRedactions?: boolean;
}

/**
 * Redact sensitive data from string
 */
export function redactString(
  input: string,
  mode: RedactionMode = 'mask',
  maskChar = '*'
): string {
  let redacted = input;

  // Apply all PII patterns
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    redacted = redacted.replace(pattern, (match) => {
      if (mode === 'mask') {
        return maskChar.repeat(Math.min(match.length, 8));
      } else if (mode === 'hash') {
        return `[REDACTED:${type}:${hashString(match).substring(0, 8)}]`;
      } else {
        return `[REDACTED:${type}]`;
      }
    });
  }

  return redacted;
}

/**
 * Redact sensitive data from object (recursive)
 */
export function redactObject(
  obj: any,
  options: RedactorOptions = {}
): any {
  const { mode = 'mask', preserveLength = false, maskChar = '*' } = options;

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return redactString(obj, mode, maskChar);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, options));
  }

  if (typeof obj === 'object') {
    const redacted: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if field name is sensitive
      if (SENSITIVE_FIELDS.has(lowerKey) || lowerKey.includes('secret')) {
        if (mode === 'remove') {
          continue; // Skip field entirely
        } else if (typeof value === 'string') {
          redacted[key] = preserveLength
            ? maskChar.repeat(value.length)
            : '[REDACTED]';
        } else {
          redacted[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object' || typeof value === 'string') {
        redacted[key] = redactObject(value, options);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  return obj;
}

/**
 * Express middleware to redact sensitive data from request/response
 */
export function privacyRedactor(options: RedactorOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Redact request body for logging
    if (req.body && typeof req.body === 'object') {
      const originalBody = req.body;
      Object.defineProperty(req, 'sanitizedBody', {
        get() {
          return redactObject(originalBody, options);
        },
        enumerable: false,
      });
    }

    // Redact query parameters
    if (req.query && typeof req.query === 'object') {
      const originalQuery = req.query;
      Object.defineProperty(req, 'sanitizedQuery', {
        get() {
          return redactObject(originalQuery, options);
        },
        enumerable: false,
      });
    }

    // Intercept response JSON
    const originalJson = res.json.bind(res);
    res.json = function (body: any): Response {
      const redactedBody = redactObject(body, options);
      return originalJson(redactedBody);
    };

    // Log redacted request
    if (options.logRedactions) {
      logger.info('Request processed with privacy redaction', {
        method: req.method,
        path: req.path,
        sanitizedBody: (req as any).sanitizedBody,
        sanitizedQuery: (req as any).sanitizedQuery,
      });
    }

    next();
  };
}

/**
 * Redact logs before emission
 */
export function redactLogMessage(message: string, metadata?: any): {
  message: string;
  metadata?: any;
} {
  return {
    message: redactString(message),
    metadata: metadata ? redactObject(metadata) : undefined,
  };
}

/**
 * Hash string for deterministic redaction
 */
function hashString(input: string): string {
  // Simple hash for redaction (not cryptographic)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if string contains PII
 */
export function containsPII(input: string): boolean {
  for (const pattern of Object.values(PII_PATTERNS)) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Anonymize user identifier (GDPR right to be forgotten)
 */
export function anonymizeUserId(userId: string): string {
  return `anon_${hashString(userId + Date.now())}`;
}

/**
 * Data minimization - remove unnecessary fields
 */
export function minimizeData<T extends Record<string, any>>(
  data: T,
  allowedFields: string[]
): Partial<T> {
  const minimized: Partial<T> = {};
  const allowedSet = new Set(allowedFields);

  for (const [key, value] of Object.entries(data)) {
    if (allowedSet.has(key)) {
      minimized[key as keyof T] = value;
    }
  }

  return minimized;
}
