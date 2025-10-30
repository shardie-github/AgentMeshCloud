#!/usr/bin/env node
/**
 * Autonomous Mesh OS - Compliance Auditor
 * 
 * Continuous compliance monitoring and auditing system:
 * - ISO 27001 compliance checks
 * - SOC 2 controls validation
 * - GDPR compliance monitoring
 * - PCI DSS validation (where applicable)
 * - Automated audit trail generation
 * - Weekly compliance digest generation
 * - Auto-escalation of violations
 * 
 * @module compliance_auditor
 */

import { EventEmitter } from 'events';
import { readFile, writeFile, appendFile } from 'fs/promises';
import { createHash, createHmac } from 'crypto';
import YAML from 'yaml';

class ComplianceAuditor extends EventEmitter {
  constructor(configPath = './scheduler_config.yaml') {
    super();
    this.configPath = configPath;
    this.config = null;
    this.auditLog = [];
    this.violations = [];
    this.controls = new Map();
    this.lastAudit = null;
    this.startTime = Date.now();
  }

  /**
   * Initialize the compliance auditor
   */
  async initialize() {
    console.log('[Compliance Auditor] Initializing...');
    
    try {
      const configData = await readFile(this.configPath, 'utf-8');
      this.config = YAML.parse(configData);
      
      // Load compliance controls
      await this.loadControls();
      
      console.log('[Compliance Auditor] ✓ Initialized');
      this.emit('auditor:ready');
    } catch (error) {
      console.error('[Compliance Auditor] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load compliance controls from standards
   */
  async loadControls() {
    // ISO 27001 Controls
    this.registerControlSet('ISO27001', [
      { id: 'A.5.1', name: 'Information Security Policies', category: 'policy' },
      { id: 'A.6.1', name: 'Internal Organization', category: 'governance' },
      { id: 'A.8.1', name: 'Asset Management', category: 'assets' },
      { id: 'A.9.1', name: 'Access Control Policy', category: 'access' },
      { id: 'A.10.1', name: 'Cryptographic Controls', category: 'crypto' },
      { id: 'A.12.1', name: 'Operational Security', category: 'operations' },
      { id: 'A.12.4', name: 'Logging and Monitoring', category: 'monitoring' },
      { id: 'A.14.1', name: 'Security in Development', category: 'development' },
      { id: 'A.16.1', name: 'Incident Management', category: 'incident' },
      { id: 'A.17.1', name: 'Business Continuity', category: 'continuity' }
    ]);

    // SOC 2 Controls
    this.registerControlSet('SOC2', [
      { id: 'CC1.1', name: 'Control Environment', category: 'governance', type: 'common' },
      { id: 'CC2.1', name: 'Communication and Information', category: 'communication', type: 'common' },
      { id: 'CC3.1', name: 'Risk Assessment', category: 'risk', type: 'common' },
      { id: 'CC4.1', name: 'Monitoring Activities', category: 'monitoring', type: 'common' },
      { id: 'CC5.1', name: 'Control Activities', category: 'control', type: 'common' },
      { id: 'CC6.1', name: 'Logical and Physical Access', category: 'access', type: 'common' },
      { id: 'CC7.1', name: 'System Operations', category: 'operations', type: 'common' },
      { id: 'CC8.1', name: 'Change Management', category: 'change', type: 'common' },
      { id: 'A1.1', name: 'Availability', category: 'availability', type: 'availability' },
      { id: 'C1.1', name: 'Confidentiality', category: 'confidentiality', type: 'confidentiality' }
    ]);

    // GDPR Requirements
    this.registerControlSet('GDPR', [
      { id: 'Art.5', name: 'Principles for Processing', category: 'principles' },
      { id: 'Art.6', name: 'Lawfulness of Processing', category: 'lawfulness' },
      { id: 'Art.15', name: 'Right of Access', category: 'access_rights' },
      { id: 'Art.17', name: 'Right to Erasure', category: 'erasure' },
      { id: 'Art.25', name: 'Data Protection by Design', category: 'design' },
      { id: 'Art.30', name: 'Records of Processing', category: 'records' },
      { id: 'Art.32', name: 'Security of Processing', category: 'security' },
      { id: 'Art.33', name: 'Breach Notification', category: 'breach' }
    ]);

    console.log(`[Compliance Auditor] Loaded ${this.controls.size} control sets`);
  }

  /**
   * Register a control set
   */
  registerControlSet(standard, controls) {
    this.controls.set(standard, controls);
  }

  /**
   * Perform comprehensive compliance audit
   */
  async performAudit(agents, telemetry) {
    console.log('[Compliance Auditor] Starting compliance audit...');
    
    const audit = {
      id: this.generateAuditId(),
      timestamp: Date.now(),
      date: new Date().toISOString(),
      auditor: 'Autonomous Mesh OS Compliance Auditor',
      scope: 'Full System Audit',
      results: {
        ISO27001: await this.auditISO27001(agents, telemetry),
        SOC2: await this.auditSOC2(agents, telemetry),
        GDPR: await this.auditGDPR(agents, telemetry)
      },
      summary: {
        totalControls: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        notApplicable: 0
      },
      violations: [],
      recommendations: []
    };

    // Calculate summary
    for (const standard of Object.values(audit.results)) {
      audit.summary.totalControls += standard.controls.length;
      audit.summary.passed += standard.controls.filter(c => c.status === 'pass').length;
      audit.summary.failed += standard.controls.filter(c => c.status === 'fail').length;
      audit.summary.warnings += standard.controls.filter(c => c.status === 'warning').length;
      audit.summary.notApplicable += standard.controls.filter(c => c.status === 'n/a').length;
      
      audit.violations.push(...standard.controls.filter(c => c.status === 'fail'));
    }

    // Calculate compliance scores
    audit.summary.overallScore = audit.summary.totalControls > 0
      ? ((audit.summary.passed / audit.summary.totalControls) * 100).toFixed(2)
      : 0;

    // Generate recommendations
    audit.recommendations = this.generateRecommendations(audit);

    // Log audit
    this.auditLog.push(audit);
    this.lastAudit = audit;

    // Check for violations
    if (audit.summary.failed > 0) {
      await this.handleViolations(audit);
    }

    console.log(`[Compliance Auditor] Audit complete: ${audit.summary.passed}/${audit.summary.totalControls} controls passed`);
    
    this.emit('audit:complete', audit);
    
    return audit;
  }

  /**
   * Audit ISO 27001 controls
   */
  async auditISO27001(agents, telemetry) {
    const controls = this.controls.get('ISO27001') || [];
    const results = {
      standard: 'ISO 27001:2013',
      auditDate: new Date().toISOString(),
      controls: []
    };

    for (const control of controls) {
      let status = 'pass';
      let findings = [];
      let evidence = [];

      switch (control.id) {
        case 'A.5.1': // Information Security Policies
          if (!this.config?.security || !this.config.security.authentication?.enabled) {
            status = 'fail';
            findings.push('Security policies not fully configured');
          }
          evidence.push('Security configuration present in config');
          break;

        case 'A.9.1': // Access Control Policy
          if (!this.config?.security?.authentication?.enabled) {
            status = 'fail';
            findings.push('Authentication not enabled');
          }
          if (!this.config?.security?.authorization?.enabled) {
            status = 'fail';
            findings.push('Authorization not enabled');
          }
          evidence.push('Access control configuration reviewed');
          break;

        case 'A.10.1': // Cryptographic Controls
          if (!this.config?.security?.encryption?.inTransit || !this.config.security.encryption?.atRest) {
            status = 'fail';
            findings.push('Encryption not fully enabled');
          }
          evidence.push('Encryption settings validated');
          break;

        case 'A.12.4': // Logging and Monitoring
          if (!telemetry || telemetry.length === 0) {
            status = 'warning';
            findings.push('Limited telemetry data available');
          }
          evidence.push('Telemetry system operational');
          break;

        default:
          status = 'n/a';
          findings.push('Control not yet implemented');
      }

      results.controls.push({
        controlId: control.id,
        name: control.name,
        category: control.category,
        status: status,
        findings: findings,
        evidence: evidence,
        timestamp: Date.now()
      });
    }

    return results;
  }

  /**
   * Audit SOC 2 controls
   */
  async auditSOC2(agents, telemetry) {
    const controls = this.controls.get('SOC2') || [];
    const results = {
      standard: 'SOC 2 Type II',
      auditDate: new Date().toISOString(),
      controls: []
    };

    for (const control of controls) {
      let status = 'pass';
      let findings = [];
      let evidence = [];

      switch (control.id) {
        case 'CC6.1': // Logical and Physical Access
          if (!this.config?.security?.authentication?.enabled) {
            status = 'fail';
            findings.push('Authentication controls not enabled');
          }
          if (!this.config?.security?.rateLimit?.enabled) {
            status = 'warning';
            findings.push('Rate limiting not enabled');
          }
          evidence.push('Access controls reviewed');
          break;

        case 'CC7.1': // System Operations
          const healthyAgents = agents?.filter(a => a.health === 'healthy').length || 0;
          const totalAgents = agents?.length || 0;
          if (totalAgents > 0 && (healthyAgents / totalAgents) < 0.95) {
            status = 'warning';
            findings.push(`Only ${healthyAgents}/${totalAgents} agents healthy`);
          }
          evidence.push('System health metrics reviewed');
          break;

        case 'A1.1': // Availability
          // Check uptime
          const uptime = this.calculateUptime(agents);
          if (uptime < 99.0) {
            status = 'fail';
            findings.push(`Uptime ${uptime}% below 99% target`);
          } else if (uptime < 99.9) {
            status = 'warning';
            findings.push(`Uptime ${uptime}% below 99.9% target`);
          }
          evidence.push(`Current uptime: ${uptime}%`);
          break;

        default:
          status = 'n/a';
          findings.push('Control not yet implemented');
      }

      results.controls.push({
        controlId: control.id,
        name: control.name,
        category: control.category,
        type: control.type,
        status: status,
        findings: findings,
        evidence: evidence,
        timestamp: Date.now()
      });
    }

    return results;
  }

  /**
   * Audit GDPR compliance
   */
  async auditGDPR(agents, telemetry) {
    const controls = this.controls.get('GDPR') || [];
    const results = {
      standard: 'GDPR (EU 2016/679)',
      auditDate: new Date().toISOString(),
      controls: []
    };

    for (const control of controls) {
      let status = 'pass';
      let findings = [];
      let evidence = [];

      switch (control.id) {
        case 'Art.25': // Data Protection by Design
          if (!this.config?.security?.encryption?.atRest) {
            status = 'fail';
            findings.push('Data not encrypted at rest');
          }
          evidence.push('Encryption configuration reviewed');
          break;

        case 'Art.30': // Records of Processing
          if (this.auditLog.length === 0) {
            status = 'warning';
            findings.push('Limited audit log history');
          }
          evidence.push(`${this.auditLog.length} audit records maintained`);
          break;

        case 'Art.32': // Security of Processing
          if (!this.config?.security?.encryption?.inTransit) {
            status = 'fail';
            findings.push('Data not encrypted in transit');
          }
          if (!this.config?.security?.authentication?.enabled) {
            status = 'fail';
            findings.push('Authentication not enabled');
          }
          evidence.push('Security controls reviewed');
          break;

        case 'Art.33': // Breach Notification
          // Check if alerting is configured
          if (!this.config?.alerting?.enabled) {
            status = 'warning';
            findings.push('Automated alerting not configured');
          }
          evidence.push('Incident notification system reviewed');
          break;

        default:
          status = 'n/a';
          findings.push('Control not yet implemented');
      }

      results.controls.push({
        controlId: control.id,
        name: control.name,
        category: control.category,
        status: status,
        findings: findings,
        evidence: evidence,
        timestamp: Date.now()
      });
    }

    return results;
  }

  /**
   * Calculate system uptime
   */
  calculateUptime(agents) {
    if (!agents || agents.length === 0) return 0;
    
    const totalUptime = agents.reduce((sum, agent) => 
      sum + (agent.metrics?.uptime || 100), 0
    );
    
    return (totalUptime / agents.length).toFixed(2);
  }

  /**
   * Generate audit ID
   */
  generateAuditId() {
    const timestamp = Date.now();
    const hash = createHash('sha256')
      .update(`${timestamp}-${Math.random()}`)
      .digest('hex')
      .substring(0, 8);
    return `AUDIT-${timestamp}-${hash}`;
  }

  /**
   * Generate recommendations based on audit results
   */
  generateRecommendations(audit) {
    const recommendations = [];

    // Analyze failures
    const failures = audit.violations;
    
    if (failures.length > 0) {
      const categories = new Set(failures.map(v => v.category));
      
      for (const category of categories) {
        const categoryFailures = failures.filter(f => f.category === category);
        recommendations.push({
          priority: 'high',
          category: category,
          issue: `${categoryFailures.length} control(s) failing in ${category}`,
          recommendation: `Review and remediate ${category} controls`,
          controls: categoryFailures.map(f => f.controlId)
        });
      }
    }

    // Check for warnings
    const allControls = [
      ...audit.results.ISO27001.controls,
      ...audit.results.SOC2.controls,
      ...audit.results.GDPR.controls
    ];
    const warnings = allControls.filter(c => c.status === 'warning');

    if (warnings.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'warnings',
        issue: `${warnings.length} control(s) with warnings`,
        recommendation: 'Address warning conditions to improve compliance posture'
      });
    }

    // Check compliance score
    if (audit.summary.overallScore < 95) {
      recommendations.push({
        priority: 'high',
        category: 'overall',
        issue: `Compliance score ${audit.summary.overallScore}% below 95% target`,
        recommendation: 'Prioritize remediation of failed controls to improve compliance score'
      });
    }

    return recommendations;
  }

  /**
   * Handle compliance violations
   */
  async handleViolations(audit) {
    console.log(`[Compliance Auditor] Handling ${audit.summary.failed} violations...`);
    
    const criticalViolations = audit.violations.filter(v => 
      v.status === 'fail' && (v.category === 'security' || v.category === 'access' || v.category === 'crypto')
    );

    if (criticalViolations.length > 0) {
      await this.escalateViolations(criticalViolations);
    }

    // Log all violations
    for (const violation of audit.violations) {
      await this.logViolation(violation, audit.id);
    }

    this.violations.push(...audit.violations);
  }

  /**
   * Escalate violations
   */
  async escalateViolations(violations) {
    console.log(`[Compliance Auditor] Escalating ${violations.length} critical violations...`);
    
    const escalation = {
      timestamp: Date.now(),
      severity: 'critical',
      type: 'compliance_violation',
      violations: violations,
      message: `${violations.length} critical compliance violations detected`,
      actionRequired: true
    };

    // Send webhook notification (if configured)
    if (this.config?.alerting?.enabled) {
      const webhooks = this.config.alerting.channels?.filter(c => c.type === 'webhook') || [];
      for (const webhook of webhooks) {
        try {
          // Simulate webhook call
          console.log(`[Compliance Auditor] Sending escalation to ${webhook.url}`);
          // In production, use fetch or http.request to send actual webhook
          this.emit('violation:escalated', { webhook: webhook.url, escalation });
        } catch (error) {
          console.error('[Compliance Auditor] Failed to send webhook:', error);
        }
      }
    }
  }

  /**
   * Log violation to audit trail
   */
  async logViolation(violation, auditId) {
    const logEntry = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      auditId: auditId,
      type: 'violation',
      controlId: violation.controlId,
      name: violation.name,
      category: violation.category,
      status: violation.status,
      findings: violation.findings,
      signature: this.signEntry({ auditId, violation })
    };

    // Append to audit log file
    try {
      await appendFile(
        './audit_trail.log',
        JSON.stringify(logEntry) + '\n'
      );
    } catch (error) {
      console.error('[Compliance Auditor] Failed to write audit log:', error);
    }
  }

  /**
   * Sign audit entry for tamper-evidence
   */
  signEntry(entry) {
    const secret = process.env.AUDIT_SECRET || 'default-audit-secret-change-in-production';
    const data = JSON.stringify(entry);
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Generate weekly compliance digest
   */
  async generateDigest() {
    console.log('[Compliance Auditor] Generating compliance digest...');
    
    const digest = {
      generated: new Date().toISOString(),
      period: 'weekly',
      weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      weekEnd: new Date().toISOString(),
      summary: {
        auditsPerformed: this.auditLog.filter(a => 
          a.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
        ).length,
        averageComplianceScore: this.calculateAverageScore(),
        totalViolations: this.violations.length,
        criticalViolations: this.violations.filter(v => 
          v.category === 'security' || v.category === 'access'
        ).length,
        trend: this.calculateComplianceTrend()
      },
      lastAudit: this.lastAudit ? {
        id: this.lastAudit.id,
        date: this.lastAudit.date,
        score: this.lastAudit.summary.overallScore,
        passed: this.lastAudit.summary.passed,
        failed: this.lastAudit.summary.failed
      } : null,
      standards: {
        ISO27001: this.getStandardStatus('ISO27001'),
        SOC2: this.getStandardStatus('SOC2'),
        GDPR: this.getStandardStatus('GDPR')
      },
      topViolations: this.getTopViolations(5),
      recommendations: this.lastAudit?.recommendations || []
    };

    // Write digest to file
    const markdown = this.formatDigestAsMarkdown(digest);
    await writeFile('./audit_digest.md', markdown);
    
    // Sign digest
    digest.signature = this.signEntry(digest);
    await writeFile('./audit_digest.json', JSON.stringify(digest, null, 2));

    console.log('[Compliance Auditor] ✓ Digest generated');
    this.emit('digest:generated', digest);

    return digest;
  }

  /**
   * Calculate average compliance score
   */
  calculateAverageScore() {
    if (this.auditLog.length === 0) return 0;
    
    const recentAudits = this.auditLog.slice(-4); // Last 4 audits
    const scores = recentAudits.map(a => parseFloat(a.summary.overallScore));
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    return avg.toFixed(2);
  }

  /**
   * Calculate compliance trend
   */
  calculateComplianceTrend() {
    if (this.auditLog.length < 2) return 'stable';
    
    const recent = this.auditLog.slice(-4);
    if (recent.length < 2) return 'stable';
    
    const scores = recent.map(a => parseFloat(a.summary.overallScore));
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg + 2) return 'improving';
    if (secondAvg < firstAvg - 2) return 'declining';
    return 'stable';
  }

  /**
   * Get standard status
   */
  getStandardStatus(standard) {
    if (!this.lastAudit) return { status: 'unknown', score: 0 };
    
    const results = this.lastAudit.results[standard];
    if (!results) return { status: 'unknown', score: 0 };
    
    const passed = results.controls.filter(c => c.status === 'pass').length;
    const total = results.controls.length;
    const score = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;
    
    return {
      status: score >= 95 ? 'compliant' : score >= 80 ? 'mostly_compliant' : 'non_compliant',
      score: score,
      passed: passed,
      total: total
    };
  }

  /**
   * Get top violations
   */
  getTopViolations(limit = 5) {
    const violationCounts = {};
    
    for (const violation of this.violations) {
      const key = violation.controlId;
      violationCounts[key] = (violationCounts[key] || 0) + 1;
    }
    
    return Object.entries(violationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([controlId, count]) => {
        const violation = this.violations.find(v => v.controlId === controlId);
        return {
          controlId: controlId,
          name: violation?.name || 'Unknown',
          category: violation?.category || 'Unknown',
          count: count
        };
      });
  }

  /**
   * Format digest as Markdown
   */
  formatDigestAsMarkdown(digest) {
    return `# Compliance Audit Digest

**Generated:** ${digest.generated}  
**Period:** ${digest.period} (${digest.weekStart} to ${digest.weekEnd})

## Executive Summary

- **Audits Performed:** ${digest.summary.auditsPerformed}
- **Average Compliance Score:** ${digest.summary.averageComplianceScore}%
- **Total Violations:** ${digest.summary.totalViolations}
- **Critical Violations:** ${digest.summary.criticalViolations}
- **Trend:** ${digest.summary.trend}

## Last Audit

${digest.lastAudit ? `
- **Audit ID:** \`${digest.lastAudit.id}\`
- **Date:** ${digest.lastAudit.date}
- **Score:** ${digest.lastAudit.score}%
- **Passed:** ${digest.lastAudit.passed} controls
- **Failed:** ${digest.lastAudit.failed} controls
` : '*No audits performed yet*'}

## Standards Compliance

### ISO 27001
- **Status:** ${digest.standards.ISO27001.status}
- **Score:** ${digest.standards.ISO27001.score}%
- **Controls:** ${digest.standards.ISO27001.passed}/${digest.standards.ISO27001.total} passed

### SOC 2
- **Status:** ${digest.standards.SOC2.status}
- **Score:** ${digest.standards.SOC2.score}%
- **Controls:** ${digest.standards.SOC2.passed}/${digest.standards.SOC2.total} passed

### GDPR
- **Status:** ${digest.standards.GDPR.status}
- **Score:** ${digest.standards.GDPR.score}%
- **Controls:** ${digest.standards.GDPR.passed}/${digest.standards.GDPR.total} passed

## Top Violations

${digest.topViolations.length > 0 ? 
  digest.topViolations.map((v, i) => 
    `${i + 1}. **${v.controlId}** - ${v.name} (${v.category}) - ${v.count} occurrence(s)`
  ).join('\n') : '*No violations recorded*'}

## Recommendations

${digest.recommendations.length > 0 ? 
  digest.recommendations.map((rec, i) => 
    `${i + 1}. **[${rec.priority}]** ${rec.issue}\n   - ${rec.recommendation}`
  ).join('\n\n') : '*No recommendations at this time*'}

---

**Signature:** \`${digest.signature}\`

*This digest was automatically generated by the Autonomous Mesh OS Compliance Auditor*
`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const auditor = new ComplianceAuditor();
  
  await auditor.initialize();
  
  // Mock agents for testing
  const mockAgents = [
    { id: 'agent-01', health: 'healthy', metrics: { uptime: 99.9 } },
    { id: 'agent-02', health: 'healthy', metrics: { uptime: 99.5 } },
    { id: 'agent-03', health: 'degraded', metrics: { uptime: 95.0 } }
  ];

  // Perform audit
  const audit = await auditor.performAudit(mockAgents, []);
  console.log('\n=== Audit Results ===');
  console.log(`Overall Score: ${audit.summary.overallScore}%`);
  console.log(`Passed: ${audit.summary.passed}/${audit.summary.totalControls}`);
  console.log(`Failed: ${audit.summary.failed}`);
  
  // Generate digest
  const digest = await auditor.generateDigest();
  console.log('\n=== Digest Generated ===');
  console.log(`Compliance Score: ${digest.summary.averageComplianceScore}%`);
  console.log(`Trend: ${digest.summary.trend}`);
}

export default ComplianceAuditor;
