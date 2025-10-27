/**
 * Sovereign Data Zones types for tenant-controlled AI insight licensing
 * Implements data sovereignty and regulatory autonomy
 */

import type {
  EncryptionConfig,
  AccessConfig,
  MonitoringConfig,
  BackupConfig,
  RetentionConfig,
  AuditConfig,
  PriorityLevel,
  ActionType,
  ReportFrequency,
  ReportFormat,
  RecommendationType,
  EffortLevel,
  RecommendationAction,
  MonitoringMetric,
  MonitoringAlert,
  MonitoringDashboard,
  MonitoringReport,
  ReportTemplate,
  SharingConfig,
  StorageConfig,
  ProcessingConfig,
  DisposalConfig,
  AuthenticationConfig,
  AuthorizationConfig,
  LoggingConfig,
  DataType,
  NormalizationConfig,
  AggregationConfig,
  AlertCondition,
  AlertSeverity,
  DashboardWidget,
  DashboardLayout,
  ReportChart,
  ReportTable,
  TrendData,
  SourceType
} from './common';

export interface SovereignDataZone {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  status: ZoneStatus;
  config: ZoneConfig;
  governance: GovernanceConfig;
  compliance: ComplianceConfig;
  data: DataConfig;
  licensing: LicensingConfig;
  createdAt: Date;
  updatedAt: Date;
}

export type ZoneStatus = 
  | 'active' 
  | 'inactive' 
  | 'maintenance' 
  | 'error' 
  | 'suspended' 
  | 'archived';

export interface ZoneConfig {
  region: string;
  jurisdiction: string;
  dataResidency: DataResidencyConfig;
  encryption: EncryptionConfig;
  access: AccessConfig;
  monitoring: MonitoringConfig;
  backup: BackupConfig;
  retention: RetentionConfig;
}

export interface DataResidencyConfig {
  enabled: boolean;
  regions: string[];
  restrictions: DataRestriction[];
  exceptions: DataException[];
  monitoring: boolean;
}

export interface DataRestriction {
  type: RestrictionType;
  condition: string;
  action: RestrictionAction;
  enabled: boolean;
  metadata: Record<string, any>;
}

export type RestrictionType = 
  | 'geographic' 
  | 'jurisdictional' 
  | 'data_type' 
  | 'sensitivity' 
  | 'purpose' 
  | 'retention';

export type RestrictionAction = 
  | 'block' 
  | 'encrypt' 
  | 'anonymize' 
  | 'require_approval' 
  | 'log' 
  | 'notify';

export interface DataException {
  id: string;
  description: string;
  condition: string;
  action: RestrictionAction;
  approvedBy: string;
  approvedAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export interface GovernanceConfig {
  framework: GovernanceFramework;
  policies: GovernancePolicy[];
  roles: GovernanceRole[];
  permissions: GovernancePermission[];
  workflows: GovernanceWorkflow[];
  audit: AuditConfig;
}

export interface GovernanceFramework {
  name: string;
  version: string;
  standards: ComplianceStandard[];
  principles: GovernancePrinciple[];
  guidelines: GovernanceGuideline[];
}

export type ComplianceStandard = 
  | 'GDPR' 
  | 'CCPA' 
  | 'HIPAA' 
  | 'SOX' 
  | 'PCI-DSS' 
  | 'ISO-27001' 
  | 'NIST' 
  | 'AI-Act' 
  | 'DSA' 
  | 'DMA';

export interface GovernancePrinciple {
  id: string;
  name: string;
  description: string;
  category: PrincipleCategory;
  priority: PriorityLevel;
  requirements: PrincipleRequirement[];
}

export type PrincipleCategory = 
  | 'transparency' 
  | 'accountability' 
  | 'fairness' 
  | 'privacy' 
  | 'security' 
  | 'safety' 
  | 'human_agency' 
  | 'robustness' 
  | 'governance';

export interface PrincipleRequirement {
  id: string;
  description: string;
  type: RequirementType;
  mandatory: boolean;
  evidence: EvidenceType[];
  validation: ValidationConfig;
}

export type RequirementType = 
  | 'technical' 
  | 'organizational' 
  | 'procedural' 
  | 'documentation' 
  | 'training' 
  | 'monitoring';

export type EvidenceType = 
  | 'documentation' 
  | 'code_review' 
  | 'testing' 
  | 'audit' 
  | 'certification' 
  | 'monitoring';

export interface ValidationConfig {
  method: ValidationMethod;
  frequency: ValidationFrequency;
  criteria: ValidationCriteria[];
  automated: boolean;
  manual: boolean;
}

export type ValidationMethod = 
  | 'self_assessment' 
  | 'third_party_audit' 
  | 'certification' 
  | 'continuous_monitoring' 
  | 'peer_review';

export type ValidationFrequency = 
  | 'continuous' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'annually';

export interface ValidationCriteria {
  id: string;
  description: string;
  type: CriteriaType;
  threshold: number;
  operator: ComparisonOperator;
  weight: number;
}

export type CriteriaType = 
  | 'performance' 
  | 'accuracy' 
  | 'bias' 
  | 'privacy' 
  | 'security' 
  | 'compliance' 
  | 'transparency';

export type ComparisonOperator = 
  | 'gt' 
  | 'lt' 
  | 'gte' 
  | 'lte' 
  | 'eq' 
  | 'neq' 
  | 'contains' 
  | 'not_contains';

export interface GovernanceGuideline {
  id: string;
  title: string;
  description: string;
  category: GuidelineCategory;
  level: GuidelineLevel;
  steps: GuidelineStep[];
  references: GuidelineReference[];
}

export type GuidelineCategory = 
  | 'data_handling' 
  | 'model_development' 
  | 'deployment' 
  | 'monitoring' 
  | 'incident_response' 
  | 'user_rights' 
  | 'transparency' 
  | 'accountability';

export type GuidelineLevel = 
  | 'basic' 
  | 'intermediate' 
  | 'advanced' 
  | 'expert';

export interface GuidelineStep {
  step: number;
  title: string;
  description: string;
  action: string;
  evidence: string[];
  validation: string[];
  tools: string[];
}

export interface GuidelineReference {
  type: ReferenceType;
  title: string;
  url: string;
  description: string;
  relevance: RelevanceLevel;
}

export type ReferenceType = 
  | 'regulation' 
  | 'standard' 
  | 'guideline' 
  | 'best_practice' 
  | 'case_study' 
  | 'research';

export type RelevanceLevel = 
  | 'high' 
  | 'medium' 
  | 'low';

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  category: PolicyCategory;
  scope: PolicyScope;
  rules: PolicyRule[];
  enforcement: PolicyEnforcement;
  review: PolicyReview;
  status: PolicyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type PolicyCategory = 
  | 'data_protection' 
  | 'privacy' 
  | 'security' 
  | 'ai_governance' 
  | 'compliance' 
  | 'operational' 
  | 'ethical' 
  | 'transparency';

export interface PolicyScope {
  entities: string[];
  dataTypes: string[];
  operations: string[];
  regions: string[];
  timeframes: TimeFrame[];
}

export interface TimeFrame {
  start: Date;
  end: Date;
  recurring: boolean;
  pattern?: string;
}

export interface PolicyRule {
  id: string;
  condition: string;
  action: PolicyAction;
  priority: number;
  enabled: boolean;
  metadata: Record<string, any>;
}

export interface PolicyAction {
  type: ActionType;
  parameters: Record<string, any>;
  notifications: NotificationConfig[];
  escalations: EscalationConfig[];
}

export interface NotificationConfig {
  channel: NotificationChannel;
  template: string;
  recipients: string[];
  conditions: NotificationCondition[];
}

export interface NotificationChannel {
  type: ChannelType;
  config: Record<string, any>;
  enabled: boolean;
}

export type ChannelType = 
  | 'email' 
  | 'sms' 
  | 'slack' 
  | 'webhook' 
  | 'dashboard' 
  | 'api';

export interface NotificationCondition {
  attribute: string;
  operator: ComparisonOperator;
  value: any;
}

export interface EscalationConfig {
  level: number;
  condition: string;
  action: string;
  timeout: number;
  recipients: string[];
}

export interface PolicyEnforcement {
  mode: EnforcementMode;
  automated: boolean;
  manual: boolean;
  exceptions: PolicyException[];
  penalties: PolicyPenalty[];
}

export type EnforcementMode = 
  | 'preventive' 
  | 'detective' 
  | 'corrective' 
  | 'deterrent';

export interface PolicyException {
  id: string;
  description: string;
  condition: string;
  action: string;
  approvedBy: string;
  approvedAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export interface PolicyPenalty {
  type: PenaltyType;
  description: string;
  severity: PenaltySeverity;
  action: string;
  escalation: EscalationConfig;
}

export type PenaltyType = 
  | 'warning' 
  | 'fine' 
  | 'suspension' 
  | 'termination' 
  | 'legal_action';

export type PenaltySeverity = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'critical';

export interface PolicyReview {
  frequency: ReviewFrequency;
  reviewers: string[];
  criteria: ReviewCriteria[];
  process: ReviewProcess;
  lastReview?: Date;
  nextReview?: Date;
}

export type ReviewFrequency = 
  | 'continuous' 
  | 'monthly' 
  | 'quarterly' 
  | 'annually' 
  | 'ad_hoc';

export interface ReviewCriteria {
  id: string;
  description: string;
  weight: number;
  threshold: number;
  evidence: EvidenceType[];
}

export interface ReviewProcess {
  steps: ReviewStep[];
  approvals: ApprovalConfig[];
  notifications: NotificationConfig[];
  documentation: DocumentationConfig;
}

export interface ReviewStep {
  step: number;
  title: string;
  description: string;
  responsible: string;
  duration: number;
  deliverables: string[];
}

export interface ApprovalConfig {
  level: number;
  approvers: string[];
  quorum: number;
  timeout: number;
  escalation: EscalationConfig;
}

export interface DocumentationConfig {
  required: boolean;
  format: DocumentFormat;
  templates: DocumentTemplate[];
  retention: number;
  versioning: boolean;
}

export type DocumentFormat = 
  | 'pdf' 
  | 'docx' 
  | 'html' 
  | 'markdown' 
  | 'json' 
  | 'xml';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  format: DocumentFormat;
  content: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: string;
  required: boolean;
  defaultValue: any;
  description: string;
}

export type PolicyStatus = 
  | 'draft' 
  | 'review' 
  | 'approved' 
  | 'active' 
  | 'suspended' 
  | 'archived';

export interface GovernanceRole {
  id: string;
  name: string;
  description: string;
  level: RoleLevel;
  permissions: string[];
  responsibilities: string[];
  requirements: RoleRequirement[];
  reporting: ReportingConfig;
}

export type RoleLevel = 
  | 'executive' 
  | 'management' 
  | 'operational' 
  | 'technical' 
  | 'compliance' 
  | 'audit';

export interface RoleRequirement {
  type: RequirementType;
  description: string;
  mandatory: boolean;
  evidence: EvidenceType[];
}

export interface ReportingConfig {
  frequency: ReportFrequency;
  format: ReportFormat;
  recipients: string[];
  metrics: string[];
  dashboards: string[];
}

export interface GovernancePermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions: PermissionCondition[];
  scope: PermissionScope;
}

export interface PermissionCondition {
  attribute: string;
  operator: ComparisonOperator;
  value: any;
}

export interface PermissionScope {
  entities: string[];
  dataTypes: string[];
  operations: string[];
  regions: string[];
  timeframes: TimeFrame[];
}

export interface GovernanceWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  approvals: ApprovalConfig[];
  notifications: NotificationConfig[];
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: TriggerType;
  condition: string;
  schedule?: ScheduleConfig;
  event?: EventConfig;
}

export type TriggerType = 
  | 'manual' 
  | 'scheduled' 
  | 'event' 
  | 'condition' 
  | 'api';

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  time: string;
  timezone: string;
  days: number[];
  months: number[];
}

export type ScheduleFrequency = 
  | 'hourly' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'annually';

export interface EventConfig {
  source: string;
  type: string;
  filters: EventFilter[];
  conditions: EventCondition[];
}

export interface EventFilter {
  attribute: string;
  operator: ComparisonOperator;
  value: any;
}

export interface EventCondition {
  expression: string;
  variables: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  description: string;
  action: StepAction;
  conditions: StepCondition[];
  timeout: number;
  retry: RetryConfig;
  parallel: boolean;
}

export type StepType = 
  | 'action' 
  | 'approval' 
  | 'notification' 
  | 'condition' 
  | 'parallel' 
  | 'sequential';

export interface StepAction {
  type: ActionType;
  parameters: Record<string, any>;
  resources: string[];
  dependencies: string[];
}

export interface StepCondition {
  expression: string;
  variables: string[];
  onTrue: string;
  onFalse: string;
}

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  delay: number;
  backoff: BackoffStrategy;
}

export type BackoffStrategy = 
  | 'fixed' 
  | 'exponential' 
  | 'linear' 
  | 'custom';

export type WorkflowStatus = 
  | 'draft' 
  | 'active' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface ComplianceConfig {
  standards: ComplianceStandard[];
  requirements: ComplianceRequirement[];
  assessments: ComplianceAssessment[];
  certifications: ComplianceCertification[];
  monitoring: ComplianceMonitoring;
  reporting: ComplianceReporting;
}

export interface ComplianceRequirement {
  id: string;
  standard: ComplianceStandard;
  category: RequirementCategory;
  title: string;
  description: string;
  level: RequirementLevel;
  mandatory: boolean;
  evidence: EvidenceRequirement[];
  validation: ValidationConfig;
  status: RequirementStatus;
}

export type RequirementCategory = 
  | 'data_protection' 
  | 'privacy' 
  | 'security' 
  | 'transparency' 
  | 'accountability' 
  | 'fairness' 
  | 'safety' 
  | 'robustness';

export type RequirementLevel = 
  | 'basic' 
  | 'intermediate' 
  | 'advanced' 
  | 'expert';

export interface EvidenceRequirement {
  type: EvidenceType;
  description: string;
  format: DocumentFormat;
  template?: string;
  mandatory: boolean;
  validation: ValidationConfig;
}

export type RequirementStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'completed' 
  | 'verified' 
  | 'failed' 
  | 'exempt';

export interface ComplianceAssessment {
  id: string;
  standard: ComplianceStandard;
  type: AssessmentType;
  status: AssessmentStatus;
  scope: AssessmentScope;
  criteria: AssessmentCriteria[];
  results: AssessmentResult[];
  recommendations: AssessmentRecommendation[];
  conductedBy: string;
  conductedAt: Date;
  nextAssessment?: Date;
}

export type AssessmentType = 
  | 'self_assessment' 
  | 'internal_audit' 
  | 'external_audit' 
  | 'certification' 
  | 'continuous_monitoring';

export type AssessmentStatus = 
  | 'planned' 
  | 'in_progress' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface AssessmentScope {
  entities: string[];
  dataTypes: string[];
  operations: string[];
  regions: string[];
  timeframes: TimeFrame[];
}

export interface AssessmentCriteria {
  id: string;
  requirement: string;
  description: string;
  weight: number;
  threshold: number;
  evidence: EvidenceType[];
  validation: ValidationConfig;
}

export interface AssessmentResult {
  criteriaId: string;
  score: number;
  status: ResultStatus;
  evidence: Evidence[];
  findings: Finding[];
  recommendations: string[];
}

export type ResultStatus = 
  | 'compliant' 
  | 'partially_compliant' 
  | 'non_compliant' 
  | 'not_applicable';

export interface Evidence {
  type: EvidenceType;
  description: string;
  location: string;
  format: DocumentFormat;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface Finding {
  id: string;
  type: FindingType;
  severity: FindingSeverity;
  description: string;
  impact: string;
  recommendation: string;
  priority: PriorityLevel;
  status: FindingStatus;
}

export type FindingType = 
  | 'gap' 
  | 'violation' 
  | 'risk' 
  | 'opportunity' 
  | 'best_practice';

export type FindingSeverity = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'critical';

export type FindingStatus = 
  | 'open' 
  | 'in_progress' 
  | 'resolved' 
  | 'accepted' 
  | 'rejected';

export interface AssessmentRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: PriorityLevel;
  effort: EffortLevel;
  impact: number;
  actions: RecommendationAction[];
  timeline: number;
  resources: string[];
  dependencies: string[];
}

export interface ComplianceCertification {
  id: string;
  standard: ComplianceStandard;
  type: CertificationType;
  issuer: string;
  certificate: string;
  issuedAt: Date;
  expiresAt: Date;
  status: CertificationStatus;
  scope: CertificationScope;
  requirements: string[];
  evidence: Evidence[];
}

export type CertificationType = 
  | 'self_certification' 
  | 'third_party_certification' 
  | 'accreditation' 
  | 'audit_certification';

export type CertificationStatus = 
  | 'valid' 
  | 'expired' 
  | 'suspended' 
  | 'revoked' 
  | 'pending';

export interface CertificationScope {
  entities: string[];
  dataTypes: string[];
  operations: string[];
  regions: string[];
  timeframes: TimeFrame[];
}

export interface ComplianceMonitoring {
  enabled: boolean;
  frequency: MonitoringFrequency;
  metrics: MonitoringMetric[];
  alerts: MonitoringAlert[];
  dashboards: MonitoringDashboard[];
  reports: MonitoringReport[];
}

export type MonitoringFrequency = 
  | 'real_time' 
  | 'hourly' 
  | 'daily' 
  | 'weekly' 
  | 'monthly';

export interface ComplianceReporting {
  enabled: boolean;
  frequency: ReportFrequency;
  recipients: string[];
  formats: ReportFormat[];
  templates: ReportTemplate[];
  automation: AutomationConfig;
}

export interface AutomationConfig {
  enabled: boolean;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  conditions: AutomationCondition[];
  schedules: ScheduleConfig[];
}

export interface AutomationTrigger {
  type: TriggerType;
  condition: string;
  schedule?: ScheduleConfig;
  event?: EventConfig;
}

export interface AutomationAction {
  type: ActionType;
  parameters: Record<string, any>;
  resources: string[];
  dependencies: string[];
}

export interface AutomationCondition {
  expression: string;
  variables: string[];
  onTrue: string;
  onFalse: string;
}

export interface DataConfig {
  classification: DataClassification;
  handling: DataHandling;
  processing: DataProcessing;
  sharing: DataSharing;
  retention: DataRetention;
  deletion: DataDeletion;
}

export interface DataClassification {
  levels: ClassificationLevel[];
  rules: ClassificationRule[];
  automation: ClassificationAutomation;
  review: ClassificationReview;
}

export interface ClassificationLevel {
  id: string;
  name: string;
  description: string;
  sensitivity: SensitivityLevel;
  handling: HandlingRequirements;
  access: AccessRequirements;
  retention: RetentionRequirements;
}

export type SensitivityLevel = 
  | 'public' 
  | 'internal' 
  | 'confidential' 
  | 'restricted' 
  | 'top_secret';

export interface HandlingRequirements {
  encryption: EncryptionConfig;
  access: AccessConfig;
  monitoring: MonitoringConfig;
  backup: BackupConfig;
  sharing: SharingConfig;
}

export interface AccessRequirements {
  authentication: AuthenticationConfig;
  authorization: AuthorizationConfig;
  logging: LoggingConfig;
  auditing: AuditConfig;
}

export interface RetentionRequirements {
  period: number;
  unit: TimeUnit;
  conditions: RetentionCondition[];
  exceptions: RetentionException[];
}

export type TimeUnit = 
  | 'seconds' 
  | 'minutes' 
  | 'hours' 
  | 'days' 
  | 'weeks' 
  | 'months' 
  | 'years';

export interface RetentionCondition {
  type: ConditionType;
  value: any;
  action: RetentionAction;
}

export type ConditionType = 
  | 'age' 
  | 'usage' 
  | 'legal_hold' 
  | 'business_need' 
  | 'consent';

export type RetentionAction = 
  | 'extend' 
  | 'reduce' 
  | 'maintain' 
  | 'delete';

export interface RetentionException {
  id: string;
  description: string;
  condition: string;
  action: RetentionAction;
  approvedBy: string;
  approvedAt: Date;
  expiresAt?: Date;
}

export interface ClassificationRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  level: string;
  confidence: number;
  enabled: boolean;
  metadata: Record<string, any>;
}

export interface ClassificationAutomation {
  enabled: boolean;
  algorithms: ClassificationAlgorithm[];
  thresholds: ClassificationThreshold[];
  review: ClassificationReview;
}

export interface ClassificationAlgorithm {
  name: string;
  type: AlgorithmType;
  config: Record<string, any>;
  enabled: boolean;
  accuracy: number;
}

export type AlgorithmType = 
  | 'pattern_matching' 
  | 'machine_learning' 
  | 'rule_based' 
  | 'hybrid';

export interface ClassificationThreshold {
  level: string;
  confidence: number;
  action: ClassificationAction;
}

export type ClassificationAction = 
  | 'auto_classify' 
  | 'flag_for_review' 
  | 'require_manual' 
  | 'escalate';

export interface ClassificationReview {
  enabled: boolean;
  frequency: ReviewFrequency;
  reviewers: string[];
  criteria: ReviewCriteria[];
  process: ReviewProcess;
}

export interface DataHandling {
  collection: CollectionConfig;
  storage: StorageConfig;
  processing: ProcessingConfig;
  sharing: SharingConfig;
  disposal: DisposalConfig;
}

export interface CollectionConfig {
  purposes: CollectionPurpose[];
  methods: CollectionMethod[];
  consent: ConsentConfig;
  minimization: MinimizationConfig;
  transparency: TransparencyConfig;
}

export interface CollectionPurpose {
  id: string;
  name: string;
  description: string;
  legalBasis: LegalBasis;
  retention: RetentionRequirements;
  sharing: SharingConfig;
}

export type LegalBasis = 
  | 'consent' 
  | 'contract' 
  | 'legal_obligation' 
  | 'vital_interests' 
  | 'public_task' 
  | 'legitimate_interests';

export interface CollectionMethod {
  type: MethodType;
  description: string;
  privacy: PrivacyConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

export type MethodType = 
  | 'direct' 
  | 'indirect' 
  | 'automated' 
  | 'manual' 
  | 'third_party';

export interface PrivacyConfig {
  anonymization: AnonymizationConfig;
  pseudonymization: PseudonymizationConfig;
  encryption: EncryptionConfig;
  access: AccessConfig;
}

export interface AnonymizationConfig {
  enabled: boolean;
  techniques: AnonymizationTechnique[];
  quality: AnonymizationQuality;
  validation: ValidationConfig;
}

export type AnonymizationTechnique = 
  | 'generalization' 
  | 'suppression' 
  | 'perturbation' 
  | 'swapping' 
  | 'synthetic' 
  | 'differential_privacy';

export interface AnonymizationQuality {
  k_anonymity: number;
  l_diversity: number;
  t_closeness: number;
  delta_privacy: number;
}

export interface PseudonymizationConfig {
  enabled: boolean;
  techniques: PseudonymizationTechnique[];
  keys: KeyConfig;
  rotation: RotationConfig;
}

export type PseudonymizationTechnique = 
  | 'hashing' 
  | 'encryption' 
  | 'tokenization' 
  | 'masking' 
  | 'reversible';

export interface KeyConfig {
  algorithm: string;
  keySize: number;
  rotation: RotationConfig;
  storage: StorageConfig;
  access: AccessConfig;
}

export interface RotationConfig {
  enabled: boolean;
  interval: number;
  overlap: number;
  automatic: boolean;
  manual: boolean;
}

export interface SecurityConfig {
  encryption: EncryptionConfig;
  access: AccessConfig;
  monitoring: MonitoringConfig;
  backup: BackupConfig;
  incident: IncidentConfig;
}

export interface IncidentConfig {
  response: ResponseConfig;
  notification: NotificationConfig;
  escalation: EscalationConfig;
  recovery: RecoveryConfig;
}

export interface ResponseConfig {
  team: string[];
  process: ProcessConfig;
  tools: string[];
  timeline: TimelineConfig;
}

export interface ProcessConfig {
  steps: ProcessStep[];
  approvals: ApprovalConfig[];
  notifications: NotificationConfig[];
  documentation: DocumentationConfig;
}

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
  responsible: string;
  duration: number;
  deliverables: string[];
}

export interface TimelineConfig {
  detection: number;
  response: number;
  containment: number;
  recovery: number;
  lessons: number;
}

export interface RecoveryConfig {
  strategies: RecoveryStrategy[];
  testing: TestingConfig;
  validation: ValidationConfig;
  monitoring: MonitoringConfig;
}

export interface RecoveryStrategy {
  type: StrategyType;
  description: string;
  rto: number;
  rpo: number;
  resources: string[];
  dependencies: string[];
}

export type StrategyType = 
  | 'backup' 
  | 'replication' 
  | 'failover' 
  | 'reconstruction' 
  | 'alternative';

export interface TestingConfig {
  frequency: TestingFrequency;
  types: TestingType[];
  scenarios: TestingScenario[];
  validation: ValidationConfig;
}

export type TestingFrequency = 
  | 'continuous' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'annually';

export type TestingType = 
  | 'unit' 
  | 'integration' 
  | 'system' 
  | 'acceptance' 
  | 'performance' 
  | 'security' 
  | 'disaster_recovery';

export interface TestingScenario {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
  expected: ExpectedResult[];
  validation: ValidationConfig;
}

export interface ScenarioStep {
  step: number;
  action: string;
  input: any;
  expected: any;
  timeout: number;
}

export interface ExpectedResult {
  metric: string;
  value: any;
  operator: ComparisonOperator;
  tolerance: number;
}

export interface ConsentConfig {
  required: boolean;
  granular: boolean;
  withdrawal: WithdrawalConfig;
  renewal: RenewalConfig;
  evidence: EvidenceConfig;
}

export interface WithdrawalConfig {
  enabled: boolean;
  process: ProcessConfig;
  effects: WithdrawalEffect[];
  notifications: NotificationConfig[];
}

export interface WithdrawalEffect {
  type: EffectType;
  description: string;
  timeline: number;
  actions: string[];
}

export type EffectType = 
  | 'stop_processing' 
  | 'delete_data' 
  | 'anonymize_data' 
  | 'restrict_processing' 
  | 'port_data';

export interface RenewalConfig {
  enabled: boolean;
  frequency: RenewalFrequency;
  process: ProcessConfig;
  notifications: NotificationConfig[];
}

export type RenewalFrequency = 
  | 'annually' 
  | 'bi_annually' 
  | 'quarterly' 
  | 'monthly' 
  | 'as_needed';

export interface EvidenceConfig {
  required: boolean;
  format: EvidenceFormat;
  storage: StorageConfig;
  retention: RetentionConfig;
  access: AccessConfig;
}

export type EvidenceFormat = 
  | 'timestamp' 
  | 'signature' 
  | 'certificate' 
  | 'audit_log' 
  | 'document';

export interface MinimizationConfig {
  enabled: boolean;
  principles: MinimizationPrinciple[];
  techniques: MinimizationTechnique[];
  validation: ValidationConfig;
}

export interface MinimizationPrinciple {
  id: string;
  name: string;
  description: string;
  weight: number;
  enabled: boolean;
}

export interface MinimizationTechnique {
  type: TechniqueType;
  description: string;
  config: Record<string, any>;
  enabled: boolean;
}

export type TechniqueType = 
  | 'data_reduction' 
  | 'feature_selection' 
  | 'sampling' 
  | 'aggregation' 
  | 'summarization' 
  | 'compression';

export interface TransparencyConfig {
  enabled: boolean;
  notices: TransparencyNotice[];
  dashboards: TransparencyDashboard[];
  reports: TransparencyReport[];
  api: TransparencyAPI;
}

export interface TransparencyNotice {
  id: string;
  type: NoticeType;
  title: string;
  content: string;
  audience: string[];
  language: string;
  version: string;
  effectiveDate: Date;
  expirationDate?: Date;
}

export type NoticeType = 
  | 'privacy_policy' 
  | 'terms_of_service' 
  | 'data_processing_notice' 
  | 'cookie_policy' 
  | 'consent_form' 
  | 'rights_notice';

export interface TransparencyDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  access: AccessConfig;
  refresh: RefreshConfig;
}

export interface RefreshConfig {
  frequency: RefreshFrequency;
  automatic: boolean;
  manual: boolean;
  cache: CacheConfig;
}

export type RefreshFrequency = 
  | 'real_time' 
  | 'minute' 
  | 'hourly' 
  | 'daily' 
  | 'weekly' 
  | 'monthly';

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  strategy: CacheStrategy;
  invalidation: InvalidationConfig;
}

export type CacheStrategy = 
  | 'lru' 
  | 'lfu' 
  | 'fifo' 
  | 'ttl' 
  | 'custom';

export interface InvalidationConfig {
  triggers: InvalidationTrigger[];
  conditions: InvalidationCondition[];
  actions: InvalidationAction[];
}

export interface InvalidationTrigger {
  type: TriggerType;
  condition: string;
  action: string;
}

export interface InvalidationCondition {
  attribute: string;
  operator: ComparisonOperator;
  value: any;
}

export interface InvalidationAction {
  type: ActionType;
  parameters: Record<string, any>;
}

export interface TransparencyReport {
  id: string;
  name: string;
  description: string;
  frequency: ReportFrequency;
  format: ReportFormat;
  content: ReportContent;
  distribution: DistributionConfig;
}

export interface ReportContent {
  sections: ReportSection[];
  charts: ReportChart[];
  tables: ReportTable[];
  metrics: ReportMetric[];
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  visible: boolean;
}

export interface ReportMetric {
  id: string;
  name: string;
  description: string;
  value: any;
  unit: string;
  trend: TrendData;
  metadata: Record<string, any>;
}

export interface DistributionConfig {
  channels: DistributionChannel[];
  recipients: string[];
  schedule: ScheduleConfig;
  format: ReportFormat;
  encryption: EncryptionConfig;
}

export interface DistributionChannel {
  type: ChannelType;
  config: Record<string, any>;
  enabled: boolean;
  priority: number;
}

export interface TransparencyAPI {
  enabled: boolean;
  version: string;
  endpoints: APIEndpoint[];
  authentication: AuthenticationConfig;
  rateLimiting: RateLimitingConfig;
  documentation: DocumentationConfig;
}

export interface APIEndpoint {
  path: string;
  method: HTTPMethod;
  description: string;
  parameters: APIParameter[];
  responses: APIResponse[];
  authentication: boolean;
  rateLimit: RateLimitConfig;
}

export type HTTPMethod = 
  | 'GET' 
  | 'POST' 
  | 'PUT' 
  | 'DELETE' 
  | 'PATCH' 
  | 'HEAD' 
  | 'OPTIONS';

export interface APIParameter {
  name: string;
  type: ParameterType;
  required: boolean;
  description: string;
  example: any;
  validation: ValidationConfig;
}

export type ParameterType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'array' 
  | 'object' 
  | 'date' 
  | 'uuid';

export interface APIResponse {
  statusCode: number;
  description: string;
  schema: ResponseSchema;
  examples: ResponseExample[];
}

export interface ResponseSchema {
  type: string;
  properties: Record<string, any>;
  required: string[];
  additionalProperties: boolean;
}

export interface ResponseExample {
  name: string;
  description: string;
  value: any;
}

export interface RateLimitingConfig {
  enabled: boolean;
  limits: RateLimitConfig[];
  strategies: RateLimitStrategy[];
  headers: RateLimitHeaders;
}

export interface RateLimitConfig {
  window: number;
  limit: number;
  burst: number;
  skipSuccessful: boolean;
  skipFailed: boolean;
}

export interface RateLimitStrategy {
  type: StrategyType;
  config: Record<string, any>;
  enabled: boolean;
}

export interface RateLimitHeaders {
  enabled: boolean;
  limit: string;
  remaining: string;
  reset: string;
  retryAfter: string;
}

export interface DataProcessing {
  purposes: ProcessingPurpose[];
  methods: ProcessingMethod[];
  automation: ProcessingAutomation;
  monitoring: ProcessingMonitoring;
  quality: ProcessingQuality;
}

export interface ProcessingPurpose {
  id: string;
  name: string;
  description: string;
  legalBasis: LegalBasis;
  dataTypes: string[];
  operations: ProcessingOperation[];
  retention: RetentionRequirements;
  sharing: SharingConfig;
}

export interface ProcessingOperation {
  type: OperationType;
  description: string;
  automated: boolean;
  human: boolean;
  validation: ValidationConfig;
  monitoring: MonitoringConfig;
}

export type OperationType = 
  | 'collection' 
  | 'storage' 
  | 'analysis' 
  | 'profiling' 
  | 'prediction' 
  | 'decision' 
  | 'sharing' 
  | 'deletion';

export interface ProcessingMethod {
  id: string;
  name: string;
  description: string;
  type: MethodType;
  algorithm: AlgorithmConfig;
  privacy: PrivacyConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

export interface AlgorithmConfig {
  name: string;
  version: string;
  parameters: Record<string, any>;
  training: TrainingConfig;
  validation: ValidationConfig;
  performance: PerformanceConfig;
}

export interface TrainingConfig {
  data: TrainingData;
  method: TrainingMethod;
  validation: ValidationConfig;
  monitoring: MonitoringConfig;
}

export interface TrainingData {
  sources: DataSource[];
  preprocessing: PreprocessingConfig;
  augmentation: AugmentationConfig;
  splitting: SplittingConfig;
}

export interface DataSource {
  id: string;
  name: string;
  type: SourceType;
  location: string;
  format: DataFormat;
  quality: DataQuality;
  metadata: Record<string, any>;
}

export type DataFormat = 
  | 'csv' 
  | 'json' 
  | 'xml' 
  | 'parquet' 
  | 'avro' 
  | 'protobuf' 
  | 'binary' 
  | 'text';

export interface DataQuality {
  completeness: number;
  accuracy: number;
  consistency: number;
  validity: number;
  timeliness: number;
  uniqueness: number;
}

export interface PreprocessingConfig {
  cleaning: CleaningConfig;
  transformation: TransformationConfig;
  normalization: NormalizationConfig;
  encoding: EncodingConfig;
}

export interface CleaningConfig {
  missing: MissingValueConfig;
  outliers: OutlierConfig;
  duplicates: DuplicateConfig;
  noise: NoiseConfig;
}

export interface MissingValueConfig {
  strategy: MissingStrategy;
  value: any;
  threshold: number;
  imputation: ImputationConfig;
}

export type MissingStrategy = 
  | 'drop' 
  | 'fill' 
  | 'impute' 
  | 'flag' 
  | 'interpolate';

export interface ImputationConfig {
  method: ImputationMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type ImputationMethod = 
  | 'mean' 
  | 'median' 
  | 'mode' 
  | 'knn' 
  | 'regression' 
  | 'interpolation';

export interface OutlierConfig {
  detection: OutlierDetection;
  treatment: OutlierTreatment;
  threshold: number;
  validation: ValidationConfig;
}

export interface OutlierDetection {
  method: DetectionMethod;
  parameters: Record<string, any>;
  sensitivity: number;
}

export type DetectionMethod = 
  | 'iqr' 
  | 'z_score' 
  | 'isolation_forest' 
  | 'local_outlier_factor' 
  | 'one_class_svm';

export interface OutlierTreatment {
  method: TreatmentMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type TreatmentMethod = 
  | 'remove' 
  | 'cap' 
  | 'transform' 
  | 'flag' 
  | 'investigate';

export interface DuplicateConfig {
  detection: DuplicateDetection;
  treatment: DuplicateTreatment;
  threshold: number;
  validation: ValidationConfig;
}

export interface DuplicateDetection {
  method: DetectionMethod;
  parameters: Record<string, any>;
  similarity: number;
}

export interface DuplicateTreatment {
  method: TreatmentMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export interface NoiseConfig {
  detection: NoiseDetection;
  treatment: NoiseTreatment;
  threshold: number;
  validation: ValidationConfig;
}

export interface NoiseDetection {
  method: DetectionMethod;
  parameters: Record<string, any>;
  sensitivity: number;
}

export interface NoiseTreatment {
  method: TreatmentMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export interface TransformationConfig {
  scaling: ScalingConfig;
  encoding: EncodingConfig;
  feature: FeatureConfig;
  temporal: TemporalConfig;
}

export interface ScalingConfig {
  method: ScalingMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type ScalingMethod = 
  | 'min_max' 
  | 'standard' 
  | 'robust' 
  | 'quantile' 
  | 'power' 
  | 'log';

export interface EncodingConfig {
  categorical: CategoricalEncoding;
  numerical: NumericalEncoding;
  temporal: TemporalEncoding;
  text: TextEncoding;
}

export interface CategoricalEncoding {
  method: CategoricalMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type CategoricalMethod = 
  | 'one_hot' 
  | 'label' 
  | 'ordinal' 
  | 'target' 
  | 'frequency' 
  | 'embedding';

export interface NumericalEncoding {
  method: NumericalMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type NumericalMethod = 
  | 'binning' 
  | 'log' 
  | 'sqrt' 
  | 'reciprocal' 
  | 'polynomial' 
  | 'interaction';

export interface TemporalEncoding {
  method: TemporalMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type TemporalMethod = 
  | 'cyclical' 
  | 'trend' 
  | 'seasonal' 
  | 'lag' 
  | 'rolling' 
  | 'difference';

export interface TextEncoding {
  method: TextMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type TextMethod = 
  | 'bag_of_words' 
  | 'tf_idf' 
  | 'word2vec' 
  | 'glove' 
  | 'fasttext' 
  | 'bert';

export interface FeatureConfig {
  selection: SelectionConfig;
  engineering: EngineeringConfig;
  extraction: ExtractionConfig;
  reduction: ReductionConfig;
}

export interface SelectionConfig {
  method: SelectionMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type SelectionMethod = 
  | 'correlation' 
  | 'mutual_information' 
  | 'chi_square' 
  | 'f_score' 
  | 'recursive' 
  | 'lasso';

export interface EngineeringConfig {
  methods: EngineeringMethod[];
  validation: ValidationConfig;
}

export interface EngineeringMethod {
  name: string;
  description: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface ExtractionConfig {
  method: ExtractionMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type ExtractionMethod = 
  | 'pca' 
  | 'ica' 
  | 'lda' 
  | 'tsne' 
  | 'umap' 
  | 'autoencoder';

export interface ReductionConfig {
  method: ReductionMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type ReductionMethod = 
  | 'pca' 
  | 'lda' 
  | 'tsne' 
  | 'umap' 
  | 'autoencoder' 
  | 'clustering';

export interface TemporalConfig {
  frequency: FrequencyConfig;
  seasonality: SeasonalityConfig;
  trend: TrendConfig;
  stationarity: StationarityConfig;
}

export interface FrequencyConfig {
  method: FrequencyMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type FrequencyMethod = 
  | 'fft' 
  | 'wavelet' 
  | 'autocorrelation' 
  | 'spectral' 
  | 'periodogram';

export interface SeasonalityConfig {
  detection: SeasonalityDetection;
  decomposition: SeasonalityDecomposition;
  validation: ValidationConfig;
}

export interface SeasonalityDetection {
  method: DetectionMethod;
  parameters: Record<string, any>;
  threshold: number;
}

export interface SeasonalityDecomposition {
  method: DecompositionMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type DecompositionMethod = 
  | 'additive' 
  | 'multiplicative' 
  | 'x13' 
  | 'stl' 
  | 'seasonal_decompose';

export interface TrendConfig {
  detection: TrendDetection;
  modeling: TrendModeling;
  validation: ValidationConfig;
}

export interface TrendDetection {
  method: DetectionMethod;
  parameters: Record<string, any>;
  threshold: number;
}

export interface TrendModeling {
  method: ModelingMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type ModelingMethod = 
  | 'linear' 
  | 'polynomial' 
  | 'exponential' 
  | 'logarithmic' 
  | 'power' 
  | 'sigmoid';

export interface StationarityConfig {
  testing: StationarityTesting;
  transformation: StationarityTransformation;
  validation: ValidationConfig;
}

export interface StationarityTesting {
  method: TestingMethod;
  parameters: Record<string, any>;
  threshold: number;
}

export type TestingMethod = 
  | 'adf' 
  | 'kpss' 
  | 'pp' 
  | 'zivot_andrews' 
  | 'bai_perron';

export interface StationarityTransformation {
  method: TransformationMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type TransformationMethod = 
  | 'differencing' 
  | 'log' 
  | 'sqrt' 
  | 'box_cox' 
  | 'yeo_johnson' 
  | 'quantile';

export interface AugmentationConfig {
  enabled: boolean;
  methods: AugmentationMethod[];
  validation: ValidationConfig;
}

export interface AugmentationMethod {
  type: AugmentationType;
  parameters: Record<string, any>;
  probability: number;
  enabled: boolean;
}

export type AugmentationType = 
  | 'noise' 
  | 'rotation' 
  | 'translation' 
  | 'scaling' 
  | 'flipping' 
  | 'cropping' 
  | 'color' 
  | 'texture';

export interface SplittingConfig {
  method: SplittingMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type SplittingMethod = 
  | 'random' 
  | 'stratified' 
  | 'time_series' 
  | 'k_fold' 
  | 'leave_one_out' 
  | 'bootstrap';

export interface TrainingMethod {
  algorithm: AlgorithmType;
  parameters: Record<string, any>;
  optimization: OptimizationConfig;
  validation: ValidationConfig;
  monitoring: MonitoringConfig;
}

export interface OptimizationConfig {
  method: OptimizationMethod;
  parameters: Record<string, any>;
  earlyStopping: EarlyStoppingConfig;
  regularization: RegularizationConfig;
}

export type OptimizationMethod = 
  | 'sgd' 
  | 'adam' 
  | 'rmsprop' 
  | 'adagrad' 
  | 'adadelta' 
  | 'adamax' 
  | 'nadam';

export interface EarlyStoppingConfig {
  enabled: boolean;
  patience: number;
  minDelta: number;
  monitor: string;
  mode: MonitorMode;
}

export type MonitorMode = 
  | 'min' 
  | 'max' 
  | 'auto';

export interface RegularizationConfig {
  l1: number;
  l2: number;
  dropout: number;
  batchNorm: boolean;
  weightDecay: number;
}

export interface PerformanceConfig {
  metrics: PerformanceMetric[];
  thresholds: PerformanceThreshold[];
  validation: ValidationConfig;
  monitoring: MonitoringConfig;
}

export interface PerformanceMetric {
  name: string;
  type: MetricType;
  parameters: Record<string, any>;
  weight: number;
  enabled: boolean;
}

export type MetricType = 
  | 'accuracy' 
  | 'precision' 
  | 'recall' 
  | 'f1' 
  | 'auc' 
  | 'mae' 
  | 'mse' 
  | 'rmse' 
  | 'mape' 
  | 'smape';

export interface PerformanceThreshold {
  metric: string;
  threshold: number;
  operator: ComparisonOperator;
  action: ThresholdAction;
}

export type ThresholdAction = 
  | 'alert' 
  | 'retrain' 
  | 'stop' 
  | 'escalate' 
  | 'log';

export interface ProcessingAutomation {
  enabled: boolean;
  triggers: ProcessingTrigger[];
  workflows: ProcessingWorkflow[];
  monitoring: ProcessingMonitoring;
}

export interface ProcessingTrigger {
  type: TriggerType;
  condition: string;
  action: string;
  enabled: boolean;
}

export interface ProcessingWorkflow {
  id: string;
  name: string;
  description: string;
  steps: ProcessingStep[];
  approvals: ApprovalConfig[];
  notifications: NotificationConfig[];
  status: WorkflowStatus;
}

export interface ProcessingStep {
  id: string;
  name: string;
  type: StepType;
  action: StepAction;
  conditions: StepCondition[];
  timeout: number;
  retry: RetryConfig;
}

export interface ProcessingMonitoring {
  enabled: boolean;
  metrics: ProcessingMetric[];
  alerts: ProcessingAlert[];
  dashboards: ProcessingDashboard[];
  reports: ProcessingReport[];
}

export interface ProcessingMetric {
  name: string;
  type: MetricType;
  description: string;
  collection: CollectionConfig;
  aggregation: AggregationConfig;
}

export interface ProcessingAlert {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: NotificationChannel[];
  enabled: boolean;
}

export interface ProcessingDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  access: AccessConfig;
}

export interface ProcessingReport {
  id: string;
  name: string;
  description: string;
  frequency: ReportFrequency;
  format: ReportFormat;
  content: ReportContent;
  distribution: DistributionConfig;
}

export interface ProcessingQuality {
  enabled: boolean;
  metrics: QualityMetric[];
  thresholds: QualityThreshold[];
  validation: ValidationConfig;
  monitoring: MonitoringConfig;
}

export interface QualityMetric {
  name: string;
  type: QualityType;
  description: string;
  calculation: QualityCalculation;
  weight: number;
  enabled: boolean;
}

export type QualityType = 
  | 'completeness' 
  | 'accuracy' 
  | 'consistency' 
  | 'validity' 
  | 'timeliness' 
  | 'uniqueness' 
  | 'relevance' 
  | 'usability';

export interface QualityCalculation {
  method: CalculationMethod;
  parameters: Record<string, any>;
  validation: ValidationConfig;
}

export type CalculationMethod = 
  | 'percentage' 
  | 'ratio' 
  | 'count' 
  | 'average' 
  | 'median' 
  | 'standard_deviation' 
  | 'variance' 
  | 'correlation';

export interface QualityThreshold {
  metric: string;
  threshold: number;
  operator: ComparisonOperator;
  action: ThresholdAction;
}

export interface DataSharing {
  policies: SharingPolicy[];
  agreements: SharingAgreement[];
  monitoring: SharingMonitoring;
  compliance: SharingCompliance;
}

export interface SharingPolicy {
  id: string;
  name: string;
  description: string;
  scope: SharingScope;
  conditions: SharingCondition[];
  restrictions: SharingRestriction[];
  approvals: ApprovalConfig[];
  status: PolicyStatus;
}

export interface SharingScope {
  dataTypes: string[];
  purposes: string[];
  recipients: string[];
  regions: string[];
  timeframes: TimeFrame[];
}

export interface SharingCondition {
  attribute: string;
  operator: ComparisonOperator;
  value: any;
  action: SharingAction;
}

export type SharingAction = 
  | 'allow' 
  | 'deny' 
  | 'require_approval' 
  | 'encrypt' 
  | 'anonymize' 
  | 'log';

export interface SharingRestriction {
  type: RestrictionType;
  condition: string;
  action: RestrictionAction;
  enabled: boolean;
}

export interface SharingAgreement {
  id: string;
  name: string;
  description: string;
  parties: AgreementParty[];
  terms: AgreementTerm[];
  data: AgreementData[];
  security: AgreementSecurity;
  compliance: AgreementCompliance;
  status: AgreementStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgreementParty {
  id: string;
  name: string;
  type: PartyType;
  role: PartyRole;
  contact: ContactInfo;
  credentials: CredentialInfo;
}

export type PartyType = 
  | 'data_controller' 
  | 'data_processor' 
  | 'data_subject' 
  | 'third_party' 
  | 'regulator' 
  | 'auditor';

export type PartyRole = 
  | 'owner' 
  | 'custodian' 
  | 'user' 
  | 'auditor' 
  | 'regulator' 
  | 'observer';

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  address: AddressInfo;
  timezone: string;
}

export interface AddressInfo {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface CredentialInfo {
  type: CredentialType;
  value: string;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export type CredentialType = 
  | 'api_key' 
  | 'certificate' 
  | 'token' 
  | 'password' 
  | 'biometric' 
  | 'hardware';

export interface AgreementTerm {
  id: string;
  name: string;
  description: string;
  type: TermType;
  value: any;
  conditions: TermCondition[];
  enforcement: TermEnforcement;
}

export type TermType = 
  | 'duration' 
  | 'purpose' 
  | 'data_type' 
  | 'volume' 
  | 'frequency' 
  | 'quality' 
  | 'security' 
  | 'compliance';

export interface TermCondition {
  attribute: string;
  operator: ComparisonOperator;
  value: any;
  action: TermAction;
}

export type TermAction = 
  | 'enforce' 
  | 'warn' 
  | 'log' 
  | 'escalate' 
  | 'terminate';

export interface TermEnforcement {
  automated: boolean;
  manual: boolean;
  monitoring: boolean;
  penalties: PenaltyConfig[];
}

export interface PenaltyConfig {
  type: PenaltyType;
  description: string;
  severity: PenaltySeverity;
  action: string;
  escalation: EscalationConfig;
}

export interface AgreementData {
  id: string;
  name: string;
  description: string;
  type: DataType;
  classification: string;
  volume: VolumeInfo;
  format: DataFormat;
  quality: DataQuality;
  retention: RetentionRequirements;
  sharing: SharingConfig;
}

export interface VolumeInfo {
  estimated: number;
  unit: VolumeUnit;
  frequency: VolumeFrequency;
  growth: GrowthRate;
}

export type VolumeUnit = 
  | 'records' 
  | 'bytes' 
  | 'files' 
  | 'transactions' 
  | 'requests';

export type VolumeFrequency = 
  | 'per_second' 
  | 'per_minute' 
  | 'per_hour' 
  | 'per_day' 
  | 'per_week' | 'per_month' | 'per_year';

export interface GrowthRate {
  type: GrowthType;
  value: number;
  unit: GrowthUnit;
  projection: GrowthProjection[];
}

export type GrowthType = 
  | 'linear' 
  | 'exponential' 
  | 'logarithmic' 
  | 'polynomial' 
  | 'seasonal';

export type GrowthUnit = 
  | 'percentage' 
  | 'absolute' 
  | 'compound';

export interface GrowthProjection {
  period: string;
  value: number;
  confidence: number;
}

export interface AgreementSecurity {
  encryption: EncryptionConfig;
  access: AccessConfig;
  monitoring: MonitoringConfig;
  backup: BackupConfig;
  incident: IncidentConfig;
}

export interface AgreementCompliance {
  standards: ComplianceStandard[];
  requirements: ComplianceRequirement[];
  monitoring: ComplianceMonitoring;
  reporting: ComplianceReporting;
  auditing: AuditingConfig;
}

export interface AuditingConfig {
  enabled: boolean;
  frequency: AuditFrequency;
  scope: AuditScope;
  methods: AuditMethod[];
  reporting: AuditReporting;
}

export type AuditFrequency = 
  | 'continuous' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'annually';

export interface AuditScope {
  entities: string[];
  dataTypes: string[];
  operations: string[];
  regions: string[];
  timeframes: TimeFrame[];
}

export interface AuditMethod {
  type: AuditMethodType;
  description: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

export type AuditMethodType = 
  | 'automated' 
  | 'manual' 
  | 'sampling' 
  | 'full_scan' 
  | 'targeted' 
  | 'random';

export interface AuditReporting {
  format: ReportFormat;
  frequency: ReportFrequency;
  recipients: string[];
  templates: ReportTemplate[];
  automation: AutomationConfig;
}

export type AgreementStatus = 
  | 'draft' 
  | 'negotiating' 
  | 'approved' 
  | 'active' 
  | 'suspended' 
  | 'terminated' 
  | 'expired';

export interface SharingMonitoring {
  enabled: boolean;
  metrics: SharingMetric[];
  alerts: SharingAlert[];
  dashboards: SharingDashboard[];
  reports: SharingReport[];
}

export interface SharingMetric {
  name: string;
  type: MetricType;
  description: string;
  collection: CollectionConfig;
  aggregation: AggregationConfig;
}

export interface SharingAlert {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: NotificationChannel[];
  enabled: boolean;
}

export interface SharingDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  access: AccessConfig;
}

export interface SharingReport {
  id: string;
  name: string;
  description: string;
  frequency: ReportFrequency;
  format: ReportFormat;
  content: ReportContent;
  distribution: DistributionConfig;
}

export interface SharingCompliance {
  standards: ComplianceStandard[];
  requirements: ComplianceRequirement[];
  monitoring: ComplianceMonitoring;
  reporting: ComplianceReporting;
  auditing: AuditingConfig;
}

export interface DataRetention {
  policies: RetentionPolicy[];
  schedules: RetentionSchedule[];
  monitoring: RetentionMonitoring;
  compliance: RetentionCompliance;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  scope: RetentionScope;
  rules: RetentionRule[];
  exceptions: RetentionException[];
  enforcement: RetentionEnforcement;
  status: PolicyStatus;
}

export interface RetentionScope {
  dataTypes: string[];
  purposes: string[];
  regions: string[];
  entities: string[];
  timeframes: TimeFrame[];
}

export interface RetentionRule {
  id: string;
  condition: string;
  period: RetentionPeriod;
  action: RetentionAction;
  priority: number;
  enabled: boolean;
}

export interface RetentionPeriod {
  value: number;
  unit: TimeUnit;
  conditions: RetentionCondition[];
  extensions: RetentionExtension[];
}

export interface RetentionExtension {
  condition: string;
  period: RetentionPeriod;
  approval: ApprovalConfig;
  notifications: NotificationConfig[];
}

export interface RetentionEnforcement {
  automated: boolean;
  manual: boolean;
  monitoring: boolean;
  penalties: PenaltyConfig[];
}

export interface RetentionSchedule {
  id: string;
  name: string;
  description: string;
  frequency: ScheduleFrequency;
  time: string;
  timezone: string;
  rules: RetentionRule[];
  notifications: NotificationConfig[];
  enabled: boolean;
}

export interface RetentionMonitoring {
  enabled: boolean;
  metrics: RetentionMetric[];
  alerts: RetentionAlert[];
  dashboards: RetentionDashboard[];
  reports: RetentionReport[];
}

export interface RetentionMetric {
  name: string;
  type: MetricType;
  description: string;
  collection: CollectionConfig;
  aggregation: AggregationConfig;
}

export interface RetentionAlert {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: NotificationChannel[];
  enabled: boolean;
}

export interface RetentionDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  access: AccessConfig;
}

export interface RetentionReport {
  id: string;
  name: string;
  description: string;
  frequency: ReportFrequency;
  format: ReportFormat;
  content: ReportContent;
  distribution: DistributionConfig;
}

export interface RetentionCompliance {
  standards: ComplianceStandard[];
  requirements: ComplianceRequirement[];
  monitoring: ComplianceMonitoring;
  reporting: ComplianceReporting;
  auditing: AuditingConfig;
}

export interface DataDeletion {
  policies: DeletionPolicy[];
  schedules: DeletionSchedule[];
  monitoring: DeletionMonitoring;
  compliance: DeletionCompliance;
}

export interface DeletionPolicy {
  id: string;
  name: string;
  description: string;
  scope: DeletionScope;
  rules: DeletionRule[];
  exceptions: DeletionException[];
  enforcement: DeletionEnforcement;
  status: PolicyStatus;
}

export interface DeletionScope {
  dataTypes: string[];
  purposes: string[];
  regions: string[];
  entities: string[];
  timeframes: TimeFrame[];
}

export interface DeletionRule {
  id: string;
  condition: string;
  method: DeletionMethod;
  verification: DeletionVerification;
  priority: number;
  enabled: boolean;
}

export type DeletionMethod = 
  | 'soft_delete' 
  | 'hard_delete' 
  | 'anonymize' 
  | 'pseudonymize' 
  | 'encrypt' 
  | 'shred';

export interface DeletionVerification {
  required: boolean;
  methods: VerificationMethod[];
  evidence: EvidenceConfig;
  audit: AuditConfig;
}

export type VerificationMethod = 
  | 'checksum' 
  | 'hash' 
  | 'signature' 
  | 'certificate' 
  | 'witness' 
  | 'automated';

export interface DeletionException {
  id: string;
  description: string;
  condition: string;
  action: DeletionAction;
  approvedBy: string;
  approvedAt: Date;
  expiresAt?: Date;
}

export type DeletionAction = 
  | 'exempt' 
  | 'delay' 
  | 'modify' 
  | 'escalate' 
  | 'require_approval';

export interface DeletionEnforcement {
  automated: boolean;
  manual: boolean;
  monitoring: boolean;
  penalties: PenaltyConfig[];
}

export interface DeletionSchedule {
  id: string;
  name: string;
  description: string;
  frequency: ScheduleFrequency;
  time: string;
  timezone: string;
  rules: DeletionRule[];
  notifications: NotificationConfig[];
  enabled: boolean;
}

export interface DeletionMonitoring {
  enabled: boolean;
  metrics: DeletionMetric[];
  alerts: DeletionAlert[];
  dashboards: DeletionDashboard[];
  reports: DeletionReport[];
}

export interface DeletionMetric {
  name: string;
  type: MetricType;
  description: string;
  collection: CollectionConfig;
  aggregation: AggregationConfig;
}

export interface DeletionAlert {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: NotificationChannel[];
  enabled: boolean;
}

export interface DeletionDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  access: AccessConfig;
}

export interface DeletionReport {
  id: string;
  name: string;
  description: string;
  frequency: ReportFrequency;
  format: ReportFormat;
  content: ReportContent;
  distribution: DistributionConfig;
}

export interface DeletionCompliance {
  standards: ComplianceStandard[];
  requirements: ComplianceRequirement[];
  monitoring: ComplianceMonitoring;
  reporting: ComplianceReporting;
  auditing: AuditingConfig;
}

export interface LicensingConfig {
  models: LicensingModel[];
  agreements: LicensingAgreement[];
  monitoring: LicensingMonitoring;
  compliance: LicensingCompliance;
}

export interface LicensingModel {
  id: string;
  name: string;
  description: string;
  type: LicensingType;
  terms: LicensingTerm[];
  pricing: LicensingPricing;
  restrictions: LicensingRestriction[];
  status: LicensingStatus;
}

export type LicensingType = 
  | 'perpetual' 
  | 'subscription' 
  | 'usage_based' 
  | 'revenue_share' 
  | 'hybrid' 
  | 'custom';

export interface LicensingTerm {
  id: string;
  name: string;
  description: string;
  type: TermType;
  value: any;
  conditions: TermCondition[];
  enforcement: TermEnforcement;
}

export interface LicensingPricing {
  model: PricingModel;
  tiers: PricingTier[];
  discounts: PricingDiscount[];
  taxes: PricingTax[];
  currency: string;
}

export type PricingModel = 
  | 'fixed' 
  | 'tiered' 
  | 'volume' 
  | 'usage' 
  | 'value' 
  | 'hybrid';

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  min: number;
  max: number;
  price: number;
  unit: string;
  features: string[];
}

export interface PricingDiscount {
  id: string;
  name: string;
  description: string;
  type: DiscountType;
  value: number;
  conditions: DiscountCondition[];
  validFrom: Date;
  validTo: Date;
}

export type DiscountType = 
  | 'percentage' 
  | 'fixed' 
  | 'volume' 
  | 'loyalty' 
  | 'promotional' 
  | 'early_bird';

export interface DiscountCondition {
  attribute: string;
  operator: ComparisonOperator;
  value: any;
  period: string;
}

export interface PricingTax {
  id: string;
  name: string;
  description: string;
  rate: number;
  jurisdiction: string;
  exemptions: string[];
}

export interface LicensingRestriction {
  id: string;
  name: string;
  description: string;
  type: RestrictionType;
  condition: string;
  action: RestrictionAction;
  enabled: boolean;
}

export type LicensingStatus = 
  | 'draft' 
  | 'active' 
  | 'suspended' 
  | 'expired' 
  | 'terminated' 
  | 'archived';

export interface LicensingAgreement {
  id: string;
  name: string;
  description: string;
  parties: AgreementParty[];
  terms: AgreementTerm[];
  data: AgreementData[];
  security: AgreementSecurity;
  compliance: AgreementCompliance;
  status: AgreementStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicensingMonitoring {
  enabled: boolean;
  metrics: LicensingMetric[];
  alerts: LicensingAlert[];
  dashboards: LicensingDashboard[];
  reports: LicensingReport[];
}

export interface LicensingMetric {
  name: string;
  type: MetricType;
  description: string;
  collection: CollectionConfig;
  aggregation: AggregationConfig;
}

export interface LicensingAlert {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: NotificationChannel[];
  enabled: boolean;
}

export interface LicensingDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  access: AccessConfig;
}

export interface LicensingReport {
  id: string;
  name: string;
  description: string;
  frequency: ReportFrequency;
  format: ReportFormat;
  content: ReportContent;
  distribution: DistributionConfig;
}

export interface LicensingCompliance {
  standards: ComplianceStandard[];
  requirements: ComplianceRequirement[];
  monitoring: ComplianceMonitoring;
  reporting: ComplianceReporting;
  auditing: AuditingConfig;
}