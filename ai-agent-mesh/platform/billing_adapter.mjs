/**
 * Billing Adapter for AI-Agent Mesh
 * Integrates with Stripe for metered usage billing and subscription management
 * 
 * @module BillingAdapter
 * @version 3.0.0
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export class BillingAdapter {
  constructor(stripeSecretKey, supabaseUrl, supabaseKey) {
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
    this.db = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Create a new customer in Stripe and link to tenant
   * @param {Object} customerData - Customer information
   * @returns {Promise<Object>} Stripe customer and subscription
   */
  async createCustomer(customerData) {
    const {
      tenantId,
      email,
      organizationName,
      tier = 'free',
      paymentMethodId = null,
      billingAddress = {}
    } = customerData;

    try {
      // Create Stripe customer
      const customer = await this.stripe.customers.create({
        email,
        name: organizationName,
        metadata: {
          tenantId,
          tier
        },
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId
        },
        address: billingAddress
      });

      // Create subscription if not free tier
      let subscription = null;
      if (tier !== 'free') {
        subscription = await this.createSubscription(customer.id, tier);
      }

      // Store billing relationship
      await this.db
        .from('billing_accounts')
        .insert({
          tenant_id: tenantId,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription?.id,
          tier,
          status: subscription?.status || 'free',
          created_at: new Date().toISOString()
        });

      return {
        customerId: customer.id,
        subscriptionId: subscription?.id,
        status: subscription?.status || 'free',
        tier
      };
    } catch (error) {
      console.error('Failed to create customer:', error);
      throw new Error(`Billing setup failed: ${error.message}`);
    }
  }

  /**
   * Create subscription based on tier
   * @param {string} customerId - Stripe customer ID
   * @param {string} tier - Subscription tier
   * @returns {Promise<Object>} Stripe subscription
   */
  async createSubscription(customerId, tier) {
    const priceMapping = {
      pro: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly'
    };

    if (!priceMapping[tier]) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceMapping[tier],
        },
        // Add metered billing for API calls
        {
          price: process.env.STRIPE_PRICE_API_CALLS || 'price_api_calls_metered',
        },
        // Add metered billing for agent hours
        {
          price: process.env.STRIPE_PRICE_AGENT_HOURS || 'price_agent_hours_metered',
        }
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent']
    });

    return subscription;
  }

  /**
   * Report metered usage to Stripe
   * @param {string} tenantId - Tenant identifier
   * @param {Object} usage - Usage metrics
   */
  async reportUsage(tenantId, usage) {
    const { apiCalls = 0, agentHours = 0, storage = 0 } = usage;

    try {
      // Get subscription items
      const { data: billing } = await this.db
        .from('billing_accounts')
        .select('stripe_subscription_id')
        .eq('tenant_id', tenantId)
        .single();

      if (!billing?.stripe_subscription_id) {
        console.log('No active subscription for usage reporting');
        return;
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        billing.stripe_subscription_id
      );

      // Find metered items
      const apiCallsItem = subscription.items.data.find(
        item => item.price.id === process.env.STRIPE_PRICE_API_CALLS
      );
      const agentHoursItem = subscription.items.data.find(
        item => item.price.id === process.env.STRIPE_PRICE_AGENT_HOURS
      );

      // Report API calls usage
      if (apiCallsItem && apiCalls > 0) {
        await this.stripe.subscriptionItems.createUsageRecord(
          apiCallsItem.id,
          {
            quantity: apiCalls,
            timestamp: Math.floor(Date.now() / 1000),
            action: 'increment'
          }
        );
      }

      // Report agent hours usage
      if (agentHoursItem && agentHours > 0) {
        await this.stripe.subscriptionItems.createUsageRecord(
          agentHoursItem.id,
          {
            quantity: Math.ceil(agentHours),
            timestamp: Math.floor(Date.now() / 1000),
            action: 'increment'
          }
        );
      }

      // Log usage to database
      await this.db
        .from('usage_logs')
        .insert({
          tenant_id: tenantId,
          api_calls: apiCalls,
          agent_hours: agentHours,
          storage_gb: storage,
          timestamp: new Date().toISOString(),
          reported_to_stripe: true
        });

      return { success: true, usage };
    } catch (error) {
      console.error('Failed to report usage:', error);
      throw error;
    }
  }

  /**
   * Upgrade/downgrade subscription tier
   * @param {string} tenantId - Tenant identifier
   * @param {string} newTier - Target tier
   */
  async changeSubscription(tenantId, newTier) {
    const { data: billing } = await this.db
      .from('billing_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (!billing?.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }

    const priceMapping = {
      pro: process.env.STRIPE_PRICE_PRO,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE
    };

    const subscription = await this.stripe.subscriptions.retrieve(
      billing.stripe_subscription_id
    );

    // Update subscription
    const updated = await this.stripe.subscriptions.update(
      billing.stripe_subscription_id,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceMapping[newTier]
          }
        ],
        proration_behavior: 'create_prorations'
      }
    );

    // Update database
    await this.db
      .from('billing_accounts')
      .update({
        tier: newTier,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId);

    return updated;
  }

  /**
   * Cancel subscription
   * @param {string} tenantId - Tenant identifier
   * @param {boolean} immediately - Cancel immediately or at period end
   */
  async cancelSubscription(tenantId, immediately = false) {
    const { data: billing } = await this.db
      .from('billing_accounts')
      .select('stripe_subscription_id')
      .eq('tenant_id', tenantId)
      .single();

    if (!billing?.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }

    if (immediately) {
      await this.stripe.subscriptions.cancel(billing.stripe_subscription_id);
    } else {
      await this.stripe.subscriptions.update(billing.stripe_subscription_id, {
        cancel_at_period_end: true
      });
    }

    await this.db
      .from('billing_accounts')
      .update({
        status: immediately ? 'cancelled' : 'cancelling',
        cancelled_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId);

    return { success: true };
  }

  /**
   * Get billing dashboard URL for customer portal
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<string>} Customer portal URL
   */
  async getCustomerPortalUrl(tenantId, returnUrl) {
    const { data: billing } = await this.db
      .from('billing_accounts')
      .select('stripe_customer_id')
      .eq('tenant_id', tenantId)
      .single();

    if (!billing?.stripe_customer_id) {
      throw new Error('No billing account found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: returnUrl || process.env.APP_URL
    });

    return session.url;
  }

  /**
   * Calculate monthly recurring revenue (MRR)
   * @returns {Promise<Object>} Revenue metrics
   */
  async calculateMRR() {
    const { data: subscriptions } = await this.db
      .from('billing_accounts')
      .select('tier, status')
      .in('status', ['active', 'trialing']);

    const pricing = {
      pro: 99,
      enterprise: 999
    };

    let mrr = 0;
    const breakdown = { free: 0, pro: 0, enterprise: 0 };

    subscriptions?.forEach(sub => {
      const tier = sub.tier || 'free';
      breakdown[tier]++;
      mrr += pricing[tier] || 0;
    });

    return {
      mrr,
      arr: mrr * 12,
      breakdown,
      totalCustomers: subscriptions?.length || 0
    };
  }

  /**
   * Handle Stripe webhook events
   * @param {Object} event - Stripe webhook event
   */
  async handleWebhook(event) {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncSubscriptionStatus(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;

      case 'customer.updated':
        await this.syncCustomerData(event.data.object);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  async syncSubscriptionStatus(subscription) {
    await this.db
      .from('billing_accounts')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  async handleSubscriptionCancelled(subscription) {
    await this.db
      .from('billing_accounts')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    // TODO: Notify tenant via email
  }

  async handleInvoicePaid(invoice) {
    await this.db
      .from('billing_invoices')
      .insert({
        stripe_invoice_id: invoice.id,
        stripe_customer_id: invoice.customer,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      });
  }

  async handlePaymentFailed(invoice) {
    // TODO: Send alert to tenant and admin
    console.error('Payment failed for invoice:', invoice.id);
  }

  async syncCustomerData(customer) {
    await this.db
      .from('billing_accounts')
      .update({
        customer_email: customer.email,
        customer_name: customer.name
      })
      .eq('stripe_customer_id', customer.id);
  }
}

export default BillingAdapter;
