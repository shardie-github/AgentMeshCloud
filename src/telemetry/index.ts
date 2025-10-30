/**
 * Telemetry Module Exports
 */

export {
  initializeTracing,
  startSpan,
  withSpan,
  getTraceId,
  getSpanId,
  addSpanAttribute,
  addSpanEvent,
  recordException,
} from './tracer';

export type { TracerConfig } from './tracer';

export { OrcaMetrics, orcaMetrics } from './metrics';
export type { MetricsConfig } from './metrics';
