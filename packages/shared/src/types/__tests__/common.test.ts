/**
 * Tests for common types and interfaces
 */

import type {
  ID,
  Timestamp,
  Status,
  ValidationRule,
  ResourceRequirements,
  AuthenticationConfig,
  AuthorizationConfig,
  LoggingConfig,
  AuditConfig,
  Position,
  Constraint,
  CapabilityInput,
  CapabilityOutput,
  CapabilityConstraint,
  PolicyRule,
  PolicyCondition,
  PolicyAction,
  RetryPolicy,
  HealthCheckConfig,
  RateLimit,
  EndpointAuth,
  AlertSeverity,
  AlertStatus,
  AlertCondition,
  NotificationChannel,
  CostMetrics,
  PerformanceMetrics,
  RecommendationType,
  PriorityLevel,
  EffortLevel,
  RecommendationAction,
  BackupConfig,
  BackupLocation,
  EncryptionConfig,
  AccessConfig,
  AccessCondition,
  MonitoringConfig,
  CollectionConfig,
  ShardingConfig,
  ComplianceConfig,
  ComplianceStandard,
  EnforcementMode,
  ComplianceRequirement,
  AuditSchedule,
  MetricType,
  PermissionCondition,
  TemplateVariable,
  EventConfig,
  EventFilter,
  EventHandler,
  TriggerType,
  WorkflowTrigger,
  ChannelType,
  SecurityConfig,
  ClientStatus,
  AgentStatus,
  AnomalyType,
  AnomalySeverity,
  RiskLevel,
  ReferenceType,
  RestrictionType,
  RestrictionAction,
  ValidationConfig,
  CustomValidator,
  PricingTier,
  DiscountCondition,
  ReportFrequency,
  ReportFormat,
  ReportTemplate,
  ReportSection,
  DashboardWidget,
  ReportChart,
  ReportTable,
  TableColumn,
  PaginationConfig,
  TrendData,
  StorageConfig,
  ProcessingConfig,
  SharingConfig,
  DisposalConfig,
  MonitoringMetric,
  MonitoringAlert,
  MonitoringDashboard,
  DashboardLayout,
  GridItem,
  MonitoringReport,
  ActionType,
  SourceType,
  NormalizationConfig,
  NormalizationRule,
  FieldMapping,
  AggregationConfig,
  AggregationFunction,
  TimeWindow,
  DataType,
  RetentionConfig
} from '../common';

describe('Common Types', () => {
  describe('Basic Types', () => {
    it('should have correct ID type', () => {
      const id: ID = 'test-id';
      expect(typeof id).toBe('string');
    });

    it('should have correct Timestamp type', () => {
      const timestamp: Timestamp = new Date();
      expect(timestamp instanceof Date).toBe(true);
    });

    it('should have correct Status type', () => {
      const status: Status = 'active';
      expect(['active', 'inactive', 'pending', 'error', 'completed']).toContain(status);
    });
  });

  describe('Validation Types', () => {
    it('should create ValidationRule correctly', () => {
      const rule: ValidationRule = {
        type: 'required',
        message: 'This field is required'
      };
      
      expect(rule.type).toBe('required');
      expect(rule.message).toBe('This field is required');
    });

    it('should create ValidationConfig correctly', () => {
      const config: ValidationConfig = {
        rules: [],
        strict: true,
        customValidators: []
      };
      
      expect(config.strict).toBe(true);
      expect(Array.isArray(config.rules)).toBe(true);
      expect(Array.isArray(config.customValidators)).toBe(true);
    });
  });

  describe('Resource Types', () => {
    it('should create ResourceRequirements correctly', () => {
      const requirements: ResourceRequirements = {
        cpu: '1000m',
        memory: '512Mi',
        storage: '10Gi'
      };
      
      expect(requirements.cpu).toBe('1000m');
      expect(requirements.memory).toBe('512Mi');
      expect(requirements.storage).toBe('10Gi');
    });
  });

  describe('Authentication Types', () => {
    it('should create AuthenticationConfig correctly', () => {
      const config: AuthenticationConfig = {
        type: 'jwt',
        config: { secret: 'test-secret' }
      };
      
      expect(config.type).toBe('jwt');
      expect(config.config).toEqual({ secret: 'test-secret' });
    });

    it('should create AuthorizationConfig correctly', () => {
      const config: AuthorizationConfig = {
        policies: [],
        roles: ['admin', 'user'],
        permissions: ['read', 'write']
      };
      
      expect(Array.isArray(config.policies)).toBe(true);
      expect(config.roles).toEqual(['admin', 'user']);
      expect(config.permissions).toEqual(['read', 'write']);
    });
  });

  describe('Logging Types', () => {
    it('should create LoggingConfig correctly', () => {
      const config: LoggingConfig = {
        level: 'info',
        format: 'json',
        outputs: ['console', 'file']
      };
      
      expect(['debug', 'info', 'warn', 'error']).toContain(config.level);
      expect(['json', 'text']).toContain(config.format);
      expect(Array.isArray(config.outputs)).toBe(true);
    });
  });

  describe('Audit Types', () => {
    it('should create AuditConfig correctly', () => {
      const config: AuditConfig = {
        enabled: true,
        retention: 30,
        encryption: true,
        compliance: ['SOC2', 'ISO27001']
      };
      
      expect(config.enabled).toBe(true);
      expect(config.retention).toBe(30);
      expect(config.encryption).toBe(true);
      expect(Array.isArray(config.compliance)).toBe(true);
    });
  });

  describe('Position Types', () => {
    it('should create Position correctly', () => {
      const position: Position = { x: 10, y: 20 };
      
      expect(position.x).toBe(10);
      expect(position.y).toBe(20);
    });
  });

  describe('Constraint Types', () => {
    it('should create Constraint correctly', () => {
      const constraint: Constraint = {
        type: 'cpu',
        value: 1000,
        operator: 'gte'
      };
      
      expect(constraint.type).toBe('cpu');
      expect(constraint.value).toBe(1000);
      expect(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'not_in']).toContain(constraint.operator);
    });
  });

  describe('Capability Types', () => {
    it('should create CapabilityInput correctly', () => {
      const input: CapabilityInput = {
        name: 'test-input',
        type: 'string',
        required: true,
        description: 'Test input'
      };
      
      expect(input.name).toBe('test-input');
      expect(input.type).toBe('string');
      expect(input.required).toBe(true);
      expect(input.description).toBe('Test input');
    });

    it('should create CapabilityOutput correctly', () => {
      const output: CapabilityOutput = {
        name: 'test-output',
        type: 'string',
        description: 'Test output'
      };
      
      expect(output.name).toBe('test-output');
      expect(output.type).toBe('string');
      expect(output.description).toBe('Test output');
    });

    it('should create CapabilityConstraint correctly', () => {
      const constraint: CapabilityConstraint = {
        type: 'memory',
        value: 512,
        description: 'Memory constraint'
      };
      
      expect(constraint.type).toBe('memory');
      expect(constraint.value).toBe(512);
      expect(constraint.description).toBe('Memory constraint');
    });
  });

  describe('Policy Types', () => {
    it('should create PolicyRule correctly', () => {
      const rule: PolicyRule = {
        id: 'rule-1',
        name: 'Test Rule',
        description: 'Test policy rule',
        conditions: [],
        actions: [],
        priority: 1
      };
      
      expect(rule.id).toBe('rule-1');
      expect(rule.name).toBe('Test Rule');
      expect(rule.description).toBe('Test policy rule');
      expect(Array.isArray(rule.conditions)).toBe(true);
      expect(Array.isArray(rule.actions)).toBe(true);
      expect(rule.priority).toBe(1);
    });

    it('should create PolicyCondition correctly', () => {
      const condition: PolicyCondition = {
        field: 'user.role',
        operator: 'eq',
        value: 'admin'
      };
      
      expect(condition.field).toBe('user.role');
      expect(condition.operator).toBe('eq');
      expect(condition.value).toBe('admin');
    });

    it('should create PolicyAction correctly', () => {
      const action: PolicyAction = {
        type: 'allow',
        config: { resource: 'data' }
      };
      
      expect(action.type).toBe('allow');
      expect(action.config).toEqual({ resource: 'data' });
    });
  });

  describe('Retry Types', () => {
    it('should create RetryPolicy correctly', () => {
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoff: 'exponential',
        delay: 1000,
        maxDelay: 5000
      };
      
      expect(policy.maxAttempts).toBe(3);
      expect(['linear', 'exponential']).toContain(policy.backoff);
      expect(policy.delay).toBe(1000);
      expect(policy.maxDelay).toBe(5000);
    });
  });

  describe('Health Check Types', () => {
    it('should create HealthCheckConfig correctly', () => {
      const config: HealthCheckConfig = {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        path: '/health'
      };
      
      expect(config.enabled).toBe(true);
      expect(config.interval).toBe(30000);
      expect(config.timeout).toBe(5000);
      expect(config.path).toBe('/health');
    });
  });

  describe('Rate Limiting Types', () => {
    it('should create RateLimit correctly', () => {
      const limit: RateLimit = {
        requests: 100,
        window: 60000,
        burst: 10
      };
      
      expect(limit.requests).toBe(100);
      expect(limit.window).toBe(60000);
      expect(limit.burst).toBe(10);
    });
  });

  describe('Endpoint Auth Types', () => {
    it('should create EndpointAuth correctly', () => {
      const auth: EndpointAuth = {
        type: 'bearer',
        config: { token: 'test-token' }
      };
      
      expect(['none', 'basic', 'bearer', 'api_key']).toContain(auth.type);
      expect(auth.config).toEqual({ token: 'test-token' });
    });
  });

  describe('Alert Types', () => {
    it('should have correct AlertSeverity values', () => {
      const severities: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
      severities.forEach(severity => {
        expect(['low', 'medium', 'high', 'critical']).toContain(severity);
      });
    });

    it('should have correct AlertStatus values', () => {
      const statuses: AlertStatus[] = ['active', 'resolved', 'suppressed'];
      statuses.forEach(status => {
        expect(['active', 'resolved', 'suppressed']).toContain(status);
      });
    });

    it('should create AlertCondition correctly', () => {
      const condition: AlertCondition = {
        metric: 'cpu_usage',
        operator: 'gt',
        threshold: 80,
        duration: 300
      };
      
      expect(condition.metric).toBe('cpu_usage');
      expect(condition.operator).toBe('gt');
      expect(condition.threshold).toBe(80);
      expect(condition.duration).toBe(300);
    });
  });

  describe('Notification Types', () => {
    it('should create NotificationChannel correctly', () => {
      const channel: NotificationChannel = {
        id: 'channel-1',
        type: 'email',
        config: { address: 'test@example.com' },
        enabled: true
      };
      
      expect(channel.id).toBe('channel-1');
      expect(['email', 'sms', 'webhook', 'slack']).toContain(channel.type);
      expect(channel.config).toEqual({ address: 'test@example.com' });
      expect(channel.enabled).toBe(true);
    });
  });

  describe('Metrics Types', () => {
    it('should create CostMetrics correctly', () => {
      const metrics: CostMetrics = {
        cpu: 10.5,
        memory: 20.0,
        storage: 5.0,
        network: 2.5,
        total: 38.0
      };
      
      expect(metrics.cpu).toBe(10.5);
      expect(metrics.memory).toBe(20.0);
      expect(metrics.storage).toBe(5.0);
      expect(metrics.network).toBe(2.5);
      expect(metrics.total).toBe(38.0);
    });

    it('should create PerformanceMetrics correctly', () => {
      const metrics: PerformanceMetrics = {
        latency: 150,
        throughput: 1000,
        errorRate: 0.01,
        availability: 0.999
      };
      
      expect(metrics.latency).toBe(150);
      expect(metrics.throughput).toBe(1000);
      expect(metrics.errorRate).toBe(0.01);
      expect(metrics.availability).toBe(0.999);
    });
  });

  describe('Recommendation Types', () => {
    it('should have correct RecommendationType values', () => {
      const types: RecommendationType[] = ['cost_optimization', 'performance', 'security', 'compliance'];
      types.forEach(type => {
        expect(['cost_optimization', 'performance', 'security', 'compliance']).toContain(type);
      });
    });

    it('should have correct PriorityLevel values', () => {
      const levels: PriorityLevel[] = ['low', 'medium', 'high', 'critical'];
      levels.forEach(level => {
        expect(['low', 'medium', 'high', 'critical']).toContain(level);
      });
    });

    it('should have correct EffortLevel values', () => {
      const levels: EffortLevel[] = ['low', 'medium', 'high'];
      levels.forEach(level => {
        expect(['low', 'medium', 'high']).toContain(level);
      });
    });

    it('should create RecommendationAction correctly', () => {
      const action: RecommendationAction = {
        type: 'scale_down',
        description: 'Scale down resources',
        impact: 'high',
        effort: 'low'
      };
      
      expect(action.type).toBe('scale_down');
      expect(action.description).toBe('Scale down resources');
      expect(['low', 'medium', 'high']).toContain(action.impact);
      expect(['low', 'medium', 'high']).toContain(action.effort);
    });
  });

  describe('Backup Types', () => {
    it('should create BackupConfig correctly', () => {
      const config: BackupConfig = {
        enabled: true,
        frequency: 'daily',
        retention: 30,
        encryption: true,
        location: {
          type: 's3',
          config: { bucket: 'backups' }
        }
      };
      
      expect(config.enabled).toBe(true);
      expect(config.frequency).toBe('daily');
      expect(config.retention).toBe(30);
      expect(config.encryption).toBe(true);
      expect(['local', 's3', 'gcs', 'azure']).toContain(config.location.type);
    });

    it('should create BackupLocation correctly', () => {
      const location: BackupLocation = {
        type: 's3',
        config: { bucket: 'backups', region: 'us-east-1' }
      };
      
      expect(['local', 's3', 'gcs', 'azure']).toContain(location.type);
      expect(location.config).toEqual({ bucket: 'backups', region: 'us-east-1' });
    });
  });

  describe('Encryption Types', () => {
    it('should create EncryptionConfig correctly', () => {
      const config: EncryptionConfig = {
        algorithm: 'AES-256-GCM',
        keySize: 256,
        mode: 'GCM',
        padding: 'PKCS7'
      };
      
      expect(config.algorithm).toBe('AES-256-GCM');
      expect(config.keySize).toBe(256);
      expect(config.mode).toBe('GCM');
      expect(config.padding).toBe('PKCS7');
    });
  });

  describe('Access Types', () => {
    it('should create AccessConfig correctly', () => {
      const config: AccessConfig = {
        permissions: ['read', 'write'],
        roles: ['admin'],
        conditions: []
      };
      
      expect(Array.isArray(config.permissions)).toBe(true);
      expect(Array.isArray(config.roles)).toBe(true);
      expect(Array.isArray(config.conditions)).toBe(true);
    });

    it('should create AccessCondition correctly', () => {
      const condition: AccessCondition = {
        field: 'user.department',
        operator: 'eq',
        value: 'engineering'
      };
      
      expect(condition.field).toBe('user.department');
      expect(condition.operator).toBe('eq');
      expect(condition.value).toBe('engineering');
    });
  });

  describe('Monitoring Types', () => {
    it('should create MonitoringConfig correctly', () => {
      const config: MonitoringConfig = {
        enabled: true,
        interval: 60000,
        metrics: ['cpu', 'memory', 'disk'],
        alerts: []
      };
      
      expect(config.enabled).toBe(true);
      expect(config.interval).toBe(60000);
      expect(Array.isArray(config.metrics)).toBe(true);
      expect(Array.isArray(config.alerts)).toBe(true);
    });
  });

  describe('Collection Types', () => {
    it('should create CollectionConfig correctly', () => {
      const config: CollectionConfig = {
        name: 'test-collection',
        schema: { fields: [] },
        indexes: ['field1', 'field2'],
        sharding: {
          key: 'id',
          strategy: 'hash',
          shards: 4
        }
      };
      
      expect(config.name).toBe('test-collection');
      expect(config.schema).toEqual({ fields: [] });
      expect(Array.isArray(config.indexes)).toBe(true);
      expect(['hash', 'range']).toContain(config.sharding.strategy);
    });

    it('should create ShardingConfig correctly', () => {
      const config: ShardingConfig = {
        key: 'user_id',
        strategy: 'hash',
        shards: 8
      };
      
      expect(config.key).toBe('user_id');
      expect(['hash', 'range']).toContain(config.strategy);
      expect(config.shards).toBe(8);
    });
  });

  describe('Compliance Types', () => {
    it('should create ComplianceConfig correctly', () => {
      const config: ComplianceConfig = {
        standards: ['SOC2', 'ISO27001'],
        requirements: [],
        audits: []
      };
      
      expect(Array.isArray(config.standards)).toBe(true);
      expect(Array.isArray(config.requirements)).toBe(true);
      expect(Array.isArray(config.audits)).toBe(true);
    });

    it('should have correct ComplianceStandard values', () => {
      const standards: ComplianceStandard[] = ['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'PCI-DSS'];
      standards.forEach(standard => {
        expect(['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'PCI-DSS']).toContain(standard);
      });
    });

    it('should have correct EnforcementMode values', () => {
      const modes: EnforcementMode[] = ['strict', 'warning', 'disabled'];
      modes.forEach(mode => {
        expect(['strict', 'warning', 'disabled']).toContain(mode);
      });
    });

    it('should create ComplianceRequirement correctly', () => {
      const requirement: ComplianceRequirement = {
        id: 'req-1',
        standard: 'SOC2',
        description: 'Access control requirement',
        controls: ['AC-1', 'AC-2'],
        status: 'compliant'
      };
      
      expect(requirement.id).toBe('req-1');
      expect(requirement.standard).toBe('SOC2');
      expect(requirement.description).toBe('Access control requirement');
      expect(Array.isArray(requirement.controls)).toBe(true);
      expect(['compliant', 'non_compliant', 'partial']).toContain(requirement.status);
    });

    it('should create AuditSchedule correctly', () => {
      const schedule: AuditSchedule = {
        id: 'audit-1',
        name: 'Monthly Audit',
        frequency: 'monthly',
        scope: ['security', 'compliance'],
        nextRun: new Date()
      };
      
      expect(schedule.id).toBe('audit-1');
      expect(schedule.name).toBe('Monthly Audit');
      expect(schedule.frequency).toBe('monthly');
      expect(Array.isArray(schedule.scope)).toBe(true);
      expect(schedule.nextRun instanceof Date).toBe(true);
    });
  });

  describe('Metric Types', () => {
    it('should have correct MetricType values', () => {
      const types: MetricType[] = ['counter', 'gauge', 'histogram', 'summary'];
      types.forEach(type => {
        expect(['counter', 'gauge', 'histogram', 'summary']).toContain(type);
      });
    });
  });

  describe('Permission Types', () => {
    it('should create PermissionCondition correctly', () => {
      const condition: PermissionCondition = {
        resource: 'data',
        action: 'read',
        conditions: []
      };
      
      expect(condition.resource).toBe('data');
      expect(condition.action).toBe('read');
      expect(Array.isArray(condition.conditions)).toBe(true);
    });
  });

  describe('Template Types', () => {
    it('should create TemplateVariable correctly', () => {
      const variable: TemplateVariable = {
        name: 'username',
        type: 'string',
        required: true,
        defaultValue: 'admin',
        description: 'User name'
      };
      
      expect(variable.name).toBe('username');
      expect(variable.type).toBe('string');
      expect(variable.required).toBe(true);
      expect(variable.defaultValue).toBe('admin');
      expect(variable.description).toBe('User name');
    });
  });

  describe('Event Types', () => {
    it('should create EventConfig correctly', () => {
      const config: EventConfig = {
        type: 'user_action',
        source: 'web_app',
        filters: [],
        handlers: []
      };
      
      expect(config.type).toBe('user_action');
      expect(config.source).toBe('web_app');
      expect(Array.isArray(config.filters)).toBe(true);
      expect(Array.isArray(config.handlers)).toBe(true);
    });

    it('should create EventFilter correctly', () => {
      const filter: EventFilter = {
        field: 'event.type',
        operator: 'eq',
        value: 'login'
      };
      
      expect(filter.field).toBe('event.type');
      expect(filter.operator).toBe('eq');
      expect(filter.value).toBe('login');
    });

    it('should create EventHandler correctly', () => {
      const handler: EventHandler = {
        type: 'webhook',
        config: { url: 'https://example.com/webhook' }
      };
      
      expect(handler.type).toBe('webhook');
      expect(handler.config).toEqual({ url: 'https://example.com/webhook' });
    });
  });

  describe('Trigger Types', () => {
    it('should have correct TriggerType values', () => {
      const types: TriggerType[] = ['schedule', 'webhook', 'event', 'manual'];
      types.forEach(type => {
        expect(['schedule', 'webhook', 'event', 'manual']).toContain(type);
      });
    });

    it('should create WorkflowTrigger correctly', () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'schedule',
        name: 'Daily Trigger',
        config: { cron: '0 0 * * *' },
        enabled: true
      };
      
      expect(trigger.id).toBe('trigger-1');
      expect(['schedule', 'webhook', 'event', 'manual']).toContain(trigger.type);
      expect(trigger.name).toBe('Daily Trigger');
      expect(trigger.config).toEqual({ cron: '0 0 * * *' });
      expect(trigger.enabled).toBe(true);
    });
  });

  describe('Channel Types', () => {
    it('should have correct ChannelType values', () => {
      const types: ChannelType[] = ['direct', 'broadcast', 'multicast', 'anycast'];
      types.forEach(type => {
        expect(['direct', 'broadcast', 'multicast', 'anycast']).toContain(type);
      });
    });
  });

  describe('Security Types', () => {
    it('should create SecurityConfig correctly', () => {
      const config: SecurityConfig = {
        encryption: {
          algorithm: 'AES-256-GCM',
          keySize: 256,
          mode: 'GCM',
          padding: 'PKCS7'
        },
        authentication: {
          type: 'jwt',
          config: { secret: 'test-secret' }
        },
        authorization: {
          policies: [],
          roles: [],
          permissions: []
        },
        audit: {
          enabled: true,
          retention: 30,
          encryption: true,
          compliance: []
        }
      };
      
      expect(config.encryption.algorithm).toBe('AES-256-GCM');
      expect(config.authentication.type).toBe('jwt');
      expect(Array.isArray(config.authorization.policies)).toBe(true);
      expect(config.audit.enabled).toBe(true);
    });
  });

  describe('Status Types', () => {
    it('should have correct ClientStatus values', () => {
      const statuses: ClientStatus[] = ['connected', 'disconnected', 'connecting', 'error'];
      statuses.forEach(status => {
        expect(['connected', 'disconnected', 'connecting', 'error']).toContain(status);
      });
    });

    it('should have correct AgentStatus values', () => {
      const statuses: AgentStatus[] = ['online', 'offline', 'processing', 'error', 'maintenance'];
      statuses.forEach(status => {
        expect(['online', 'offline', 'processing', 'error', 'maintenance']).toContain(status);
      });
    });
  });

  describe('Anomaly Types', () => {
    it('should have correct AnomalyType values', () => {
      const types: AnomalyType[] = ['spike', 'drop', 'pattern', 'outlier'];
      types.forEach(type => {
        expect(['spike', 'drop', 'pattern', 'outlier']).toContain(type);
      });
    });

    it('should have correct AnomalySeverity values', () => {
      const severities: AnomalySeverity[] = ['low', 'medium', 'high', 'critical'];
      severities.forEach(severity => {
        expect(['low', 'medium', 'high', 'critical']).toContain(severity);
      });
    });
  });

  describe('Risk Types', () => {
    it('should have correct RiskLevel values', () => {
      const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
      levels.forEach(level => {
        expect(['low', 'medium', 'high', 'critical']).toContain(level);
      });
    });
  });

  describe('Reference Types', () => {
    it('should have correct ReferenceType values', () => {
      const types: ReferenceType[] = ['agent', 'workflow', 'resource', 'user'];
      types.forEach(type => {
        expect(['agent', 'workflow', 'resource', 'user']).toContain(type);
      });
    });
  });

  describe('Restriction Types', () => {
    it('should have correct RestrictionType values', () => {
      const types: RestrictionType[] = ['temporal', 'geographical', 'resource', 'permission'];
      types.forEach(type => {
        expect(['temporal', 'geographical', 'resource', 'permission']).toContain(type);
      });
    });

    it('should have correct RestrictionAction values', () => {
      const actions: RestrictionAction[] = ['allow', 'deny', 'warn', 'log'];
      actions.forEach(action => {
        expect(['allow', 'deny', 'warn', 'log']).toContain(action);
      });
    });
  });

  describe('Custom Validator Types', () => {
    it('should create CustomValidator correctly', () => {
      const validator: CustomValidator = {
        name: 'email-validator',
        function: 'validateEmail',
        config: { domain: 'example.com' }
      };
      
      expect(validator.name).toBe('email-validator');
      expect(validator.function).toBe('validateEmail');
      expect(validator.config).toEqual({ domain: 'example.com' });
    });
  });

  describe('Pricing Types', () => {
    it('should have correct PricingTier values', () => {
      const tiers: PricingTier[] = ['free', 'basic', 'premium', 'enterprise'];
      tiers.forEach(tier => {
        expect(['free', 'basic', 'premium', 'enterprise']).toContain(tier);
      });
    });

    it('should create DiscountCondition correctly', () => {
      const condition: DiscountCondition = {
        type: 'volume',
        threshold: 100,
        discount: 0.1
      };
      
      expect(['volume', 'duration', 'feature']).toContain(condition.type);
      expect(condition.threshold).toBe(100);
      expect(condition.discount).toBe(0.1);
    });
  });

  describe('Report Types', () => {
    it('should have correct ReportFrequency values', () => {
      const frequencies: ReportFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
      frequencies.forEach(frequency => {
        expect(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).toContain(frequency);
      });
    });

    it('should have correct ReportFormat values', () => {
      const formats: ReportFormat[] = ['json', 'csv', 'pdf', 'xlsx'];
      formats.forEach(format => {
        expect(['json', 'csv', 'pdf', 'xlsx']).toContain(format);
      });
    });

    it('should create ReportTemplate correctly', () => {
      const template: ReportTemplate = {
        id: 'template-1',
        name: 'Monthly Report',
        description: 'Monthly performance report',
        sections: [],
        format: 'pdf'
      };
      
      expect(template.id).toBe('template-1');
      expect(template.name).toBe('Monthly Report');
      expect(template.description).toBe('Monthly performance report');
      expect(Array.isArray(template.sections)).toBe(true);
      expect(['json', 'csv', 'pdf', 'xlsx']).toContain(template.format);
    });

    it('should create ReportSection correctly', () => {
      const section: ReportSection = {
        id: 'section-1',
        title: 'Performance Metrics',
        type: 'chart',
        config: { chartType: 'line' }
      };
      
      expect(section.id).toBe('section-1');
      expect(section.title).toBe('Performance Metrics');
      expect(['text', 'chart', 'table', 'metric']).toContain(section.type);
      expect(section.config).toEqual({ chartType: 'line' });
    });
  });

  describe('Dashboard Types', () => {
    it('should create DashboardWidget correctly', () => {
      const widget: DashboardWidget = {
        id: 'widget-1',
        type: 'chart',
        title: 'CPU Usage',
        config: { chartType: 'line' },
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 }
      };
      
      expect(widget.id).toBe('widget-1');
      expect(widget.type).toBe('chart');
      expect(widget.title).toBe('CPU Usage');
      expect(widget.config).toEqual({ chartType: 'line' });
      expect(widget.position).toEqual({ x: 0, y: 0 });
      expect(widget.size).toEqual({ width: 400, height: 300 });
    });
  });

  describe('Chart Types', () => {
    it('should create ReportChart correctly', () => {
      const chart: ReportChart = {
        type: 'line',
        data: [{ x: 1, y: 2 }],
        config: { title: 'Test Chart' }
      };
      
      expect(['line', 'bar', 'pie', 'scatter']).toContain(chart.type);
      expect(Array.isArray(chart.data)).toBe(true);
      expect(chart.config).toEqual({ title: 'Test Chart' });
    });
  });

  describe('Table Types', () => {
    it('should create ReportTable correctly', () => {
      const table: ReportTable = {
        columns: [],
        data: [],
        pagination: {
          page: 1,
          size: 10,
          total: 100
        }
      };
      
      expect(Array.isArray(table.columns)).toBe(true);
      expect(Array.isArray(table.data)).toBe(true);
      expect(table.pagination.page).toBe(1);
      expect(table.pagination.size).toBe(10);
      expect(table.pagination.total).toBe(100);
    });

    it('should create TableColumn correctly', () => {
      const column: TableColumn = {
        key: 'name',
        title: 'Name',
        type: 'string',
        sortable: true,
        filterable: true
      };
      
      expect(column.key).toBe('name');
      expect(column.title).toBe('Name');
      expect(column.type).toBe('string');
      expect(column.sortable).toBe(true);
      expect(column.filterable).toBe(true);
    });

    it('should create PaginationConfig correctly', () => {
      const config: PaginationConfig = {
        page: 2,
        size: 20,
        total: 200
      };
      
      expect(config.page).toBe(2);
      expect(config.size).toBe(20);
      expect(config.total).toBe(200);
    });
  });

  describe('Trend Types', () => {
    it('should create TrendData correctly', () => {
      const trend: TrendData = {
        period: '2024-01',
        value: 100,
        change: 10,
        changePercent: 0.1
      };
      
      expect(trend.period).toBe('2024-01');
      expect(trend.value).toBe(100);
      expect(trend.change).toBe(10);
      expect(trend.changePercent).toBe(0.1);
    });
  });

  describe('Storage Types', () => {
    it('should create StorageConfig correctly', () => {
      const config: StorageConfig = {
        type: 's3',
        config: { bucket: 'data' },
        encryption: {
          algorithm: 'AES-256-GCM',
          keySize: 256,
          mode: 'GCM',
          padding: 'PKCS7'
        }
      };
      
      expect(['local', 's3', 'gcs', 'azure']).toContain(config.type);
      expect(config.config).toEqual({ bucket: 'data' });
      expect(config.encryption.algorithm).toBe('AES-256-GCM');
    });
  });

  describe('Processing Types', () => {
    it('should create ProcessingConfig correctly', () => {
      const config: ProcessingConfig = {
        batchSize: 100,
        timeout: 30000,
        retries: 3,
        parallel: true
      };
      
      expect(config.batchSize).toBe(100);
      expect(config.timeout).toBe(30000);
      expect(config.retries).toBe(3);
      expect(config.parallel).toBe(true);
    });
  });

  describe('Sharing Types', () => {
    it('should create SharingConfig correctly', () => {
      const config: SharingConfig = {
        enabled: true,
        permissions: ['read', 'write'],
        expiration: new Date(),
        encryption: true
      };
      
      expect(config.enabled).toBe(true);
      expect(Array.isArray(config.permissions)).toBe(true);
      expect(config.expiration instanceof Date).toBe(true);
      expect(config.encryption).toBe(true);
    });
  });

  describe('Disposal Types', () => {
    it('should create DisposalConfig correctly', () => {
      const config: DisposalConfig = {
        method: 'delete',
        retention: 30,
        verification: true
      };
      
      expect(['delete', 'anonymize', 'archive']).toContain(config.method);
      expect(config.retention).toBe(30);
      expect(config.verification).toBe(true);
    });
  });

  describe('Monitoring Types', () => {
    it('should create MonitoringMetric correctly', () => {
      const metric: MonitoringMetric = {
        name: 'cpu_usage',
        value: 75.5,
        unit: 'percent',
        timestamp: new Date(),
        tags: { host: 'server-1' }
      };
      
      expect(metric.name).toBe('cpu_usage');
      expect(metric.value).toBe(75.5);
      expect(metric.unit).toBe('percent');
      expect(metric.timestamp instanceof Date).toBe(true);
      expect(metric.tags).toEqual({ host: 'server-1' });
    });

    it('should create MonitoringAlert correctly', () => {
      const alert: MonitoringAlert = {
        id: 'alert-1',
        name: 'High CPU Usage',
        condition: {
          metric: 'cpu_usage',
          operator: 'gt',
          threshold: 80,
          duration: 300
        },
        severity: 'high',
        status: 'active',
        createdAt: new Date()
      };
      
      expect(alert.id).toBe('alert-1');
      expect(alert.name).toBe('High CPU Usage');
      expect(alert.condition.metric).toBe('cpu_usage');
      expect(['low', 'medium', 'high', 'critical']).toContain(alert.severity);
      expect(['active', 'resolved', 'suppressed']).toContain(alert.status);
      expect(alert.createdAt instanceof Date).toBe(true);
    });

    it('should create MonitoringDashboard correctly', () => {
      const dashboard: MonitoringDashboard = {
        id: 'dashboard-1',
        name: 'System Overview',
        widgets: [],
        layout: {
          columns: 3,
          rows: 2,
          grid: []
        }
      };
      
      expect(dashboard.id).toBe('dashboard-1');
      expect(dashboard.name).toBe('System Overview');
      expect(Array.isArray(dashboard.widgets)).toBe(true);
      expect(dashboard.layout.columns).toBe(3);
      expect(dashboard.layout.rows).toBe(2);
      expect(Array.isArray(dashboard.layout.grid)).toBe(true);
    });

    it('should create DashboardLayout correctly', () => {
      const layout: DashboardLayout = {
        columns: 4,
        rows: 3,
        grid: []
      };
      
      expect(layout.columns).toBe(4);
      expect(layout.rows).toBe(3);
      expect(Array.isArray(layout.grid)).toBe(true);
    });

    it('should create GridItem correctly', () => {
      const item: GridItem = {
        widgetId: 'widget-1',
        x: 0,
        y: 0,
        width: 2,
        height: 1
      };
      
      expect(item.widgetId).toBe('widget-1');
      expect(item.x).toBe(0);
      expect(item.y).toBe(0);
      expect(item.width).toBe(2);
      expect(item.height).toBe(1);
    });

    it('should create MonitoringReport correctly', () => {
      const report: MonitoringReport = {
        id: 'report-1',
        name: 'Monthly Report',
        type: 'performance',
        data: { metrics: [] },
        generatedAt: new Date(),
        format: 'pdf'
      };
      
      expect(report.id).toBe('report-1');
      expect(report.name).toBe('Monthly Report');
      expect(report.type).toBe('performance');
      expect(report.data).toEqual({ metrics: [] });
      expect(report.generatedAt instanceof Date).toBe(true);
      expect(['json', 'csv', 'pdf', 'xlsx']).toContain(report.format);
    });
  });

  describe('Action Types', () => {
    it('should have correct ActionType values', () => {
      const types: ActionType[] = ['create', 'read', 'update', 'delete', 'execute', 'approve', 'reject'];
      types.forEach(type => {
        expect(['create', 'read', 'update', 'delete', 'execute', 'approve', 'reject']).toContain(type);
      });
    });
  });

  describe('Source Types', () => {
    it('should have correct SourceType values', () => {
      const types: SourceType[] = ['api', 'database', 'file', 'stream', 'webhook'];
      types.forEach(type => {
        expect(['api', 'database', 'file', 'stream', 'webhook']).toContain(type);
      });
    });
  });

  describe('Normalization Types', () => {
    it('should create NormalizationConfig correctly', () => {
      const config: NormalizationConfig = {
        rules: [],
        mappings: [],
        validation: {
          rules: [],
          strict: true,
          customValidators: []
        }
      };
      
      expect(Array.isArray(config.rules)).toBe(true);
      expect(Array.isArray(config.mappings)).toBe(true);
      expect(config.validation.strict).toBe(true);
    });

    it('should create NormalizationRule correctly', () => {
      const rule: NormalizationRule = {
        field: 'email',
        type: 'lowercase',
        config: {}
      };
      
      expect(rule.field).toBe('email');
      expect(['trim', 'lowercase', 'uppercase', 'format', 'transform']).toContain(rule.type);
      expect(rule.config).toEqual({});
    });

    it('should create FieldMapping correctly', () => {
      const mapping: FieldMapping = {
        source: 'user_email',
        target: 'email',
        transform: 'lowercase'
      };
      
      expect(mapping.source).toBe('user_email');
      expect(mapping.target).toBe('email');
      expect(mapping.transform).toBe('lowercase');
    });
  });

  describe('Aggregation Types', () => {
    it('should create AggregationConfig correctly', () => {
      const config: AggregationConfig = {
        groupBy: ['region', 'service'],
        aggregations: [],
        filters: [],
        timeWindow: {
          duration: 3600,
          unit: 'seconds'
        }
      };
      
      expect(Array.isArray(config.groupBy)).toBe(true);
      expect(Array.isArray(config.aggregations)).toBe(true);
      expect(Array.isArray(config.filters)).toBe(true);
      expect(config.timeWindow.duration).toBe(3600);
      expect(['seconds', 'minutes', 'hours', 'days']).toContain(config.timeWindow.unit);
    });

    it('should create AggregationFunction correctly', () => {
      const func: AggregationFunction = {
        field: 'cpu_usage',
        function: 'avg',
        alias: 'avg_cpu'
      };
      
      expect(func.field).toBe('cpu_usage');
      expect(['sum', 'avg', 'min', 'max', 'count', 'distinct']).toContain(func.function);
      expect(func.alias).toBe('avg_cpu');
    });

    it('should create TimeWindow correctly', () => {
      const window: TimeWindow = {
        duration: 1800,
        unit: 'seconds',
        offset: 300
      };
      
      expect(window.duration).toBe(1800);
      expect(['seconds', 'minutes', 'hours', 'days']).toContain(window.unit);
      expect(window.offset).toBe(300);
    });
  });

  describe('Data Types', () => {
    it('should have correct DataType values', () => {
      const types: DataType[] = ['string', 'number', 'boolean', 'object', 'array', 'date', 'binary'];
      types.forEach(type => {
        expect(['string', 'number', 'boolean', 'object', 'array', 'date', 'binary']).toContain(type);
      });
    });
  });

  describe('Retention Types', () => {
    it('should create RetentionConfig correctly', () => {
      const config: RetentionConfig = {
        duration: 30,
        unit: 'days',
        action: 'delete'
      };
      
      expect(config.duration).toBe(30);
      expect(['days', 'weeks', 'months', 'years']).toContain(config.unit);
      expect(['delete', 'archive', 'anonymize']).toContain(config.action);
    });
  });
});