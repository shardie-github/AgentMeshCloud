/**
 * Policy Enforcer - ORCA Core
 * RBAC, data classification, and policy enforcement
 */

import { createLogger } from '@/common/logger';
import { EnforcementMode, Classification } from '@/common/types';
import { PolicyViolationError, AuthorizationError } from '@/common/errors';
import { orcaMetrics } from '@/telemetry/metrics';

const logger = createLogger('policy-enforcer');

export interface PolicyRule {
  id: string;
  name: string;
  enabled: boolean;
  enforcement: EnforcementMode;
  evaluate: (context: PolicyContext) => Promise<PolicyResult>;
}

export interface PolicyContext {
  user_id?: string;
  role?: string;
  agent_id?: string;
  resource: string;
  action: string;
  data?: unknown;
  ip_address?: string;
  classification?: Classification;
  metadata?: Record<string, unknown>;
}

export interface PolicyResult {
  allowed: boolean;
  policy_id: string;
  violations?: PolicyViolation[];
  modifications?: Record<string, unknown>;
}

export interface PolicyViolation {
  policy_id: string;
  rule_id?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  remediation?: string;
}

/**
 * Policy Enforcer Service
 */
export class PolicyEnforcer {
  private policies: Map<string, PolicyRule>;
  private piiPatterns: Map<string, RegExp>;

  constructor() {
    this.policies = new Map();
    this.piiPatterns = new Map([
      ['ssn', /\b\d{3}-\d{2}-\d{4}\b/g],
      ['credit_card', /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g],
      ['email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g],
      ['phone', /\b\+?1?\d{10,15}\b/g],
      ['api_key', /(?i)(api[_-]?key|apikey|token)["']?\s*[:=]\s*["']?[a-zA-Z0-9_-]{20,}/gi],
    ]);
    
    this.loadDefaultPolicies();
  }

  /**
   * Register a policy rule
   */
  registerPolicy(policy: PolicyRule): void {
    logger.info('Registering policy', { policy_id: policy.id, name: policy.name });
    this.policies.set(policy.id, policy);
  }

  /**
   * Enforce policies for a given context
   */
  async enforce(context: PolicyContext): Promise<PolicyResult> {
    logger.debug('Enforcing policies', {
      user: context.user_id,
      resource: context.resource,
      action: context.action,
    });

    const results: PolicyResult[] = [];
    const violations: PolicyViolation[] = [];

    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      try {
        const result = await policy.evaluate(context);
        results.push(result);

        if (!result.allowed) {
          if (result.violations) {
            violations.push(...result.violations);
          }

          // Record metric
          orcaMetrics.recordPolicyViolation(policy.id, context.agent_id || 'unknown');

          // Handle enforcement mode
          if (policy.enforcement === EnforcementMode.BLOCKING) {
            logger.warn('Policy violation - blocking request', {
              policy_id: policy.id,
              user: context.user_id,
              resource: context.resource,
            });

            throw new PolicyViolationError(
              policy.id,
              result.violations?.[0]?.message || 'Policy violation',
              { violations: result.violations }
            );
          } else if (policy.enforcement === EnforcementMode.LOGGING) {
            logger.warn('Policy violation - logging only', {
              policy_id: policy.id,
              user: context.user_id,
              resource: context.resource,
              violations: result.violations,
            });
          }
        }
      } catch (error) {
        if (error instanceof PolicyViolationError) {
          throw error;
        }
        logger.error('Error evaluating policy', error as Error, { policy_id: policy.id });
      }
    }

    const allowed = violations.length === 0 || 
                     violations.every(v => v.severity !== 'critical');

    return {
      allowed,
      policy_id: 'aggregate',
      violations: violations.length > 0 ? violations : undefined,
    };
  }

  /**
   * Check RBAC permissions
   */
  async checkRBAC(
    role: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    // Simple role-based access control
    // In production, this would query a proper RBAC system
    const permissions: Record<string, string[]> = {
      admin: ['*'],
      user: ['read:public', 'read:internal', 'write:internal'],
      service_account: ['read:*', 'write:internal'],
      anonymous: ['read:public'],
    };

    const rolePermissions = permissions[role] || [];
    const requiredPermission = `${action}:${resource}`;

    return rolePermissions.includes('*') || 
           rolePermissions.includes(requiredPermission) ||
           rolePermissions.some(p => p.endsWith(':*') && requiredPermission.startsWith(p.split(':')[0]));
  }

  /**
   * Detect PII in text
   */
  detectPII(text: string): { type: string; matches: string[] }[] {
    const detected: { type: string; matches: string[] }[] = [];

    for (const [type, pattern] of this.piiPatterns.entries()) {
      const matches = text.match(pattern);
      if (matches) {
        detected.push({ type, matches });
      }
    }

    return detected;
  }

  /**
   * Redact PII from text
   */
  redactPII(text: string, replacement: string = '[REDACTED]'): string {
    let redacted = text;
    
    for (const pattern of this.piiPatterns.values()) {
      redacted = redacted.replace(pattern, replacement);
    }

    return redacted;
  }

  /**
   * Classify data sensitivity
   */
  classifyData(data: unknown): Classification {
    const dataStr = JSON.stringify(data);
    const piiDetected = this.detectPII(dataStr);

    if (piiDetected.length > 0) {
      // Check severity of PII
      if (piiDetected.some(p => ['ssn', 'credit_card'].includes(p.type))) {
        return Classification.CRITICAL;
      }
      return Classification.RESTRICTED;
    }

    // Default classification based on content heuristics
    return Classification.INTERNAL;
  }

  /**
   * Load default policies
   */
  private loadDefaultPolicies(): void {
    // RBAC Policy
    this.registerPolicy({
      id: 'rbac-access-control',
      name: 'Role-Based Access Control',
      enabled: true,
      enforcement: EnforcementMode.BLOCKING,
      evaluate: async (context) => {
        if (!context.role) {
          return {
            allowed: false,
            policy_id: 'rbac-access-control',
            violations: [{
              policy_id: 'rbac-access-control',
              message: 'No role specified',
              severity: 'critical',
            }],
          };
        }

        const allowed = await this.checkRBAC(context.role, context.resource, context.action);

        return {
          allowed,
          policy_id: 'rbac-access-control',
          violations: allowed ? undefined : [{
            policy_id: 'rbac-access-control',
            message: `Role '${context.role}' not authorized for '${context.action}:${context.resource}'`,
            severity: 'critical',
            remediation: 'Request appropriate permissions from administrator',
          }],
        };
      },
    });

    // PII Protection Policy
    this.registerPolicy({
      id: 'pii-protection',
      name: 'PII Detection and Protection',
      enabled: true,
      enforcement: EnforcementMode.BLOCKING,
      evaluate: async (context) => {
        if (!context.data) {
          return { allowed: true, policy_id: 'pii-protection' };
        }

        const dataStr = JSON.stringify(context.data);
        const piiDetected = this.detectPII(dataStr);

        if (piiDetected.length === 0) {
          return { allowed: true, policy_id: 'pii-protection' };
        }

        // Check if PII is allowed based on classification
        if (context.classification === Classification.PUBLIC) {
          return {
            allowed: false,
            policy_id: 'pii-protection',
            violations: [{
              policy_id: 'pii-protection',
              message: 'PII detected in public data',
              severity: 'critical',
              remediation: 'Remove PII or change classification',
            }],
          };
        }

        logger.warn('PII detected in request', {
          types: piiDetected.map(p => p.type),
          count: piiDetected.reduce((acc, p) => acc + p.matches.length, 0),
        });

        return { allowed: true, policy_id: 'pii-protection' };
      },
    });

    // Rate Limiting Policy
    this.registerPolicy({
      id: 'rate-limiting',
      name: 'Rate Limiting',
      enabled: true,
      enforcement: EnforcementMode.BLOCKING,
      evaluate: async (context) => {
        // Simplified rate limiting - in production use Redis/proper rate limiter
        // This is just a placeholder
        return { allowed: true, policy_id: 'rate-limiting' };
      },
    });

    logger.info('Default policies loaded', { count: this.policies.size });
  }

  /**
   * Get policy statistics
   */
  getStats(): { total: number; enabled: number; by_enforcement: Record<string, number> } {
    const policies = Array.from(this.policies.values());
    const byEnforcement: Record<string, number> = {};

    for (const policy of policies) {
      byEnforcement[policy.enforcement] = (byEnforcement[policy.enforcement] || 0) + 1;
    }

    return {
      total: policies.length,
      enabled: policies.filter(p => p.enabled).length,
      by_enforcement: byEnforcement,
    };
  }
}

/**
 * Singleton instance
 */
export const policyEnforcer = new PolicyEnforcer();
