import { ContextBus } from '../context-bus/context_bus.js';

export interface SyncAnalysis {
  sync_freshness_pct: number;
  stale_workflows: Array<{
    workflow_id: string;
    workflow_name: string;
    last_event_at: Date | null;
    staleness_hours: number;
  }>;
  drift_detections: Array<{
    workflow_id: string;
    drift_type: string;
    drift_score: number;
    description: string;
  }>;
  summary: {
    total_workflows: number;
    fresh_workflows: number;
    stale_workflows: number;
    drift_rate_pct: number;
  };
}

export class SyncAnalyzer {
  private contextBus: ContextBus;
  private freshnessSloHours: number;

  constructor(contextBus: ContextBus, freshnessSloHours = 24) {
    this.contextBus = contextBus;
    this.freshnessSloHours = freshnessSloHours;
  }

  async analyze(): Promise<SyncAnalysis> {
    const workflows = await this.contextBus.getWorkflows();
    const now = new Date();
    const sloMs = this.freshnessSloHours * 60 * 60 * 1000;

    const staleWorkflows: SyncAnalysis['stale_workflows'] = [];
    let freshCount = 0;

    for (const workflow of workflows) {
      const events = await this.contextBus.getEventsByWorkflow(workflow.id, 1);
      const lastEventAt = events.length > 0 && events[0] ? events[0].ts : null;

      if (!lastEventAt) {
        staleWorkflows.push({
          workflow_id: workflow.id,
          workflow_name: workflow.name,
          last_event_at: null,
          staleness_hours: Infinity,
        });
        continue;
      }

      const ageMs = now.getTime() - new Date(lastEventAt).getTime();
      const ageHours = ageMs / (60 * 60 * 1000);

      if (ageMs > sloMs) {
        staleWorkflows.push({
          workflow_id: workflow.id,
          workflow_name: workflow.name,
          last_event_at: lastEventAt,
          staleness_hours: Math.round(ageHours * 10) / 10,
        });
      } else {
        freshCount++;
      }
    }

    const syncFreshness =
      workflows.length > 0 ? (freshCount / workflows.length) * 100 : 100;

    // Simple drift detection based on staleness
    const driftDetections: SyncAnalysis['drift_detections'] = staleWorkflows
      .filter(w => w.staleness_hours > this.freshnessSloHours * 2)
      .map(w => ({
        workflow_id: w.workflow_id,
        drift_type: 'sync_staleness',
        drift_score: Math.min(100, (w.staleness_hours / this.freshnessSloHours) * 10),
        description: `Workflow has not received events for ${w.staleness_hours} hours`,
      }));

    const driftRate =
      workflows.length > 0 ? (driftDetections.length / workflows.length) * 100 : 0;

    return {
      sync_freshness_pct: Math.round(syncFreshness * 100) / 100,
      stale_workflows: staleWorkflows,
      drift_detections: driftDetections,
      summary: {
        total_workflows: workflows.length,
        fresh_workflows: freshCount,
        stale_workflows: staleWorkflows.length,
        drift_rate_pct: Math.round(driftRate * 100) / 100,
      },
    };
  }

  async detectDrift(): Promise<SyncAnalysis['drift_detections']> {
    const analysis = await this.analyze();
    return analysis.drift_detections;
  }

  async getSyncFreshness(): Promise<number> {
    const analysis = await this.analyze();
    return analysis.sync_freshness_pct;
  }
}
