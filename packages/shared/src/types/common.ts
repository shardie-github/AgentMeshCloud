/**
 * Common types used across AgentMesh Cloud
 * Centralized definitions to avoid duplication
 */

// Base types
export type ID = string;
export type Timestamp = Date;
export type Status = 'active' | 'inactive' | 'pending' | 'error' | 'completed';

// Validation types
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

// Resource types
export interface ResourceRequirements {
  cpu: string;
  memory: string;
  storage: string;
  gpu?: string;
}

// Authentication types
export interface AuthenticationConfig {
  type: 'jwt' | 'oauth' | 'api_key' | 'certificate';
  config: Record<string, any>;
}

export interface AuthorizationConfig {
  policies: PolicyRule[];
  roles: string[];
  permissions: string[];
}

// Logging types
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  outputs: string[];
}

// Audit types
export interface AuditConfig {
  enabled: boolean;
  retention: number;
  encryption: boolean;
  compliance: string[];
}

// Position types
export interface Position {
  x: number;
  y: number;
}

// Constraint types
export interface Constraint {
  type: string;
  value: any;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
}

// Capability types
export interface CapabilityInput {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  validation?: ValidationRule[];
}

export interface CapabilityOutput {
  name: string;
  type: string;
  description?: string;
}

export interface CapabilityConstraint {
  type: string;
  value: any;
  description?: string;
}

// Policy types
export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  priority: number;
}

export interface PolicyCondition {
  field: string;
  operator: string;
  value: any;
}

export interface PolicyAction {
  type: string;
  config: Record<string, any>;
}

// Retry types
export interface RetryPolicy {
  maxAttempts: number;
  backoff: 'linear' | 'exponential';
  delay: number;
  maxDelay: number;
}

// Health check types
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  path: string;
}

// Rate limiting types
export interface RateLimit {
  requests: number;
  window: number;
  burst?: number;
}

// Endpoint auth types
export interface EndpointAuth {
  type: 'none' | 'basic' | 'bearer' | 'api_key';
  config: Record<string, any>;
}

// Alert types
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'resolved' | 'suppressed';

export interface AlertCondition {
  metric: string;
  operator: string;
  threshold: number;
  duration: number;
}

// Notification types
export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'slack';
  config: Record<string, any>;
  enabled: boolean;
}

// Metrics types
export interface CostMetrics {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  total: number;
}

export interface PerformanceMetrics {
  latency: number;
  throughput: number;
  errorRate: number;
  availability: number;
}

// Recommendation types
export type RecommendationType = 'cost_optimization' | 'performance' | 'security' | 'compliance';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type EffortLevel = 'low' | 'medium' | 'high';

export interface RecommendationAction {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: EffortLevel;
}

// Backup types
export interface BackupConfig {
  enabled: boolean;
  frequency: string;
  retention: number;
  encryption: boolean;
  location: BackupLocation;
}

export interface BackupLocation {
  type: 'local' | 's3' | 'gcs' | 'azure';
  config: Record<string, any>;
}

// Encryption types
export interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  mode: string;
  padding: string;
}

// Access types
export interface AccessConfig {
  permissions: string[];
  roles: string[];
  conditions: AccessCondition[];
}

export interface AccessCondition {
  field: string;
  operator: string;
  value: any;
}

// Monitoring types
export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  metrics: string[];
  alerts: AlertCondition[];
}

// Collection types
export interface CollectionConfig {
  name: string;
  schema: Record<string, any>;
  indexes: string[];
  sharding: ShardingConfig;
}

export interface ShardingConfig {
  key: string;
  strategy: 'hash' | 'range';
  shards: number;
}

// Compliance types
export interface ComplianceConfig {
  standards: ComplianceStandard[];
  requirements: ComplianceRequirement[];
  audits: AuditSchedule[];
}

export type ComplianceStandard = 'SOC2' | 'ISO27001' | 'GDPR' | 'HIPAA' | 'PCI-DSS';
export type EnforcementMode = 'strict' | 'warning' | 'disabled';

export interface ComplianceRequirement {
  id: string;
  standard: ComplianceStandard;
  description: string;
  controls: string[];
  status: 'compliant' | 'non_compliant' | 'partial';
}

export interface AuditSchedule {
  id: string;
  name: string;
  frequency: string;
  scope: string[];
  lastRun?: Timestamp;
  nextRun: Timestamp;
}

// Metric types
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

// Permission types
export interface PermissionCondition {
  resource: string;
  action: string;
  conditions: AccessCondition[];
}

// Template types
export interface TemplateVariable {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
}

// Event types
export interface EventConfig {
  type: string;
  source: string;
  filters: EventFilter[];
  handlers: EventHandler[];
}

export interface EventFilter {
  field: string;
  operator: string;
  value: any;
}

export interface EventHandler {
  type: string;
  config: Record<string, any>;
}

// Trigger types
export type TriggerType = 'schedule' | 'webhook' | 'event' | 'manual';

export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

// Channel types
export type ChannelType = 'direct' | 'broadcast' | 'multicast' | 'anycast';

export interface SecurityConfig {
  encryption: EncryptionConfig;
  authentication: AuthenticationConfig;
  authorization: AuthorizationConfig;
  audit: AuditConfig;
}

// Client status types
export type ClientStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Agent status types
export type AgentStatus = 'online' | 'offline' | 'processing' | 'error' | 'maintenance';

// Anomaly types
export type AnomalyType = 'spike' | 'drop' | 'pattern' | 'outlier';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

// Risk types
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Reference types
export type ReferenceType = 'agent' | 'workflow' | 'resource' | 'user';

// Restriction types
export type RestrictionType = 'temporal' | 'geographical' | 'resource' | 'permission';
export type RestrictionAction = 'allow' | 'deny' | 'warn' | 'log';

// Validation config types
export interface ValidationConfig {
  rules: ValidationRule[];
  strict: boolean;
  customValidators: CustomValidator[];
}

export interface CustomValidator {
  name: string;
  function: string;
  config: Record<string, any>;
}

// Pricing types
export type PricingTier = 'free' | 'basic' | 'premium' | 'enterprise';

export interface DiscountCondition {
  type: 'volume' | 'duration' | 'feature';
  threshold: number;
  discount: number;
}

// Report types
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ReportFormat = 'json' | 'csv' | 'pdf' | 'xlsx';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: ReportSection[];
  format: ReportFormat;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'text' | 'chart' | 'table' | 'metric';
  config: Record<string, any>;
}

// Dashboard types
export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  config: Record<string, any>;
  position: Position;
  size: { width: number; height: number };
}

// Chart types
export interface ReportChart {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  data: any[];
  config: Record<string, any>;
}

// Table types
export interface ReportTable {
  columns: TableColumn[];
  data: any[];
  pagination: PaginationConfig;
}

export interface TableColumn {
  key: string;
  title: string;
  type: string;
  sortable: boolean;
  filterable: boolean;
}

export interface PaginationConfig {
  page: number;
  size: number;
  total: number;
}

// Trend types
export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

// Storage types
export interface StorageConfig {
  type: 'local' | 's3' | 'gcs' | 'azure';
  config: Record<string, any>;
  encryption: EncryptionConfig;
}

// Processing types
export interface ProcessingConfig {
  batchSize: number;
  timeout: number;
  retries: number;
  parallel: boolean;
}

// Sharing types
export interface SharingConfig {
  enabled: boolean;
  permissions: string[];
  expiration?: Timestamp;
  encryption: boolean;
}

// Disposal types
export interface DisposalConfig {
  method: 'delete' | 'anonymize' | 'archive';
  retention: number;
  verification: boolean;
}

// Monitoring types
export interface MonitoringMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Timestamp;
  tags: Record<string, string>;
}

export interface MonitoringAlert {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  grid: GridItem[];
}

export interface GridItem {
  widgetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MonitoringReport {
  id: string;
  name: string;
  type: string;
  data: any;
  generatedAt: Timestamp;
  format: ReportFormat;
}

// Action types
export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'approve' | 'reject';

// Source types
export type SourceType = 'api' | 'database' | 'file' | 'stream' | 'webhook';

// Normalization types
export interface NormalizationConfig {
  rules: NormalizationRule[];
  mappings: FieldMapping[];
  validation: ValidationConfig;
}

export interface NormalizationRule {
  field: string;
  type: 'trim' | 'lowercase' | 'uppercase' | 'format' | 'transform';
  config: Record<string, any>;
}

export interface FieldMapping {
  source: string;
  target: string;
  transform?: string;
}

// Aggregation types
export interface AggregationConfig {
  groupBy: string[];
  aggregations: AggregationFunction[];
  filters: EventFilter[];
  timeWindow: TimeWindow;
}

export interface AggregationFunction {
  field: string;
  function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct';
  alias?: string;
}

export interface TimeWindow {
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
  offset?: number;
}

// Data type
export type DataType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'binary';

// Retention config
export interface RetentionConfig {
  duration: number;
  unit: 'days' | 'weeks' | 'months' | 'years';
  action: 'delete' | 'archive' | 'anonymize';
}