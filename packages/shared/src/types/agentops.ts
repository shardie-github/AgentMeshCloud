/**
 * AgentOps types for continuous learning and model management
 * Implements lifelong learning pipelines and model drift detection
 */

export interface AgentOpsConfig {
  id: string;
  agentId: string;
  learningMode: LearningMode;
  driftThreshold: number;
  retrainingInterval: number; // hours
  dataRetentionDays: number;
  modelVersioning: boolean;
  autoRetrain: boolean;
  humanFeedbackEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type LearningMode = 
  | 'incremental' 
  | 'lifelong' 
  | 'online' 
  | 'batch' 
  | 'hybrid';

export interface ModelDriftMetrics {
  id: string;
  agentId: string;
  timestamp: Date;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  dataDistribution: DataDistribution;
  predictionConfidence: number;
  driftScore: number;
  driftDetected: boolean;
  severity: DriftSeverity;
  metadata: Record<string, any>;
}

export type DriftSeverity = 
  | 'none' 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'critical';

export interface DataDistribution {
  featureMeans: Record<string, number>;
  featureVariances: Record<string, number>;
  classDistribution: Record<string, number>;
  dataQuality: number;
  sampleCount: number;
}

export interface LearningPipeline {
  id: string;
  agentId: string;
  name: string;
  type: PipelineType;
  status: PipelineStatus;
  config: PipelineConfig;
  stages: PipelineStage[];
  metrics: PipelineMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export type PipelineType = 
  | 'data_preprocessing' 
  | 'feature_engineering' 
  | 'model_training' 
  | 'model_evaluation' 
  | 'model_deployment' 
  | 'drift_detection' 
  | 'feedback_loop';

export type PipelineStatus = 
  | 'idle' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'paused' 
  | 'cancelled';

export interface PipelineConfig {
  batchSize: number;
  learningRate: number;
  epochs: number;
  validationSplit: number;
  earlyStopping: boolean;
  dataAugmentation: boolean;
  crossValidation: boolean;
  hyperparameterTuning: boolean;
  gpuAcceleration: boolean;
  distributedTraining: boolean;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: string;
  status: StageStatus;
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  metrics: Record<string, number>;
}

export type StageStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'skipped';

export interface PipelineMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDuration: number;
  lastRunAt?: Date;
  performanceScore: number;
  resourceUtilization: ResourceUtilization;
  costMetrics: CostMetrics;
}

export interface ResourceUtilization {
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  storageUsage: number;
  networkUsage: number;
  timestamp: Date;
}

export interface CostMetrics {
  computeCost: number;
  storageCost: number;
  networkCost: number;
  totalCost: number;
  currency: string;
  period: string;
}

export interface HumanFeedback {
  id: string;
  agentId: string;
  requestId: string;
  userId: string;
  feedbackType: FeedbackType;
  rating: number;
  comment?: string;
  corrections?: FeedbackCorrection[];
  metadata: Record<string, any>;
  createdAt: Date;
  processedAt?: Date;
  status: FeedbackStatus;
}

export type FeedbackType = 
  | 'accuracy' 
  | 'relevance' 
  | 'helpfulness' 
  | 'safety' 
  | 'bias' 
  | 'quality';

export type FeedbackStatus = 
  | 'pending' 
  | 'processed' 
  | 'ignored' 
  | 'escalated';

export interface FeedbackCorrection {
  field: string;
  originalValue: any;
  correctedValue: any;
  confidence: number;
  reason: string;
}

export interface ModelVersion {
  id: string;
  agentId: string;
  version: string;
  modelPath: string;
  config: ModelConfig;
  metrics: ModelMetrics;
  trainingData: TrainingDataInfo;
  createdAt: Date;
  deployedAt?: Date;
  status: ModelStatus;
  tags: string[];
  metadata: Record<string, any>;
}

export type ModelStatus = 
  | 'training' 
  | 'ready' 
  | 'deployed' 
  | 'deprecated' 
  | 'failed';

export interface ModelConfig {
  architecture: string;
  parameters: Record<string, any>;
  hyperparameters: Record<string, any>;
  preprocessing: Record<string, any>;
  postprocessing: Record<string, any>;
  constraints: ModelConstraints;
}

export interface ModelConstraints {
  maxInputSize: number;
  maxOutputSize: number;
  latencyThreshold: number;
  memoryLimit: number;
  accuracyThreshold: number;
  biasThreshold: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  confusionMatrix: number[][];
  featureImportance: Record<string, number>;
  biasMetrics: BiasMetrics;
  performanceMetrics: PerformanceMetrics;
}

export interface BiasMetrics {
  demographicParity: number;
  equalizedOdds: number;
  calibration: number;
  disparateImpact: number;
  statisticalParity: number;
}

export interface PerformanceMetrics {
  inferenceTime: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  gpuUsage: number;
  energyConsumption: number;
}

export interface TrainingDataInfo {
  datasetId: string;
  datasetName: string;
  sampleCount: number;
  featureCount: number;
  classCount: number;
  dataQuality: number;
  diversityScore: number;
  biasScore: number;
  lastUpdated: Date;
}

export interface RetrainingTrigger {
  id: string;
  agentId: string;
  triggerType: TriggerType;
  condition: TriggerCondition;
  action: RetrainingAction;
  enabled: boolean;
  lastTriggered?: Date;
  createdAt: Date;
}

export type TriggerType = 
  | 'drift_detected' 
  | 'performance_degradation' 
  | 'data_accumulation' 
  | 'scheduled' 
  | 'manual' 
  | 'feedback_threshold';

export interface TriggerCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';
  threshold: number;
  windowSize: number; // hours
  minSamples: number;
}

export interface RetrainingAction {
  type: 'full_retrain' | 'incremental_update' | 'fine_tune' | 'transfer_learning';
  config: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  estimatedDuration: number; // minutes
  resourceRequirements: ResourceRequirements;
}

export interface ResourceRequirements {
  cpu: string;
  memory: string;
  gpu?: string;
  storage: string;
  network?: string;
}

export interface AgentOpsSupervisor {
  id: string;
  agentId: string;
  status: SupervisorStatus;
  config: SupervisorConfig;
  metrics: SupervisorMetrics;
  alerts: Alert[];
  lastHealthCheck: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SupervisorStatus = 
  | 'active' 
  | 'inactive' 
  | 'error' 
  | 'maintenance';

export interface SupervisorConfig {
  monitoringInterval: number; // seconds
  alertThresholds: AlertThresholds;
  autoRemediation: boolean;
  escalationPolicy: EscalationPolicy;
  notificationChannels: NotificationChannel[];
}

export interface AlertThresholds {
  driftScore: number;
  accuracyDrop: number;
  latencyIncrease: number;
  errorRate: number;
  resourceUsage: number;
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  timeouts: Record<string, number>;
  autoEscalate: boolean;
}

export interface EscalationLevel {
  level: number;
  condition: string;
  action: string;
  recipients: string[];
  timeout: number;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export interface Alert {
  id: string;
  agentId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  status: AlertStatus;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export type AlertType = 
  | 'drift_detected' 
  | 'performance_degradation' 
  | 'resource_exhaustion' 
  | 'model_failure' 
  | 'data_quality_issue' 
  | 'security_breach' 
  | 'compliance_violation';

export type AlertSeverity = 
  | 'info' 
  | 'warning' 
  | 'error' 
  | 'critical';

export type AlertStatus = 
  | 'active' 
  | 'acknowledged' 
  | 'resolved' 
  | 'suppressed';

export interface SupervisorMetrics {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  averageResolutionTime: number;
  uptime: number;
  lastDriftCheck: Date;
  lastRetraining: Date;
  modelStability: number;
}

export interface AgentOpsDashboard {
  agentId: string;
  overview: DashboardOverview;
  driftMetrics: ModelDriftMetrics[];
  learningPipelines: LearningPipeline[];
  modelVersions: ModelVersion[];
  humanFeedback: HumanFeedback[];
  alerts: Alert[];
  performance: PerformanceMetrics;
  costs: CostMetrics;
  lastUpdated: Date;
}

export interface DashboardOverview {
  totalModels: number;
  activeModels: number;
  driftDetected: number;
  retrainingInProgress: number;
  averageAccuracy: number;
  totalCost: number;
  uptime: number;
  lastActivity: Date;
}