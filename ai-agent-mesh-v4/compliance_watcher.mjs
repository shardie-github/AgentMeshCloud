/**
 * Compliance Watcher - Real-Time Compliance Monitoring
 * 
 * Purpose: Automated compliance monitoring across jurisdictions
 * Monitors: GDPR, EU AI Act, CCPA, HIPAA, PIPEDA, ISO standards
 * 
 * Features:
 * - Real-time policy violation detection
 * - Automatic remediation actions
 * - Multi-jurisdiction compliance tracking
 * - Audit trail generation
 * - Regulatory change monitoring
 * 
 * KPIs:
 * - Policy check latency: <10ms
 * - False positive rate: <1%
 * - Automated remediation success: >95%
 * - Compliance score: 90-100
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import yaml from 'js-yaml';
import fs from 'fs/promises';

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE WATCHER
// ═══════════════════════════════════════════════════════════════

export class ComplianceWatcher extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.watcherId = config.watcherId || `watcher-${randomUUID()}`;
    this.complianceConfig = null;
    this.policyEngine = config.policyEngine;
    this.dataClassifier = config.dataClassifier;
    
    // Violation tracking
    this.violations = [];
    this.remediations = [];
    
    // Compliance state
    this.complianceScores = new Map(); // jurisdiction => score
    this.lastAudit = new Map(); // jurisdiction => timestamp
    
    // Monitoring state
    this.monitoringActive = false;
    this.checkQueue = [];
    
    this.metrics = {
      checksPerformed: 0,
      violationsDetected: 0,
      remediationsExecuted: 0,
      autoRemediationSuccessRate: 0,
      avgCheckLatency: 0,
      falsePositiveRate: 0
    };
    
    this.initializeWatcher();
  }
  
  async initializeWatcher() {
    console.log(`[ComplianceWatcher] Initializing watcher ${this.watcherId}`);
    
    // Load compliance configuration
    await this.loadComplianceConfig();
    
    // Start monitoring loops
    this.startRealTimeMonitoring();
    this.startPeriodicAudits();
    this.startPolicyUpdateMonitoring();
    
    console.log('[ComplianceWatcher] Compliance watcher active');
  }
  
  async loadComplianceConfig() {
    try {
      const configPath = './global_compliance.yaml';
      const configFile = await fs.readFile(configPath, 'utf8');
      this.complianceConfig = yaml.load(configFile);
      
      console.log(`[ComplianceWatcher] Loaded compliance config version ${this.complianceConfig.version}`);
      
      // Initialize compliance scores
      for (const region in this.complianceConfig.regions) {
        this.complianceScores.set(region, 100); // Start at perfect compliance
        this.lastAudit.set(region, Date.now());
      }
      
    } catch (error) {
      console.error('[ComplianceWatcher] Failed to load compliance config:', error.message);
      throw error;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // REAL-TIME MONITORING
  // ═══════════════════════════════════════════════════════════════
  
  startRealTimeMonitoring() {
    this.monitoringActive = true;
    
    // Process check queue
    this.checkInterval = setInterval(() => this.processCheckQueue(), 100); // 10 checks/second
    
    console.log('[ComplianceWatcher] Real-time monitoring started');
  }
  
  /**
   * Check data transfer compliance
   */
  async checkDataTransfer(transfer) {
    const startTime = Date.now();
    
    try {
      const { sourceRegion, targetRegion, dataType, dataClassification } = transfer;
      
      // Find applicable rules
      const rules = this.complianceConfig.automatic_enforcement.geofencing.rules;
      const applicableRule = rules.find(r => r.source_region === sourceRegion);
      
      if (!applicableRule) {
        return { allowed: true, reason: 'No specific rules for source region' };
      }
      
      // Check if transfer is allowed
      const allowed = applicableRule.allowed_destinations.includes(targetRegion);
      
      if (!allowed) {
        const violation = {
          id: randomUUID(),
          type: 'unauthorized_data_transfer',
          severity: 'critical',
          sourceRegion,
          targetRegion,
          dataType,
          detectedAt: Date.now(),
          regulation: this.getApplicableRegulation(sourceRegion),
          action: applicableRule.fallback || 'reject_transfer'
        };
        
        this.violations.push(violation);
        this.metrics.violationsDetected++;
        
        await this.executeRemediation(violation);
        
        this.emit('violation:detected', violation);
        
        console.warn(`[ComplianceWatcher] Data transfer violation:`, violation);
        
        return { allowed: false, violation };
      }
      
      // Additional checks for specific data types
      if (dataClassification === 'PHI' && targetRegion !== 'US') {
        return { allowed: false, reason: 'PHI cannot leave US jurisdiction (HIPAA)' };
      }
      
      if (dataClassification === 'PII' && sourceRegion === 'EU') {
        // Check for SCCs or adequacy decision
        const adequateCountries = this.complianceConfig.regions.european_union.data_residency.adequacy_decisions;
        
        if (!adequateCountries.includes(targetRegion) && !transfer.sccsInPlace) {
          return {
            allowed: false,
            reason: 'GDPR: No adequacy decision or SCCs for target country'
          };
        }
      }
      
      this.metrics.checksPerformed++;
      
      const duration = Date.now() - startTime;
      this.metrics.avgCheckLatency = (this.metrics.avgCheckLatency * 0.9) + (duration * 0.1);
      
      return { allowed: true };
      
    } catch (error) {
      console.error('[ComplianceWatcher] Data transfer check failed:', error.message);
      return { allowed: false, error: error.message };
    }
  }
  
  /**
   * Check consent compliance (GDPR, CCPA)
   */
  async checkConsentCompliance(operation) {
    const { userId, purpose, dataType, sourceRegion } = operation;
    
    // Get user's consent records
    const consent = await this.getConsent(userId, purpose);
    
    if (!consent) {
      const violation = {
        id: randomUUID(),
        type: 'missing_consent',
        severity: 'high',
        userId,
        purpose,
        dataType,
        sourceRegion,
        detectedAt: Date.now(),
        regulation: this.getApplicableRegulation(sourceRegion),
        action: 'block_operation'
      };
      
      this.violations.push(violation);
      this.metrics.violationsDetected++;
      
      await this.executeRemediation(violation);
      
      return { compliant: false, violation };
    }
    
    // Check consent expiry
    const consentAge = Date.now() - consent.grantedAt;
    const maxAge = this.complianceConfig.automatic_enforcement.consent_management.consent_expiry_days * 86400000;
    
    if (consentAge > maxAge) {
      return {
        compliant: false,
        reason: 'Consent expired',
        action: 'request_new_consent'
      };
    }
    
    return { compliant: true };
  }
  
  /**
   * Check data retention compliance
   */
  async checkRetentionCompliance(dataRecord) {
    const { dataType, createdAt, dataClassification } = dataRecord;
    
    // Find retention policy
    const retentionLimit = this.getRetentionLimit(dataClassification);
    
    if (!retentionLimit) {
      return { compliant: true }; // No specific retention policy
    }
    
    const age = Date.now() - createdAt;
    const maxAge = retentionLimit * 86400000; // Convert days to ms
    
    if (age > maxAge) {
      const violation = {
        id: randomUUID(),
        type: 'retention_limit_exceeded',
        severity: 'medium',
        dataType,
        dataClassification,
        age: Math.floor(age / 86400000), // days
        limit: retentionLimit,
        detectedAt: Date.now(),
        action: 'auto_delete'
      };
      
      this.violations.push(violation);
      this.metrics.violationsDetected++;
      
      await this.executeRemediation(violation);
      
      return { compliant: false, violation };
    }
    
    return { compliant: true };
  }
  
  /**
   * Check AI risk classification (EU AI Act)
   */
  async checkAIRiskCompliance(aiSystem) {
    const { systemType, purpose, dataUsed, humanOversight } = aiSystem;
    
    const riskLevels = this.complianceConfig.risk_assessment.ai_risk_levels;
    
    // Check for prohibited AI
    for (const example of riskLevels.unacceptable.examples) {
      if (purpose.includes(example) || systemType.includes(example)) {
        const violation = {
          id: randomUUID(),
          type: 'prohibited_ai_system',
          severity: 'critical',
          systemType,
          purpose,
          detectedAt: Date.now(),
          regulation: 'EU AI Act',
          action: 'immediate_shutdown',
          penalty: '35M EUR or 7% global revenue'
        };
        
        this.violations.push(violation);
        this.metrics.violationsDetected++;
        
        await this.executeRemediation(violation);
        
        return { compliant: false, violation };
      }
    }
    
    // Check high-risk AI requirements
    const isHighRisk = riskLevels.high.examples.some(ex => 
      purpose.includes(ex) || systemType.includes(ex)
    );
    
    if (isHighRisk) {
      // Verify compliance requirements
      const requirements = this.complianceConfig.regions.european_union.primary_regulations
        .find(r => r.name === 'EU AI Act')
        .requirements.risk_classification.high_risk;
      
      const missing = [];
      
      if (!humanOversight) missing.push('human_oversight');
      if (!aiSystem.conformityAssessment) missing.push('conformity_assessment');
      if (!aiSystem.riskManagementSystem) missing.push('risk_management_system');
      
      if (missing.length > 0) {
        const violation = {
          id: randomUUID(),
          type: 'high_risk_ai_non_compliance',
          severity: 'high',
          systemType,
          missingRequirements: missing,
          detectedAt: Date.now(),
          regulation: 'EU AI Act',
          action: 'suspend_system',
          penalty: '15M EUR or 3% global revenue'
        };
        
        this.violations.push(violation);
        this.metrics.violationsDetected++;
        
        return { compliant: false, violation };
      }
    }
    
    return { compliant: true, riskLevel: isHighRisk ? 'high' : 'low' };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // REMEDIATION
  // ═══════════════════════════════════════════════════════════════
  
  async executeRemediation(violation) {
    console.log(`[ComplianceWatcher] Executing remediation for violation ${violation.id}`);
    
    const remediation = {
      id: randomUUID(),
      violationId: violation.id,
      action: violation.action,
      startedAt: Date.now(),
      completedAt: null,
      success: false
    };
    
    try {
      switch (violation.action) {
        case 'reject_transfer':
          await this.rejectDataTransfer(violation);
          break;
          
        case 'block_operation':
          await this.blockOperation(violation);
          break;
          
        case 'auto_delete':
          await this.autoDeleteData(violation);
          break;
          
        case 'immediate_shutdown':
          await this.shutdownSystem(violation);
          break;
          
        case 'suspend_system':
          await this.suspendSystem(violation);
          break;
          
        case 'notify_user':
          await this.notifyUser(violation);
          break;
          
        case 'block_and_alert_admin':
          await this.blockAndAlertAdmin(violation);
          break;
          
        default:
          console.warn(`[ComplianceWatcher] Unknown remediation action: ${violation.action}`);
      }
      
      remediation.success = true;
      remediation.completedAt = Date.now();
      
      this.remediations.push(remediation);
      this.metrics.remediationsExecuted++;
      
      // Update success rate
      const successfulRemediations = this.remediations.filter(r => r.success).length;
      this.metrics.autoRemediationSuccessRate = successfulRemediations / this.remediations.length;
      
      this.emit('remediation:completed', remediation);
      
      console.log(`[ComplianceWatcher] Remediation completed successfully`);
      
    } catch (error) {
      remediation.error = error.message;
      remediation.completedAt = Date.now();
      
      this.remediations.push(remediation);
      
      console.error('[ComplianceWatcher] Remediation failed:', error.message);
      
      this.emit('remediation:failed', { remediation, error });
    }
  }
  
  async rejectDataTransfer(violation) {
    // Block the transfer at network level
    console.log(`[ComplianceWatcher] Rejecting data transfer from ${violation.sourceRegion} to ${violation.targetRegion}`);
    // In production: Update firewall rules, network policies
  }
  
  async blockOperation(violation) {
    console.log(`[ComplianceWatcher] Blocking operation for user ${violation.userId}`);
    // In production: Revoke temporary access, return error to user
  }
  
  async autoDeleteData(violation) {
    console.log(`[ComplianceWatcher] Auto-deleting expired data: ${violation.dataType}`);
    // In production: Schedule deletion job, backup to archive, notify stakeholders
  }
  
  async shutdownSystem(violation) {
    console.log(`[ComplianceWatcher] CRITICAL: Shutting down prohibited AI system`);
    // In production: Kill process, alert executives, document incident
    this.emit('critical:prohibited_ai', violation);
  }
  
  async suspendSystem(violation) {
    console.log(`[ComplianceWatcher] Suspending non-compliant AI system`);
    // In production: Graceful shutdown, preserve state, alert compliance team
  }
  
  async notifyUser(violation) {
    console.log(`[ComplianceWatcher] Notifying user about ${violation.type}`);
    // In production: Send email/SMS, in-app notification
  }
  
  async blockAndAlertAdmin(violation) {
    console.log(`[ComplianceWatcher] Blocking and alerting admin for ${violation.type}`);
    // In production: Block request, send PagerDuty alert, log to SIEM
  }
  
  // ═══════════════════════════════════════════════════════════════
  // PERIODIC AUDITS
  // ═══════════════════════════════════════════════════════════════
  
  startPeriodicAudits() {
    // Daily retention check
    this.retentionAudit = setInterval(() => this.auditRetentionPolicies(), 86400000);
    
    // Weekly access review
    this.accessAudit = setInterval(() => this.auditAccessControls(), 604800000);
    
    // Monthly compliance score calculation
    this.scoreAudit = setInterval(() => this.calculateComplianceScores(), 2592000000);
    
    console.log('[ComplianceWatcher] Periodic audits scheduled');
  }
  
  async auditRetentionPolicies() {
    console.log('[ComplianceWatcher] Auditing data retention policies');
    
    // In production: Query database for all records, check ages
    // For now: simulate
    const expiredRecords = []; // Populate from database
    
    for (const record of expiredRecords) {
      await this.checkRetentionCompliance(record);
    }
    
    console.log(`[ComplianceWatcher] Retention audit complete: ${expiredRecords.length} records processed`);
  }
  
  async auditAccessControls() {
    console.log('[ComplianceWatcher] Auditing access controls');
    
    // In production: Review access logs, check for anomalies, verify least privilege
    const accessViolations = []; // Detect from logs
    
    for (const violation of accessViolations) {
      this.violations.push(violation);
      await this.executeRemediation(violation);
    }
    
    console.log(`[ComplianceWatcher] Access audit complete: ${accessViolations.length} violations found`);
  }
  
  async calculateComplianceScores() {
    console.log('[ComplianceWatcher] Calculating compliance scores');
    
    for (const [region, _] of this.complianceScores) {
      const recentViolations = this.violations.filter(v => 
        v.sourceRegion === region &&
        Date.now() - v.detectedAt < 2592000000 // Last 30 days
      );
      
      // Score formula
      let score = 100;
      
      for (const violation of recentViolations) {
        const penalty = {
          'critical': -10,
          'high': -5,
          'medium': -2,
          'low': -1
        }[violation.severity] || 0;
        
        score += penalty;
      }
      
      score = Math.max(0, score); // Floor at 0
      
      this.complianceScores.set(region, score);
      this.lastAudit.set(region, Date.now());
      
      console.log(`[ComplianceWatcher] ${region} compliance score: ${score}`);
      
      if (score < 70) {
        this.emit('compliance:low_score', { region, score, violations: recentViolations });
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // REGULATORY UPDATES
  // ═══════════════════════════════════════════════════════════════
  
  startPolicyUpdateMonitoring() {
    // Check for regulatory updates weekly
    this.policyUpdateCheck = setInterval(() => this.checkRegulatoryUpdates(), 604800000);
    
    console.log('[ComplianceWatcher] Policy update monitoring started');
  }
  
  async checkRegulatoryUpdates() {
    console.log('[ComplianceWatcher] Checking for regulatory updates');
    
    // In production: Scrape regulatory websites, RSS feeds, API integrations
    // For now: simulate
    const updates = []; // Fetch from external sources
    
    for (const update of updates) {
      this.emit('regulatory:update_detected', update);
      console.log(`[ComplianceWatcher] New regulation detected: ${update.name}`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════
  
  getApplicableRegulation(region) {
    const regionConfig = this.complianceConfig.regions[region];
    if (!regionConfig) return 'Unknown';
    
    return regionConfig.primary_regulations?.[0]?.name || 'General';
  }
  
  getRetentionLimit(dataClassification) {
    const categories = this.complianceConfig.automatic_enforcement.data_classification.categories;
    const category = categories.find(c => 
      c.abbrev === dataClassification || c.name === dataClassification
    );
    
    return category?.retention_limit_days || null;
  }
  
  async getConsent(userId, purpose) {
    // In production: Query consent database
    // For now: simulate
    return {
      userId,
      purpose,
      granted: true,
      grantedAt: Date.now() - 86400000 * 30 // 30 days ago
    };
  }
  
  processCheckQueue() {
    // Process queued compliance checks
    // In production: Drain queue and execute checks
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      activeViolations: this.violations.filter(v => 
        Date.now() - v.detectedAt < 86400000 // Last 24h
      ).length,
      totalViolations: this.violations.length,
      complianceScores: Object.fromEntries(this.complianceScores),
      lastAudit: Object.fromEntries(this.lastAudit)
    };
  }
  
  getViolations(filter = {}) {
    let filtered = this.violations;
    
    if (filter.severity) {
      filtered = filtered.filter(v => v.severity === filter.severity);
    }
    
    if (filter.type) {
      filtered = filtered.filter(v => v.type === filter.type);
    }
    
    if (filter.region) {
      filtered = filtered.filter(v => v.sourceRegion === filter.region);
    }
    
    if (filter.since) {
      filtered = filtered.filter(v => v.detectedAt >= filter.since);
    }
    
    return filtered.sort((a, b) => b.detectedAt - a.detectedAt);
  }
  
  async shutdown() {
    console.log('[ComplianceWatcher] Shutting down compliance watcher');
    
    this.monitoringActive = false;
    
    clearInterval(this.checkInterval);
    clearInterval(this.retentionAudit);
    clearInterval(this.accessAudit);
    clearInterval(this.scoreAudit);
    clearInterval(this.policyUpdateCheck);
    
    // Generate final compliance report
    const report = this.generateComplianceReport();
    await fs.writeFile('./compliance_report_final.json', JSON.stringify(report, null, 2));
    
    this.emit('watcher:shutdown');
  }
  
  generateComplianceReport() {
    return {
      watcherId: this.watcherId,
      generatedAt: Date.now(),
      period: {
        start: this.violations[0]?.detectedAt || Date.now(),
        end: Date.now()
      },
      metrics: this.getMetrics(),
      violations: this.violations,
      remediations: this.remediations,
      complianceScores: Object.fromEntries(this.complianceScores)
    };
  }
}

export default ComplianceWatcher;
