#!/usr/bin/env node
/**
 * ORCA Revenue Predictor
 * 24-Month MRR/ARR Projection Model
 * 
 * Usage: node revenue_predictor.mjs [options]
 * 
 * @version 1.0
 * @date 2025-10-30
 */

import { writeFileSync } from 'fs';

// ============================================================================
// Configuration & Assumptions
// ============================================================================

const CONFIG = {
  // Current State (Q4 2025)
  currentCustomers: 47,
  currentAgents: 4200,
  currentMRR: 3200000, // $3.2M MRR
  currentARR: 38400000, // $38.4M ARR
  
  // Growth Assumptions (Conservative)
  customerGrowthRate: 0.155, // +155% YoY (Q4 2025 → Q4 2026)
  agentGrowthRate: 0.257, // +257% YoY (enterprises deploy 3-5× more agents)
  avgContractValue: 817000, // $817K per customer (current avg)
  
  // Pricing Tiers (Annual Contract Value per Agent)
  pricingTiers: {
    pro: { minAgents: 10, maxAgents: 50, pricePerAgent: 4000 },
    enterprise: { minAgents: 51, maxAgents: 500, pricePerAgent: 3500 },
    enterprisePlus: { minAgents: 501, maxAgents: 10000, pricePerAgent: 3000 }
  },
  
  // Churn & Retention
  annualChurnRate: 0.02, // 2% churn (98% retention)
  expansionRate: 0.42, // 42% net revenue retention (expansion)
  
  // Sales Metrics
  avgSalesCycleDays: 87,
  avgDealSize: 380000, // Partner-influenced avg
  winRate: 0.42,
  
  // Channel Mix
  channelMix: {
    direct: 0.40, // 40% direct sales
    partner: 0.60 // 60% partner-sourced
  },
  
  // Seasonality (Q1=80%, Q2=100%, Q3=95%, Q4=125%)
  seasonality: [0.80, 1.00, 0.95, 1.25]
};

// ============================================================================
// Revenue Projection Model
// ============================================================================

class RevenuePredictor {
  constructor(config) {
    this.config = config;
    this.currentDate = new Date('2025-10-30');
  }
  
  /**
   * Project MRR/ARR for next 24 months
   */
  project24Months() {
    const projections = [];
    let customers = this.config.currentCustomers;
    let mrr = this.config.currentMRR;
    let arr = this.config.currentARR;
    
    for (let month = 1; month <= 24; month++) {
      const date = new Date(this.currentDate);
      date.setMonth(date.getMonth() + month);
      
      const quarter = Math.floor((date.getMonth() % 12) / 3);
      const seasonalityFactor = this.config.seasonality[quarter];
      
      // New customer acquisition (monthly)
      const monthlyGrowthRate = Math.pow(1 + this.config.customerGrowthRate, 1/12) - 1;
      const newCustomers = customers * monthlyGrowthRate * seasonalityFactor;
      
      // Churn (monthly)
      const monthlyChurnRate = Math.pow(1 - this.config.annualChurnRate, 1/12) - 1;
      const churnedCustomers = customers * Math.abs(monthlyChurnRate);
      
      // Net new customers
      customers = customers + newCustomers - churnedCustomers;
      
      // Expansion revenue (existing customers deploying more agents)
      const expansionMRR = mrr * (Math.pow(1 + this.config.expansionRate, 1/12) - 1);
      
      // New customer MRR
      const newCustomerMRR = newCustomers * (this.config.avgContractValue / 12);
      
      // Churned MRR
      const churnedMRR = mrr * Math.abs(monthlyChurnRate);
      
      // Total MRR
      mrr = mrr + newCustomerMRR + expansionMRR - churnedMRR;
      arr = mrr * 12;
      
      projections.push({
        month,
        date: date.toISOString().split('T')[0],
        quarter: `Q${Math.floor((date.getMonth() % 12) / 3) + 1} ${date.getFullYear()}`,
        customers: Math.round(customers),
        newCustomers: Math.round(newCustomers),
        churnedCustomers: Math.round(churnedCustomers * 10) / 10,
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        yoyGrowth: month >= 12 ? this.calculateYoYGrowth(projections, month) : null
      });
    }
    
    return projections;
  }
  
  /**
   * Calculate YoY growth rate
   */
  calculateYoYGrowth(projections, currentMonth) {
    if (currentMonth < 12) return null;
    const current = projections[currentMonth - 1];
    const yearAgo = currentMonth === 12 ? 
      { mrr: this.config.currentMRR } : 
      projections[currentMonth - 13];
    return ((current.mrr - yearAgo.mrr) / yearAgo.mrr * 100).toFixed(1);
  }
  
  /**
   * Project by tier (Pro, Enterprise, Enterprise Plus)
   */
  projectByTier(projections) {
    const tiers = [];
    
    for (const projection of projections) {
      const totalAgents = Math.round(
        this.config.currentAgents * 
        Math.pow(1 + this.config.agentGrowthRate, projection.month / 12)
      );
      
      // Distribution: 30% Pro, 50% Enterprise, 20% Enterprise Plus
      const proAgents = Math.round(totalAgents * 0.30);
      const enterpriseAgents = Math.round(totalAgents * 0.50);
      const enterprisePlusAgents = Math.round(totalAgents * 0.20);
      
      const proMRR = (proAgents * this.config.pricingTiers.pro.pricePerAgent) / 12;
      const enterpriseMRR = (enterpriseAgents * this.config.pricingTiers.enterprise.pricePerAgent) / 12;
      const enterprisePlusMRR = (enterprisePlusAgents * this.config.pricingTiers.enterprisePlus.pricePerAgent) / 12;
      
      tiers.push({
        month: projection.month,
        date: projection.date,
        pro: {
          agents: proAgents,
          mrr: Math.round(proMRR),
          arr: Math.round(proMRR * 12)
        },
        enterprise: {
          agents: enterpriseAgents,
          mrr: Math.round(enterpriseMRR),
          arr: Math.round(enterpriseMRR * 12)
        },
        enterprisePlus: {
          agents: enterprisePlusAgents,
          mrr: Math.round(enterprisePlusMRR),
          arr: Math.round(enterprisePlusMRR * 12)
        },
        total: {
          agents: totalAgents,
          mrr: Math.round(proMRR + enterpriseMRR + enterprisePlusMRR),
          arr: Math.round((proMRR + enterpriseMRR + enterprisePlusMRR) * 12)
        }
      });
    }
    
    return tiers;
  }
  
  /**
   * Project by channel (Direct vs. Partner)
   */
  projectByChannel(projections) {
    return projections.map(p => ({
      month: p.month,
      date: p.date,
      direct: {
        mrr: Math.round(p.mrr * this.config.channelMix.direct),
        arr: Math.round(p.arr * this.config.channelMix.direct),
        customers: Math.round(p.customers * this.config.channelMix.direct)
      },
      partner: {
        mrr: Math.round(p.mrr * this.config.channelMix.partner),
        arr: Math.round(p.arr * this.config.channelMix.partner),
        customers: Math.round(p.customers * this.config.channelMix.partner)
      }
    }));
  }
  
  /**
   * Generate executive summary
   */
  generateSummary(projections, tiers, channels) {
    const month12 = projections[11]; // 12 months out
    const month24 = projections[23]; // 24 months out
    
    return {
      currentState: {
        date: '2025-10-30',
        customers: this.config.currentCustomers,
        agents: this.config.currentAgents,
        mrr: this.config.currentMRR,
        arr: this.config.currentARR
      },
      month12Projection: {
        date: month12.date,
        quarter: month12.quarter,
        customers: month12.customers,
        mrr: month12.mrr,
        arr: month12.arr,
        yoyGrowth: `+${month12.yoyGrowth}%`
      },
      month24Projection: {
        date: month24.date,
        quarter: month24.quarter,
        customers: month24.customers,
        mrr: month24.mrr,
        arr: month24.arr,
        yoyGrowth: `+${month24.yoyGrowth}%`
      },
      keyAssumptions: {
        customerGrowthRate: `+${(this.config.customerGrowthRate * 100).toFixed(0)}% YoY`,
        agentGrowthRate: `+${(this.config.agentGrowthRate * 100).toFixed(0)}% YoY`,
        churnRate: `${(this.config.annualChurnRate * 100).toFixed(0)}% annually`,
        expansionRate: `+${(this.config.expansionRate * 100).toFixed(0)}% NRR`
      }
    };
  }
}

// ============================================================================
// Execution
// ============================================================================

function main() {
  console.log('ORCA Revenue Predictor v1.0');
  console.log('Generating 24-month MRR/ARR projections...\n');
  
  const predictor = new RevenuePredictor(CONFIG);
  
  // Generate projections
  const projections = predictor.project24Months();
  const tiers = predictor.projectByTier(projections);
  const channels = predictor.projectByChannel(projections);
  const summary = predictor.generateSummary(projections, tiers, channels);
  
  // Console output (summary)
  console.log('=== EXECUTIVE SUMMARY ===\n');
  console.log('Current State (Q4 2025):');
  console.log(`  Customers: ${summary.currentState.customers.toLocaleString()}`);
  console.log(`  Agents: ${summary.currentState.agents.toLocaleString()}`);
  console.log(`  MRR: $${(summary.currentState.mrr / 1000000).toFixed(2)}M`);
  console.log(`  ARR: $${(summary.currentState.arr / 1000000).toFixed(2)}M\n`);
  
  console.log('12-Month Projection (October 2026):');
  console.log(`  Customers: ${summary.month12Projection.customers.toLocaleString()} (${summary.keyAssumptions.customerGrowthRate})`);
  console.log(`  MRR: $${(summary.month12Projection.mrr / 1000000).toFixed(2)}M (${summary.month12Projection.yoyGrowth})`);
  console.log(`  ARR: $${(summary.month12Projection.arr / 1000000).toFixed(2)}M\n`);
  
  console.log('24-Month Projection (October 2027):');
  console.log(`  Customers: ${summary.month24Projection.customers.toLocaleString()}`);
  console.log(`  MRR: $${(summary.month24Projection.mrr / 1000000).toFixed(2)}M (${summary.month24Projection.yoyGrowth})`);
  console.log(`  ARR: $${(summary.month24Projection.arr / 1000000).toFixed(2)}M\n`);
  
  console.log('Key Assumptions:');
  console.log(`  Customer Growth: ${summary.keyAssumptions.customerGrowthRate}`);
  console.log(`  Agent Growth: ${summary.keyAssumptions.agentGrowthRate}`);
  console.log(`  Churn Rate: ${summary.keyAssumptions.churnRate}`);
  console.log(`  Net Revenue Retention: ${summary.keyAssumptions.expansionRate}\n`);
  
  // Export to JSON
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      version: '1.0',
      model: 'Conservative Growth (155% YoY)'
    },
    summary,
    projections,
    tiers,
    channels
  };
  
  const filename = 'revenue_projections_24mo.json';
  writeFileSync(filename, JSON.stringify(output, null, 2));
  console.log(`Full projections exported to: ${filename}\n`);
  
  // CSV export for spreadsheet analysis
  const csv = generateCSV(projections);
  const csvFilename = 'revenue_projections_24mo.csv';
  writeFileSync(csvFilename, csv);
  console.log(`CSV exported to: ${csvFilename}\n`);
  
  console.log('✅ Revenue projection complete!');
}

/**
 * Generate CSV output
 */
function generateCSV(projections) {
  let csv = 'Month,Date,Quarter,Customers,New Customers,Churned Customers,MRR ($),ARR ($),YoY Growth (%)\n';
  
  for (const p of projections) {
    csv += `${p.month},${p.date},${p.quarter},${p.customers},${p.newCustomers},${p.churnedCustomers},${p.mrr},${p.arr},${p.yoyGrowth || 'N/A'}\n`;
  }
  
  return csv;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { RevenuePredictor, CONFIG };
