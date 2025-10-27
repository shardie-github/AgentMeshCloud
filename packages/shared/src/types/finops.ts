/**
 * FinOps and AIOps types for financial operations and resource optimization
 * Implements AI-driven cost analysis and predictive resource balancing
 */

export interface FinOpsConfig {
  id: string;
  tenantId: string;
  budgetLimits: BudgetLimits;
  costOptimization: CostOptimizationConfig;
  resourceScaling: ResourceScalingConfig;
  billing: BillingConfig;
  alerts: FinOpsAlerts;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetLimits {
  monthly: number;
  daily: number;
  hourly: number;
  perService: Record<string, number>;
  perRegion: Record<string, number>;
  perAgent: Record<string, number>;
  currency: string;
  alertThresholds: AlertThreshold[];
}

export interface AlertThreshold {
  type: 'percentage' | 'absolute';
  value: number;
  action: 'notify' | 'throttle' | 'stop';
  recipients: string[];
}

export interface CostOptimizationConfig {
  autoScaling: boolean;
  spotInstances: boolean;
  reservedInstances: boolean;
  rightSizing: boolean;
  scheduleOptimization: boolean;
  dataTransferOptimization: boolean;
  storageOptimization: boolean;
  gpuOptimization: boolean;
}

export interface ResourceScalingConfig {
  minInstances: number;
  maxInstances: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  predictiveScaling: boolean;
  customMetrics: CustomMetric[];
}

export interface CustomMetric {
  name: string;
  query: string;
  threshold: number;
  weight: number;
  enabled: boolean;
}

export interface BillingConfig {
  billingModel: BillingModel;
  pricingTiers: PricingTier[];
  discounts: Discount[];
  taxes: TaxConfig;
  invoicing: InvoicingConfig;
}

export type BillingModel = 
  | 'pay_as_you_go' 
  | 'reserved' 
  | 'spot' 
  | 'hybrid' 
  | 'subscription';

export interface PricingTier {
  name: string;
  minUsage: number;
  maxUsage: number;
  pricePerUnit: number;
  unit: string;
  currency: string;
  effectiveDate: Date;
  expirationDate?: Date;
}

export interface Discount {
  type: 'volume' | 'commitment' | 'loyalty' | 'promotional';
  value: number;
  unit: 'percentage' | 'absolute';
  conditions: DiscountCondition[];
  effectiveDate: Date;
  expirationDate?: Date;
}

export interface DiscountCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  value: number;
  period: string;
}

export interface TaxConfig {
  enabled: boolean;
  rate: number;
  jurisdiction: string;
  exemptions: string[];
}

export interface InvoicingConfig {
  frequency: 'monthly' | 'quarterly' | 'annually';
  format: 'pdf' | 'json' | 'csv';
  delivery: 'email' | 'api' | 'portal';
  customFields: string[];
}

export interface FinOpsAlerts {
  budgetExceeded: boolean;
  costAnomaly: boolean;
  resourceWaste: boolean;
  optimizationOpportunity: boolean;
  billingError: boolean;
  thresholdBreach: boolean;
}

export interface CostAnalysis {
  id: string;
  tenantId: string;
  period: AnalysisPeriod;
  totalCost: number;
  breakdown: CostBreakdown;
  trends: CostTrend[];
  anomalies: CostAnomaly[];
  recommendations: CostRecommendation[];
  generatedAt: Date;
}

export interface AnalysisPeriod {
  start: Date;
  end: Date;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export interface CostBreakdown {
  byService: Record<string, ServiceCost>;
  byRegion: Record<string, RegionCost>;
  byAgent: Record<string, AgentCost>;
  byResource: Record<string, ResourceCost>;
  byTime: TimeSeriesCost[];
}

export interface ServiceCost {
  serviceName: string;
  totalCost: number;
  usage: number;
  unit: string;
  unitPrice: number;
  efficiency: number;
  trends: CostTrend[];
}

export interface RegionCost {
  region: string;
  totalCost: number;
  services: Record<string, number>;
  efficiency: number;
  carbonFootprint: number;
}

export interface AgentCost {
  agentId: string;
  agentName: string;
  totalCost: number;
  computeCost: number;
  storageCost: number;
  networkCost: number;
  efficiency: number;
  utilization: number;
}

export interface ResourceCost {
  resourceType: string;
  totalCost: number;
  usage: number;
  unit: string;
  unitPrice: number;
  efficiency: number;
  waste: number;
}

export interface TimeSeriesCost {
  timestamp: Date;
  totalCost: number;
  breakdown: Record<string, number>;
  efficiency: number;
  utilization: number;
}

export interface CostTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number;
  confidence: number;
  forecast: number[];
  period: string;
}

export interface CostAnomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  detectedAt: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  impact: number;
  recommendations: string[];
}

export type AnomalyType = 
  | 'spike' 
  | 'drop' 
  | 'trend_change' 
  | 'seasonal_deviation' 
  | 'outlier' 
  | 'pattern_break';

export type AnomalySeverity = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'critical';

export interface CostRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  potentialSavings: number;
  implementationEffort: ImplementationEffort;
  riskLevel: RiskLevel;
  prerequisites: string[];
  steps: RecommendationStep[];
  estimatedImpact: number;
  confidence: number;
}

export type RecommendationType = 
  | 'right_sizing' 
  | 'reserved_instances' 
  | 'spot_instances' 
  | 'schedule_optimization' 
  | 'data_transfer_optimization' 
  | 'storage_optimization' 
  | 'gpu_optimization' 
  | 'workload_migration';

export type ImplementationEffort = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'very_high';

export type RiskLevel = 
  | 'low' 
  | 'medium' 
  | 'high';

export interface RecommendationStep {
  step: number;
  description: string;
  duration: number;
  resources: string[];
  dependencies: string[];
}

export interface SmartScaler {
  id: string;
  tenantId: string;
  name: string;
  status: ScalerStatus;
  config: ScalerConfig;
  metrics: ScalerMetrics;
  predictions: ScalingPrediction[];
  actions: ScalingAction[];
  createdAt: Date;
  updatedAt: Date;
}

export type ScalerStatus = 
  | 'active' 
  | 'paused' 
  | 'error' 
  | 'maintenance';

export interface ScalerConfig {
  targetAgent: string;
  minInstances: number;
  maxInstances: number;
  scaleUpPolicy: ScalingPolicy;
  scaleDownPolicy: ScalingPolicy;
  predictiveScaling: boolean;
  costOptimization: boolean;
  customMetrics: CustomMetric[];
  cooldownPeriods: CooldownPeriods;
}

export interface ScalingPolicy {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte';
  action: 'scale_up' | 'scale_down';
  adjustment: number;
  evaluationPeriods: number;
  cooldown: number;
}

export interface CooldownPeriods {
  scaleUp: number;
  scaleDown: number;
  stabilization: number;
}

export interface ScalerMetrics {
  totalScalingEvents: number;
  successfulScalingEvents: number;
  failedScalingEvents: number;
  averageScalingTime: number;
  costSavings: number;
  efficiency: number;
  lastScalingEvent?: Date;
  currentInstances: number;
  targetInstances: number;
}

export interface ScalingPrediction {
  id: string;
  timestamp: Date;
  predictedLoad: number;
  recommendedInstances: number;
  confidence: number;
  timeHorizon: number;
  factors: PredictionFactor[];
  costImpact: number;
}

export interface PredictionFactor {
  name: string;
  value: number;
  weight: number;
  impact: number;
}

export interface ScalingAction {
  id: string;
  type: 'scale_up' | 'scale_down' | 'maintain';
  targetInstances: number;
  currentInstances: number;
  reason: string;
  triggeredBy: string;
  executedAt: Date;
  duration: number;
  costImpact: number;
  success: boolean;
  error?: string;
}

export interface AIOpsDashboard {
  tenantId: string;
  overview: AIOpsOverview;
  costAnalysis: CostAnalysis;
  smartScalers: SmartScaler[];
  recommendations: CostRecommendation[];
  alerts: FinOpsAlert[];
  performance: AIOpsPerformance;
  lastUpdated: Date;
}

export interface AIOpsOverview {
  totalCost: number;
  costSavings: number;
  efficiency: number;
  activeScalers: number;
  pendingRecommendations: number;
  activeAlerts: number;
  uptime: number;
  lastOptimization: Date;
}

export interface FinOpsAlert {
  id: string;
  tenantId: string;
  type: FinOpsAlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  status: AlertStatus;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export type FinOpsAlertType = 
  | 'budget_exceeded' 
  | 'cost_anomaly' 
  | 'resource_waste' 
  | 'scaling_failure' 
  | 'billing_error' 
  | 'optimization_opportunity';

export interface AIOpsPerformance {
  costEfficiency: number;
  resourceUtilization: number;
  scalingAccuracy: number;
  predictionAccuracy: number;
  optimizationSuccess: number;
  alertResponseTime: number;
  systemUptime: number;
  lastOptimization: Date;
}

export interface MultiTenantBilling {
  tenantId: string;
  billingPeriod: BillingPeriod;
  totalCost: number;
  breakdown: TenantCostBreakdown;
  usage: TenantUsage;
  charges: Charge[];
  adjustments: Adjustment[];
  taxes: Tax[];
  total: number;
  status: BillingStatus;
  dueDate: Date;
  paidAt?: Date;
}

export interface BillingPeriod {
  start: Date;
  end: Date;
  period: 'monthly' | 'quarterly' | 'annually';
}

export interface TenantCostBreakdown {
  compute: number;
  storage: number;
  network: number;
  services: number;
  agents: number;
  data: number;
  other: number;
}

export interface TenantUsage {
  computeHours: number;
  storageGB: number;
  networkGB: number;
  apiCalls: number;
  agentExecutions: number;
  dataProcessed: number;
}

export interface Charge {
  id: string;
  description: string;
  amount: number;
  unit: string;
  quantity: number;
  unitPrice: number;
  service: string;
  period: string;
  metadata: Record<string, any>;
}

export interface Adjustment {
  id: string;
  type: 'discount' | 'credit' | 'penalty' | 'refund';
  description: string;
  amount: number;
  reason: string;
  appliedAt: Date;
  metadata: Record<string, any>;
}

export interface Tax {
  id: string;
  type: string;
  rate: number;
  amount: number;
  jurisdiction: string;
  description: string;
}

export type BillingStatus = 
  | 'draft' 
  | 'pending' 
  | 'paid' 
  | 'overdue' 
  | 'cancelled' 
  | 'refunded';