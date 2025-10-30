import fs from 'fs';
import path from 'path';
import { ContextBus } from '../context-bus/context_bus.js';
import { TrustScoring } from './trust_scoring.js';
import { SyncAnalyzer } from './sync_analyzer.js';
import { AgentDiscovery } from './agent_discovery.js';

export interface ExecutiveSummary {
  generated_at: string;
  period: string;
  kpis: {
    trust_score: number;
    risk_avoided_usd: number;
    sync_freshness_pct: number;
    drift_rate_pct: number;
    compliance_sla_pct: number;
  };
  insights: string[];
  recommendations: string[];
}

export class ReportEngine {
  // private contextBus: ContextBus;
  private trustScoring: TrustScoring;
  private syncAnalyzer: SyncAnalyzer;
  private agentDiscovery: AgentDiscovery;

  constructor(
    _contextBus: ContextBus,
    trustScoring: TrustScoring,
    syncAnalyzer: SyncAnalyzer,
    agentDiscovery: AgentDiscovery
  ) {
    // this.contextBus = contextBus;
    this.trustScoring = trustScoring;
    this.syncAnalyzer = syncAnalyzer;
    this.agentDiscovery = agentDiscovery;
  }

  async generateExecutiveSummary(): Promise<ExecutiveSummary> {
    // Compute KPIs
    const trustMetrics = await this.trustScoring.computeTrustScore();
    const syncAnalysis = await this.syncAnalyzer.analyze();
    const discovery = await this.agentDiscovery.discover();

    // Compute compliance SLA (simplified: based on policy adherence and uptime)
    const complianceSla =
      (trustMetrics.components.policy_adherence_score +
        trustMetrics.components.agent_uptime_score) *
      50;

    // Generate insights
    const insights: string[] = [];
    
    if (trustMetrics.trust_score >= 0.85) {
      insights.push('✅ System trust score exceeds baseline, indicating strong agent health');
    } else if (trustMetrics.trust_score >= 0.7) {
      insights.push('⚠️  System trust score is moderate, monitor agent performance closely');
    } else {
      insights.push('🚨 System trust score is below acceptable levels, immediate action required');
    }

    if (syncAnalysis.sync_freshness_pct >= 90) {
      insights.push('✅ Sync freshness is excellent, workflows are receiving timely updates');
    } else {
      insights.push(
        `⚠️  ${syncAnalysis.stale_workflows.length} workflows are stale, affecting sync freshness`
      );
    }

    if (syncAnalysis.drift_detections.length > 0) {
      insights.push(
        `🔍 Detected ${syncAnalysis.drift_detections.length} drift instances requiring attention`
      );
    }

    insights.push(
      `📊 ${discovery.summary.total_agents} agents and ${discovery.summary.total_workflows} workflows actively managed`
    );

    // Generate recommendations
    const recommendations: string[] = [];

    if (trustMetrics.trust_score < 0.85) {
      recommendations.push(
        'Review agents with low trust levels and address policy violations'
      );
    }

    if (syncAnalysis.stale_workflows.length > 0) {
      recommendations.push(
        `Investigate ${syncAnalysis.stale_workflows.length} stale workflows to restore sync freshness`
      );
    }

    if (syncAnalysis.drift_detections.length > 0) {
      recommendations.push('Enable self-healing to automatically remediate detected drifts');
    }

    if (complianceSla < 99.0) {
      recommendations.push('Strengthen policy enforcement to improve compliance SLA');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating within acceptable parameters, continue monitoring');
    }

    return {
      generated_at: new Date().toISOString(),
      period: 'current',
      kpis: {
        trust_score: trustMetrics.trust_score,
        risk_avoided_usd: trustMetrics.risk_avoided_usd,
        sync_freshness_pct: syncAnalysis.sync_freshness_pct,
        drift_rate_pct: syncAnalysis.summary.drift_rate_pct,
        compliance_sla_pct: Math.round(complianceSla * 100) / 100,
      },
      insights,
      recommendations,
    };
  }

  async exportMarkdown(): Promise<string> {
    const summary = await this.generateExecutiveSummary();

    const markdown = `# ORCA AgentMesh Executive Summary

**Generated:** ${new Date(summary.generated_at).toLocaleString()}  
**Period:** ${summary.period}

## Key Performance Indicators (KPIs)

| Metric | Value | Target |
|--------|-------|--------|
| **Trust Score (TS)** | ${summary.kpis.trust_score.toFixed(4)} | ≥ 0.8500 |
| **Risk Avoided (RA$)** | $${summary.kpis.risk_avoided_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Maximize |
| **Sync Freshness %** | ${summary.kpis.sync_freshness_pct.toFixed(2)}% | ≥ 90% |
| **Drift Rate %** | ${summary.kpis.drift_rate_pct.toFixed(2)}% | < 5% |
| **Compliance SLA %** | ${summary.kpis.compliance_sla_pct.toFixed(2)}% | ≥ 99.5% |

## Insights

${summary.insights.map(i => `- ${i}`).join('\n')}

## Recommendations

${summary.recommendations.map(r => `- ${r}`).join('\n')}

---

*This report was generated automatically by the ORCA UADSI Report Engine.*
`;

    return markdown;
  }

  async exportCSV(): Promise<string> {
    const summary = await this.generateExecutiveSummary();

    const csv = `metric,value,target
Trust Score,${summary.kpis.trust_score},0.8500
Risk Avoided USD,${summary.kpis.risk_avoided_usd},10000
Sync Freshness %,${summary.kpis.sync_freshness_pct},90.00
Drift Rate %,${summary.kpis.drift_rate_pct},5.00
Compliance SLA %,${summary.kpis.compliance_sla_pct},99.50
`;

    return csv;
  }

  async saveReport(format: 'markdown' | 'csv' = 'markdown'): Promise<string> {
    const content = format === 'markdown' ? await this.exportMarkdown() : await this.exportCSV();
    const extension = format === 'markdown' ? 'md' : 'csv';
    const filename = `executive_summary.${extension}`;
    const filepath = path.join(process.cwd(), filename);

    fs.writeFileSync(filepath, content, 'utf8');

    return filepath;
  }
}
