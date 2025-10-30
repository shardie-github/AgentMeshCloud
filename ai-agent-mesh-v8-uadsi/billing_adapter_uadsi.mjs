#!/usr/bin/env node
/**
 * UADSI Billing Adapter
 * Handles subscription management, usage tracking, and payment processing
 * Integrates with Stripe, billing systems, and usage metering
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

export class UADSIBillingAdapter extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      stripeSecretKey: config.stripeSecretKey || process.env.STRIPE_SECRET_KEY,
      supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL,
      supabaseKey: config.supabaseKey || process.env.SUPABASE_KEY,
      ...config
    };
    
    this.stripe = new Stripe(this.config.stripeSecretKey);
    this.db = createClient(this.config.supabaseUrl, this.config.supabaseKey);
    
    // Pricing configuration (from uadsi_pricing_sheet.yaml)
    this.plans = {
      professional: {
        monthly_price: 499,
        annual_price: 4990,
        limits: {
          agents: 100,
          workflows: 50,
          users: 5,
          api_calls_per_month: 100000
        },
        overage_fees: {
          agents_per_100: 99,
          workflows_per_50: 49,
          api_calls_per_10k: 9
        }
      },
      enterprise: {
        monthly_price: 2499,
        annual_price: 24990,
        limits: {
          agents: Infinity,
          workflows: Infinity,
          users: Infinity,
          api_calls_per_month: Infinity
        }
      }
    };
  }

  /**
   * Initialize billing adapter
   */
  async initialize() {
    console.log('💳 Initializing UADSI Billing Adapter...');
    await this.ensureSchema();
    this.emit('initialized');
    console.log('✅ Billing Adapter initialized');
  }

  /**
   * Ensure database schema for billing
   */
  async ensureSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS uadsi_subscriptions (
        subscription_id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        plan_tier TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        status TEXT NOT NULL,
        current_period_start TIMESTAMPTZ NOT NULL,
        current_period_end TIMESTAMPTZ NOT NULL,
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,
        trial_end TIMESTAMPTZ,
        cancel_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS uadsi_usage (
        usage_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        metric_value INTEGER NOT NULL,
        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        metadata JSONB
      );

      CREATE TABLE IF NOT EXISTS uadsi_invoices (
        invoice_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        amount_due INTEGER NOT NULL,
        amount_paid INTEGER,
        currency TEXT DEFAULT 'usd',
        status TEXT NOT NULL,
        due_date TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        stripe_invoice_id TEXT,
        line_items JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON uadsi_subscriptions(organization_id);
      CREATE INDEX IF NOT EXISTS idx_usage_subscription ON uadsi_usage(subscription_id, recorded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON uadsi_invoices(subscription_id, created_at DESC);
    `;

    try {
      await this.db.rpc('exec_sql', { sql: schema });
    } catch (error) {
      console.log('Schema check:', error.message);
    }
  }

  /**
   * Create a new subscription
   */
  async createSubscription(params) {
    const {
      organizationId,
      planTier,
      billingCycle,
      email,
      paymentMethodId,
      trialDays = 14
    } = params;

    try {
      // Create or get Stripe customer
      const customer = await this.createStripeCustomer(organizationId, email);
      
      // Attach payment method
      if (paymentMethodId) {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id
        });
        
        await this.stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });
      }

      // Get plan pricing
      const plan = this.plans[planTier];
      const amount = billingCycle === 'annual' ? plan.annual_price : plan.monthly_price;
      
      // Create Stripe price
      const price = await this.stripe.prices.create({
        unit_amount: amount * 100, // Convert to cents
        currency: 'usd',
        recurring: {
          interval: billingCycle === 'annual' ? 'year' : 'month'
        },
        product_data: {
          name: `UADSI ${planTier.charAt(0).toUpperCase() + planTier.slice(1)}`,
          metadata: {
            plan_tier: planTier
          }
        }
      });

      // Create Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
        trial_period_days: trialDays,
        metadata: {
          organization_id: organizationId,
          plan_tier: planTier
        }
      });

      // Store subscription in database
      const subscription = await this.storeSubscription({
        subscription_id: `uadsi_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organization_id: organizationId,
        plan_tier: planTier,
        billing_cycle: billingCycle,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: customer.id,
        trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null
      });

      this.emit('subscription:created', subscription);
      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Create or retrieve Stripe customer
   */
  async createStripeCustomer(organizationId, email) {
    // Check if customer already exists
    const { data: existingSub } = await this.db
      .from('uadsi_subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .limit(1);
    
    if (existingSub?.[0]?.stripe_customer_id) {
      return await this.stripe.customers.retrieve(existingSub[0].stripe_customer_id);
    }

    // Create new customer
    return await this.stripe.customers.create({
      email,
      metadata: {
        organization_id: organizationId
      }
    });
  }

  /**
   * Store subscription in database
   */
  async storeSubscription(subscription) {
    const { error } = await this.db
      .from('uadsi_subscriptions')
      .insert(subscription);
    
    if (error) throw error;
    return subscription;
  }

  /**
   * Record usage for a subscription
   */
  async recordUsage(subscriptionId, metricType, metricValue) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usage = {
      usage_id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscription_id: subscriptionId,
      metric_type: metricType,
      metric_value: metricValue,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString()
    };

    const { error } = await this.db
      .from('uadsi_usage')
      .insert(usage);
    
    if (error) {
      console.error('Error recording usage:', error);
      throw error;
    }

    // Check for overages
    await this.checkOverages(subscriptionId);
    
    this.emit('usage:recorded', usage);
    return usage;
  }

  /**
   * Check for usage overages and calculate fees
   */
  async checkOverages(subscriptionId) {
    // Get subscription
    const { data: subscription } = await this.db
      .from('uadsi_subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();
    
    if (!subscription) return;

    const plan = this.plans[subscription.plan_tier];
    if (!plan.overage_fees) return; // Enterprise has no overages

    // Get current period usage
    const { data: usageRecords } = await this.db
      .from('uadsi_usage')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .gte('period_start', subscription.current_period_start);
    
    const usage = this.aggregateUsage(usageRecords);
    
    // Calculate overages
    const overages = {};
    
    if (usage.agents > plan.limits.agents) {
      const overage = Math.ceil((usage.agents - plan.limits.agents) / 100);
      overages.agents = {
        units: overage,
        fee: overage * plan.overage_fees.agents_per_100
      };
    }
    
    if (usage.workflows > plan.limits.workflows) {
      const overage = Math.ceil((usage.workflows - plan.limits.workflows) / 50);
      overages.workflows = {
        units: overage,
        fee: overage * plan.overage_fees.workflows_per_50
      };
    }
    
    if (usage.api_calls > plan.limits.api_calls_per_month) {
      const overage = Math.ceil((usage.api_calls - plan.limits.api_calls_per_month) / 10000);
      overages.api_calls = {
        units: overage,
        fee: overage * plan.overage_fees.api_calls_per_10k
      };
    }

    if (Object.keys(overages).length > 0) {
      this.emit('overages:detected', { subscriptionId, overages });
      return overages;
    }

    return null;
  }

  /**
   * Aggregate usage records
   */
  aggregateUsage(usageRecords) {
    const usage = {
      agents: 0,
      workflows: 0,
      api_calls: 0
    };

    for (const record of usageRecords || []) {
      if (record.metric_type in usage) {
        usage[record.metric_type] = Math.max(usage[record.metric_type], record.metric_value);
      }
    }

    return usage;
  }

  /**
   * Generate invoice with overages
   */
  async generateInvoice(subscriptionId) {
    const { data: subscription } = await this.db
      .from('uadsi_subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();
    
    if (!subscription) throw new Error('Subscription not found');

    const plan = this.plans[subscription.plan_tier];
    const baseAmount = subscription.billing_cycle === 'annual' 
      ? plan.annual_price 
      : plan.monthly_price;

    const overages = await this.checkOverages(subscriptionId);
    
    const lineItems = [
      {
        description: `UADSI ${subscription.plan_tier} - ${subscription.billing_cycle}`,
        amount: baseAmount,
        quantity: 1
      }
    ];

    let totalOverageFee = 0;

    if (overages) {
      for (const [metric, overage] of Object.entries(overages)) {
        lineItems.push({
          description: `${metric} overage (${overage.units} units)`,
          amount: overage.fee,
          quantity: 1
        });
        totalOverageFee += overage.fee;
      }
    }

    const totalAmount = baseAmount + totalOverageFee;

    // Create Stripe invoice if not already exists
    let stripeInvoiceId = null;
    if (subscription.stripe_customer_id) {
      try {
        const stripeInvoice = await this.stripe.invoices.create({
          customer: subscription.stripe_customer_id,
          auto_advance: true,
          metadata: {
            subscription_id: subscriptionId
          }
        });

        // Add line items
        for (const item of lineItems) {
          await this.stripe.invoiceItems.create({
            customer: subscription.stripe_customer_id,
            invoice: stripeInvoice.id,
            amount: Math.round(item.amount * 100),
            currency: 'usd',
            description: item.description
          });
        }

        await this.stripe.invoices.finalizeInvoice(stripeInvoice.id);
        stripeInvoiceId = stripeInvoice.id;
      } catch (error) {
        console.error('Error creating Stripe invoice:', error);
      }
    }

    const invoice = {
      invoice_id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscription_id: subscriptionId,
      amount_due: Math.round(totalAmount * 100), // Store in cents
      currency: 'usd',
      status: 'pending',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      stripe_invoice_id: stripeInvoiceId,
      line_items: lineItems
    };

    const { error } = await this.db
      .from('uadsi_invoices')
      .insert(invoice);
    
    if (error) throw error;

    this.emit('invoice:generated', invoice);
    return invoice;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, immediate = false) {
    const { data: subscription } = await this.db
      .from('uadsi_subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();
    
    if (!subscription) throw new Error('Subscription not found');

    // Cancel in Stripe
    if (subscription.stripe_subscription_id) {
      await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: !immediate
      });

      if (immediate) {
        await this.stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      }
    }

    // Update database
    const { error } = await this.db
      .from('uadsi_subscriptions')
      .update({
        status: immediate ? 'canceled' : 'canceling',
        cancel_at: immediate ? new Date().toISOString() : subscription.current_period_end,
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscriptionId);
    
    if (error) throw error;

    this.emit('subscription:canceled', { subscriptionId, immediate });
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId) {
    const { data, error } = await this.db
      .from('uadsi_subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Get organization's current usage
   */
  async getUsage(subscriptionId) {
    const { data: subscription } = await this.db
      .from('uadsi_subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();
    
    if (!subscription) throw new Error('Subscription not found');

    const { data: usageRecords } = await this.db
      .from('uadsi_usage')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .gte('period_start', subscription.current_period_start);
    
    const usage = this.aggregateUsage(usageRecords);
    const plan = this.plans[subscription.plan_tier];
    
    return {
      subscription_id: subscriptionId,
      plan_tier: subscription.plan_tier,
      billing_cycle: subscription.billing_cycle,
      current_usage: usage,
      limits: plan.limits,
      utilization: {
        agents: plan.limits.agents === Infinity ? 0 : (usage.agents / plan.limits.agents * 100),
        workflows: plan.limits.workflows === Infinity ? 0 : (usage.workflows / plan.limits.workflows * 100),
        api_calls: plan.limits.api_calls_per_month === Infinity ? 0 : (usage.api_calls / plan.limits.api_calls_per_month * 100)
      }
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event) {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
    }
  }

  async handlePaymentSucceeded(invoice) {
    await this.db
      .from('uadsi_invoices')
      .update({
        status: 'paid',
        amount_paid: invoice.amount_paid,
        paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      })
      .eq('stripe_invoice_id', invoice.id);
    
    this.emit('payment:succeeded', invoice);
  }

  async handlePaymentFailed(invoice) {
    await this.db
      .from('uadsi_invoices')
      .update({ status: 'failed' })
      .eq('stripe_invoice_id', invoice.id);
    
    this.emit('payment:failed', invoice);
  }

  async handleSubscriptionUpdated(subscription) {
    await this.db
      .from('uadsi_subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  async handleSubscriptionDeleted(subscription) {
    await this.db
      .from('uadsi_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  /**
   * Shutdown billing adapter
   */
  async shutdown() {
    this.emit('shutdown');
    console.log('🛑 Billing Adapter shutdown');
  }
}

export default UADSIBillingAdapter;
