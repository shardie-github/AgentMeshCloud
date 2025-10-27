/**
 * Digital Twin types for AgentMesh Cloud
 * Implements system simulation and stress testing capabilities
 */

export interface DigitalTwin {
  id: string;
  name: string;
  description: string;
  version: string;
  status: TwinStatus;
  configuration: TwinConfiguration;
  state: TwinState;
  metrics: TwinMetrics;
  health: TwinHealth;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
}

export type TwinStatus = 'active' | 'inactive' | 'syncing' | 'error' | 'maintenance';

export interface TwinConfiguration {
  sourceSystem: SourceSystemConfig;
  simulation: SimulationConfig;
  monitoring: MonitoringConfig;
  testing: TestingConfig;
  scaling: ScalingConfig;
  security: SecurityConfig;
}

export interface SourceSystemConfig {
  type: 'production' | 'staging' | 'development' | 'custom';
  endpoints: SystemEndpoint[];
  authentication: AuthConfig;
  dataSources: DataSourceConfig[];
  syncInterval: number;
  realTimeSync: boolean;
}

export interface SystemEndpoint {
  id: string;
  name: string;
  url: string;
  type: 'api' | 'database' | 'message_queue' | 'file_system' | 'custom';
  authentication: EndpointAuth;
  rateLimit: RateLimit;
  timeout: number;
  retryPolicy: RetryPolicy;
  healthCheck: HealthCheckConfig;
}

export interface DataSourceConfig {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'stream' | 'event';
  connection: ConnectionConfig;
  schema: SchemaConfig;
  syncStrategy: SyncStrategy;
  filters: DataFilter[];
  transformations: Transformation[];
}

export interface ConnectionConfig {
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  ssl: boolean;
  pool: PoolConfig;
}

export interface PoolConfig {
  min: number;
  max: number;
  idleTimeout: number;
  acquireTimeout: number;
}

export interface SchemaConfig {
  tables: TableSchema[];
  relationships: RelationshipSchema[];
  indexes: IndexSchema[];
  constraints: ConstraintSchema[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey: string[];
  foreignKeys: ForeignKeySchema[];
  indexes: string[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  constraints?: string[];
}

export interface ForeignKeySchema {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: 'cascade' | 'set_null' | 'restrict';
  onUpdate: 'cascade' | 'set_null' | 'restrict';
}

export interface RelationshipSchema {
  from: string;
  to: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  foreignKey: string;
}

export interface IndexSchema {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ConstraintSchema {
  name: string;
  table: string;
  type: 'unique' | 'check' | 'not_null' | 'foreign_key';
  definition: string;
}

export interface SyncStrategy {
  type: 'full' | 'incremental' | 'real_time' | 'hybrid';
  interval: number;
  batchSize: number;
  parallel: boolean;
  conflictResolution: ConflictResolution;
}

export type ConflictResolution = 'source_wins' | 'target_wins' | 'merge' | 'custom';

export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'like' | 'regex';
  value: any;
  logic?: 'and' | 'or';
}

export interface Transformation {
  id: string;
  name: string;
  type: 'map' | 'filter' | 'aggregate' | 'join' | 'custom';
  config: TransformationConfig;
  order: number;
}

export interface TransformationConfig {
  sourceField: string;
  targetField: string;
  function: string;
  parameters: Record<string, any>;
  conditions?: DataFilter[];
}

export interface SimulationConfig {
  enabled: boolean;
  mode: SimulationMode;
  speed: number; // 1x, 2x, 0.5x, etc.
  timeRange: TimeRange;
  scenarios: ScenarioConfig[];
  variables: VariableConfig[];
  constraints: ConstraintConfig[];
}

export type SimulationMode = 'deterministic' | 'stochastic' | 'monte_carlo' | 'agent_based';

export interface TimeRange {
  start: Date;
  end: Date;
  step: number; // in milliseconds
}

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  probability: number;
  conditions: ScenarioCondition[];
  actions: ScenarioAction[];
  duration: number;
  repeatable: boolean;
}

export type ScenarioType = 'load_test' | 'failure_test' | 'security_test' | 'performance_test' | 'custom';

export interface ScenarioCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  duration?: number;
}

export interface ScenarioAction {
  type: 'inject_load' | 'inject_failure' | 'modify_config' | 'scale_resource' | 'custom';
  target: string;
  parameters: Record<string, any>;
  delay?: number;
  duration?: number;
}

export interface VariableConfig {
  name: string;
  type: 'constant' | 'random' | 'function' | 'external';
  value: any;
  distribution?: DistributionConfig;
  function?: FunctionConfig;
  source?: string;
}

export interface DistributionConfig {
  type: 'uniform' | 'normal' | 'exponential' | 'poisson' | 'custom';
  parameters: Record<string, number>;
}

export interface FunctionConfig {
  name: string;
  parameters: Record<string, any>;
  dependencies: string[];
}

export interface ConstraintConfig {
  name: string;
  type: 'resource' | 'performance' | 'cost' | 'security' | 'compliance';
  condition: string;
  action: 'warn' | 'stop' | 'scale' | 'fallback';
  threshold: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: MetricConfig[];
  alerts: AlertConfig[];
  dashboards: DashboardConfig[];
  reports: ReportConfig[];
  retention: RetentionConfig;
}

export interface MetricConfig {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  unit: string;
  labels: string[];
  collection: CollectionConfig;
  aggregation: AggregationConfig;
}

export interface CollectionConfig {
  interval: number;
  timeout: number;
  retries: number;
  batchSize: number;
}

export interface AggregationConfig {
  functions: string[];
  window: number;
  alignment: 'start' | 'end' | 'center';
}

export interface AlertConfig {
  name: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: AlertAction;
  cooldown: number;
  enabled: boolean;
}

export interface AlertAction {
  type: 'notification' | 'webhook' | 'email' | 'slack' | 'custom';
  config: Record<string, any>;
}

export interface DashboardConfig {
  name: string;
  description: string;
  panels: PanelConfig[];
  layout: LayoutConfig;
  refresh: number;
  timeRange: TimeRange;
}

export interface PanelConfig {
  id: string;
  title: string;
  type: 'graph' | 'table' | 'stat' | 'gauge' | 'heatmap' | 'custom';
  query: QueryConfig;
  options: PanelOptions;
  position: PositionConfig;
}

export interface QueryConfig {
  dataSource: string;
  query: string;
  parameters: Record<string, any>;
  transformations: Transformation[];
}

export interface PanelOptions {
  width: number;
  height: number;
  colors: string[];
  thresholds: ThresholdConfig[];
  format: FormatConfig;
}

export interface ThresholdConfig {
  value: number;
  color: string;
  operator: 'gt' | 'lt' | 'eq';
}

export interface FormatConfig {
  unit: string;
  decimals: number;
  prefix: string;
  suffix: string;
}

export interface PositionConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutConfig {
  rows: number;
  columns: number;
  gap: number;
  padding: number;
}

export interface ReportConfig {
  name: string;
  description: string;
  schedule: ScheduleConfig;
  format: 'pdf' | 'html' | 'csv' | 'json';
  template: string;
  recipients: string[];
  parameters: Record<string, any>;
}

export interface ScheduleConfig {
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'cron';
  time: string;
  timezone: string;
  enabled: boolean;
}

export interface RetentionConfig {
  metrics: number; // days
  logs: number; // days
  events: number; // days
  snapshots: number; // days
}

export interface TestingConfig {
  enabled: boolean;
  frameworks: TestingFramework[];
  scenarios: TestScenario[];
  environments: TestEnvironment[];
  reporting: TestReporting;
  automation: TestAutomation;
}

export interface TestingFramework {
  name: string;
  type: 'load' | 'stress' | 'spike' | 'volume' | 'endurance' | 'custom';
  config: FrameworkConfig;
  enabled: boolean;
}

export interface FrameworkConfig {
  tool: string;
  version: string;
  parameters: Record<string, any>;
  plugins: string[];
  extensions: string[];
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  type: TestType;
  steps: TestStep[];
  assertions: Assertion[];
  data: TestData;
  environment: string;
  timeout: number;
  retries: number;
}

export type TestType = 'unit' | 'integration' | 'performance' | 'load' | 'stress' | 'security' | 'usability' | 'compatibility';

export interface TestStep {
  id: string;
  name: string;
  action: TestAction;
  parameters: Record<string, any>;
  expected: ExpectedResult;
  timeout: number;
  retries: number;
}

export interface TestAction {
  type: 'api_call' | 'database_query' | 'ui_interaction' | 'file_operation' | 'custom';
  target: string;
  method: string;
  payload?: any;
  headers?: Record<string, string>;
}

export interface ExpectedResult {
  status: number;
  response: any;
  performance: PerformanceExpectation;
  data: DataExpectation;
}

export interface PerformanceExpectation {
  maxLatency: number;
  maxMemory: number;
  maxCpu: number;
  throughput: number;
}

export interface DataExpectation {
  schema: any;
  values: Record<string, any>;
  constraints: ConstraintConfig[];
}

export interface Assertion {
  id: string;
  name: string;
  type: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than' | 'custom';
  expression: string;
  expected: any;
  message: string;
}

export interface TestData {
  sources: DataSource[];
  generators: DataGenerator[];
  fixtures: DataFixture[];
  mocks: DataMock[];
}

export interface DataSource {
  name: string;
  type: 'database' | 'file' | 'api' | 'generator';
  connection: ConnectionConfig;
  query?: string;
  path?: string;
  format?: string;
}

export interface DataGenerator {
  name: string;
  type: 'random' | 'sequential' | 'faker' | 'custom';
  schema: any;
  count: number;
  seed?: number;
}

export interface DataFixture {
  name: string;
  data: any[];
  format: 'json' | 'csv' | 'yaml' | 'sql';
  path: string;
}

export interface DataMock {
  name: string;
  endpoint: string;
  method: string;
  response: any;
  delay?: number;
  status?: number;
}

export interface TestEnvironment {
  name: string;
  type: 'local' | 'staging' | 'production' | 'custom';
  config: EnvironmentConfig;
  resources: ResourceConfig;
  services: ServiceConfig[];
}

export interface EnvironmentConfig {
  baseUrl: string;
  database: ConnectionConfig;
  cache: ConnectionConfig;
  messageQueue: ConnectionConfig;
  storage: StorageConfig;
}

export interface StorageConfig {
  type: 'local' | 's3' | 'gcs' | 'azure';
  bucket: string;
  region: string;
  credentials: Record<string, string>;
}

export interface ResourceConfig {
  cpu: string;
  memory: string;
  storage: string;
  network: string;
  gpu?: string;
}

export interface ServiceConfig {
  name: string;
  image: string;
  version: string;
  ports: PortConfig[];
  environment: Record<string, string>;
  volumes: VolumeConfig[];
  dependencies: string[];
}

export interface PortConfig {
  container: number;
  host: number;
  protocol: 'tcp' | 'udp';
}

export interface VolumeConfig {
  source: string;
  target: string;
  type: 'bind' | 'volume' | 'tmpfs';
}

export interface TestReporting {
  enabled: boolean;
  formats: string[];
  destinations: string[];
  templates: string[];
  notifications: NotificationConfig[];
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'custom';
  recipients: string[];
  conditions: string[];
  template: string;
}

export interface TestAutomation {
  enabled: boolean;
  triggers: TriggerConfig[];
  schedules: ScheduleConfig[];
  pipelines: PipelineConfig[];
  integrations: IntegrationConfig[];
}

export interface TriggerConfig {
  type: 'commit' | 'schedule' | 'manual' | 'webhook' | 'event';
  condition: string;
  action: string;
  parameters: Record<string, any>;
}

export interface PipelineConfig {
  name: string;
  stages: PipelineStage[];
  parallel: boolean;
  timeout: number;
  retries: number;
}

export interface PipelineStage {
  name: string;
  type: 'build' | 'test' | 'deploy' | 'custom';
  script: string;
  dependencies: string[];
  timeout: number;
  retries: number;
}

export interface IntegrationConfig {
  name: string;
  type: 'ci_cd' | 'monitoring' | 'notification' | 'storage' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
}

export interface ScalingConfig {
  enabled: boolean;
  strategy: ScalingStrategy;
  metrics: ScalingMetric[];
  policies: ScalingPolicy[];
  limits: ScalingLimits;
}

export interface ScalingStrategy {
  type: 'horizontal' | 'vertical' | 'hybrid';
  algorithm: 'cpu' | 'memory' | 'custom' | 'predictive';
  cooldown: number;
  stabilization: number;
}

export interface ScalingMetric {
  name: string;
  type: 'cpu' | 'memory' | 'custom' | 'external';
  target: number;
  threshold: number;
  weight: number;
}

export interface ScalingPolicy {
  name: string;
  condition: string;
  action: ScalingAction;
  cooldown: number;
  enabled: boolean;
}

export interface ScalingAction {
  type: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in';
  amount: number;
  resource: string;
  timeout: number;
}

export interface ScalingLimits {
  minInstances: number;
  maxInstances: number;
  minCpu: number;
  maxCpu: number;
  minMemory: number;
  maxMemory: number;
}

export interface SecurityConfig {
  enabled: boolean;
  authentication: AuthConfig;
  authorization: AuthorizationConfig;
  encryption: EncryptionConfig;
  network: NetworkConfig;
  compliance: ComplianceConfig;
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'token' | 'oauth2' | 'saml' | 'ldap';
  config: Record<string, any>;
  providers: AuthProvider[];
}

export interface AuthProvider {
  name: string;
  type: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface AuthorizationConfig {
  type: 'rbac' | 'abac' | 'custom';
  policies: Policy[];
  roles: Role[];
  permissions: Permission[];
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  enforcement: 'strict' | 'warning' | 'audit';
}

export interface PolicyRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'require_approval';
  metadata?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  inherited: string[];
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: string[];
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keySize: number;
  inTransit: boolean;
  atRest: boolean;
  keyRotation: number;
}

export interface NetworkConfig {
  enabled: boolean;
  firewall: FirewallConfig;
  vpn: VpnConfig;
  proxy: ProxyConfig;
  dns: DnsConfig;
}

export interface FirewallConfig {
  enabled: boolean;
  rules: FirewallRule[];
  defaultAction: 'allow' | 'deny';
}

export interface FirewallRule {
  id: string;
  name: string;
  action: 'allow' | 'deny';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  port: number;
  source: string;
  destination: string;
  enabled: boolean;
}

export interface VpnConfig {
  enabled: boolean;
  type: 'ipsec' | 'openvpn' | 'wireguard';
  config: Record<string, any>;
}

export interface ProxyConfig {
  enabled: boolean;
  type: 'http' | 'https' | 'socks';
  host: string;
  port: number;
  authentication?: AuthConfig;
}

export interface DnsConfig {
  enabled: boolean;
  servers: string[];
  search: string[];
  options: string[];
}

export interface ComplianceConfig {
  enabled: boolean;
  standards: string[];
  policies: CompliancePolicy[];
  audits: AuditConfig;
  reporting: ComplianceReporting;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  standard: string;
  description: string;
  rules: ComplianceRule[];
  enforcement: 'strict' | 'warning' | 'audit';
}

export interface ComplianceRule {
  id: string;
  condition: string;
  action: 'pass' | 'fail' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  remediation: string;
}

export interface AuditConfig {
  enabled: boolean;
  level: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
  retention: number;
  destinations: string[];
  realTime: boolean;
}

export interface ComplianceReporting {
  enabled: boolean;
  schedule: ScheduleConfig;
  formats: string[];
  recipients: string[];
  templates: string[];
}

export interface TwinState {
  status: 'running' | 'paused' | 'stopped' | 'error';
  phase: 'initializing' | 'syncing' | 'simulating' | 'testing' | 'idle';
  progress: number;
  currentScenario?: string;
  activeTests: string[];
  lastSync: Date;
  nextSync: Date;
  errors: ErrorLog[];
  warnings: WarningLog[];
}

export interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'error' | 'critical';
  message: string;
  source: string;
  stack?: string;
  context: Record<string, any>;
  resolved: boolean;
}

export interface WarningLog {
  id: string;
  timestamp: Date;
  level: 'warning' | 'info';
  message: string;
  source: string;
  context: Record<string, any>;
  acknowledged: boolean;
}

export interface TwinMetrics {
  performance: PerformanceMetrics;
  resource: ResourceMetrics;
  business: BusinessMetrics;
  custom: CustomMetrics;
  lastUpdated: Date;
}

export interface PerformanceMetrics {
  latency: LatencyMetrics;
  throughput: ThroughputMetrics;
  errorRate: ErrorRateMetrics;
  availability: AvailabilityMetrics;
}

export interface LatencyMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  avg: number;
}

export interface ThroughputMetrics {
  requestsPerSecond: number;
  transactionsPerSecond: number;
  dataPerSecond: number;
  peak: number;
  sustained: number;
}

export interface ErrorRateMetrics {
  total: number;
  rate: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  trend: number;
}

export interface AvailabilityMetrics {
  uptime: number;
  downtime: number;
  mttr: number; // Mean Time To Recovery
  mtbf: number; // Mean Time Between Failures
  sla: number;
}

export interface ResourceMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics;
  network: NetworkMetrics;
}

export interface CpuMetrics {
  usage: number;
  cores: number;
  load: number;
  temperature: number;
  frequency: number;
}

export interface MemoryMetrics {
  usage: number;
  total: number;
  available: number;
  swap: number;
  cache: number;
}

export interface StorageMetrics {
  usage: number;
  total: number;
  available: number;
  iops: number;
  throughput: number;
  latency: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  errors: number;
  latency: number;
}

export interface BusinessMetrics {
  users: UserMetrics;
  revenue: RevenueMetrics;
  costs: CostMetrics;
  efficiency: EfficiencyMetrics;
}

export interface UserMetrics {
  active: number;
  total: number;
  new: number;
  churn: number;
  satisfaction: number;
}

export interface RevenueMetrics {
  total: number;
  recurring: number;
  oneTime: number;
  growth: number;
  perUser: number;
}

export interface CostMetrics {
  total: number;
  infrastructure: number;
  operations: number;
  development: number;
  perUser: number;
}

export interface EfficiencyMetrics {
  roi: number;
  productivity: number;
  utilization: number;
  waste: number;
  optimization: number;
}

export interface CustomMetrics {
  [key: string]: any;
}

export interface TwinHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  score: number;
  checks: HealthCheck[];
  lastChecked: Date;
  uptime: number;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'unknown';
  message: string;
  duration: number;
  lastChecked: Date;
  details: Record<string, any>;
}

export interface DigitalTwinService {
  initialize(): Promise<void>;
  createTwin(config: Omit<DigitalTwin, 'id' | 'createdAt' | 'updatedAt' | 'state' | 'metrics' | 'health'>): Promise<DigitalTwin>;
  getTwin(id: string): Promise<DigitalTwin | null>;
  updateTwin(id: string, updates: Partial<DigitalTwin>): Promise<DigitalTwin>;
  deleteTwin(id: string): Promise<void>;
  listTwins(filters?: TwinFilters): Promise<DigitalTwin[]>;
  startTwin(id: string): Promise<void>;
  stopTwin(id: string): Promise<void>;
  pauseTwin(id: string): Promise<void>;
  resumeTwin(id: string): Promise<void>;
  syncTwin(id: string): Promise<void>;
  runScenario(twinId: string, scenarioId: string): Promise<ScenarioResult>;
  runTest(twinId: string, testId: string): Promise<TestResult>;
  getTwinMetrics(id: string): Promise<TwinMetrics>;
  getTwinHealth(id: string): Promise<TwinHealth>;
  getTwinState(id: string): Promise<TwinState>;
  cleanup(): Promise<void>;
}

export interface TwinFilters {
  status?: TwinStatus[];
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ScenarioResult {
  id: string;
  twinId: string;
  scenarioId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  metrics: ScenarioMetrics;
  logs: ScenarioLog[];
  errors: ErrorLog[];
}

export interface ScenarioMetrics {
  performance: PerformanceMetrics;
  resource: ResourceMetrics;
  custom: CustomMetrics;
}

export interface ScenarioLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  context: Record<string, any>;
}

export interface TestResult {
  id: string;
  twinId: string;
  testId: string;
  status: 'running' | 'passed' | 'failed' | 'skipped' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  score: number;
  assertions: AssertionResult[];
  coverage: CoverageMetrics;
  performance: PerformanceMetrics;
  logs: TestLog[];
}

export interface AssertionResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  duration: number;
  expected: any;
  actual: any;
}

export interface CoverageMetrics {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface TestLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  step: string;
  context: Record<string, any>;
}