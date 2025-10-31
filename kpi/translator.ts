/**
 * KPI to ROI Translator
 * Resolves KPI values to dollar amounts using registry formulas
 * Exposes /kpi/roi API endpoint
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface KPIDefinition {
  name: string;
  description: string;
  unit: string;
  formula: string;
  sla: {
    target: number;
    warning_threshold: number;
    critical_threshold: number;
  };
  owner: string;
  roi_impact: string;
  invert?: boolean;
}

interface ROIFormula {
  description: string;
  formula: string;
  multiplier: number;
  [key: string]: any;
}

interface KPIRegistry {
  kpis: Record<string, KPIDefinition>;
  roi_formulas: Record<string, ROIFormula>;
  tenant_baseline_overrides: Record<string, Record<string, number>>;
}

interface ROIMap {
  impact_categories: Record<string, any>;
  mappings: Record<string, any>;
}

interface KPIValue {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  target: number;
  delta?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface ROIResult {
  kpi: string;
  value: number;
  roi_usd: number;
  impact_category: string;
  explanation: string;
  calculation: string;
}

class KPITranslator {
  private registry: KPIRegistry | null = null;
  private roiMap: ROIMap | null = null;
  
  async initialize() {
    const registryPath = path.join(process.cwd(), 'kpi/kpi_registry.yaml');
    const roiMapPath = path.join(process.cwd(), 'kpi/roi_map.yaml');
    
    const [registryContent, roiMapContent] = await Promise.all([
      fs.readFile(registryPath, 'utf-8'),
      fs.readFile(roiMapPath, 'utf-8')
    ]);
    
    this.registry = yaml.load(registryContent) as KPIRegistry;
    this.roiMap = yaml.load(roiMapContent) as ROIMap;
  }
  
  /**
   * Calculate ROI for a single KPI value
   */
  calculateKPIROI(
    kpiName: string,
    value: number,
    tenantTier: string = 'default'
  ): ROIResult {
    if (!this.registry || !this.roiMap) {
      throw new Error('Translator not initialized');
    }
    
    const kpiDef = this.registry.kpis[kpiName];
    if (!kpiDef) {
      throw new Error(`Unknown KPI: ${kpiName}`);
    }
    
    const roiImpact = kpiDef.roi_impact;
    const roiFormula = this.registry.roi_formulas[roiImpact];
    const mapping = this.roiMap.mappings[kpiName];
    const baselines = this.registry.tenant_baseline_overrides[tenantTier] || 
                     this.registry.tenant_baseline_overrides.default;
    
    let roiValue = 0;
    let calculation = '';
    
    // Calculate based on specific KPI
    switch (kpiName) {
      case 'trust_score':
        roiValue = (value / 100) * baselines.revenue_at_risk * 0.1;
        calculation = `(${value} / 100) * ${baselines.revenue_at_risk} * 0.1 = $${roiValue.toFixed(2)}`;
        break;
        
      case 'risk_avoided_usd':
        roiValue = value;
        calculation = `Direct value: $${value.toFixed(2)}`;
        break;
        
      case 'sync_freshness_pct':
        roiValue = (value / 100) * 160 * baselines.hourly_rate;
        calculation = `(${value} / 100) * 160 hours * $${baselines.hourly_rate} = $${roiValue.toFixed(2)}`;
        break;
        
      case 'drift_rate_pct':
        roiValue = (1 - value / 100) * 50000;
        calculation = `(1 - ${value} / 100) * $50000 = $${roiValue.toFixed(2)}`;
        break;
        
      case 'compliance_sla_pct':
        roiValue = (value / 100) * baselines.compliance_penalty_risk;
        calculation = `(${value} / 100) * ${baselines.compliance_penalty_risk} = $${roiValue.toFixed(2)}`;
        break;
        
      case 'mttr_minutes':
        roiValue = ((60 - value) / 60) * baselines.monthly_incident_impact;
        calculation = `((60 - ${value}) / 60) * ${baselines.monthly_incident_impact} = $${roiValue.toFixed(2)}`;
        break;
        
      case 'policy_coverage_pct':
        roiValue = (value / 100) * baselines.breach_risk;
        calculation = `(${value} / 100) * ${baselines.breach_risk} = $${roiValue.toFixed(2)}`;
        break;
        
      case 'agent_availability_pct':
        roiValue = (value / 100) * baselines.revenue_at_risk;
        calculation = `(${value} / 100) * ${baselines.revenue_at_risk} = $${roiValue.toFixed(2)}`;
        break;
        
      case 'api_p95_latency_ms':
        roiValue = ((1000 - value) / 1000) * baselines.customer_retention_value;
        calculation = `((1000 - ${value}) / 1000) * ${baselines.customer_retention_value} = $${roiValue.toFixed(2)}`;
        break;
        
      case 'cost_per_transaction':
        roiValue = (0.020 - value) * baselines.monthly_transactions;
        calculation = `(0.020 - ${value}) * ${baselines.monthly_transactions} = $${roiValue.toFixed(2)}`;
        break;
        
      default:
        roiValue = 0;
        calculation = 'Formula not implemented';
    }
    
    // Find impact category
    let impactCategory = 'unknown';
    for (const [category, config] of Object.entries(this.roiMap.impact_categories)) {
      if (config.kpis.includes(kpiName)) {
        impactCategory = category;
        break;
      }
    }
    
    return {
      kpi: kpiName,
      value,
      roi_usd: Math.max(0, roiValue),
      impact_category: impactCategory,
      explanation: mapping?.explanation || kpiDef.description,
      calculation
    };
  }
  
  /**
   * Calculate total ROI from multiple KPI values
   */
  calculateTotalROI(
    kpiValues: Record<string, number>,
    tenantTier: string = 'default'
  ): {
    total_monthly_roi: number;
    annualized_roi: number;
    by_category: Record<string, number>;
    kpi_details: ROIResult[];
  } {
    const results: ROIResult[] = [];
    const byCategory: Record<string, number> = {};
    
    for (const [kpiName, value] of Object.entries(kpiValues)) {
      try {
        const result = this.calculateKPIROI(kpiName, value, tenantTier);
        results.push(result);
        
        if (!byCategory[result.impact_category]) {
          byCategory[result.impact_category] = 0;
        }
        byCategory[result.impact_category] += result.roi_usd;
      } catch (err) {
        // Skip unknown KPIs
      }
    }
    
    const totalMonthlyROI = results.reduce((sum, r) => sum + r.roi_usd, 0);
    
    return {
      total_monthly_roi: totalMonthlyROI,
      annualized_roi: totalMonthlyROI * 12,
      by_category: byCategory,
      kpi_details: results
    };
  }
  
  /**
   * Get KPI status (good/warning/critical) based on thresholds
   */
  getKPIStatus(kpiName: string, value: number): 'good' | 'warning' | 'critical' {
    if (!this.registry) {
      throw new Error('Translator not initialized');
    }
    
    const kpiDef = this.registry.kpis[kpiName];
    if (!kpiDef) {
      return 'critical';
    }
    
    const { target, warning_threshold, critical_threshold } = kpiDef.sla;
    const invert = kpiDef.invert || false;
    
    if (invert) {
      // For metrics where lower is better
      if (value <= target) return 'good';
      if (value <= warning_threshold) return 'warning';
      return 'critical';
    } else {
      // For metrics where higher is better
      if (value >= target) return 'good';
      if (value >= warning_threshold) return 'warning';
      return 'critical';
    }
  }
  
  /**
   * Get all KPI definitions
   */
  getAllKPIs(): Record<string, KPIDefinition> {
    if (!this.registry) {
      throw new Error('Translator not initialized');
    }
    return this.registry.kpis;
  }
}

// Singleton instance
let translatorInstance: KPITranslator | null = null;

export async function getTranslator(): Promise<KPITranslator> {
  if (!translatorInstance) {
    translatorInstance = new KPITranslator();
    await translatorInstance.initialize();
  }
  return translatorInstance;
}

export { KPITranslator };
export type { KPIValue, ROIResult, KPIDefinition };
