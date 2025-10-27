/**
 * Cognitive Ledger types for real-time token and carbon audit tracking
 * Implements transparent FinOps audits and sustainability monitoring
 */

export interface CognitiveLedger {
  id: string;
  tenantId: string;
  name: string;
  status: LedgerStatus;
  config: LedgerConfig;
  entries: LedgerEntry[];
  balances: LedgerBalance[];
  reports: LedgerReport[];
  createdAt: Date;
  updatedAt: Date;
}

export type LedgerStatus = 
  | 'active' 
  | 'inactive' 
  | 'maintenance' 
  | 'error' 
  | 'archived';

export interface LedgerConfig {
  currency: string;
  precision: number;
  rounding: RoundingMode;
  validation: ValidationConfig;
  encryption: EncryptionConfig;
  backup: BackupConfig;
  retention: RetentionConfig;
}

export type RoundingMode = 
  | 'round' 
  | 'floor' 
  | 'ceil' 
  | 'truncate';

export interface ValidationConfig {
  enabled: boolean;
  rules: ValidationRule[];
  checksums: boolean;
  signatures: boolean;
  timestamps: boolean;
}

export interface ValidationRule {
  field: string;
  type: ValidationType;
  parameters: Record<string, any>;
  required: boolean;
}

export type ValidationType = 
  | 'range' 
  | 'pattern' 
  | 'format' 
  | 'reference' 
  | 'calculation';

export interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  mode: string;
  padding: string;
  enabled: boolean;
}

export interface BackupConfig {
  enabled: boolean;
  frequency: number;
  retention: number;
  compression: boolean;
  encryption: boolean;
  locations: BackupLocation[];
}

export interface BackupLocation {
  type: 'local' | 'cloud' | 'tape';
  path: string;
  credentials: Record<string, string>;
  enabled: boolean;
}

export interface RetentionConfig {
  entries: number; // days
  balances: number; // days
  reports: number; // days
  audit: number; // days
  archive: boolean;
}

export interface LedgerEntry {
  id: string;
  tenantId: string;
  type: EntryType;
  category: EntryCategory;
  amount: number;
  currency: string;
  description: string;
  metadata: EntryMetadata;
  timestamp: Date;
  source: EntrySource;
  references: EntryReference[];
  hash: string;
  signature: string;
  status: EntryStatus;
}

export type EntryType = 
  | 'debit' 
  | 'credit' 
  | 'transfer' 
  | 'adjustment' 
  | 'fee' 
  | 'refund' 
  | 'reward' 
  | 'penalty';

export type EntryCategory = 
  | 'compute' 
  | 'storage' 
  | 'network' 
  | 'api' 
  | 'agent' 
  | 'data' 
  | 'carbon' 
  | 'energy' 
  | 'service' 
  | 'other';

export interface EntryMetadata {
  agentId?: string;
  serviceId?: string;
  region?: string;
  resourceType?: string;
  usage?: UsageMetrics;
  carbon?: CarbonMetrics;
  cost?: CostMetrics;
  performance?: PerformanceMetrics;
  custom?: Record<string, any>;
}

export interface UsageMetrics {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  gpu?: number;
  duration: number;
  requests: number;
  tokens: number;
}

export interface CarbonMetrics {
  emissions: number; // kg CO2
  intensity: number; // kg CO2 per kWh
  energy: number; // kWh
  renewable: number; // percentage
  offset: number; // kg CO2
  certificate?: string;
}

export interface CostMetrics {
  compute: number;
  storage: number;
  network: number;
  service: number;
  total: number;
  currency: string;
  rate: number;
  discount?: number;
}

export interface PerformanceMetrics {
  latency: number;
  throughput: number;
  availability: number;
  errorRate: number;
  efficiency: number;
}

export interface EntrySource {
  type: SourceType;
  id: string;
  name: string;
  version: string;
  location: string;
  metadata: Record<string, any>;
}

export type SourceType = 
  | 'agent' 
  | 'service' 
  | 'user' 
  | 'system' 
  | 'external' 
  | 'api';

export interface EntryReference {
  type: ReferenceType;
  id: string;
  description: string;
  metadata: Record<string, any>;
}

export type ReferenceType = 
  | 'transaction' 
  | 'invoice' 
  | 'contract' 
  | 'workflow' 
  | 'agent' 
  | 'user' 
  | 'external';

export type EntryStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'failed' 
  | 'cancelled' 
  | 'disputed';

export interface LedgerBalance {
  id: string;
  tenantId: string;
  account: string;
  currency: string;
  balance: number;
  available: number;
  reserved: number;
  pending: number;
  lastUpdated: Date;
  metadata: BalanceMetadata;
}

export interface BalanceMetadata {
  accountType: AccountType;
  description: string;
  limits: BalanceLimits;
  restrictions: BalanceRestriction[];
  custom: Record<string, any>;
}

export type AccountType = 
  | 'main' 
  | 'reserve' 
  | 'escrow' 
  | 'rewards' 
  | 'penalties' 
  | 'carbon' 
  | 'energy';

export interface BalanceLimits {
  min: number;
  max: number;
  daily: number;
  monthly: number;
  yearly: number;
}

export interface BalanceRestriction {
  type: RestrictionType;
  condition: string;
  action: RestrictionAction;
  enabled: boolean;
}

export type RestrictionType = 
  | 'withdrawal' 
  | 'transfer' 
  | 'usage' 
  | 'time' 
  | 'amount';

export type RestrictionAction = 
  | 'block' 
  | 'limit' 
  | 'require_approval' 
  | 'notify';

export interface LedgerReport {
  id: string;
  tenantId: string;
  type: ReportType;
  period: ReportPeriod;
  status: ReportStatus;
  data: ReportData;
  generatedAt: Date;
  expiresAt: Date;
  metadata: ReportMetadata;
}

export type ReportType = 
  | 'financial' 
  | 'carbon' 
  | 'usage' 
  | 'performance' 
  | 'compliance' 
  | 'audit' 
  | 'custom';

export interface ReportPeriod {
  start: Date;
  end: Date;
  granularity: ReportGranularity;
  timezone: string;
}

export type ReportGranularity = 
  | 'hourly' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'annually';

export type ReportStatus = 
  | 'generating' 
  | 'completed' 
  | 'failed' 
  | 'expired' 
  | 'cancelled';

export interface ReportData {
  summary: ReportSummary;
  breakdown: ReportBreakdown;
  trends: ReportTrend[];
  anomalies: ReportAnomaly[];
  recommendations: ReportRecommendation[];
  charts: ReportChart[];
  tables: ReportTable[];
}

export interface ReportSummary {
  totalAmount: number;
  totalEntries: number;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  currency: string;
  period: string;
  generatedAt: Date;
}

export interface ReportBreakdown {
  byCategory: Record<string, CategoryBreakdown>;
  byAgent: Record<string, AgentBreakdown>;
  byService: Record<string, ServiceBreakdown>;
  byRegion: Record<string, RegionBreakdown>;
  byTime: TimeBreakdown[];
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  entries: number;
  trends: TrendData[];
}

export interface AgentBreakdown {
  agentId: string;
  agentName: string;
  amount: number;
  percentage: number;
  entries: number;
  efficiency: number;
  carbon: number;
}

export interface ServiceBreakdown {
  serviceId: string;
  serviceName: string;
  amount: number;
  percentage: number;
  entries: number;
  utilization: number;
  performance: number;
}

export interface RegionBreakdown {
  region: string;
  amount: number;
  percentage: number;
  entries: number;
  carbon: number;
  renewable: number;
}

export interface TimeBreakdown {
  timestamp: Date;
  amount: number;
  entries: number;
  efficiency: number;
  carbon: number;
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface ReportTrend {
  metric: string;
  direction: TrendDirection;
  rate: number;
  confidence: number;
  forecast: TrendForecast[];
  description: string;
}

export type TrendDirection = 
  | 'increasing' 
  | 'decreasing' 
  | 'stable' 
  | 'volatile';

export interface TrendForecast {
  timestamp: Date;
  value: number;
  confidence: number;
  lower: number;
  upper: number;
}

export interface ReportAnomaly {
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

export interface ReportRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  impact: number;
  effort: EffortLevel;
  priority: PriorityLevel;
  actions: RecommendationAction[];
  estimatedSavings: number;
  confidence: number;
}

export type RecommendationType = 
  | 'cost_optimization' 
  | 'carbon_reduction' 
  | 'performance_improvement' 
  | 'resource_efficiency' 
  | 'compliance' 
  | 'security';

export type EffortLevel = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'very_high';

export type PriorityLevel = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'critical';

export interface RecommendationAction {
  step: number;
  description: string;
  duration: number;
  resources: string[];
  dependencies: string[];
}

export interface ReportChart {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  data: ChartData;
  config: ChartConfig;
  position: ChartPosition;
}

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'area' 
  | 'scatter' 
  | 'heatmap' 
  | 'gauge' 
  | 'table';

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  metadata: Record<string, any>;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  metadata: Record<string, any>;
}

export interface ChartConfig {
  responsive: boolean;
  maintainAspectRatio: boolean;
  scales: ChartScales;
  plugins: ChartPlugins;
  options: Record<string, any>;
}

export interface ChartScales {
  x: ScaleConfig;
  y: ScaleConfig;
}

export interface ScaleConfig {
  type: string;
  display: boolean;
  title: string;
  min?: number;
  max?: number;
  ticks: TickConfig;
}

export interface TickConfig {
  display: boolean;
  color: string;
  font: FontConfig;
}

export interface FontConfig {
  family: string;
  size: number;
  weight: string;
}

export interface ChartPlugins {
  legend: LegendConfig;
  tooltip: TooltipConfig;
  title: TitleConfig;
}

export interface LegendConfig {
  display: boolean;
  position: string;
  labels: LabelConfig;
}

export interface LabelConfig {
  usePointStyle: boolean;
  padding: number;
  font: FontConfig;
}

export interface TooltipConfig {
  enabled: boolean;
  mode: string;
  intersect: boolean;
  backgroundColor: string;
  titleColor: string;
  bodyColor: string;
  borderColor: string;
  borderWidth: number;
}

export interface TitleConfig {
  display: boolean;
  text: string;
  font: FontConfig;
  color: string;
}

export interface ChartPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReportTable {
  id: string;
  title: string;
  description: string;
  columns: TableColumn[];
  rows: TableRow[];
  config: TableConfig;
  position: TablePosition;
}

export interface TableColumn {
  key: string;
  title: string;
  type: ColumnType;
  width?: number;
  align?: ColumnAlign;
  sortable: boolean;
  filterable: boolean;
  formatter?: string;
}

export type ColumnType = 
  | 'string' 
  | 'number' 
  | 'date' 
  | 'currency' 
  | 'percentage' 
  | 'boolean';

export type ColumnAlign = 
  | 'left' 
  | 'center' 
  | 'right';

export interface TableRow {
  id: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
}

export interface TableConfig {
  sortable: boolean;
  filterable: boolean;
  pagination: boolean;
  pageSize: number;
  striped: boolean;
  hover: boolean;
  bordered: boolean;
  condensed: boolean;
}

export interface TablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReportMetadata {
  version: string;
  format: string;
  compression: boolean;
  encryption: boolean;
  checksum: string;
  signature: string;
  custom: Record<string, any>;
}

export interface CarbonFootprint {
  id: string;
  tenantId: string;
  period: CarbonPeriod;
  totalEmissions: number; // kg CO2
  breakdown: CarbonBreakdown;
  intensity: CarbonIntensity;
  offset: CarbonOffset;
  certificates: CarbonCertificate[];
  generatedAt: Date;
}

export interface CarbonPeriod {
  start: Date;
  end: Date;
  granularity: CarbonGranularity;
}

export type CarbonGranularity = 
  | 'hourly' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'annually';

export interface CarbonBreakdown {
  bySource: Record<string, SourceEmissions>;
  byRegion: Record<string, RegionEmissions>;
  byAgent: Record<string, AgentEmissions>;
  byService: Record<string, ServiceEmissions>;
  byTime: TimeEmissions[];
}

export interface SourceEmissions {
  source: string;
  emissions: number;
  percentage: number;
  intensity: number;
  renewable: number;
}

export interface RegionEmissions {
  region: string;
  emissions: number;
  percentage: number;
  intensity: number;
  renewable: number;
  gridFactor: number;
}

export interface AgentEmissions {
  agentId: string;
  agentName: string;
  emissions: number;
  percentage: number;
  efficiency: number;
  utilization: number;
  carbonPerRequest: number;
}

export interface ServiceEmissions {
  serviceId: string;
  serviceName: string;
  emissions: number;
  percentage: number;
  utilization: number;
  carbonPerUnit: number;
}

export interface TimeEmissions {
  timestamp: Date;
  emissions: number;
  intensity: number;
  renewable: number;
  efficiency: number;
}

export interface CarbonIntensity {
  average: number; // kg CO2 per kWh
  byRegion: Record<string, number>;
  byTime: TimeIntensity[];
  trend: IntensityTrend;
}

export interface TimeIntensity {
  timestamp: Date;
  intensity: number;
  renewable: number;
}

export interface IntensityTrend {
  direction: TrendDirection;
  rate: number;
  confidence: number;
  forecast: IntensityForecast[];
}

export interface IntensityForecast {
  timestamp: Date;
  intensity: number;
  confidence: number;
}

export interface CarbonOffset {
  total: number; // kg CO2
  purchased: number;
  generated: number;
  verified: number;
  pending: number;
  certificates: string[];
}

export interface CarbonCertificate {
  id: string;
  type: CertificateType;
  amount: number; // kg CO2
  price: number;
  currency: string;
  provider: string;
  standard: string;
  issuedAt: Date;
  expiresAt: Date;
  verified: boolean;
  metadata: Record<string, any>;
}

export type CertificateType = 
  | 'renewable_energy' 
  | 'forest_conservation' 
  | 'reforestation' 
  | 'carbon_capture' 
  | 'energy_efficiency' 
  | 'other';

export interface TokenFlow {
  id: string;
  tenantId: string;
  type: FlowType;
  direction: FlowDirection;
  amount: number;
  currency: string;
  source: FlowSource;
  destination: FlowDestination;
  timestamp: Date;
  metadata: FlowMetadata;
}

export type FlowType = 
  | 'compute' 
  | 'storage' 
  | 'network' 
  | 'api' 
  | 'agent' 
  | 'data' 
  | 'carbon' 
  | 'energy';

export type FlowDirection = 
  | 'inbound' 
  | 'outbound' 
  | 'internal';

export interface FlowSource {
  type: SourceType;
  id: string;
  name: string;
  location: string;
  metadata: Record<string, any>;
}

export interface FlowDestination {
  type: DestinationType;
  id: string;
  name: string;
  location: string;
  metadata: Record<string, any>;
}

export type DestinationType = 
  | 'agent' 
  | 'service' 
  | 'user' 
  | 'system' 
  | 'external' 
  | 'carbon_offset';

export interface FlowMetadata {
  agentId?: string;
  serviceId?: string;
  userId?: string;
  workflowId?: string;
  requestId?: string;
  carbon?: number;
  energy?: number;
  performance?: number;
  custom?: Record<string, any>;
}