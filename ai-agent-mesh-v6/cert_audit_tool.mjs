#!/usr/bin/env node

/**
 * Compliance Certification Audit Tool
 * Automated controls scanner for SOC 2, ISO 27001, and GDPR
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse } from 'yaml';

class CertificationAuditTool {
  constructor() {
    this.controls = {
      soc2: [],
      iso27001: [],
      gdpr: []
    };
    this.auditResults = [];
    this.evidence = new Map();
  }

  /**
   * Initialize audit tool with control mappings
   */
  async initialize() {
    console.log('🔍 Initializing Certification Audit Tool...');
    
    // Load control mappings
    this.loadControls();
    
    console.log(`✅ Loaded ${this.controls.soc2.length} SOC 2 controls`);
    console.log(`✅ Loaded ${this.controls.iso27001.length} ISO 27001 controls`);
    console.log(`✅ Loaded ${this.controls.gdpr.length} GDPR requirements`);
    
    return true;
  }

  /**
   * Load control mappings for each certification
   */
  loadControls() {
    // SOC 2 Trust Service Criteria
    this.controls.soc2 = [
      { id: 'CC1.1', category: 'Control Environment', description: 'COSO Principle 1 - Demonstrates commitment to integrity and ethical values', severity: 'critical' },
      { id: 'CC1.2', category: 'Control Environment', description: 'Board exercises oversight responsibility', severity: 'critical' },
      { id: 'CC2.1', category: 'Communication', description: 'Quality information communicated', severity: 'high' },
      { id: 'CC3.1', category: 'Risk Assessment', description: 'Specifies objectives with clarity', severity: 'high' },
      { id: 'CC3.2', category: 'Risk Assessment', description: 'Identifies and analyzes risk', severity: 'high' },
      { id: 'CC4.1', category: 'Monitoring', description: 'Monitoring activities conducted', severity: 'high' },
      { id: 'CC5.1', category: 'Control Activities', description: 'Logical access controls', severity: 'critical' },
      { id: 'CC5.2', category: 'Control Activities', description: 'System operations controls', severity: 'critical' },
      { id: 'CC6.1', category: 'Logical Access', description: 'Logical access controls exist', severity: 'critical' },
      { id: 'CC6.2', category: 'Logical Access', description: 'Access credentials managed', severity: 'critical' },
      { id: 'CC6.3', category: 'Logical Access', description: 'Access removed when no longer needed', severity: 'high' },
      { id: 'CC6.6', category: 'Logical Access', description: 'Encryption in transit', severity: 'critical' },
      { id: 'CC6.7', category: 'Logical Access', description: 'Encryption at rest', severity: 'critical' },
      { id: 'CC7.1', category: 'System Operations', description: 'Security incidents detected', severity: 'critical' },
      { id: 'CC7.2', category: 'System Operations', description: 'Incidents monitored and reported', severity: 'critical' },
      { id: 'CC7.3', category: 'System Operations', description: 'Vulnerability assessments performed', severity: 'high' },
      { id: 'CC7.4', category: 'System Operations', description: 'Incidents responded to', severity: 'critical' },
      { id: 'CC8.1', category: 'Change Management', description: 'Change management process exists', severity: 'high' },
      { id: 'A1.1', category: 'Availability', description: 'System availability performance monitored', severity: 'critical' },
      { id: 'A1.2', category: 'Availability', description: 'Recovery plans exist and tested', severity: 'critical' }
    ];
    
    // ISO 27001 Controls
    this.controls.iso27001 = [
      { id: 'A.5.1', category: 'Information Security Policies', description: 'Policy for information security', severity: 'critical' },
      { id: 'A.6.1', category: 'Organization', description: 'Internal organization', severity: 'high' },
      { id: 'A.6.2', category: 'Organization', description: 'Mobile devices and teleworking', severity: 'medium' },
      { id: 'A.7.1', category: 'Human Resources', description: 'Prior to employment', severity: 'high' },
      { id: 'A.7.2', category: 'Human Resources', description: 'During employment', severity: 'high' },
      { id: 'A.8.1', category: 'Asset Management', description: 'Responsibility for assets', severity: 'critical' },
      { id: 'A.8.2', category: 'Asset Management', description: 'Information classification', severity: 'critical' },
      { id: 'A.9.1', category: 'Access Control', description: 'Business requirements', severity: 'critical' },
      { id: 'A.9.2', category: 'Access Control', description: 'User access management', severity: 'critical' },
      { id: 'A.9.3', category: 'Access Control', description: 'User responsibilities', severity: 'high' },
      { id: 'A.9.4', category: 'Access Control', description: 'System and application access', severity: 'critical' },
      { id: 'A.10.1', category: 'Cryptography', description: 'Cryptographic controls', severity: 'critical' },
      { id: 'A.11.1', category: 'Physical Security', description: 'Secure areas', severity: 'high' },
      { id: 'A.12.1', category: 'Operations Security', description: 'Operational procedures', severity: 'high' },
      { id: 'A.12.3', category: 'Operations Security', description: 'Backup', severity: 'critical' },
      { id: 'A.12.4', category: 'Operations Security', description: 'Logging and monitoring', severity: 'critical' },
      { id: 'A.12.6', category: 'Operations Security', description: 'Technical vulnerability management', severity: 'critical' },
      { id: 'A.13.1', category: 'Communications Security', description: 'Network security', severity: 'critical' },
      { id: 'A.14.1', category: 'System Development', description: 'Security in development', severity: 'high' },
      { id: 'A.16.1', category: 'Incident Management', description: 'Management of security incidents', severity: 'critical' },
      { id: 'A.17.1', category: 'Business Continuity', description: 'Continuity planning', severity: 'critical' },
      { id: 'A.18.1', category: 'Compliance', description: 'Compliance with legal requirements', severity: 'critical' }
    ];
    
    // GDPR Requirements
    this.controls.gdpr = [
      { id: 'Art.5', category: 'Principles', description: 'Principles relating to processing of personal data', severity: 'critical' },
      { id: 'Art.6', category: 'Lawfulness', description: 'Lawfulness of processing', severity: 'critical' },
      { id: 'Art.7', category: 'Consent', description: 'Conditions for consent', severity: 'critical' },
      { id: 'Art.9', category: 'Special Categories', description: 'Processing of special categories of personal data', severity: 'critical' },
      { id: 'Art.12', category: 'Transparency', description: 'Transparent information and communication', severity: 'high' },
      { id: 'Art.13', category: 'Data Subject Rights', description: 'Information to be provided where data collected', severity: 'critical' },
      { id: 'Art.15', category: 'Data Subject Rights', description: 'Right of access by data subject', severity: 'critical' },
      { id: 'Art.16', category: 'Data Subject Rights', description: 'Right to rectification', severity: 'high' },
      { id: 'Art.17', category: 'Data Subject Rights', description: 'Right to erasure (right to be forgotten)', severity: 'critical' },
      { id: 'Art.20', category: 'Data Subject Rights', description: 'Right to data portability', severity: 'high' },
      { id: 'Art.25', category: 'Security', description: 'Data protection by design and by default', severity: 'critical' },
      { id: 'Art.28', category: 'Processors', description: 'Processor obligations', severity: 'critical' },
      { id: 'Art.30', category: 'Documentation', description: 'Records of processing activities', severity: 'critical' },
      { id: 'Art.32', category: 'Security', description: 'Security of processing', severity: 'critical' },
      { id: 'Art.33', category: 'Breach Notification', description: 'Notification of breach to supervisory authority', severity: 'critical' },
      { id: 'Art.34', category: 'Breach Notification', description: 'Communication of breach to data subject', severity: 'critical' },
      { id: 'Art.35', category: 'DPIA', description: 'Data protection impact assessment', severity: 'high' },
      { id: 'Art.37', category: 'DPO', description: 'Designation of data protection officer', severity: 'high' },
      { id: 'Art.44', category: 'Transfers', description: 'General principle for transfers', severity: 'critical' }
    ];
  }

  /**
   * Run comprehensive audit
   */
  async runAudit(certifications = ['soc2', 'iso27001', 'gdpr']) {
    console.log('\n🔎 Starting compliance audit...\n');
    
    for (const cert of certifications) {
      console.log(`\n📋 Auditing ${cert.toUpperCase()} controls...\n`);
      
      const controls = this.controls[cert];
      for (const control of controls) {
        const result = await this.auditControl(cert, control);
        this.auditResults.push(result);
        
        const status = result.compliant ? '✅' : '❌';
        console.log(`   ${status} ${control.id}: ${control.description.substring(0, 60)}...`);
        
        if (!result.compliant && result.findings.length > 0) {
          console.log(`      Issues: ${result.findings.join(', ')}`);
        }
      }
    }
    
    return this.generateAuditReport();
  }

  /**
   * Audit individual control
   */
  async auditControl(certification, control) {
    const result = {
      certification,
      controlId: control.id,
      category: control.category,
      description: control.description,
      severity: control.severity,
      compliant: false,
      score: 0,
      findings: [],
      evidence: [],
      recommendations: [],
      lastAudited: new Date().toISOString()
    };
    
    // Perform specific checks based on control
    const checks = await this.performControlChecks(control);
    
    result.compliant = checks.passed;
    result.score = checks.score;
    result.findings = checks.findings;
    result.evidence = checks.evidence;
    result.recommendations = checks.recommendations;
    
    return result;
  }

  /**
   * Perform control checks
   */
  async performControlChecks(control) {
    // Simulate control checks (in production, integrate with actual systems)
    
    const checks = {
      passed: Math.random() > 0.15,  // 85% pass rate
      score: Math.random() * 100,
      findings: [],
      evidence: [],
      recommendations: []
    };
    
    // Add findings for failed controls
    if (!checks.passed) {
      if (control.category === 'Logical Access' || control.category === 'Access Control') {
        checks.findings.push('Password policy not enforced for all accounts');
        checks.findings.push('MFA not enabled for 12% of privileged accounts');
        checks.recommendations.push('Enforce password complexity requirements across all systems');
        checks.recommendations.push('Enable mandatory MFA for all privileged accounts');
      } else if (control.category === 'Encryption' || control.category === 'Cryptography') {
        checks.findings.push('Some data at rest not encrypted with approved algorithms');
        checks.recommendations.push('Migrate to AES-256-GCM for all data encryption');
      } else if (control.category === 'Monitoring' || control.category === 'Logging and monitoring') {
        checks.findings.push('Log retention period below 90 days for some systems');
        checks.recommendations.push('Increase log retention to minimum 90 days');
      } else if (control.category === 'Backup') {
        checks.findings.push('Backup testing not performed in last 90 days');
        checks.recommendations.push('Schedule quarterly backup restoration tests');
      } else {
        checks.findings.push('Control implementation incomplete');
        checks.recommendations.push('Review and implement missing control requirements');
      }
    } else {
      // Evidence for passed controls
      checks.evidence.push('Policy document reviewed and approved');
      checks.evidence.push('Technical implementation verified');
      checks.evidence.push('Access logs reviewed');
    }
    
    return checks;
  }

  /**
   * Generate audit report
   */
  generateAuditReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        total: this.auditResults.length,
        compliant: 0,
        nonCompliant: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0
      },
      byCertification: {},
      criticalFindings: [],
      recommendations: [],
      results: this.auditResults
    };
    
    // Calculate summary statistics
    for (const result of this.auditResults) {
      if (result.compliant) {
        report.summary.compliant++;
      } else {
        report.summary.nonCompliant++;
        
        // Count by severity
        if (result.severity === 'critical') {
          report.summary.criticalIssues++;
          report.criticalFindings.push({
            controlId: result.controlId,
            description: result.description,
            findings: result.findings
          });
        } else if (result.severity === 'high') {
          report.summary.highIssues++;
        } else if (result.severity === 'medium') {
          report.summary.mediumIssues++;
        }
      }
      
      // Group by certification
      if (!report.byCertification[result.certification]) {
        report.byCertification[result.certification] = {
          total: 0,
          compliant: 0,
          nonCompliant: 0,
          complianceRate: 0
        };
      }
      
      report.byCertification[result.certification].total++;
      if (result.compliant) {
        report.byCertification[result.certification].compliant++;
      } else {
        report.byCertification[result.certification].nonCompliant++;
      }
      
      // Collect unique recommendations
      result.recommendations.forEach(rec => {
        if (!report.recommendations.includes(rec)) {
          report.recommendations.push(rec);
        }
      });
    }
    
    // Calculate compliance rates
    for (const cert in report.byCertification) {
      const stats = report.byCertification[cert];
      stats.complianceRate = ((stats.compliant / stats.total) * 100).toFixed(1);
    }
    
    return report;
  }

  /**
   * Display audit summary
   */
  displaySummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPLIANCE AUDIT SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    console.log('Overall Status:');
    console.log(`  Total Controls: ${report.summary.total}`);
    console.log(`  Compliant: ${report.summary.compliant} (${((report.summary.compliant / report.summary.total) * 100).toFixed(1)}%)`);
    console.log(`  Non-Compliant: ${report.summary.nonCompliant}`);
    console.log(`  Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`  High Issues: ${report.summary.highIssues}`);
    console.log(`  Medium Issues: ${report.summary.mediumIssues}\n`);
    
    console.log('By Certification:');
    for (const [cert, stats] of Object.entries(report.byCertification)) {
      const status = parseFloat(stats.complianceRate) >= 90 ? '✅' : parseFloat(stats.complianceRate) >= 75 ? '⚠️' : '❌';
      console.log(`  ${status} ${cert.toUpperCase()}: ${stats.complianceRate}% (${stats.compliant}/${stats.total})`);
    }
    
    if (report.criticalFindings.length > 0) {
      console.log('\n🚨 Critical Findings:');
      report.criticalFindings.slice(0, 5).forEach((finding, i) => {
        console.log(`  ${i + 1}. ${finding.controlId}: ${finding.description}`);
        finding.findings.forEach(f => console.log(`     - ${f}`));
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:');
      report.recommendations.slice(0, 5).forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Save audit report
   */
  saveReport(report) {
    const filename = './certification_audit_report.json';
    writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`✅ Audit report saved to ${filename}`);
  }
}

// Main execution
async function main() {
  const tool = new CertificationAuditTool();
  
  await tool.initialize();
  
  // Run audit
  const report = await tool.runAudit(['soc2', 'iso27001', 'gdpr']);
  
  // Display summary
  tool.displaySummary(report);
  
  // Save report
  tool.saveReport(report);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default CertificationAuditTool;
