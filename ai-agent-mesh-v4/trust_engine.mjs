/**
 * Trust Engine - Verifiable Agent Credential System
 * 
 * Purpose: Cryptographic trust scoring, reputation management, and credential verification
 * Standards: W3C Verifiable Credentials, DIF Presentation Exchange, Zero-Knowledge Proofs
 * 
 * Trust Scoring Model:
 * TrustScore = 0.30×Credentials + 0.25×History + 0.20×Attestations + 0.15×Compliance + 0.10×Uptime
 * 
 * KPIs:
 * - Credential verification: <10ms
 * - Trust score update: <1s
 * - Reputation query: <5ms
 * - False positive rate: <0.01%
 */

import { createHash, createVerify, randomBytes } from 'crypto';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════
// TRUST LEVELS & CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const TrustLevel = {
  UNVERIFIED: { min: 0, max: 24, label: 'Unverified', access: 'restricted' },
  BASIC: { min: 25, max: 49, label: 'Basic', access: 'limited' },
  VALIDATED: { min: 50, max: 74, label: 'Validated', access: 'standard' },
  CERTIFIED: { min: 75, max: 89, label: 'Certified', access: 'enhanced' },
  AUDITED: { min: 90, max: 100, label: 'Audited', access: 'full' }
};

export const ViolationType = {
  POLICY_BREACH: { severity: 40, label: 'Policy Violation' },
  CREDENTIAL_FORGERY: { severity: 100, label: 'Credential Forgery' },
  MALICIOUS_BEHAVIOR: { severity: 80, label: 'Malicious Behavior' },
  UPTIME_FAILURE: { severity: 10, label: 'Uptime Failure' },
  COMPLIANCE_BREACH: { severity: 60, label: 'Compliance Breach' }
};

export const TRUST_DECAY_RATE = 0.001; // 0.1% per day for inactive participants
export const TRUST_RECOVERY_RATE = 0.01; // 1% per day for good behavior
export const MIN_ATTESTATIONS_FOR_CERTIFIED = 5;
export const STAKE_SLASHING_MULTIPLIER = 0.1; // 10% stake slash per violation point

// ═══════════════════════════════════════════════════════════════
// TRUST ENGINE
// ═══════════════════════════════════════════════════════════════

export class TrustEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = config;
    this.identityResolver = config.identityResolver;
    this.trustGraph = config.trustGraph || new Map();
    this.credentialStore = new Map();
    this.reputationCache = new Map();
    this.attestationRegistry = new Map();
    
    // Blockchain stub for trust anchoring
    this.blockchainAdapter = config.blockchainAdapter;
    
    // Trust computation weights
    this.weights = {
      credentials: 0.30,
      history: 0.25,
      attestations: 0.20,
      compliance: 0.15,
      uptime: 0.10
    };
    
    this.metrics = {
      verificationsPerformed: 0,
      trustScoresComputed: 0,
      violationsDetected: 0,
      attestationsIssued: 0,
      avgVerificationTime: 0
    };
    
    this.initializeEngine();
  }
  
  initializeEngine() {
    console.log('[TrustEngine] Initializing trust scoring engine');
    
    // Start trust decay timer
    this.decayTimer = setInterval(() => this.applyTrustDecay(), 86400000); // 24 hours
    
    // Start reputation refresh
    this.refreshTimer = setInterval(() => this.refreshReputationCache(), 3600000); // 1 hour
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CREDENTIAL VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Verify Verifiable Credential (VC) according to W3C spec
   */
  async verifyCredentials(credential, publicKey) {
    const startTime = Date.now();
    
    try {
      // Step 1: Validate credential structure
      if (!this.validateCredentialStructure(credential)) {
        throw new Error('Invalid credential structure');
      }
      
      // Step 2: Check expiration
      if (credential.expirationDate) {
        const expiry = new Date(credential.expirationDate);
        if (expiry < new Date()) {
          throw new Error('Credential expired');
        }
      }
      
      // Step 3: Verify issuer is trusted
      const issuerTrusted = await this.verifyIssuer(credential.issuer);
      if (!issuerTrusted) {
        throw new Error('Untrusted issuer');
      }
      
      // Step 4: Verify cryptographic proof
      const proofValid = await this.verifyProof(credential, publicKey);
      if (!proofValid) {
        throw new Error('Invalid credential proof');
      }
      
      // Step 5: Check revocation status
      const revoked = await this.checkRevocation(credential.id);
      if (revoked) {
        throw new Error('Credential revoked');
      }
      
      // Cache verified credential
      this.credentialStore.set(credential.credentialSubject.id, {
        credential,
        verifiedAt: Date.now(),
        verifiedBy: this.config.engineId
      });
      
      this.metrics.verificationsPerformed++;
      
      const duration = Date.now() - startTime;
      this.metrics.avgVerificationTime = 
        (this.metrics.avgVerificationTime * 0.9) + (duration * 0.1);
      
      console.log(`[TrustEngine] Credential verified for ${credential.credentialSubject.id} (${duration}ms)`);
      
      return true;
      
    } catch (error) {
      console.error('[TrustEngine] Credential verification failed:', error.message);
      return false;
    }
  }
  
  validateCredentialStructure(credential) {
    return (
      credential &&
      credential['@context'] &&
      credential.type &&
      credential.issuer &&
      credential.credentialSubject &&
      credential.proof
    );
  }
  
  async verifyIssuer(issuerId) {
    // Resolve issuer DID and check trust authority status
    const issuer = await this.identityResolver.resolve(issuerId);
    return issuer && issuer.isTrustAuthority === true;
  }
  
  async verifyProof(credential, publicKey) {
    // Verify Ed25519 signature on credential
    const proof = credential.proof;
    
    if (proof.type !== 'Ed25519Signature2020') {
      console.warn('[TrustEngine] Unsupported proof type:', proof.type);
      return false;
    }
    
    // In production, verify actual cryptographic signature
    // For now, simulate verification
    return true;
  }
  
  async checkRevocation(credentialId) {
    // Query revocation registry
    // In production, check on-chain or distributed registry
    return false; // Not revoked
  }
  
  /**
   * Verify digital signature
   */
  async verifySignature(data, signature, publicKey) {
    try {
      const verify = createVerify('SHA256');
      verify.update(typeof data === 'string' ? data : JSON.stringify(data));
      verify.end();
      
      // In production, use actual crypto verification
      // Simulated for demonstration
      return true;
      
    } catch (error) {
      console.error('[TrustEngine] Signature verification failed:', error.message);
      return false;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // TRUST SCORE COMPUTATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Compute comprehensive trust score (0-100)
   */
  async getTrustScore(meshId) {
    // Check cache first
    const cached = this.reputationCache.get(meshId);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      return cached.score;
    }
    
    const startTime = Date.now();
    
    try {
      // Component 1: Credential Validity (30%)
      const credentialScore = await this.computeCredentialScore(meshId);
      
      // Component 2: Historical Behavior (25%)
      const historyScore = await this.computeHistoryScore(meshId);
      
      // Component 3: Peer Attestations (20%)
      const attestationScore = await this.computeAttestationScore(meshId);
      
      // Component 4: Compliance Status (15%)
      const complianceScore = await this.computeComplianceScore(meshId);
      
      // Component 5: Uptime Reliability (10%)
      const uptimeScore = await this.computeUptimeScore(meshId);
      
      // Weighted sum
      const trustScore = Math.round(
        credentialScore * this.weights.credentials +
        historyScore * this.weights.history +
        attestationScore * this.weights.attestations +
        complianceScore * this.weights.compliance +
        uptimeScore * this.weights.uptime
      );
      
      // Cache result
      this.reputationCache.set(meshId, {
        score: trustScore,
        timestamp: Date.now(),
        components: {
          credentials: credentialScore,
          history: historyScore,
          attestations: attestationScore,
          compliance: complianceScore,
          uptime: uptimeScore
        }
      });
      
      this.metrics.trustScoresComputed++;
      
      const duration = Date.now() - startTime;
      console.log(`[TrustEngine] Trust score computed for ${meshId}: ${trustScore} (${duration}ms)`);
      
      this.emit('trust:scored', { meshId, score: trustScore });
      
      return trustScore;
      
    } catch (error) {
      console.error('[TrustEngine] Trust score computation failed:', error.message);
      return 0; // Default to untrusted
    }
  }
  
  async computeCredentialScore(meshId) {
    const stored = this.credentialStore.get(meshId);
    
    if (!stored) return 0;
    
    const credential = stored.credential;
    const age = Date.now() - new Date(credential.issuanceDate).getTime();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
    
    // Fresher credentials score higher
    const ageScore = Math.max(0, 100 - (age / maxAge * 50));
    
    // Trust level from credential
    const trustLevel = credential.credentialSubject.trustLevel || 50;
    
    return (ageScore + trustLevel) / 2;
  }
  
  async computeHistoryScore(meshId) {
    const history = this.trustGraph.get(meshId);
    
    if (!history) return 50; // Neutral for new participants
    
    const { interactions = 0, violations = 0, successRate = 1.0 } = history;
    
    if (interactions === 0) return 50;
    
    // Score based on success rate and violation frequency
    const successScore = successRate * 100;
    const violationPenalty = Math.min(50, violations * 10);
    
    return Math.max(0, successScore - violationPenalty);
  }
  
  async computeAttestationScore(meshId) {
    const attestations = this.attestationRegistry.get(meshId) || [];
    
    if (attestations.length === 0) return 25; // Low trust without attestations
    
    // Weight attestations by attester's trust score
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const attestation of attestations) {
      const attesterScore = await this.getTrustScore(attestation.attesterId);
      weightedSum += attestation.score * (attesterScore / 100);
      totalWeight += (attesterScore / 100);
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 25;
  }
  
  async computeComplianceScore(meshId) {
    const credential = this.credentialStore.get(meshId);
    
    if (!credential) return 0;
    
    const certifications = credential.credential.credentialSubject.complianceCertifications || [];
    
    // Score based on number and quality of certifications
    const certMap = {
      'GDPR': 20,
      'SOC2': 20,
      'ISO27001': 15,
      'ISO42001': 15,
      'CCPA': 10,
      'PIPEDA': 10,
      'HIPAA': 10
    };
    
    let score = 0;
    for (const cert of certifications) {
      score += certMap[cert] || 5;
    }
    
    return Math.min(100, score);
  }
  
  async computeUptimeScore(meshId) {
    const history = this.trustGraph.get(meshId);
    
    if (!history || !history.uptime) return 50;
    
    const { uptime } = history;
    
    // Convert uptime percentage to score
    // 99.9% = 100, 95% = 50, <90% = 0
    if (uptime >= 99.9) return 100;
    if (uptime >= 99.0) return 90;
    if (uptime >= 95.0) return 70;
    if (uptime >= 90.0) return 50;
    return Math.max(0, uptime - 50);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // REPUTATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Record trust graph interaction
   */
  async recordInteraction(fromMeshId, toMeshId, outcome) {
    const key = `${fromMeshId}:${toMeshId}`;
    const existing = this.trustGraph.get(key) || {
      from: fromMeshId,
      to: toMeshId,
      interactions: 0,
      successfulInteractions: 0,
      violations: 0,
      lastInteraction: null,
      stake: 0
    };
    
    existing.interactions++;
    if (outcome.success) {
      existing.successfulInteractions++;
    }
    if (outcome.violation) {
      existing.violations++;
      this.metrics.violationsDetected++;
      await this.handleViolation(fromMeshId, outcome.violationType);
    }
    existing.lastInteraction = Date.now();
    existing.successRate = existing.successfulInteractions / existing.interactions;
    
    this.trustGraph.set(key, existing);
    
    // Invalidate reputation cache
    this.reputationCache.delete(fromMeshId);
    
    this.emit('interaction:recorded', { fromMeshId, toMeshId, outcome });
    
    console.log(`[TrustEngine] Interaction recorded: ${key} (success: ${outcome.success})`);
  }
  
  /**
   * Handle trust violation
   */
  async handleViolation(meshId, violationType) {
    const violation = ViolationType[violationType];
    
    if (!violation) {
      console.error('[TrustEngine] Unknown violation type:', violationType);
      return;
    }
    
    console.warn(`[TrustEngine] Violation detected: ${meshId} - ${violation.label} (severity: ${violation.severity})`);
    
    // Reduce trust score
    const currentScore = await this.getTrustScore(meshId);
    const penalty = violation.severity / 2; // 50% severity impact
    const newScore = Math.max(0, currentScore - penalty);
    
    // Update cache with penalty
    this.reputationCache.set(meshId, {
      score: newScore,
      timestamp: Date.now(),
      penalized: true
    });
    
    // Slash stake if applicable
    if (this.blockchainAdapter) {
      const slashAmount = violation.severity * STAKE_SLASHING_MULTIPLIER;
      await this.blockchainAdapter.slashStake(meshId, slashAmount);
    }
    
    this.emit('violation:detected', { meshId, violationType, penalty, newScore });
  }
  
  /**
   * Issue peer attestation
   */
  async issueAttestation(attesterId, targetMeshId, attestationData) {
    // Verify attester has sufficient trust to attest
    const attesterScore = await this.getTrustScore(attesterId);
    
    if (attesterScore < TrustLevel.VALIDATED.min) {
      throw new Error('Attester trust score too low to issue attestations');
    }
    
    const attestation = {
      id: `att-${randomBytes(16).toString('hex')}`,
      attesterId,
      targetMeshId,
      score: attestationData.score,
      statement: attestationData.statement,
      evidence: attestationData.evidence,
      issuedAt: Date.now(),
      signature: await this.signAttestation(attesterId, attestationData)
    };
    
    const existing = this.attestationRegistry.get(targetMeshId) || [];
    existing.push(attestation);
    this.attestationRegistry.set(targetMeshId, existing);
    
    // Invalidate reputation cache
    this.reputationCache.delete(targetMeshId);
    
    this.metrics.attestationsIssued++;
    
    this.emit('attestation:issued', attestation);
    
    console.log(`[TrustEngine] Attestation issued: ${attesterId} → ${targetMeshId} (score: ${attestationData.score})`);
    
    return attestation;
  }
  
  async signAttestation(attesterId, data) {
    // In production, sign with attester's private key
    const hash = createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    return `sig-${hash.substring(0, 32)}`;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // ROUTING EVALUATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Evaluate if message routing should be allowed
   */
  async evaluateRouting(request) {
    const { sourceMeshId, targetMeshId, federationId, messageType } = request;
    
    // Check source trust score
    const sourceScore = await this.getTrustScore(sourceMeshId);
    
    if (sourceScore < TrustLevel.BASIC.min) {
      return {
        allowed: false,
        reason: 'Source mesh trust score insufficient',
        requiredScore: TrustLevel.BASIC.min,
        actualScore: sourceScore
      };
    }
    
    // Check target trust score
    const targetScore = await this.getTrustScore(targetMeshId);
    
    if (targetScore < TrustLevel.BASIC.min) {
      return {
        allowed: false,
        reason: 'Target mesh trust score insufficient',
        requiredScore: TrustLevel.BASIC.min,
        actualScore: targetScore
      };
    }
    
    // Check historical trust between parties
    const trustEdge = this.trustGraph.get(`${sourceMeshId}:${targetMeshId}`);
    
    if (trustEdge && trustEdge.violations > 5) {
      return {
        allowed: false,
        reason: 'Too many historical violations between parties',
        violations: trustEdge.violations
      };
    }
    
    return {
      allowed: true,
      confidence: Math.min(sourceScore, targetScore) / 100
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // MAINTENANCE
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Apply time-based trust decay for inactive participants
   */
  applyTrustDecay() {
    const now = Date.now();
    const dayMs = 86400000;
    let decayed = 0;
    
    for (const [meshId, cached] of this.reputationCache.entries()) {
      const age = (now - cached.timestamp) / dayMs;
      
      if (age > 1) {
        // Apply decay
        const decayAmount = cached.score * TRUST_DECAY_RATE * age;
        cached.score = Math.max(0, cached.score - decayAmount);
        cached.timestamp = now;
        decayed++;
      }
    }
    
    if (decayed > 0) {
      console.log(`[TrustEngine] Applied trust decay to ${decayed} participants`);
    }
  }
  
  /**
   * Refresh reputation cache
   */
  refreshReputationCache() {
    const now = Date.now();
    const hourMs = 3600000;
    let refreshed = 0;
    
    for (const [meshId, cached] of this.reputationCache.entries()) {
      if (now - cached.timestamp > hourMs) {
        this.reputationCache.delete(meshId);
        refreshed++;
      }
    }
    
    if (refreshed > 0) {
      console.log(`[TrustEngine] Refreshed ${refreshed} reputation cache entries`);
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      cachedReputations: this.reputationCache.size,
      trustGraphEdges: this.trustGraph.size,
      storedCredentials: this.credentialStore.size,
      totalAttestations: Array.from(this.attestationRegistry.values())
        .reduce((sum, arr) => sum + arr.length, 0)
    };
  }
  
  /**
   * Export trust graph for analysis
   */
  exportTrustGraph() {
    const edges = [];
    
    for (const [key, edge] of this.trustGraph.entries()) {
      edges.push({
        from: edge.from,
        to: edge.to,
        weight: edge.successRate,
        interactions: edge.interactions,
        violations: edge.violations,
        lastInteraction: edge.lastInteraction,
        stake: edge.stake
      });
    }
    
    return {
      exportedAt: Date.now(),
      totalEdges: edges.length,
      edges
    };
  }
  
  async shutdown() {
    console.log('[TrustEngine] Shutting down trust engine');
    
    clearInterval(this.decayTimer);
    clearInterval(this.refreshTimer);
    
    // Optionally persist state to blockchain
    if (this.blockchainAdapter && this.config.persistOnShutdown) {
      await this.blockchainAdapter.persistTrustGraph(this.exportTrustGraph());
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// BLOCKCHAIN ADAPTER (Stub for Avalanche/Polygon)
// ═══════════════════════════════════════════════════════════════

export class BlockchainTrustAdapter {
  constructor(config = {}) {
    this.network = config.network || 'avalanche-fuji'; // Test network
    this.contractAddress = config.contractAddress;
  }
  
  async slashStake(meshId, amount) {
    console.log(`[BlockchainAdapter] Slashing ${amount} MESH from ${meshId}`);
    // In production: Execute smart contract call
    return { txHash: `0x${randomBytes(32).toString('hex')}` };
  }
  
  async persistTrustGraph(graph) {
    console.log(`[BlockchainAdapter] Persisting trust graph (${graph.totalEdges} edges)`);
    // In production: Store merkle root on-chain
    return { txHash: `0x${randomBytes(32).toString('hex')}` };
  }
  
  async recordAttestation(attestation) {
    console.log(`[BlockchainAdapter] Recording attestation ${attestation.id}`);
    // In production: Emit attestation event on-chain
    return { txHash: `0x${randomBytes(32).toString('hex')}` };
  }
}

export default TrustEngine;
