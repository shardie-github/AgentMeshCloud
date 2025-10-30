#!/usr/bin/env node

/**
 * AI-Agent Mesh Drift Monitor
 * 
 * Detects AI model drift by comparing agent outputs against baseline.
 * Triggers re-alignment workflows when drift exceeds thresholds.
 * 
 * @version 1.0.0
 * @module drift-monitor
 */

import crypto from 'crypto';
import fs from 'fs';
import yaml from 'js-yaml';

// ============================================================================
// DRIFT DETECTION ENGINE
// ============================================================================

const driftBaselines = new Map(); // agent_id -> baseline
const driftMeasurements = new Map(); // agent_id -> measurements[]
const driftAlerts = [];

/**
 * Load alignment rules from YAML
 */
function loadAlignmentRules() {
  try {
    const rulesPath = './ai-agent-mesh/alignment_rules.yaml';
    if (fs.existsSync(rulesPath)) {
      return yaml.load(fs.readFileSync(rulesPath, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Could not load alignment rules:', error.message);
  }
  
  // Default rules
  return {
    drift_thresholds: {
      output_similarity: 0.85,
      tone_deviation: 0.15,
      policy_violation_rate: 0.05,
      error_rate: 0.10
    },
    measurement_window: '7d',
    alert_channels: ['slack', 'email'],
    auto_remediation: false
  };
}

const alignmentRules = loadAlignmentRules();

/**
 * Establish baseline for agent
 */
function establishBaseline(agentId, samples) {
  const baseline = {
    agent_id: agentId,
    established_at: new Date().toISOString(),
    sample_count: samples.length,
    characteristics: {
      avg_response_length: 0,
      tone_profile: {},
      common_patterns: [],
      policy_adherence_rate: 1.0,
      error_rate: 0
    }
  };
  
  // Calculate characteristics
  let totalLength = 0;
  const toneScores = { professional: 0, casual: 0, technical: 0 };
  
  for (const sample of samples) {
    totalLength += sample.response?.length || 0;
    
    // Simple tone detection
    if (sample.response) {
      if (/\b(please|kindly|regards)\b/i.test(sample.response)) {
        toneScores.professional++;
      }
      if (/\b(hey|cool|awesome)\b/i.test(sample.response)) {
        toneScores.casual++;
      }
      if (/\b(algorithm|function|parameter)\b/i.test(sample.response)) {
        toneScores.technical++;
      }
    }
  }
  
  baseline.characteristics.avg_response_length = Math.floor(totalLength / samples.length);
  baseline.characteristics.tone_profile = toneScores;
  
  driftBaselines.set(agentId, baseline);
  
  console.log(`✓ Baseline established for ${agentId}`);
  return baseline;
}

/**
 * Measure drift for a new sample
 */
function measureDrift(agentId, sample) {
  const baseline = driftBaselines.get(agentId);
  
  if (!baseline) {
    return {
      error: 'No baseline established for agent',
      agent_id: agentId
    };
  }
  
  const measurement = {
    measurement_id: crypto.randomUUID(),
    agent_id: agentId,
    timestamp: new Date().toISOString(),
    sample,
    drift_scores: {},
    overall_drift: 0,
    alert_triggered: false
  };
  
  // 1. Response length drift
  const lengthDrift = Math.abs(
    (sample.response?.length || 0) - baseline.characteristics.avg_response_length
  ) / baseline.characteristics.avg_response_length;
  measurement.drift_scores.length_drift = lengthDrift;
  
  // 2. Tone drift (simplified)
  let toneDrift = 0;
  if (sample.response) {
    const sampleTone = {
      professional: /\b(please|kindly|regards)\b/i.test(sample.response) ? 1 : 0,
      casual: /\b(hey|cool|awesome)\b/i.test(sample.response) ? 1 : 0,
      technical: /\b(algorithm|function|parameter)\b/i.test(sample.response) ? 1 : 0
    };
    
    for (const [tone, score] of Object.entries(sampleTone)) {
      const baselineScore = baseline.characteristics.tone_profile[tone] || 0;
      const baselineTotal = baseline.sample_count;
      toneDrift += Math.abs(score - (baselineScore / baselineTotal));
    }
    toneDrift /= 3; // Average across tones
  }
  measurement.drift_scores.tone_drift = toneDrift;
  
  // 3. Policy violation rate drift
  const violationDrift = sample.policy_violations ? 0.1 : 0;
  measurement.drift_scores.policy_violation_drift = violationDrift;
  
  // 4. Overall drift score (weighted average)
  measurement.overall_drift = (
    lengthDrift * 0.3 +
    toneDrift * 0.4 +
    violationDrift * 0.3
  );
  
  // Check thresholds
  if (toneDrift > alignmentRules.drift_thresholds.tone_deviation) {
    measurement.alert_triggered = true;
    triggerDriftAlert(agentId, 'tone_deviation', toneDrift, measurement);
  }
  
  if (violationDrift > alignmentRules.drift_thresholds.policy_violation_rate) {
    measurement.alert_triggered = true;
    triggerDriftAlert(agentId, 'policy_violations', violationDrift, measurement);
  }
  
  // Store measurement
  if (!driftMeasurements.has(agentId)) {
    driftMeasurements.set(agentId, []);
  }
  driftMeasurements.get(agentId).push(measurement);
  
  // Keep only last 1000 measurements per agent
  const measurements = driftMeasurements.get(agentId);
  if (measurements.length > 1000) {
    measurements.shift();
  }
  
  return measurement;
}

/**
 * Trigger drift alert
 */
function triggerDriftAlert(agentId, type, score, measurement) {
  const alert = {
    alert_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agent_id: agentId,
    alert_type: type,
    severity: score > 0.3 ? 'critical' : 'warning',
    drift_score: score,
    measurement_id: measurement.measurement_id,
    message: `Drift detected: ${type} score ${score.toFixed(3)} exceeds threshold`,
    recommended_actions: []
  };
  
  // Recommend actions
  if (type === 'tone_deviation') {
    alert.recommended_actions.push('Review system prompt configuration');
    alert.recommended_actions.push('Retrain or fine-tune model');
    alert.recommended_actions.push('Update prompt normalization rules');
  }
  
  if (type === 'policy_violations') {
    alert.recommended_actions.push('Review and update policy enforcement rules');
    alert.recommended_actions.push('Investigate root cause of violations');
    alert.recommended_actions.push('Consider suspending agent pending review');
  }
  
  driftAlerts.push(alert);
  
  console.log(`🚨 DRIFT ALERT: ${agentId} - ${type} - ${alert.severity.toUpperCase()}`);
  
  // Auto-remediation (if enabled)
  if (alignmentRules.auto_remediation && alert.severity === 'critical') {
    console.log(`🔧 Triggering auto-remediation for ${agentId}`);
    // In production: trigger workflow to re-align agent
  }
  
  return alert;
}

/**
 * Get drift report for agent
 */
function getDriftReport(agentId) {
  const baseline = driftBaselines.get(agentId);
  const measurements = driftMeasurements.get(agentId) || [];
  const alerts = driftAlerts.filter(a => a.agent_id === agentId);
  
  if (!baseline) {
    return { error: 'No baseline established for agent' };
  }
  
  // Calculate statistics
  const recentMeasurements = measurements.slice(-100); // Last 100
  const avgDrift = recentMeasurements.length > 0 ?
    recentMeasurements.reduce((sum, m) => sum + m.overall_drift, 0) / recentMeasurements.length :
    0;
  
  const report = {
    agent_id: agentId,
    generated_at: new Date().toISOString(),
    baseline: {
      established_at: baseline.established_at,
      sample_count: baseline.sample_count
    },
    current_status: {
      total_measurements: measurements.length,
      recent_measurements: recentMeasurements.length,
      average_drift: avgDrift,
      drift_trend: avgDrift > 0.2 ? 'increasing' : avgDrift > 0.1 ? 'stable' : 'minimal',
      alert_count: alerts.length
    },
    recent_alerts: alerts.slice(-10),
    recommendations: []
  };
  
  // Add recommendations
  if (avgDrift > 0.2) {
    report.recommendations.push('High drift detected - immediate review recommended');
    report.recommendations.push('Consider re-establishing baseline with recent samples');
  } else if (avgDrift > 0.1) {
    report.recommendations.push('Moderate drift - monitor closely');
  } else {
    report.recommendations.push('Agent performing within expected parameters');
  }
  
  return report;
}

// ============================================================================
// CLI & TESTING
// ============================================================================

/**
 * Run drift detection tests
 */
async function runDriftTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         AI-AGENT MESH DRIFT MONITOR v1.0.0                ║');
  console.log('║                    Test Suite                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const testAgentId = 'test-agent-001';
  
  // 1. Establish baseline
  console.log('📊 Establishing baseline...');
  const baselineSamples = [
    { response: 'Thank you for your inquiry. I will assist you promptly.' },
    { response: 'Please let me know if you need further assistance.' },
    { response: 'I appreciate your patience while I process this request.' },
    { response: 'Your request has been received and will be handled accordingly.' },
    { response: 'I am here to help you with any questions you may have.' }
  ];
  
  const baseline = establishBaseline(testAgentId, baselineSamples);
  console.log(`   ✓ Baseline established with ${baseline.sample_count} samples\n`);
  
  // 2. Test normal sample (no drift)
  console.log('✅ Testing normal sample (no drift expected)...');
  const normalSample = {
    response: 'Thank you for reaching out. I will assist you with this matter.'
  };
  const normalMeasurement = measureDrift(testAgentId, normalSample);
  console.log(`   Drift score: ${normalMeasurement.overall_drift.toFixed(3)}`);
  console.log(`   Alert: ${normalMeasurement.alert_triggered ? '🚨 YES' : '✓ NO'}\n`);
  
  // 3. Test drifted sample (tone change)
  console.log('⚠️  Testing drifted sample (tone change)...');
  const driftedSample = {
    response: 'Hey! Cool question! Let me check that out for you real quick!'
  };
  const driftedMeasurement = measureDrift(testAgentId, driftedSample);
  console.log(`   Drift score: ${driftedMeasurement.overall_drift.toFixed(3)}`);
  console.log(`   Tone drift: ${driftedMeasurement.drift_scores.tone_drift.toFixed(3)}`);
  console.log(`   Alert: ${driftedMeasurement.alert_triggered ? '🚨 YES' : '✓ NO'}\n`);
  
  // 4. Test sample with policy violation
  console.log('🚫 Testing sample with policy violation...');
  const violationSample = {
    response: 'Here is some information...',
    policy_violations: ['pii-detected']
  };
  const violationMeasurement = measureDrift(testAgentId, violationSample);
  console.log(`   Drift score: ${violationMeasurement.overall_drift.toFixed(3)}`);
  console.log(`   Alert: ${violationMeasurement.alert_triggered ? '🚨 YES' : '✓ NO'}\n`);
  
  // 5. Generate drift report
  console.log('📋 Generating drift report...');
  const report = getDriftReport(testAgentId);
  console.log(JSON.stringify(report, null, 2));
  
  console.log('\n✓ All drift detection tests complete\n');
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runDriftTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

// Export for module usage
export {
  establishBaseline,
  measureDrift,
  triggerDriftAlert,
  getDriftReport,
  driftBaselines,
  driftMeasurements,
  driftAlerts,
  alignmentRules,
  runDriftTests
};
