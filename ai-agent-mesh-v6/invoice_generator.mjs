#!/usr/bin/env node

/**
 * Invoice Generator
 * Auto-generates monthly invoice PDFs per tenant with multi-currency and tax support
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { parse } from 'yaml';

class InvoiceGenerator {
  constructor() {
    this.billingMatrix = null;
    this.invoiceCounter = 1000;
  }

  /**
   * Initialize invoice generator
   */
  async initialize() {
    console.log('📄 Initializing Invoice Generator...');
    
    try {
      const billingContent = readFileSync('./billing_matrix.yaml', 'utf8');
      this.billingMatrix = parse(billingContent);
      
      // Create invoices directory
      if (!existsSync('./invoices')) {
        mkdirSync('./invoices', { recursive: true });
      }
      
      console.log('✅ Invoice Generator initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      return false;
    }
  }

  /**
   * Generate invoice for tenant
   */
  async generateInvoice(tenantId, period, tenantData) {
    console.log(`\n📝 Generating invoice for ${tenantId}...`);
    
    const {
      name,
      region,
      plan,
      currency = 'USD',
      addOns = [],
      usageOverages = {},
      billingAddress,
      taxId = null
    } = tenantData;
    
    // Get billing configuration
    const currencyConfig = this.billingMatrix.currencies[currency];
    const planConfig = this.billingMatrix.plans[plan];
    const taxZone = this.getTaxZone(region);
    
    // Calculate invoice
    const invoice = {
      invoiceNumber: this.generateInvoiceNumber(),
      tenantId,
      tenantName: name,
      period: {
        start: period.start,
        end: period.end,
        type: 'monthly'
      },
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: this.calculateDueDate(7),
      currency: currency,
      currencySymbol: currencyConfig.symbol,
      lineItems: [],
      subtotal: 0,
      taxBreakdown: [],
      totalTax: 0,
      total: 0,
      billingAddress,
      taxId,
      paymentTerms: 'NET7',
      paymentMethods: this.getAvailablePaymentMethods(currency)
    };
    
    // Add plan base price
    const planPrice = planConfig.basePrice[currency];
    invoice.lineItems.push({
      description: `${planConfig.name} Plan`,
      quantity: 1,
      unitPrice: planPrice,
      amount: planPrice,
      details: this.formatPlanFeatures(planConfig.features)
    });
    invoice.subtotal += planPrice;
    
    // Add add-ons
    for (const addOn of addOns) {
      const addOnConfig = this.billingMatrix.addOns[addOn.type];
      if (addOnConfig) {
        const addOnPrice = addOnConfig.price[currency] * addOn.quantity;
        invoice.lineItems.push({
          description: addOnConfig.name,
          quantity: addOn.quantity,
          unitPrice: addOnConfig.price[currency],
          amount: addOnPrice
        });
        invoice.subtotal += addOnPrice;
      }
    }
    
    // Add usage overages
    if (usageOverages.agents) {
      const overagePrice = this.calculateOveragePrice('agents', usageOverages.agents, plan, currency);
      invoice.lineItems.push({
        description: `Additional Agent Usage (${usageOverages.agents} over limit)`,
        quantity: 1,
        unitPrice: overagePrice,
        amount: overagePrice
      });
      invoice.subtotal += overagePrice;
    }
    
    if (usageOverages.apiCalls) {
      const overagePrice = this.calculateOveragePrice('apiCalls', usageOverages.apiCalls, plan, currency);
      invoice.lineItems.push({
        description: `Additional API Calls (${usageOverages.apiCalls.toLocaleString()} over limit)`,
        quantity: 1,
        unitPrice: overagePrice,
        amount: overagePrice
      });
      invoice.subtotal += overagePrice;
    }
    
    // Calculate taxes
    const taxes = this.calculateTaxes(invoice.subtotal, taxZone, billingAddress, taxId);
    invoice.taxBreakdown = taxes.breakdown;
    invoice.totalTax = taxes.total;
    
    // Calculate total
    invoice.total = invoice.subtotal + invoice.totalTax;
    
    // Round to currency decimal places
    invoice.subtotal = this.roundAmount(invoice.subtotal, currencyConfig.decimalPlaces);
    invoice.totalTax = this.roundAmount(invoice.totalTax, currencyConfig.decimalPlaces);
    invoice.total = this.roundAmount(invoice.total, currencyConfig.decimalPlaces);
    
    // Save invoice
    await this.saveInvoice(invoice);
    
    console.log('✅ Invoice generated');
    console.log(`   Invoice #: ${invoice.invoiceNumber}`);
    console.log(`   Subtotal: ${currencyConfig.symbol}${invoice.subtotal.toFixed(2)}`);
    console.log(`   Tax: ${currencyConfig.symbol}${invoice.totalTax.toFixed(2)}`);
    console.log(`   Total: ${currencyConfig.symbol}${invoice.total.toFixed(2)}`);
    console.log(`   Due Date: ${invoice.dueDate}`);
    
    return invoice;
  }

  /**
   * Generate invoice number
   */
  generateInvoiceNumber() {
    const prefix = 'INV';
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const number = String(this.invoiceCounter++).padStart(4, '0');
    return `${prefix}-${year}${month}-${number}`;
  }

  /**
   * Calculate due date
   */
  calculateDueDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get tax zone for region
   */
  getTaxZone(region) {
    for (const [zone, config] of Object.entries(this.billingMatrix.taxZones)) {
      if (config.regions.includes(region)) {
        return { zone, ...config };
      }
    }
    return null;
  }

  /**
   * Calculate taxes
   */
  calculateTaxes(amount, taxZone, billingAddress, taxId) {
    const breakdown = [];
    let total = 0;
    
    if (!taxZone) {
      return { breakdown, total };
    }
    
    // Check for reverse charge (B2B in EU)
    if (taxZone.zone === 'EU' && taxZone.reverseCharge && taxId) {
      breakdown.push({
        type: 'VAT',
        rate: 0,
        amount: 0,
        note: 'Reverse charge applies - customer to account for VAT'
      });
      return { breakdown, total: 0 };
    }
    
    // Calculate based on tax type
    if (taxZone.type === 'state') {
      // US state tax
      const stateCode = billingAddress?.state || 'default';
      const rate = taxZone.rates.states?.[stateCode] || taxZone.rates.default;
      
      if (rate > 0) {
        const taxAmount = amount * rate;
        breakdown.push({
          type: `Sales Tax (${stateCode})`,
          rate: rate * 100,
          amount: taxAmount
        });
        total += taxAmount;
      }
    } else if (taxZone.type === 'vat') {
      // EU/ME/APAC VAT
      const countryCode = billingAddress?.country || 'default';
      const rate = taxZone.rates.countries?.[countryCode] || taxZone.rates.default;
      
      if (rate > 0) {
        const taxAmount = taxZone.taxInclusive 
          ? amount * rate / (1 + rate)  // Extract from inclusive price
          : amount * rate;  // Add to exclusive price
        
        breakdown.push({
          type: 'VAT',
          rate: rate * 100,
          amount: taxAmount
        });
        total += taxAmount;
      }
    } else if (taxZone.type === 'gst-pst') {
      // Canada GST/PST/HST
      const provinceCode = billingAddress?.province || 'default';
      
      if (taxZone.rates.provinces?.[provinceCode]) {
        // Combined rate (HST)
        const rate = taxZone.rates.provinces[provinceCode];
        const taxAmount = amount * rate;
        breakdown.push({
          type: `HST (${provinceCode})`,
          rate: rate * 100,
          amount: taxAmount
        });
        total += taxAmount;
      } else {
        // Separate GST
        const gstRate = taxZone.rates.GST;
        const gstAmount = amount * gstRate;
        breakdown.push({
          type: 'GST',
          rate: gstRate * 100,
          amount: gstAmount
        });
        total += gstAmount;
      }
    }
    
    return { breakdown, total };
  }

  /**
   * Calculate overage pricing
   */
  calculateOveragePrice(type, overageAmount, plan, currency) {
    if (type === 'agents') {
      const addOnConfig = this.billingMatrix.addOns.additionalAgents;
      const units = Math.ceil(overageAmount / 10);
      return addOnConfig.price[currency] * units;
    } else if (type === 'apiCalls') {
      // $10 per 10,000 additional calls
      const units = Math.ceil(overageAmount / 10000);
      return 10 * units * (this.billingMatrix.currencies[currency].exchangeRate);
    }
    return 0;
  }

  /**
   * Format plan features
   */
  formatPlanFeatures(features) {
    return Object.entries(features)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }

  /**
   * Get available payment methods
   */
  getAvailablePaymentMethods(currency) {
    const methods = [];
    
    for (const [method, config] of Object.entries(this.billingMatrix.paymentMethods)) {
      if (config.enabled && config.currencies.includes(currency)) {
        methods.push({
          method,
          name: method.charAt(0).toUpperCase() + method.slice(1).replace(/([A-Z])/g, ' $1'),
          fee: config.processingFee
        });
      }
    }
    
    return methods;
  }

  /**
   * Round amount to specified decimal places
   */
  roundAmount(amount, decimalPlaces) {
    const multiplier = Math.pow(10, decimalPlaces);
    return Math.round(amount * multiplier) / multiplier;
  }

  /**
   * Save invoice to file
   */
  async saveInvoice(invoice) {
    const filename = `./invoices/${invoice.invoiceNumber}.json`;
    writeFileSync(filename, JSON.stringify(invoice, null, 2));
    
    // In production, also generate PDF using a library like pdfkit or puppeteer
    // await this.generatePDF(invoice);
  }

  /**
   * Generate batch invoices
   */
  async generateBatchInvoices(tenants, period) {
    console.log(`\n📦 Generating batch invoices for ${tenants.length} tenants...\n`);
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const tenant of tenants) {
      try {
        const invoice = await this.generateInvoice(tenant.id, period, tenant);
        results.success.push({ tenantId: tenant.id, invoiceNumber: invoice.invoiceNumber });
      } catch (error) {
        results.failed.push({ tenantId: tenant.id, error: error.message });
        console.error(`❌ Failed for ${tenant.id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Batch complete:`);
    console.log(`   Success: ${results.success.length}`);
    console.log(`   Failed: ${results.failed.length}`);
    
    return results;
  }
}

// Main execution
async function main() {
  const generator = new InvoiceGenerator();
  
  if (!await generator.initialize()) {
    process.exit(1);
  }
  
  // Sample tenant data
  const sampleTenants = [
    {
      id: 'tenant-001',
      name: 'Acme Corporation',
      region: 'us-east-1',
      plan: 'enterprise',
      currency: 'USD',
      addOns: [
        { type: 'additionalAgents', quantity: 5 },
        { type: 'additionalStorage', quantity: 2 }
      ],
      usageOverages: {
        agents: 23,
        apiCalls: 50000
      },
      billingAddress: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        country: 'US'
      }
    },
    {
      id: 'tenant-002',
      name: 'TechStart GmbH',
      region: 'eu-central-1',
      plan: 'professional',
      currency: 'EUR',
      addOns: [],
      usageOverages: {},
      billingAddress: {
        street: 'Hauptstraße 1',
        city: 'Berlin',
        state: 'Berlin',
        zip: '10115',
        country: 'DE'
      },
      taxId: 'DE123456789'
    }
  ];
  
  const period = {
    start: '2025-10-01',
    end: '2025-10-31'
  };
  
  // Generate individual invoices
  for (const tenant of sampleTenants) {
    await generator.generateInvoice(tenant.id, period, tenant);
  }
  
  console.log('\n✅ All invoices generated successfully');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default InvoiceGenerator;
