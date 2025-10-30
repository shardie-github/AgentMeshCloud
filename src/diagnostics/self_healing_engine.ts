import { ContextBus } from '../context-bus/context_bus.js';
import { SyncAnalyzer } from '../uadsi/sync_analyzer.js';
import { TrustScoring } from '../uadsi/trust_scoring.js';
import fs from 'fs';
import path from 'path';

export interface HealingAction {
  timestamp: string;
  workflow_id: string;
  workflow_name: string;
  issue_type: string;
  action_taken: string;
  result: 'success' | 'failed' | 'skipped';
  details: string;
}

export interface HealingReport {
  generated_at: string;
  total_actions: number;
  successful_actions: number;
  failed_actions: number;
  skipped_actions: number;
  actions: HealingAction[];
}

export class SelfHealingEngine {
  private contextBus: ContextBus;
  private syncAnalyzer: SyncAnalyzer;
  private trustScoring: TrustScoring;
  private enabled: boolean;

  constructor(
    contextBus: ContextBus,
    syncAnalyzer: SyncAnalyzer,
    trustScoring: TrustScoring,
    enabled = true
  ) {
    this.contextBus = contextBus;
    this.syncAnalyzer = syncAnalyzer;
    this.trustScoring = trustScoring;
    this.enabled = enabled;
  }

  async diagnoseAndHeal(): Promise<HealingReport> {
    const actions: HealingAction[] = [];

    if (!this.enabled) {
      return {
        generated_at: new Date().toISOString(),
        total_actions: 0,
        successful_actions: 0,
        failed_actions: 0,
        skipped_actions: 0,
        actions: [],
      };
    }

    // Detect drift
    const driftDetections = await this.syncAnalyzer.detectDrift();

    for (const drift of driftDetections) {
      const workflow = await this.contextBus.getWorkflowById(drift.workflow_id);

      if (!workflow) {
        actions.push({
          timestamp: new Date().toISOString(),
          workflow_id: drift.workflow_id,
          workflow_name: 'unknown',
          issue_type: 'drift',
          action_taken: 'skip',
          result: 'skipped',
          details: 'Workflow not found',
        });
        continue;
      }

      // Attempt to heal by resetting workflow status
      try {
        if (workflow.status === 'error') {
          await this.contextBus.updateWorkflowStatus(drift.workflow_id, 'active');
          actions.push({
            timestamp: new Date().toISOString(),
            workflow_id: drift.workflow_id,
            workflow_name: workflow.name,
            issue_type: 'drift_with_error_status',
            action_taken: 'reset_workflow_status',
            result: 'success',
            details: `Reset workflow from error to active`,
          });
        } else {
          actions.push({
            timestamp: new Date().toISOString(),
            workflow_id: drift.workflow_id,
            workflow_name: workflow.name,
            issue_type: 'drift',
            action_taken: 'monitor',
            result: 'skipped',
            details: `Drift detected but no automatic remediation available (${drift.description})`,
          });
        }
      } catch (error) {
        actions.push({
          timestamp: new Date().toISOString(),
          workflow_id: drift.workflow_id,
          workflow_name: workflow.name,
          issue_type: 'drift',
          action_taken: 'reset_workflow_status',
          result: 'failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update agent trust levels
    try {
      await this.trustScoring.updateAgentTrustLevels();
      actions.push({
        timestamp: new Date().toISOString(),
        workflow_id: 'system',
        workflow_name: 'system',
        issue_type: 'trust_scoring',
        action_taken: 'update_agent_trust_levels',
        result: 'success',
        details: 'Updated trust levels for all agents based on telemetry',
      });
    } catch (error) {
      actions.push({
        timestamp: new Date().toISOString(),
        workflow_id: 'system',
        workflow_name: 'system',
        issue_type: 'trust_scoring',
        action_taken: 'update_agent_trust_levels',
        result: 'failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const successful = actions.filter(a => a.result === 'success').length;
    const failed = actions.filter(a => a.result === 'failed').length;
    const skipped = actions.filter(a => a.result === 'skipped').length;

    return {
      generated_at: new Date().toISOString(),
      total_actions: actions.length,
      successful_actions: successful,
      failed_actions: failed,
      skipped_actions: skipped,
      actions,
    };
  }

  async generateHealingReport(): Promise<string> {
    const report = await this.diagnoseAndHeal();

    const markdown = `# Self-Healing Report

**Generated:** ${new Date(report.generated_at).toLocaleString()}

## Summary

- **Total Actions:** ${report.total_actions}
- **Successful:** ${report.successful_actions}
- **Failed:** ${report.failed_actions}
- **Skipped:** ${report.skipped_actions}

## Actions Taken

${report.actions.length === 0 ? '*No actions taken - system is healthy*' : ''}

${report.actions
  .map(
    action => `### ${action.result === 'success' ? '✅' : action.result === 'failed' ? '❌' : '⏭️ '} ${action.workflow_name} - ${action.issue_type}

- **Timestamp:** ${new Date(action.timestamp).toLocaleString()}
- **Action:** ${action.action_taken}
- **Result:** ${action.result}
- **Details:** ${action.details}
`
  )
  .join('\n')}

---

*This report was generated automatically by the ORCA Self-Healing Engine.*
`;

    // Save to file
    const filepath = path.join(process.cwd(), 'healing_report.md');
    fs.writeFileSync(filepath, markdown, 'utf8');

    return markdown;
  }
}
