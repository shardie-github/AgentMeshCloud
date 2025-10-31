/**
 * FinOps Optimizer
 * Analyzes Supabase stats, Vercel logs, and cost data to recommend optimizations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

export interface OptimizationRecommendation {
  category: 'database' | 'compute' | 'storage' | 'network' | 'function';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  estimated_savings_usd_monthly: number;
  effort: 'low' | 'medium' | 'high';
  action_items: string[];
}

export interface CostAnalysis {
  current_monthly_cost_usd: number;
  projected_monthly_cost_usd: number;
  potential_savings_usd: number;
  recommendations: OptimizationRecommendation[];
  metrics: {
    db_size_gb: number;
    db_connections: number;
    function_invocations: number;
    bandwidth_gb: number;
  };
}

export class FinOpsOptimizer {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Perform comprehensive cost analysis
   */
  async analyzeCosts(): Promise<CostAnalysis> {
    console.log('💰 Analyzing costs and generating recommendations...');

    const recommendations: OptimizationRecommendation[] = [];

    // Fetch metrics
    const dbMetrics = await this.getDatabaseMetrics();
    const functionMetrics = await this.getFunctionMetrics();
    const storageMetrics = await this.getStorageMetrics();

    // Database optimizations
    recommendations.push(...(await this.analyzeDatabaseCosts(dbMetrics)));

    // Function optimizations
    recommendations.push(...(await this.analyzeFunctionCosts(functionMetrics)));

    // Storage optimizations
    recommendations.push(...(await this.analyzeStorageCosts(storageMetrics)));

    // Network optimizations
    recommendations.push(...(await this.analyzeNetworkCosts()));

    // Calculate total potential savings
    const potentialSavings = recommendations.reduce(
      (sum, rec) => sum + rec.estimated_savings_usd_monthly,
      0
    );

    // Sort by savings potential
    recommendations.sort((a, b) => b.estimated_savings_usd_monthly - a.estimated_savings_usd_monthly);

    const analysis: CostAnalysis = {
      current_monthly_cost_usd: await this.getCurrentMonthlyCost(),
      projected_monthly_cost_usd: await this.getProjectedMonthlyCost(),
      potential_savings_usd: potentialSavings,
      recommendations,
      metrics: {
        db_size_gb: dbMetrics.size_gb,
        db_connections: dbMetrics.active_connections,
        function_invocations: functionMetrics.monthly_invocations,
        bandwidth_gb: storageMetrics.bandwidth_gb,
      },
    };

    // Store analysis
    await this.storeAnalysis(analysis);

    console.log(`✅ Cost analysis complete: ${recommendations.length} recommendations, potential savings: $${potentialSavings}/month`);

    return analysis;
  }

  /**
   * Analyze database costs
   */
  private async analyzeDatabaseCosts(metrics: any): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Connection pool optimization
    if (metrics.max_connections > 100 && metrics.avg_active_connections < 20) {
      recommendations.push({
        category: 'database',
        severity: 'medium',
        title: 'Right-size database connection pool',
        description:
          'Your max connections is set to ' +
          metrics.max_connections +
          ' but average usage is only ' +
          metrics.avg_active_connections +
          '. Reducing the pool size can lower costs.',
        estimated_savings_usd_monthly: 50,
        effort: 'low',
        action_items: [
          'Review connection pool configuration',
          'Set max_connections to 50',
          'Monitor for connection pool exhaustion',
        ],
      });
    }

    // Unused indexes
    if (metrics.unused_indexes > 0) {
      recommendations.push({
        category: 'database',
        severity: 'medium',
        title: 'Drop unused database indexes',
        description:
          metrics.unused_indexes +
          ' indexes are never used but consume storage and slow down writes.',
        estimated_savings_usd_monthly: metrics.unused_indexes * 2,
        effort: 'low',
        action_items: [
          'Review unused indexes: ' + (metrics.unused_index_names || []).join(', '),
          'Drop unused indexes',
          'Monitor query performance after removal',
        ],
      });
    }

    // Slow queries
    if (metrics.slow_queries > 10) {
      recommendations.push({
        category: 'database',
        severity: 'high',
        title: 'Optimize slow queries',
        description:
          metrics.slow_queries + ' queries are taking >1s. Optimizing can reduce compute costs.',
        estimated_savings_usd_monthly: 100,
        effort: 'medium',
        action_items: [
          'Review slow query log',
          'Add missing indexes',
          'Refactor N+1 queries',
          'Consider query caching',
        ],
      });
    }

    // Large table without partitioning
    if (metrics.largest_table_gb > 50) {
      recommendations.push({
        category: 'database',
        severity: 'medium',
        title: 'Consider table partitioning',
        description:
          'Largest table is ' +
          metrics.largest_table_gb +
          'GB. Partitioning can improve query performance and reduce costs.',
        estimated_savings_usd_monthly: 75,
        effort: 'high',
        action_items: [
          'Analyze query patterns on large tables',
          'Implement time-based or hash partitioning',
          'Archive old data',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Analyze function costs
   */
  private async analyzeFunctionCosts(metrics: any): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Cold start optimization
    if (metrics.cold_start_percent > 20) {
      recommendations.push({
        category: 'function',
        severity: 'medium',
        title: 'Reduce serverless function cold starts',
        description:
          metrics.cold_start_percent +
          '% of function invocations are cold starts, increasing latency and costs.',
        estimated_savings_usd_monthly: 30,
        effort: 'medium',
        action_items: [
          'Enable function warming/provisioned concurrency',
          'Reduce bundle size',
          'Consider edge functions for frequently called APIs',
        ],
      });
    }

    // Memory over-provisioning
    if (metrics.avg_memory_usage_percent < 50) {
      recommendations.push({
        category: 'function',
        severity: 'medium',
        title: 'Right-size function memory',
        description:
          'Functions are using only ' +
          metrics.avg_memory_usage_percent +
          '% of allocated memory. Reducing memory can lower costs.',
        estimated_savings_usd_monthly: 40,
        effort: 'low',
        action_items: [
          'Review function memory allocation',
          'Reduce memory to match actual usage',
          'Monitor for OOM errors after adjustment',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Analyze storage costs
   */
  private async analyzeStorageCosts(metrics: any): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Old log retention
    if (metrics.log_storage_gb > 10) {
      recommendations.push({
        category: 'storage',
        severity: 'medium',
        title: 'Implement log retention policy',
        description:
          'Log storage is ' + metrics.log_storage_gb + 'GB. Implementing TTL can reduce costs.',
        estimated_savings_usd_monthly: metrics.log_storage_gb * 2,
        effort: 'low',
        action_items: [
          'Set 30-day retention for application logs',
          'Set 90-day retention for audit logs',
          'Archive critical logs to cheaper storage (S3 Glacier)',
        ],
      });
    }

    // Unoptimized images
    if (metrics.image_storage_gb > 5) {
      recommendations.push({
        category: 'storage',
        severity: 'low',
        title: 'Optimize image storage',
        description:
          'Image storage is ' +
          metrics.image_storage_gb +
          'GB. Compression and CDN can reduce costs.',
        estimated_savings_usd_monthly: metrics.image_storage_gb * 1.5,
        effort: 'medium',
        action_items: [
          'Enable automatic image compression',
          'Convert to WebP format',
          'Implement lazy loading',
          'Use CDN for static assets',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Analyze network costs
   */
  private async analyzeNetworkCosts(): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // TODO: Implement network cost analysis
    // - Bandwidth usage patterns
    // - CDN hit rate
    // - API response sizes

    return recommendations;
  }

  /**
   * Get database metrics
   */
  private async getDatabaseMetrics(): Promise<any> {
    const { data, error } = await this.supabase.rpc('get_database_metrics');

    if (error) {
      console.warn('Failed to fetch database metrics:', error);
      return {
        size_gb: 0,
        active_connections: 0,
        max_connections: 100,
        avg_active_connections: 0,
        unused_indexes: 0,
        slow_queries: 0,
        largest_table_gb: 0,
      };
    }

    return data || {};
  }

  /**
   * Get function metrics
   */
  private async getFunctionMetrics(): Promise<any> {
    // TODO: Integrate with Vercel/Netlify API
    return {
      monthly_invocations: 100000,
      cold_start_percent: 25,
      avg_memory_usage_percent: 45,
    };
  }

  /**
   * Get storage metrics
   */
  private async getStorageMetrics(): Promise<any> {
    // TODO: Query storage statistics
    return {
      bandwidth_gb: 50,
      log_storage_gb: 15,
      image_storage_gb: 8,
    };
  }

  /**
   * Get current monthly cost
   */
  private async getCurrentMonthlyCost(): Promise<number> {
    // TODO: Integrate with billing API
    return 500; // placeholder
  }

  /**
   * Get projected monthly cost
   */
  private async getProjectedMonthlyCost(): Promise<number> {
    // TODO: Calculate based on usage trends
    return 650; // placeholder
  }

  /**
   * Store analysis results
   */
  private async storeAnalysis(analysis: CostAnalysis): Promise<void> {
    const { error } = await this.supabase.from('cost_analyses').insert({
      timestamp: new Date().toISOString(),
      current_monthly_cost_usd: analysis.current_monthly_cost_usd,
      projected_monthly_cost_usd: analysis.projected_monthly_cost_usd,
      potential_savings_usd: analysis.potential_savings_usd,
      recommendations: analysis.recommendations,
      metrics: analysis.metrics,
    });

    if (error) {
      console.error('Failed to store cost analysis:', error);
    }
  }

  /**
   * Generate cost report
   */
  generateReport(analysis: CostAnalysis): string {
    let report = `
╔════════════════════════════════════════════════════════════════╗
║                    FinOps Cost Analysis Report                  ║
╚════════════════════════════════════════════════════════════════╝

💰 Current Monthly Cost: $${analysis.current_monthly_cost_usd.toFixed(2)}
📈 Projected Monthly Cost: $${analysis.projected_monthly_cost_usd.toFixed(2)}
💡 Potential Savings: $${analysis.potential_savings_usd.toFixed(2)}/month

📊 Resource Metrics:
  - Database Size: ${analysis.metrics.db_size_gb.toFixed(1)} GB
  - DB Connections: ${analysis.metrics.db_connections}
  - Function Invocations: ${analysis.metrics.function_invocations.toLocaleString()}
  - Bandwidth: ${analysis.metrics.bandwidth_gb.toFixed(1)} GB

🎯 Top Recommendations:

`;

    analysis.recommendations.forEach((rec, i) => {
      report += `${i + 1}. [${rec.severity.toUpperCase()}] ${rec.title}
   💵 Savings: $${rec.estimated_savings_usd_monthly}/month | Effort: ${rec.effort}
   ${rec.description}
   
   Action Items:
${rec.action_items.map((item) => `   - ${item}`).join('\n')}

`;
    });

    return report;
  }
}

/**
 * Factory function
 */
export function createFinOpsOptimizer(): FinOpsOptimizer | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, FinOps optimizer disabled');
    return null;
  }

  return new FinOpsOptimizer(supabaseUrl, supabaseKey);
}

export default FinOpsOptimizer;
