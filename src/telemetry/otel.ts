import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader, MeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode, metrics } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

export interface TelemetryConfig {
  serviceName: string;
  endpoint: string;
  enabled?: boolean;
}

let provider: NodeTracerProvider | null = null;

export function initTelemetry(config: TelemetryConfig): NodeTracerProvider | null {
  if (!config.enabled) {
    console.log('📊 Telemetry disabled');
    return null;
  }

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.API_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });

  const traceExporter = new OTLPTraceExporter({
    url: config.endpoint,
  });

  provider = new NodeTracerProvider({
    resource,
  });

  provider.addSpanProcessor(new BatchSpanProcessor(traceExporter));

  provider.register();

  // Register instrumentations
  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  });

  // Setup metrics
  const metricExporter = new OTLPMetricExporter({
    url: config.endpoint,
  });

  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 10000,
      }),
    ],
  });

  metrics.setGlobalMeterProvider(meterProvider);

  console.log('📊 OpenTelemetry initialized');

  // Graceful shutdown
  process.on('SIGTERM', () => {
    provider
      ?.shutdown()
      .then(() => console.log('📊 Telemetry terminated'))
      .catch((err: Error) => console.error('Error terminating telemetry', err))
      .finally(() => process.exit(0));
  });

  return provider;
}

export function getTracer(name: string) {
  return trace.getTracer(name);
}

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer('orca-agentmesh');
  const span = tracer.startSpan(name);

  if (attributes) {
    span.setAttributes(attributes);
  }

  try {
    const result = await context.with(trace.setSpan(context.active(), span), fn);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    const error = err as Error;
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Unknown error',
    });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}

export { context, trace, SpanStatusCode };
