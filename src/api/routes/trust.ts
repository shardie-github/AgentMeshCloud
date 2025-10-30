import { Router } from 'express';

export const trustRouter = Router();

trustRouter.get('/', async (req, res) => {
  try {
    const { trustScoring, syncAnalyzer, contextBus } = req.app.locals;

    // Compute trust metrics
    const trustMetrics = await trustScoring.computeTrustScore();
    const syncAnalysis = await syncAnalyzer.analyze();
    
    // Get latest metric from database
    const latestMetric = await contextBus.getLatestMetric();

    // Compute compliance SLA
    const complianceSla =
      (trustMetrics.components.policy_adherence_score +
        trustMetrics.components.agent_uptime_score) *
      50;

    // Get counts
    const agents = await contextBus.getAgents();
    const workflows = await contextBus.getWorkflows();
    const events = await contextBus.getEvents(1000);

    res.json({
      timestamp: new Date().toISOString(),
      kpis: {
        trust_score: trustMetrics.trust_score,
        risk_avoided_usd: trustMetrics.risk_avoided_usd,
        sync_freshness_pct: syncAnalysis.sync_freshness_pct,
        drift_rate_pct: syncAnalysis.summary.drift_rate_pct,
        compliance_sla_pct: Math.round(complianceSla * 100) / 100,
      },
      components: trustMetrics.components,
      confidence: trustMetrics.confidence,
      counts: {
        active_agents: agents.length,
        active_workflows: workflows.length,
        total_events: events.length,
      },
      sync_analysis: {
        fresh_workflows: syncAnalysis.summary.fresh_workflows,
        stale_workflows: syncAnalysis.summary.stale_workflows,
        drift_detections: syncAnalysis.drift_detections.length,
      },
      latest_metric: latestMetric,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

trustRouter.post('/refresh', async (req, res) => {
  try {
    const { trustScoring, syncAnalyzer, contextBus } = req.app.locals;

    // Update agent trust levels
    await trustScoring.updateAgentTrustLevels();

    // Compute fresh metrics
    const trustMetrics = await trustScoring.computeTrustScore();
    const syncAnalysis = await syncAnalyzer.analyze();

    // Compute compliance SLA
    const complianceSla =
      (trustMetrics.components.policy_adherence_score +
        trustMetrics.components.agent_uptime_score) *
      50;

    // Get counts
    const agents = await contextBus.getAgents();
    const workflows = await contextBus.getWorkflows();
    const events = await contextBus.getEvents(1000);

    // Store metric snapshot
    await contextBus.createMetric({
      ts: new Date(),
      trust_score: trustMetrics.trust_score,
      risk_avoided_usd: trustMetrics.risk_avoided_usd,
      sync_freshness_pct: syncAnalysis.sync_freshness_pct,
      drift_rate_pct: syncAnalysis.summary.drift_rate_pct,
      compliance_sla_pct: complianceSla,
      active_agents: agents.length,
      active_workflows: workflows.length,
      total_events: events.length,
    });

    res.json({
      message: 'Trust metrics refreshed and stored',
      kpis: {
        trust_score: trustMetrics.trust_score,
        risk_avoided_usd: trustMetrics.risk_avoided_usd,
        sync_freshness_pct: syncAnalysis.sync_freshness_pct,
        drift_rate_pct: syncAnalysis.summary.drift_rate_pct,
        compliance_sla_pct: Math.round(complianceSla * 100) / 100,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
