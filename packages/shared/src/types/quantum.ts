/**
 * Quantum-Resilient Security types for post-quantum cryptography
 * Implements lattice-based and hash-based cryptographic schemes
 */

import type { AlertSeverity, NotificationChannel, RiskLevel } from './common';

export interface QuantumSecurityConfig {
  id: string;
  tenantId: string;
  algorithm: QuantumAlgorithm;
  keySize: number;
  signatureScheme: SignatureScheme;
  encryptionScheme: EncryptionScheme;
  keyRotation: KeyRotationConfig;
  compliance: ComplianceConfig;
  createdAt: Date;
  updatedAt: Date;
}

export type QuantumAlgorithm = 
  | 'CRYSTALS-Kyber' 
  | 'CRYSTALS-Dilithium' 
  | 'FALCON' 
  | 'SPHINCS+' 
  | 'NTRU' 
  | 'SABER' 
  | 'McEliece' 
  | 'Rainbow';

export interface SignatureScheme {
  algorithm: QuantumAlgorithm;
  keySize: number;
  signatureSize: number;
  verificationTime: number;
  keyGenerationTime: number;
  securityLevel: SecurityLevel;
}

export interface EncryptionScheme {
  algorithm: QuantumAlgorithm;
  keySize: number;
  ciphertextSize: number;
  encryptionTime: number;
  decryptionTime: number;
  securityLevel: SecurityLevel;
}

export type SecurityLevel = 
  | 'Level-1' 
  | 'Level-3' 
  | 'Level-5' 
  | 'Level-8';

export interface KeyRotationConfig {
  enabled: boolean;
  interval: number; // hours
  overlapPeriod: number; // hours
  autoRotation: boolean;
  manualRotation: boolean;
  rotationStrategy: RotationStrategy;
}

export type RotationStrategy = 
  | 'time_based' 
  | 'usage_based' 
  | 'threat_based' 
  | 'hybrid';

export interface ComplianceConfig {
  standards: ComplianceStandard[];
  auditLogging: boolean;
  keyEscrow: boolean;
  exportRestrictions: boolean;
  jurisdiction: string;
  certifications: string[];
}

export type ComplianceStandard = 
  | 'FIPS-140-2' 
  | 'Common-Criteria' 
  | 'NIST-SP-800-56' 
  | 'ISO-27001' 
  | 'SOC-2' 
  | 'GDPR' 
  | 'HIPAA' 
  | 'PCI-DSS';

export interface QuantumKeyVault {
  id: string;
  tenantId: string;
  name: string;
  status: VaultStatus;
  config: VaultConfig;
  keys: QuantumKey[];
  accessPolicies: AccessPolicy[];
  auditLog: AuditLogEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export type VaultStatus = 
  | 'active' 
  | 'inactive' 
  | 'maintenance' 
  | 'error' 
  | 'compromised';

export interface VaultConfig {
  encryption: EncryptionConfig;
  backup: BackupConfig;
  replication: ReplicationConfig;
  monitoring: MonitoringConfig;
  access: AccessConfig;
}

export interface EncryptionConfig {
  algorithm: QuantumAlgorithm;
  keySize: number;
  mode: EncryptionMode;
  padding: PaddingScheme;
  ivGeneration: IVGeneration;
}

export type EncryptionMode = 
  | 'GCM' 
  | 'CBC' 
  | 'CTR' 
  | 'OFB' 
  | 'CFB';

export type PaddingScheme = 
  | 'PKCS7' 
  | 'OAEP' 
  | 'PSS' 
  | 'PKCS1';

export type IVGeneration = 
  | 'random' 
  | 'counter' 
  | 'timestamp' 
  | 'hybrid';

export interface BackupConfig {
  enabled: boolean;
  frequency: number; // hours
  retention: number; // days
  encryption: boolean;
  compression: boolean;
  locations: BackupLocation[];
}

export interface BackupLocation {
  type: 'local' | 'cloud' | 'tape';
  path: string;
  credentials: Record<string, string>;
  encryption: boolean;
}

export interface ReplicationConfig {
  enabled: boolean;
  replicas: number;
  strategy: ReplicationStrategy;
  consistency: ConsistencyLevel;
  regions: string[];
}

export type ReplicationStrategy = 
  | 'synchronous' 
  | 'asynchronous' 
  | 'eventual' 
  | 'strong';

export type ConsistencyLevel = 
  | 'strong' 
  | 'eventual' 
  | 'bounded_staleness' 
  | 'session';

export interface MonitoringConfig {
  enabled: boolean;
  metrics: string[];
  alerts: AlertConfig[];
  logging: LoggingConfig;
  dashboards: DashboardConfig[];
}

export interface AlertConfig {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  severity: AlertSeverity;
  channels: NotificationChannel[];
  enabled: boolean;
}

export interface LoggingConfig {
  level: LogLevel;
  format: LogFormat;
  retention: number; // days
  encryption: boolean;
  destinations: LogDestination[];
}

export type LogLevel = 
  | 'debug' 
  | 'info' 
  | 'warn' 
  | 'error' 
  | 'fatal';

export type LogFormat = 
  | 'json' 
  | 'text' 
  | 'binary' 
  | 'structured';

export interface LogDestination {
  type: 'file' | 'database' | 'syslog' | 'cloud';
  config: Record<string, any>;
  enabled: boolean;
}

export interface DashboardConfig {
  name: string;
  widgets: WidgetConfig[];
  refreshInterval: number;
  access: AccessConfig;
}

export interface WidgetConfig {
  type: string;
  title: string;
  config: Record<string, any>;
  position: Position;
  size: Size;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface AccessConfig {
  authentication: AuthenticationConfig;
  authorization: AuthorizationConfig;
  encryption: EncryptionConfig;
  audit: AuditConfig;
}

export interface AuthenticationConfig {
  methods: AuthMethod[];
  mfa: boolean;
  sessionTimeout: number;
  maxAttempts: number;
  lockoutDuration: number;
}

export type AuthMethod = 
  | 'password' 
  | 'certificate' 
  | 'biometric' 
  | 'hardware_token' 
  | 'smart_card';

export interface AuthorizationConfig {
  rbac: boolean;
  abac: boolean;
  policies: Policy[];
  defaultDeny: boolean;
  inheritance: boolean;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  conditions: PolicyCondition[];
  effect: PolicyEffect;
}

export interface PolicyRule {
  action: string;
  resource: string;
  conditions: PolicyCondition[];
}

export interface PolicyCondition {
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: any;
}

export type PolicyEffect = 
  | 'allow' 
  | 'deny' 
  | 'audit';

export interface AuditConfig {
  enabled: boolean;
  events: AuditEvent[];
  retention: number; // days
  encryption: boolean;
  integrity: boolean;
}

export type AuditEvent = 
  | 'key_access' 
  | 'key_creation' 
  | 'key_deletion' 
  | 'key_rotation' 
  | 'vault_access' 
  | 'policy_change' 
  | 'user_action' 
  | 'system_event';

export interface QuantumKey {
  id: string;
  vaultId: string;
  name: string;
  type: KeyType;
  algorithm: QuantumAlgorithm;
  keySize: number;
  status: KeyStatus;
  material: KeyMaterial;
  metadata: KeyMetadata;
  lifecycle: KeyLifecycle;
  access: KeyAccess;
  createdAt: Date;
  updatedAt: Date;
}

export type KeyType = 
  | 'signing' 
  | 'encryption' 
  | 'key_encryption' 
  | 'authentication' 
  | 'derivation';

export type KeyStatus = 
  | 'active' 
  | 'inactive' 
  | 'expired' 
  | 'revoked' 
  | 'compromised' 
  | 'pending_activation';

export interface KeyMaterial {
  publicKey: string;
  privateKey?: string; // Encrypted
  certificate?: string;
  chain?: string[];
  thumbprint: string;
  fingerprint: string;
}

export interface KeyMetadata {
  version: string;
  createdBy: string;
  purpose: string[];
  tags: string[];
  description: string;
  customAttributes: Record<string, any>;
}

export interface KeyLifecycle {
  created: Date;
  activated?: Date;
  expires?: Date;
  revoked?: Date;
  destroyed?: Date;
  rotationSchedule?: RotationSchedule;
  usageCount: number;
  lastUsed?: Date;
}

export interface RotationSchedule {
  enabled: boolean;
  interval: number; // hours
  nextRotation: Date;
  overlapPeriod: number; // hours
  autoRotation: boolean;
}

export interface KeyAccess {
  permissions: KeyPermission[];
  users: string[];
  groups: string[];
  applications: string[];
  ipWhitelist: string[];
  timeRestrictions: TimeRestriction[];
}

export interface KeyPermission {
  action: KeyAction;
  resource: string;
  conditions: PolicyCondition[];
}

export type KeyAction = 
  | 'read' 
  | 'write' 
  | 'delete' 
  | 'sign' 
  | 'verify' 
  | 'encrypt' 
  | 'decrypt' 
  | 'derive' 
  | 'rotate';

export interface TimeRestriction {
  days: number[];
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  subjects: PolicySubject[];
  resources: PolicyResource[];
  actions: PolicyAction[];
  conditions: PolicyCondition[];
  effect: PolicyEffect;
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicySubject {
  type: 'user' | 'group' | 'service' | 'application';
  id: string;
  attributes: Record<string, any>;
}

export interface PolicyResource {
  type: 'key' | 'vault' | 'operation';
  id: string;
  pattern: string;
  attributes: Record<string, any>;
}

export interface PolicyAction {
  name: string;
  description: string;
  parameters: ActionParameter[];
}

export interface ActionParameter {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  event: AuditEvent;
  subject: AuditSubject;
  resource: AuditResource;
  action: AuditAction;
  result: AuditResult;
  details: AuditDetails;
  metadata: Record<string, any>;
}

export interface AuditSubject {
  type: 'user' | 'service' | 'system';
  id: string;
  name: string;
  attributes: Record<string, any>;
}

export interface AuditResource {
  type: 'key' | 'vault' | 'policy';
  id: string;
  name: string;
  attributes: Record<string, any>;
}

export interface AuditAction {
  name: string;
  parameters: Record<string, any>;
  duration: number;
  success: boolean;
}

export interface AuditResult {
  success: boolean;
  error?: string;
  details: Record<string, any>;
}

export interface AuditDetails {
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  requestId: string;
  correlationId: string;
  additionalData: Record<string, any>;
}

export interface ZeroTrustConfig {
  id: string;
  tenantId: string;
  name: string;
  status: ZeroTrustStatus;
  policies: ZeroTrustPolicy[];
  authentication: ZeroTrustAuth;
  authorization: ZeroTrustAuthz;
  monitoring: ZeroTrustMonitoring;
  createdAt: Date;
  updatedAt: Date;
}

export type ZeroTrustStatus = 
  | 'active' 
  | 'inactive' 
  | 'testing' 
  | 'error';

export interface ZeroTrustPolicy {
  id: string;
  name: string;
  description: string;
  rules: ZeroTrustRule[];
  conditions: ZeroTrustCondition[];
  actions: ZeroTrustAction[];
  priority: number;
  enabled: boolean;
}

export interface ZeroTrustRule {
  id: string;
  name: string;
  type: RuleType;
  conditions: ZeroTrustCondition[];
  actions: ZeroTrustAction[];
  priority: number;
  enabled: boolean;
}

export type RuleType = 
  | 'access_control' 
  | 'network_segmentation' 
  | 'data_protection' 
  | 'threat_detection' 
  | 'compliance' 
  | 'behavioral';

export interface ZeroTrustCondition {
  attribute: string;
  operator: ConditionOperator;
  value: any;
  context: ConditionContext;
}

export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains' 
  | 'starts_with' 
  | 'ends_with' 
  | 'matches' 
  | 'greater_than' 
  | 'less_than' 
  | 'in' 
  | 'not_in';

export interface ConditionContext {
  source: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface ZeroTrustAction {
  type: ActionType;
  parameters: Record<string, any>;
  conditions: ZeroTrustCondition[];
}

export type ActionType = 
  | 'allow' 
  | 'deny' 
  | 'challenge' 
  | 'log' 
  | 'alert' 
  | 'redirect' 
  | 'throttle' 
  | 'quarantine';

export interface ZeroTrustAuth {
  methods: AuthMethod[];
  mfa: MFAConfig;
  session: SessionConfig;
  risk: RiskConfig;
  adaptive: AdaptiveAuthConfig;
}

export interface MFAConfig {
  enabled: boolean;
  methods: MFAMethod[];
  required: boolean;
  backupCodes: boolean;
  rememberDevice: boolean;
}

export type MFAMethod = 
  | 'totp' 
  | 'sms' 
  | 'email' 
  | 'push' 
  | 'biometric' 
  | 'hardware_token' 
  | 'backup_code';

export interface SessionConfig {
  timeout: number;
  maxConcurrent: number;
  refreshThreshold: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: SameSitePolicy;
}

export type SameSitePolicy = 
  | 'strict' 
  | 'lax' 
  | 'none';

export interface RiskConfig {
  enabled: boolean;
  factors: RiskFactor[];
  thresholds: RiskThreshold[];
  actions: RiskAction[];
}

export interface RiskFactor {
  name: string;
  weight: number;
  enabled: boolean;
  config: Record<string, any>;
}

export interface RiskThreshold {
  level: RiskLevel;
  score: number;
  action: RiskAction;
}

export interface RiskAction {
  type: 'allow' | 'deny' | 'challenge' | 'monitor';
  parameters: Record<string, any>;
}

export interface AdaptiveAuthConfig {
  enabled: boolean;
  learning: boolean;
  models: string[];
  thresholds: AdaptiveThreshold[];
  actions: AdaptiveAction[];
}

export interface AdaptiveThreshold {
  confidence: number;
  action: AdaptiveAction;
}

export interface AdaptiveAction {
  type: 'allow' | 'deny' | 'challenge' | 'escalate';
  parameters: Record<string, any>;
}

export interface ZeroTrustAuthz {
  rbac: RBACConfig;
  abac: ABACConfig;
  policies: AuthorizationPolicy[];
  enforcement: EnforcementConfig;
}

export interface RBACConfig {
  enabled: boolean;
  roles: Role[];
  permissions: Permission[];
  assignments: RoleAssignment[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  constraints: RoleConstraint[];
}

export interface RoleConstraint {
  attribute: string;
  operator: ConditionOperator;
  value: any;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions: PermissionCondition[];
}

export interface PermissionCondition {
  attribute: string;
  operator: ConditionOperator;
  value: any;
}

export interface RoleAssignment {
  userId: string;
  roleId: string;
  resourceId?: string;
  conditions: AssignmentCondition[];
  expiresAt?: Date;
}

export interface AssignmentCondition {
  attribute: string;
  operator: ConditionOperator;
  value: any;
}

export interface ABACConfig {
  enabled: boolean;
  attributes: AttributeDefinition[];
  policies: ABACPolicy[];
  evaluation: EvaluationConfig;
}

export interface AttributeDefinition {
  name: string;
  type: AttributeType;
  source: AttributeSource;
  required: boolean;
  multiValued: boolean;
}

export type AttributeType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'array' 
  | 'object';

export type AttributeSource = 
  | 'user' 
  | 'resource' 
  | 'environment' 
  | 'action' 
  | 'context';

export interface ABACPolicy {
  id: string;
  name: string;
  description: string;
  rules: ABACRule[];
  effect: PolicyEffect;
  priority: number;
}

export interface ABACRule {
  subject: RuleCondition[];
  resource: RuleCondition[];
  action: RuleCondition[];
  environment: RuleCondition[];
  context: RuleCondition[];
}

export interface RuleCondition {
  attribute: string;
  operator: ConditionOperator;
  value: any;
}

export interface EvaluationConfig {
  algorithm: EvaluationAlgorithm;
  caching: boolean;
  optimization: boolean;
  logging: boolean;
}

export type EvaluationAlgorithm = 
  | 'deny_overrides' 
  | 'permit_overrides' 
  | 'first_applicable' 
  | 'ordered_deny_overrides' 
  | 'ordered_permit_overrides';

export interface AuthorizationPolicy {
  id: string;
  name: string;
  description: string;
  rules: AuthorizationRule[];
  effect: PolicyEffect;
  priority: number;
  enabled: boolean;
}

export interface AuthorizationRule {
  subjects: PolicySubject[];
  resources: PolicyResource[];
  actions: PolicyAction[];
  conditions: PolicyCondition[];
}

export interface EnforcementConfig {
  mode: EnforcementMode;
  fallback: FallbackAction;
  logging: boolean;
  monitoring: boolean;
}

export type EnforcementMode = 
  | 'enforcing' 
  | 'permissive' 
  | 'audit';

export type FallbackAction = 
  | 'allow' 
  | 'deny' 
  | 'challenge';

export interface ZeroTrustMonitoring {
  enabled: boolean;
  metrics: MonitoringMetric[];
  alerts: MonitoringAlert[];
  dashboards: MonitoringDashboard[];
  reports: MonitoringReport[];
}

export interface MonitoringMetric {
  name: string;
  type: MetricType;
  description: string;
  unit: string;
  collection: CollectionConfig;
  aggregation: AggregationConfig;
}

export type MetricType = 
  | 'counter' 
  | 'gauge' 
  | 'histogram' 
  | 'summary';

export interface CollectionConfig {
  interval: number;
  retention: number;
  sampling: number;
  filters: MetricFilter[];
}

export interface MetricFilter {
  attribute: string;
  operator: ConditionOperator;
  value: any;
}

export interface AggregationConfig {
  functions: AggregationFunction[];
  windows: TimeWindow[];
  dimensions: string[];
}

export type AggregationFunction = 
  | 'sum' 
  | 'avg' 
  | 'min' 
  | 'max' 
  | 'count' 
  | 'percentile';

export interface TimeWindow {
  duration: number;
  step: number;
  alignment: WindowAlignment;
}

export type WindowAlignment = 
  | 'start' 
  | 'end' 
  | 'center';

export interface MonitoringAlert {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: NotificationChannel[];
  enabled: boolean;
}

export interface AlertCondition {
  operator: ConditionOperator;
  threshold: number;
  duration: number;
  evaluation: EvaluationConfig;
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  access: AccessConfig;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  position: Position;
  size: Size;
}

export type WidgetType = 
  | 'chart' 
  | 'table' 
  | 'gauge' 
  | 'text' 
  | 'map' 
  | 'heatmap';

export interface DashboardLayout {
  rows: number;
  columns: number;
  responsive: boolean;
  theme: string;
}

export interface MonitoringReport {
  id: string;
  name: string;
  description: string;
  schedule: ReportSchedule;
  format: ReportFormat;
  recipients: string[];
  templates: ReportTemplate[];
}

export interface ReportSchedule {
  frequency: ReportFrequency;
  time: string;
  timezone: string;
  enabled: boolean;
}

export type ReportFrequency = 
  | 'hourly' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'annually';

export type ReportFormat = 
  | 'pdf' 
  | 'html' 
  | 'csv' 
  | 'json' 
  | 'xml';

export interface ReportTemplate {
  name: string;
  content: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: string;
  defaultValue: any;
  required: boolean;
}