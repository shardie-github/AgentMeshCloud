/**
 * Plan Matrix - Subscription Tiers & Feature Mapping
 * Maps subscription plans to features and quotas for billing integration
 */

import type { Quota } from './quotas.js';
import { PLANS } from './quotas.js';

export interface PlanFeatures {
  workflows: boolean;
  reporting: boolean;
  analytics: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  sla: boolean;
  sso: boolean;
  auditLogs: boolean;
  advancedSecurity: boolean;
  dedicatedInfra: boolean;
}

export interface PlanPricing {
  monthlyUSD: number;
  annualUSD: number; // Discounted annual price
  perSeatMonthly?: number; // Additional seats
  overage?: {
    workflow_executions: number; // Per 1000 executions
    storage_gb: number; // Per GB/month
    api_requests: number; // Per 10k requests
  };
}

export interface FullPlan {
  id: string;
  name: string;
  description: string;
  features: PlanFeatures;
  quotas: typeof PLANS.free.quotas;
  pricing: PlanPricing;
  stripePriceId?: string; // Stripe integration
  popular?: boolean;
}

/**
 * Complete plan matrix with features and pricing
 */
export const PLAN_MATRIX: Record<string, FullPlan> = {
  free: {
    ...PLANS.free!,
    description: 'Get started with basic workflow automation',
    features: {
      workflows: true,
      reporting: false,
      analytics: false,
      apiAccess: true,
      webhooks: false,
      customBranding: false,
      prioritySupport: false,
      sla: false,
      sso: false,
      auditLogs: false,
      advancedSecurity: false,
      dedicatedInfra: false,
    },
    pricing: {
      monthlyUSD: 0,
      annualUSD: 0,
    },
    stripePriceId: 'price_free',
  },

  starter: {
    ...PLANS.starter!,
    description: 'For growing teams and small businesses',
    features: {
      workflows: true,
      reporting: true,
      analytics: true,
      apiAccess: true,
      webhooks: true,
      customBranding: false,
      prioritySupport: false,
      sla: false,
      sso: false,
      auditLogs: false,
      advancedSecurity: false,
      dedicatedInfra: false,
    },
    pricing: {
      monthlyUSD: 29,
      annualUSD: 290, // ~17% discount
      perSeatMonthly: 10,
      overage: {
        workflow_executions: 5, // $5 per 1000 executions
        storage_gb: 2, // $2 per GB/month
        api_requests: 1, // $1 per 10k requests
      },
    },
    stripePriceId: 'price_starter_monthly',
    popular: true,
  },

  professional: {
    ...PLANS.professional!,
    description: 'For businesses requiring advanced automation',
    features: {
      workflows: true,
      reporting: true,
      analytics: true,
      apiAccess: true,
      webhooks: true,
      customBranding: true,
      prioritySupport: true,
      sla: false,
      sso: true,
      auditLogs: true,
      advancedSecurity: true,
      dedicatedInfra: false,
    },
    pricing: {
      monthlyUSD: 99,
      annualUSD: 990, // ~17% discount
      perSeatMonthly: 20,
      overage: {
        workflow_executions: 3,
        storage_gb: 1.5,
        api_requests: 0.5,
      },
    },
    stripePriceId: 'price_professional_monthly',
  },

  enterprise: {
    ...PLANS.enterprise!,
    description: 'For large organizations with custom needs',
    features: {
      workflows: true,
      reporting: true,
      analytics: true,
      apiAccess: true,
      webhooks: true,
      customBranding: true,
      prioritySupport: true,
      sla: true,
      sso: true,
      auditLogs: true,
      advancedSecurity: true,
      dedicatedInfra: true,
    },
    pricing: {
      monthlyUSD: 0, // Custom pricing
      annualUSD: 0,
      perSeatMonthly: 0,
    },
    stripePriceId: 'price_enterprise_custom',
  },
};

/**
 * Check if plan has feature enabled
 */
export function hasFeature(planId: string, feature: keyof PlanFeatures): boolean {
  const plan = PLAN_MATRIX[planId];
  if (!plan) return false;
  return plan.features[feature];
}

/**
 * Calculate overage charges
 */
export function calculateOverage(
  planId: string,
  usage: {
    workflow_executions?: number;
    storage_gb?: number;
    api_requests?: number;
  }
): number {
  const plan = PLAN_MATRIX[planId];
  if (!plan || !plan.pricing.overage) return 0;

  const { overage } = plan.pricing;
  let total = 0;

  if (usage.workflow_executions && overage.workflow_executions) {
    const overageAmount = Math.max(
      0,
      usage.workflow_executions - plan.quotas.workflow_executions.limit
    );
    total += (overageAmount / 1000) * overage.workflow_executions;
  }

  if (usage.storage_gb && overage.storage_gb) {
    const quotaGB = plan.quotas.storage_mb.limit / 1024;
    const overageAmount = Math.max(0, usage.storage_gb - quotaGB);
    total += overageAmount * overage.storage_gb;
  }

  if (usage.api_requests && overage.api_requests) {
    const overageAmount = Math.max(
      0,
      usage.api_requests - plan.quotas.api_requests.limit
    );
    total += (overageAmount / 10000) * overage.api_requests;
  }

  return Math.round(total * 100) / 100; // Round to 2 decimals
}

/**
 * Get upgrade recommendations based on usage
 */
export function getUpgradeRecommendations(
  currentPlanId: string,
  usage: {
    workflow_executions: number;
    storage_mb: number;
    api_requests: number;
  }
): { shouldUpgrade: boolean; recommendedPlan?: string; reason?: string } {
  const plan = PLAN_MATRIX[currentPlanId];
  if (!plan) return { shouldUpgrade: false };

  const utilizationThreshold = 0.8; // 80%

  // Check if approaching quota limits
  const quotas = plan.quotas;

  if (quotas.workflow_executions.limit > 0) {
    const utilization = usage.workflow_executions / quotas.workflow_executions.limit;
    if (utilization > utilizationThreshold) {
      const nextPlan = getNextPlan(currentPlanId);
      if (nextPlan) {
        return {
          shouldUpgrade: true,
          recommendedPlan: nextPlan,
          reason: `Workflow execution usage at ${(utilization * 100).toFixed(0)}%`,
        };
      }
    }
  }

  // Similar checks for other resources...

  return { shouldUpgrade: false };
}

/**
 * Get next tier plan
 */
function getNextPlan(currentPlanId: string): string | undefined {
  const planOrder = ['free', 'starter', 'professional', 'enterprise'];
  const currentIndex = planOrder.indexOf(currentPlanId);

  if (currentIndex < 0 || currentIndex >= planOrder.length - 1) {
    return undefined;
  }

  return planOrder[currentIndex + 1];
}
