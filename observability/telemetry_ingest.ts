/**
 * Telemetry Ingest Pipeline
 * Streams OTEL traces and metrics to Supabase for long-term storage and analysis
 */

import { trace, metrics } from '@opentelemetry/api';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

interface TelemetryEvent {
  timestamp: Date;
  service: string;
  traceId: string;
  spanId: string;
  operation: string;
  duration_ms: number;
  status: 'ok' | 'error';
  attributes?: Record<string, any>;
  resource?: Record<string, any>;
}

interface MetricSnapshot {
  timestamp: Date;
  service: string;
  metric_name: string;
  metric_type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
}

export class TelemetryIngestor extends EventEmitter {
  private supabase: SupabaseClient;
  private buffer: TelemetryEvent[] = [];
  private metricBuffer: MetricSnapshot[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 10000; // 10 seconds

  constructor(supabaseUrl: string, supabaseKey: string) {
    super();
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.startPeriodicFlush();
  }

  /**
   * Ingest a trace span event
   */
  async ingestTrace(event: TelemetryEvent): Promise<void> {
    this.buffer.push(event);

    if (this.buffer.length >= this.BATCH_SIZE) {
      await this.flushTraces();
    }
  }

  /**
   * Ingest a metric snapshot
   */
  async ingestMetric(metric: MetricSnapshot): Promise<void> {
    this.metricBuffer.push(metric);

    if (this.metricBuffer.length >= this.BATCH_SIZE) {
      await this.flushMetrics();
    }
  }

  /**
   * Flush trace buffer to Supabase
   */
  private async flushTraces(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      const { error } = await this.supabase
        .from('telemetry_traces')
        .insert(
          batch.map((event) => ({
            timestamp: event.timestamp.toISOString(),
            service: event.service,
            trace_id: event.traceId,
            span_id: event.spanId,
            operation: event.operation,
            duration_ms: event.duration_ms,
            status: event.status,
            attributes: event.attributes || {},
            resource: event.resource || {},
          }))
        );

      if (error) {
        console.error('Failed to flush traces:', error);
        // Re-add to buffer for retry
        this.buffer.unshift(...batch);
        this.emit('flush_error', error);
      } else {
        this.emit('traces_flushed', batch.length);
      }
    } catch (err) {
      console.error('Exception during trace flush:', err);
      this.buffer.unshift(...batch);
      this.emit('flush_error', err);
    }
  }

  /**
   * Flush metric buffer to Supabase
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricBuffer.length === 0) return;

    const batch = [...this.metricBuffer];
    this.metricBuffer = [];

    try {
      const { error } = await this.supabase
        .from('telemetry_metrics')
        .insert(
          batch.map((metric) => ({
            timestamp: metric.timestamp.toISOString(),
            service: metric.service,
            metric_name: metric.metric_name,
            metric_type: metric.metric_type,
            value: metric.value,
            labels: metric.labels || {},
          }))
        );

      if (error) {
        console.error('Failed to flush metrics:', error);
        this.metricBuffer.unshift(...batch);
        this.emit('flush_error', error);
      } else {
        this.emit('metrics_flushed', batch.length);
      }
    } catch (err) {
      console.error('Exception during metric flush:', err);
      this.metricBuffer.unshift(...batch);
      this.emit('flush_error', err);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(async () => {
      await Promise.all([this.flushTraces(), this.flushMetrics()]);
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Final flush
    await Promise.all([this.flushTraces(), this.flushMetrics()]);
    this.emit('shutdown');
  }

  /**
   * Get buffer stats
   */
  getStats() {
    return {
      traces_buffered: this.buffer.length,
      metrics_buffered: this.metricBuffer.length,
      batch_size: this.BATCH_SIZE,
      flush_interval_ms: this.FLUSH_INTERVAL_MS,
    };
  }
}

/**
 * Factory function to create and configure the ingestor
 */
export function createTelemetryIngestor(): TelemetryIngestor | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, telemetry ingestion disabled');
    return null;
  }

  const ingestor = new TelemetryIngestor(supabaseUrl, supabaseKey);

  // Event handlers
  ingestor.on('traces_flushed', (count) => {
    console.log(`✅ Flushed ${count} traces to Supabase`);
  });

  ingestor.on('metrics_flushed', (count) => {
    console.log(`📊 Flushed ${count} metrics to Supabase`);
  });

  ingestor.on('flush_error', (error) => {
    console.error('❌ Flush error:', error);
  });

  return ingestor;
}

export default TelemetryIngestor;
