/**
 * OpenTelemetry Tracer - ORCA Core
 * Distributed tracing with correlation IDs
 */

import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { createLogger } from '@/common/logger';

const logger = createLogger('telemetry-tracer');

export interface TracerConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  endpoint?: string;
  samplingRatio?: number;
}

/**
 * Initialize OpenTelemetry tracing
 */
export function initializeTracing(config: TracerConfig): NodeTracerProvider {
  logger.info('Initializing OpenTelemetry tracing', {
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

  const provider = new NodeTracerProvider({ resource });

  // Configure exporter
  const exporter = new OTLPTraceExporter({
    url: config.endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
  });

  // Add batch processor
  provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
    maxQueueSize: 2048,
    scheduledDelayMillis: 5000,
    maxExportBatchSize: 512,
  }));

  provider.register();

  logger.info('OpenTelemetry tracing initialized successfully');

  return provider;
}

/**
 * Create a span for an operation
 */
export function startSpan(name: string, attributes?: Record<string, string | number>): Span {
  const tracer = trace.getTracer('orca-core');
  return tracer.startSpan(name, {
    attributes,
  });
}

/**
 * Execute a function within a span
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number>
): Promise<T> {
  const tracer = trace.getTracer('orca-core');
  
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Get current trace ID
 */
export function getTraceId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext().traceId;
}

/**
 * Get current span ID
 */
export function getSpanId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext().spanId;
}

/**
 * Add attribute to current span
 */
export function addSpanAttribute(key: string, value: string | number | boolean): void {
  const span = trace.getSpan(context.active());
  span?.setAttribute(key, value);
}

/**
 * Add event to current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, string | number>): void {
  const span = trace.getSpan(context.active());
  span?.addEvent(name, attributes);
}

/**
 * Record exception in current span
 */
export function recordException(error: Error): void {
  const span = trace.getSpan(context.active());
  span?.recordException(error);
  span?.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
}
