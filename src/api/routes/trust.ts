/**
 * Trust API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { trustScoringEngine, syncAnalyzer, reportEngine } from '@/uadsi';
import { withSpan } from '@/telemetry/tracer';

export const trustRouter = Router();

/**
 * GET /api/v1/trust
 * Get Trust KPIs for current period
 */
trustRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('get_trust_kpis', async () => {
      const periodEnd = new Date();
      const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const kpis = await trustScoringEngine.computeTrustKPIs(periodStart, periodEnd);

      res.json({
        success: true,
        data: kpis,
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust/score/:agentId
 * Get trust score for specific agent
 */
trustRouter.get('/score/:agentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('get_agent_trust_score', async () => {
      const trustScore = await trustScoringEngine.computeTrustScore(req.params.agentId);

      res.json({
        success: true,
        data: trustScore,
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust/sync-gaps
 * Get synchronization gaps
 */
trustRouter.get('/sync-gaps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('get_sync_gaps', async () => {
      const severity = req.query.severity as 'low' | 'medium' | 'high' | 'critical' | undefined;
      const gaps = syncAnalyzer.getAllSyncGaps(severity);

      res.json({
        success: true,
        data: {
          gaps,
          count: gaps.length,
          sync_freshness_percent: syncAnalyzer.getSyncFreshnessPercent(),
          drift_rate_percent: syncAnalyzer.getDriftRatePercent(),
        },
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust/report/executive
 * Generate executive summary
 */
trustRouter.get('/report/executive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('generate_executive_report', async () => {
      const periodEnd = new Date();
      const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

      const report = await reportEngine.generateExecutiveSummary(periodStart, periodEnd);

      res.set('Content-Type', 'text/markdown');
      res.send(report);
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/trust/incident
 * Record an incident for risk calculation
 */
trustRouter.post('/incident', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('record_incident', async () => {
      const { agent_id, severity, loss_usd } = req.body;

      trustScoringEngine.recordIncident(agent_id, severity, loss_usd);

      res.status(201).json({
        success: true,
        message: 'Incident recorded',
      });
    });
  } catch (error) {
    next(error);
  }
});
