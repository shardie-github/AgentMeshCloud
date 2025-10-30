/**
 * OpenTelemetry Metrics - ORCA Core
 * Custom metrics for Trust KPIs and performance
 */

import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { metrics, Counter, Histogram, ObservableGauge } from '@opentelemetry/api';
import { createLogger } from '@/common/logger';

const logger = createLogger('telemetry-metrics');

export interface MetricsConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  endpoint?: string;
  exportInterval?: number;
}

/**
 * ORCA Metrics singleton
 */
export class OrcaMetrics {
  private meterProvider: MeterProvider | null = null;
  private meter: ReturnType<typeof metrics.getMeter> | null = null;

  // Trust KPI Metrics
  public trustScoreGauge: ObservableGauge | null = null;
  public riskAvoidedCounter: Counter | null = null;
  public syncLagHistogram: Histogram | null = null;
  public driftRateGauge: ObservableGauge | null = null;
  public complianceSlaGauge: ObservableGauge | null = null;
  public healingSuccessRate: ObservableGauge | null = null;

  // Performance Metrics
  public requestCounter: Counter | null = null;
  public requestDuration: Histogram | null = null;
  public errorCounter: Counter | null = null;
  public policyViolationCounter: Counter | null = null;

  /**
   * Initialize metrics collection
   */
  initialize(config: MetricsConfig): void {
    logger.info('Initializing OpenTelemetry metrics', {
      service: config.serviceName,
      environment: config.environment,
    });

    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
      })
    );

    const exporter = new OTLPMetricExporter({
      url: config.endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
    });

    const metricReader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: config.exportInterval || 60000, // 1 minute
    });

    this.meterProvider = new MeterProvider({
      resource,
      readers: [metricReader],
    });

    metrics.setGlobalMeterProvider(this.meterProvider);
    this.meter = metrics.getMeter('orca-core');

    this.setupMetrics();

    logger.info('OpenTelemetry metrics initialized successfully');
  }

  /**
   * Setup all ORCA metrics
   */
  private setupMetrics(): void {
    if (!this.meter) return;

    // Trust KPI Metrics
    this.trustScoreGauge = this.meter.createObservableGauge('orca.trust.score', {
      description: 'Trust score for agents (0-100)',
      unit: '1',
    });

    this.riskAvoidedCounter = this.meter.createCounter('orca.risk.avoided_usd', {
      description: 'Risk avoided in USD',
      unit: 'USD',
    });

    this.syncLagHistogram = this.meter.createHistogram('orca.sync.lag', {
      description: 'Data synchronization lag',
      unit: 'ms',
    });

    this.driftRateGauge = this.meter.createObservableGauge('orca.drift.rate', {
      description: 'Configuration/data drift rate',
      unit: '%',
    });

    this.complianceSlaGauge = this.meter.createObservableGauge('orca.compliance.sla', {
      description: 'Compliance SLA percentage',
      unit: '%',
    });

    this.healingSuccessRate = this.meter.createObservableGauge('orca.healing.success_rate', {
      description: 'Self-healing success rate',
      unit: '%',
    });

    // Performance Metrics
    this.requestCounter = this.meter.createCounter('orca.requests.total', {
      description: 'Total number of requests',
      unit: '1',
    });

    this.requestDuration = this.meter.createHistogram('orca.requests.duration', {
      description: 'Request duration',
      unit: 'ms',
    });

    this.errorCounter = this.meter.createCounter('orca.errors.total', {
      description: 'Total number of errors',
      unit: '1',
    });

    this.policyViolationCounter = this.meter.createCounter('orca.policy.violations', {
      description: 'Total number of policy violations',
      unit: '1',
    });

    logger.debug('All ORCA metrics registered');
  }

  /**
   * Record a request
   */
  recordRequest(method: string, path: string, statusCode: number): void {
    this.requestCounter?.add(1, {
      method,
      path,
      status_code: statusCode.toString(),
    });
  }

  /**
   * Record request duration
   */
  recordRequestDuration(method: string, path: string, duration: number): void {
    this.requestDuration?.record(duration, {
      method,
      path,
    });
  }

  /**
   * Record an error
   */
  recordError(errorType: string, errorCode: string): void {
    this.errorCounter?.add(1, {
      error_type: errorType,
      error_code: errorCode,
    });
  }

  /**
   * Record policy violation
   */
  recordPolicyViolation(policyId: string, agentId: string): void {
    this.policyViolationCounter?.add(1, {
      policy_id: policyId,
      agent_id: agentId,
    });
  }

  /**
   * Record sync lag
   */
  recordSyncLag(source: string, lagMs: number): void {
    this.syncLagHistogram?.record(lagMs, {
      source,
    });
  }

  /**
   * Record risk avoided
   */
  recordRiskAvoided(amount: number, category: string): void {
    this.riskAvoidedCounter?.add(amount, {
      category,
    });
  }

  /**
   * Shutdown metrics
   */
  async shutdown(): Promise<void> {
    if (this.meterProvider) {
      await this.meterProvider.shutdown();
      logger.info('Metrics provider shutdown');
    }
  }
}

/**
 * Singleton instance
 */
export const orcaMetrics = new OrcaMetrics();
