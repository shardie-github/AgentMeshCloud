/**
 * Sync Analyzer - UADSI Core
 * Detects sync gaps, data freshness, event ordering issues
 */

import { createLogger } from '@/common/logger';
import { orcaMetrics } from '@/telemetry/metrics';

const logger = createLogger('uadsi-sync-analyzer');

export interface SyncGap {
  source: string;
  target: string;
  gap_type: 'missing_records' | 'stale_data' | 'ordering_issue' | 'webhook_drift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: Date;
  lag_ms?: number;
  missing_count?: number;
  details: Record<string, unknown>;
}

export interface DataFreshnessMetrics {
  source: string;
  last_sync: Date;
  freshness_score: number; // 0-100
  lag_seconds: number;
  is_stale: boolean;
}

/**
 * Sync Analyzer Service
 * Monitors and analyzes data synchronization
 */
export class SyncAnalyzer {
  private syncGaps: SyncGap[];
  private freshnessMetrics: Map<string, DataFreshnessMetrics>;
  private stalenessThresholdSeconds: number;

  constructor() {
    this.syncGaps = [];
    this.freshnessMetrics = new Map();
    this.stalenessThresholdSeconds = 3600; // 1 hour
  }

  /**
   * Analyze sync status between source and target
   */
  async analyzeSyncStatus(source: string, target: string): Promise<SyncGap[]> {
    logger.debug('Analyzing sync status', { source, target });

    const gaps: SyncGap[] = [];

    // Check for missing records
    const missingRecords = await this.detectMissingRecords(source, target);
    if (missingRecords.count > 0) {
      gaps.push({
        source,
        target,
        gap_type: 'missing_records',
        severity: missingRecords.count > 100 ? 'critical' : 'medium',
        detected_at: new Date(),
        missing_count: missingRecords.count,
        details: { sample_ids: missingRecords.sampleIds },
      });
    }

    // Check for stale data
    const staleness = await this.detectStaleData(source);
    if (staleness.is_stale) {
      gaps.push({
        source,
        target,
        gap_type: 'stale_data',
        severity: staleness.lag_seconds > 7200 ? 'high' : 'medium',
        detected_at: new Date(),
        lag_ms: staleness.lag_seconds * 1000,
        details: { last_sync: staleness.last_sync, freshness_score: staleness.freshness_score },
      });
    }

    // Check for event ordering issues
    const orderingIssues = await this.detectOrderingIssues(source, target);
    if (orderingIssues.count > 0) {
      gaps.push({
        source,
        target,
        gap_type: 'ordering_issue',
        severity: 'medium',
        detected_at: new Date(),
        details: { out_of_order_count: orderingIssues.count },
      });
    }

    // Record metrics
    for (const gap of gaps) {
      if (gap.lag_ms) {
        orcaMetrics.recordSyncLag(source, gap.lag_ms);
      }
    }

    this.syncGaps.push(...gaps);
    return gaps;
  }

  /**
   * Detect missing records between source and target
   */
  private async detectMissingRecords(
    source: string,
    target: string
  ): Promise<{ count: number; sampleIds: string[] }> {
    // Mock implementation - in production, query actual data stores
    logger.debug('Detecting missing records', { source, target });
    
    // Simulate some missing records
    const missingCount = Math.floor(Math.random() * 50);
    const sampleIds = Array.from({ length: Math.min(5, missingCount) }, (_, i) => 
      `record-${i + 1}`
    );

    return { count: missingCount, sampleIds };
  }

  /**
   * Detect stale data
   */
  private async detectStaleData(source: string): Promise<DataFreshnessMetrics> {
    logger.debug('Detecting stale data', { source });

    // Mock implementation - in production, query last sync timestamp
    const lastSync = new Date(Date.now() - Math.random() * 7200000); // Random within 2 hours
    const lagSeconds = Math.floor((Date.now() - lastSync.getTime()) / 1000);
    const isStale = lagSeconds > this.stalenessThresholdSeconds;
    
    // Freshness score: 100 at 0 lag, decreases with lag
    const freshnessScore = Math.max(0, 100 - (lagSeconds / this.stalenessThresholdSeconds) * 100);

    const metrics: DataFreshnessMetrics = {
      source,
      last_sync: lastSync,
      freshness_score: Math.round(freshnessScore),
      lag_seconds: lagSeconds,
      is_stale: isStale,
    };

    this.freshnessMetrics.set(source, metrics);
    return metrics;
  }

  /**
   * Detect event ordering issues
   */
  private async detectOrderingIssues(
    source: string,
    target: string
  ): Promise<{ count: number }> {
    logger.debug('Detecting ordering issues', { source, target });

    // Mock implementation - in production, analyze event timestamps
    const outOfOrderCount = Math.floor(Math.random() * 10);

    return { count: outOfOrderCount };
  }

  /**
   * Check webhook drift
   */
  async checkWebhookDrift(webhookUrl: string, expectedRate: number): Promise<SyncGap | null> {
    logger.debug('Checking webhook drift', { webhook: webhookUrl });

    // Mock implementation - in production, analyze webhook delivery logs
    const actualRate = expectedRate * (0.8 + Math.random() * 0.4); // 80-120% of expected
    const driftPercent = Math.abs((actualRate - expectedRate) / expectedRate) * 100;

    if (driftPercent > 20) {
      return {
        source: webhookUrl,
        target: 'webhook_consumer',
        gap_type: 'webhook_drift',
        severity: driftPercent > 50 ? 'high' : 'medium',
        detected_at: new Date(),
        details: {
          expected_rate: expectedRate,
          actual_rate: actualRate,
          drift_percent: driftPercent,
        },
      };
    }

    return null;
  }

  /**
   * Get sync freshness percentage
   */
  getSyncFreshnessPercent(): number {
    const metrics = Array.from(this.freshnessMetrics.values());
    if (metrics.length === 0) return 100;

    const avgFreshness = metrics.reduce((sum, m) => sum + m.freshness_score, 0) / metrics.length;
    return Math.round(avgFreshness * 10) / 10;
  }

  /**
   * Get drift rate percentage
   */
  getDriftRatePercent(): number {
    if (this.syncGaps.length === 0) return 0;

    const recentGaps = this.syncGaps.filter(gap => 
      Date.now() - gap.detected_at.getTime() < 86400000 // Last 24 hours
    );

    // Drift rate: percentage of sources with gaps
    const uniqueSources = new Set(recentGaps.map(g => g.source));
    const totalSources = this.freshnessMetrics.size || 1;
    const driftRate = (uniqueSources.size / totalSources) * 100;

    return Math.round(driftRate * 10) / 10;
  }

  /**
   * Get all sync gaps
   */
  getAllSyncGaps(severityFilter?: SyncGap['severity']): SyncGap[] {
    if (severityFilter) {
      return this.syncGaps.filter(gap => gap.severity === severityFilter);
    }
    return this.syncGaps;
  }

  /**
   * Get freshness metrics for a source
   */
  getFreshnessMetrics(source: string): DataFreshnessMetrics | undefined {
    return this.freshnessMetrics.get(source);
  }

  /**
   * Get all freshness metrics
   */
  getAllFreshnessMetrics(): DataFreshnessMetrics[] {
    return Array.from(this.freshnessMetrics.values());
  }

  /**
   * Clear old sync gaps (cleanup)
   */
  clearOldGaps(olderThanMs: number = 604800000): void { // 7 days
    const cutoff = Date.now() - olderThanMs;
    this.syncGaps = this.syncGaps.filter(gap => gap.detected_at.getTime() > cutoff);
    logger.info('Cleared old sync gaps', { remaining: this.syncGaps.length });
  }

  /**
   * Set staleness threshold
   */
  setStalenessThreshold(seconds: number): void {
    this.stalenessThresholdSeconds = seconds;
    logger.info('Staleness threshold updated', { threshold_seconds: seconds });
  }
}

/**
 * Singleton instance
 */
export const syncAnalyzer = new SyncAnalyzer();
