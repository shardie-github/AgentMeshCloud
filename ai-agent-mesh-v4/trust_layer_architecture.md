# Trust Layer Architecture
## Decentralized Verification & Reputation System

**Version:** 1.0.0  
**Status:** Production  
**Last Updated:** October 30, 2025

---

## Executive Summary

The Trust Layer provides cryptographic verification, reputation management, and behavioral analysis for the AI-Agent Mesh Network. Built on W3C standards (DIDs, Verifiable Credentials) and enhanced with blockchain anchoring, it enables **zero-trust federation** where every interaction is verified, scored, and permanently recorded.

**Core Capabilities:**
- Sub-10ms credential verification
- Multi-factor trust scoring (0-100 scale)
- Real-time reputation tracking with stake-based incentives
- Automatic violation detection and penalty enforcement
- Blockchain-anchored audit trail (Avalanche/Polygon)

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Trust Layer                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Trust Engine  │  │   Identity   │  │   Trust Graph    │   │
│  │               │  │   Resolver   │  │                  │   │
│  │ • Scoring     │◄─┤ • DID Lookup │  │ • Relationships  │   │
│  │ • Verification│  │ • VC Storage │  │ • Interactions   │   │
│  │ • Attestation │  │ • Revocation │  │ • Violations     │   │
│  └───────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│          │                  │                    │             │
│          └──────────────────┼────────────────────┘             │
│                             │                                  │
│                    ┌────────▼─────────┐                        │
│                    │  Blockchain      │                        │
│                    │  Adapter         │                        │
│                    │                  │                        │
│                    │ • Stake Mgmt     │                        │
│                    │ • Attestation    │                        │
│                    │ • Audit Log      │                        │
│                    └──────────────────┘                        │
│                             │                                  │
└─────────────────────────────┼──────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Avalanche SubNet  │
                    │  / Polygon CDK     │
                    └────────────────────┘
```

### 1.2 Data Flow

**Credential Verification Flow:**
```
1. Agent → Trust Engine: Verify Credential
2. Trust Engine → Identity Resolver: Resolve Issuer DID
3. Identity Resolver → Trust Engine: Issuer Public Key
4. Trust Engine: Verify Cryptographic Proof
5. Trust Engine → Revocation Registry: Check Status
6. Trust Engine → Agent: Verification Result (valid/invalid)
```

**Trust Score Computation Flow:**
```
1. Federation Hub → Trust Engine: Get Trust Score(meshId)
2. Trust Engine: Compute Components
   ├─ Credential Validity (30%)
   ├─ Historical Behavior (25%)
   ├─ Peer Attestations (20%)
   ├─ Compliance Status (15%)
   └─ Uptime Reliability (10%)
3. Trust Engine: Weighted Sum → Score (0-100)
4. Trust Engine → Cache: Store Result (1hr TTL)
5. Trust Engine → Federation Hub: Return Score
```

---

## 2. Trust Scoring Model

### 2.1 Multi-Factor Scoring Algorithm

**Formula:**
```
TrustScore = Σ (Component_i × Weight_i)

Where:
  Component_1 = CredentialValidity     (Weight = 0.30)
  Component_2 = HistoricalBehavior     (Weight = 0.25)
  Component_3 = PeerAttestations       (Weight = 0.20)
  Component_4 = ComplianceStatus       (Weight = 0.15)
  Component_5 = UptimeReliability      (Weight = 0.10)
```

### 2.2 Component Calculations

#### 2.2.1 Credential Validity (30%)

```javascript
CredentialScore = (AgeScore + TrustLevel) / 2

AgeScore = max(0, 100 - (credentialAge / maxAge × 50))
TrustLevel = credential.credentialSubject.trustLevel (0-100)
```

**Rationale:**
- Fresher credentials indicate active maintenance
- Trust level from issuer reflects initial verification depth
- Combined score prevents gaming via old high-trust credentials

#### 2.2.2 Historical Behavior (25%)

```javascript
HistoryScore = SuccessRate × 100 - ViolationPenalty

SuccessRate = successfulInteractions / totalInteractions
ViolationPenalty = min(50, violations × 10)
```

**Violation Severity:**
| Type | Penalty | Recovery Time |
|------|---------|---------------|
| Policy Breach | -40 | 30 days |
| Credential Forgery | -100 | Permanent ban |
| Malicious Behavior | -80 | 90 days |
| Uptime Failure | -10 | 7 days |
| Compliance Breach | -60 | 60 days |

#### 2.2.3 Peer Attestations (20%)

```javascript
AttestationScore = Σ(attestation_i.score × attester_i.trustScore) / Σ(attester_i.trustScore)
```

**Attestation Weight:**
- Attester with TrustScore 90+: Full weight
- Attester with TrustScore 50-89: 0.5× weight
- Attester with TrustScore <50: Ignored

**Minimum Attestations:**
- Basic (25-49): 1 attestation
- Validated (50-74): 3 attestations
- Certified (75-89): 5 attestations
- Audited (90-100): 10 attestations

#### 2.2.4 Compliance Status (15%)

```javascript
ComplianceScore = Σ CertificationValue_i

Certification Values:
  GDPR:      20 points
  SOC2:      20 points
  ISO27001:  15 points
  ISO42001:  15 points
  CCPA:      10 points
  PIPEDA:    10 points
  HIPAA:     10 points
  Custom:    5 points
```

**Cap:** 100 points (multiple certifications encouraged)

#### 2.2.5 Uptime Reliability (10%)

```javascript
UptimeScore = f(uptimePercentage)

Where f(x) = 
  100,  if x ≥ 99.9%
  90,   if x ≥ 99.0%
  70,   if x ≥ 95.0%
  50,   if x ≥ 90.0%
  max(0, x - 50), otherwise
```

### 2.3 Trust Levels

| Level | Range | Access | Requirements |
|-------|-------|--------|--------------|
| **Unverified** | 0-24 | Restricted | Valid DID, no credentials |
| **Basic** | 25-49 | Limited | 1 VC, 1 attestation, 100 MESH stake |
| **Validated** | 50-74 | Standard | 1+ compliance cert, 3 attestations, 1000 MESH |
| **Certified** | 75-89 | Enhanced | SOC2/ISO27001, 5 attestations, 5000 MESH |
| **Audited** | 90-100 | Full | Independent audit, 10+ attestations, 10000 MESH |

---

## 3. Verifiable Credentials

### 3.1 Credential Schema

**Base Credential Structure (W3C VC 2.0):**
```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://mesh.global/contexts/v1"
  ],
  "type": ["VerifiableCredential", "MeshAgentCredential"],
  "issuer": "did:mesh:authority:foundation",
  "issuanceDate": "2025-10-30T00:00:00Z",
  "expirationDate": "2026-10-30T00:00:00Z",
  "credentialSubject": {
    "id": "did:mesh:enterprise:acme-001",
    "meshCapabilities": ["ml.inference", "data.processing"],
    "complianceCertifications": ["GDPR", "SOC2"],
    "trustLevel": 85,
    "organizationType": "enterprise",
    "jurisdiction": ["US", "EU"]
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2025-10-30T00:00:00Z",
    "verificationMethod": "did:mesh:authority:foundation#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z58DAdFfa9SkqZMsuN1ob..."
  }
}
```

### 3.2 Verification Process

**Steps:**
1. **Structure Validation**: Check required fields per W3C spec
2. **Expiration Check**: Ensure `expirationDate > now()`
3. **Issuer Verification**: Resolve issuer DID, confirm trust authority status
4. **Proof Verification**: Verify Ed25519 signature against issuer's public key
5. **Revocation Check**: Query revocation registry (accumulator-based)
6. **Cache**: Store verified credential (1hr TTL)

**Performance Targets:**
- Structure validation: <1ms
- DID resolution: <5ms (cached)
- Cryptographic verification: <3ms
- Revocation check: <1ms (Bloom filter)
- **Total: <10ms p95**

### 3.3 Revocation Registry

**Accumulator-Based Design:**
- **Type**: Merkle tree accumulator
- **Update Frequency**: Real-time
- **Proof Size**: O(log n)
- **Verification**: O(1) with Bloom filter cache

**Revocation Reasons:**
| Code | Description | Auto-Revoke | Grace Period |
|------|-------------|-------------|--------------|
| `compromised` | Private key leaked | Yes | None |
| `policy-violation` | Trust policy breach | Yes | 7 days appeal |
| `expired` | Credential expired | Auto | 30 days renewal |
| `superseded` | Replaced by newer | No | 90 days overlap |

---

## 4. Trust Graph

### 4.1 Graph Structure

**Nodes:**
```typescript
interface TrustNode {
  meshId: string;              // DID
  type: NodeType;              // enterprise | academic | public-good | infrastructure
  trustScore: number;          // 0-100
  trustLevel: TrustLevel;
  region: string;
  activeConnections: number;
  totalInteractions: number;
  successRate: number;
  violations: number;
  uptimePercentage: number;
  stake: string;               // In MESH tokens
  certifications: string[];
  joinedAt: timestamp;
  lastActive: timestamp;
}
```

**Edges:**
```typescript
interface TrustEdge {
  from: string;                 // Source mesh DID
  to: string;                   // Target mesh DID
  weight: number;               // 0-1 (trust strength)
  trustType: EdgeType;          // bidirectional | vendor-client | infrastructure
  interactions: number;
  successfulInteractions: number;
  violations: number;
  lastInteraction: timestamp;
  establishedAt: timestamp;
  stake: string;                // Escrowed for relationship
  purpose: string;
  metadata: object;
}
```

### 4.2 Graph Analytics

**Network Metrics:**
```
Density = 2 × |E| / (|V| × (|V| - 1))
  Current: 0.15 (healthy sparsity)

Clustering Coefficient = 3 × triangles / connected_triples
  Current: 0.42 (strong local clustering)

Average Path Length = Σ shortest_path(u,v) / (|V| × (|V| - 1))
  Current: 3.2 hops (efficient routing)
```

**Centrality Analysis:**
```sql
-- PageRank (influence)
SELECT meshId, pagerank_score
FROM trust_graph_pagerank
ORDER BY pagerank_score DESC
LIMIT 10;

-- Betweenness (bridge nodes)
SELECT meshId, betweenness_centrality
FROM trust_graph_betweenness
WHERE betweenness_centrality > 0.1;
```

### 4.3 Anomaly Detection

**Sybil Attack Detection:**
```python
def detect_sybil_cluster(graph, threshold=0.8):
    """
    Detect suspicious clusters of new nodes with high mutual trust
    """
    recent_nodes = [n for n in graph.nodes if n.age < 30 days]
    
    for cluster in find_connected_components(recent_nodes):
        if len(cluster) > 5:
            avg_internal_trust = mean([edge.weight for edge in cluster.internal_edges])
            avg_external_trust = mean([edge.weight for edge in cluster.external_edges])
            
            if avg_internal_trust > threshold and avg_external_trust < 0.3:
                flag_for_review(cluster, reason="potential_sybil")
```

**Reputation Farming Detection:**
```python
def detect_reputation_farming(meshId):
    """
    Identify suspicious patterns of reciprocal attestations
    """
    attestations_given = get_attestations_from(meshId)
    attestations_received = get_attestations_to(meshId)
    
    reciprocal_count = count_reciprocal_attestations(
        attestations_given, attestations_received
    )
    
    if reciprocal_count / len(attestations_received) > 0.7:
        flag_for_review(meshId, reason="reciprocal_attestation_farming")
```

---

## 5. Stake-Based Incentives

### 5.1 Staking Requirements

| Participation Level | Stake Required | Benefits |
|---------------------|----------------|----------|
| Observer | 0 MESH | Read-only access |
| Basic Participant | 100 MESH | Limited federations |
| Validated Participant | 1,000 MESH | Standard access |
| Certified Provider | 5,000 MESH | Enhanced SLAs |
| Infrastructure Hub | 10,000 MESH | Relay operations |
| Trust Authority | 50,000 MESH | Credential issuance |

### 5.2 Slashing Conditions

**Automatic Slashing:**
```javascript
slashAmount = violation.severity × STAKE_SLASHING_MULTIPLIER

STAKE_SLASHING_MULTIPLIER = 0.1  // 10% of stake per violation point

Examples:
  Policy Breach (severity: 40)    → 4% stake slashed
  Malicious Behavior (severity: 80) → 8% stake slashed
  Credential Forgery (severity: 100) → 10% stake slashed + ban
```

**Slashed Funds Distribution:**
- 50% → Treasury (governance operations)
- 30% → Affected parties (compensation)
- 20% → Burned (deflationary mechanism)

### 5.3 Staking Rewards

**Uptime Rewards:**
```
Annual Yield = base_rate × uptime_multiplier

base_rate = 5% APY
uptime_multiplier = 
  1.0,  if uptime ≥ 99.9%
  0.5,  if uptime ≥ 99.0%
  0.0,  if uptime < 99.0%
```

**Attestation Rewards:**
- Issuing valid attestation: 10 MESH
- Attestation proven accurate (1 year): 50 MESH bonus
- Fraudulent attestation: Slash 500 MESH

---

## 6. Blockchain Integration

### 6.1 Architecture

**Hybrid Design:**
- **Off-Chain**: Real-time trust scoring, graph updates
- **On-Chain**: Stake management, attestations, audit log
- **Bridge**: Periodic state anchoring (Merkle roots)

**Benefits:**
- **Performance**: Sub-second trust queries
- **Cost**: Only critical transactions on-chain
- **Auditability**: Cryptographic proof of history
- **Scalability**: Sharded state per region

### 6.2 Smart Contract Interface

**Trust Stake Contract:**
```solidity
interface ITrustStake {
    function stake(address meshAddress, uint256 amount) external;
    function unstake(address meshAddress, uint256 amount) external;
    function slash(address meshAddress, uint256 amount, string reason) external;
    function getStake(address meshAddress) external view returns (uint256);
    function claimRewards(address meshAddress) external;
}
```

**Attestation Registry Contract:**
```solidity
interface IAttestationRegistry {
    function recordAttestation(
        address attester,
        address target,
        uint8 score,
        bytes32 evidenceHash
    ) external returns (bytes32 attestationId);
    
    function revokeAttestation(bytes32 attestationId) external;
    function getAttestations(address target) external view returns (Attestation[] memory);
}
```

**Trust Anchor Contract:**
```solidity
interface ITrustAnchor {
    function anchorTrustGraph(bytes32 merkleRoot, uint256 timestamp) external;
    function verifyTrustProof(bytes32[] proof, bytes32 leaf) external view returns (bool);
}
```

### 6.3 Supported Networks

| Network | Purpose | Finality | Cost |
|---------|---------|----------|------|
| **Avalanche C-Chain** | Production staking | 2s | Low |
| **Avalanche SubNet** | Mesh-specific operations | 1s | Very Low |
| **Polygon CDK** | High-throughput attestations | 2s | Very Low |
| **Ethereum Mainnet** | Final audit anchoring | 15min | High |

---

## 7. Privacy & Compliance

### 7.1 Privacy-Preserving Techniques

**Zero-Knowledge Proofs:**
```
Prove: "My trust score is ≥ 75" 
Without revealing: Actual score, components, identity

Implementation: zk-SNARKs (Circom + SnarkJS)
Proof size: 200 bytes
Verification time: <5ms
```

**Selective Disclosure:**
```json
{
  "disclosedAttributes": ["trustLevel", "region"],
  "hiddenAttributes": ["organization", "specificScore"],
  "proof": "zk-proof-here"
}
```

### 7.2 GDPR Compliance

**Right to Erasure:**
- Trust scores: Aggregated, not deleted (legitimate interest)
- Identifiable data: Removed from off-chain stores
- On-chain data: Addresses only (pseudonymous)
- Grace period: 30 days for appeals

**Data Minimization:**
- Store only trust-relevant data
- No PII in public trust graph
- Encrypted metadata for sensitive contexts

---

## 8. Performance & Scalability

### 8.1 Current Benchmarks

| Operation | Target | Current | Method |
|-----------|--------|---------|--------|
| Credential Verification | <10ms | 8ms | P95 |
| Trust Score Query (cached) | <5ms | 3ms | P95 |
| Trust Score Compute | <1s | 0.7s | P95 |
| Attestation Issuance | <100ms | 87ms | P95 |
| Graph Query (1-hop) | <10ms | 6ms | P95 |
| Graph Query (2-hop) | <50ms | 42ms | P95 |

### 8.2 Scaling Strategy

**Horizontal Scaling:**
- **Trust Engine**: Stateless, replicate per region
- **Graph Store**: Sharded by region (US-EAST, EU-CENTRAL, APAC)
- **Credential Cache**: Redis cluster (99.9% cache hit rate)

**Optimization Techniques:**
- **Bloom Filters**: Revocation checks (false positive: 0.01%)
- **Merkle Proofs**: O(log n) verification
- **Batch Processing**: Aggregate trust updates every 5 minutes
- **CDN**: Distribute trust graph snapshots globally

**Capacity Targets:**
- Concurrent verifications: 10,000 req/s
- Trust graph size: 1M nodes, 10M edges
- Attestations: 100K issuances/day

---

## 9. Security Considerations

### 9.1 Threat Model

**Protected Against:**
✅ Sybil attacks (stake requirement + graph analysis)  
✅ Credential forgery (cryptographic verification)  
✅ Reputation manipulation (multi-factor scoring)  
✅ Replay attacks (nonce + timestamp)  
✅ Eclipse attacks (decentralized hubs)  

**Residual Risks:**
⚠️ State-level adversaries (quantum computing)  
⚠️ Social engineering (human trust decisions)  
⚠️ Novel attack vectors (ongoing research)  

### 9.2 Cryptographic Standards

- **Signatures**: Ed25519 (128-bit security)
- **Hashing**: SHA-256, Blake3
- **Key Derivation**: HKDF-SHA256
- **Post-Quantum**: Transition plan to CRYSTALS-Dilithium (2026)

---

## 10. Governance & Evolution

### 10.1 Trust Parameter Governance

**Adjustable Parameters (DAO vote required):**
- Component weights (credential: 30%, history: 25%, etc.)
- Trust level thresholds (certified: 75+, audited: 90+)
- Violation penalties (policy breach: -40, etc.)
- Stake requirements (basic: 100 MESH, certified: 5000 MESH)

**Parameter Update Process:**
1. Proposal (7-day discussion)
2. Simulation (impact analysis on test network)
3. Vote (60% quorum, 75% approval)
4. Staged rollout (10% → 50% → 100% over 30 days)

### 10.2 Emergency Response

**Critical Vulnerability:**
1. Core Maintainers implement patch
2. Notify all participants (email + in-app)
3. 72-hour retroactive DAO approval
4. Automatic rollback if disapproved

**Trust Authority Compromise:**
1. Immediate revocation of authority credentials
2. Notify affected participants
3. Emergency DAO vote for replacement authority
4. Re-issuance of affected credentials

---

## 11. Future Roadmap

### Phase IV (Current - Q4 2025)
✅ Trust Engine v1.0  
✅ Multi-factor scoring  
✅ Blockchain anchoring  
✅ Stake-based incentives  

### Phase V (Q1-Q2 2026)
🔄 Machine learning-based anomaly detection  
🔄 Zero-knowledge selective disclosure  
🔄 Cross-chain trust bridges  
🔄 Automated trust parameter optimization  

### Phase VI (Q3-Q4 2026)
🔮 Quantum-resistant cryptography  
🔮 AI-audited trust scoring  
🔮 Decentralized oracle integration  
🔮 Predictive trust modeling  

---

## Appendices

### A. References

- W3C Decentralized Identifiers (DIDs) v1.0
- W3C Verifiable Credentials Data Model 2.0
- DIF Presentation Exchange 2.0
- IEEE P7009 (Fail-Safe Design for AI)
- ISO/IEC 42001 (AI Management System)

### B. Open Source Components

- **DID Resolver**: `did-resolver` (Apache 2.0)
- **VC Library**: `@digitalbazaar/vc` (BSD-3-Clause)
- **Graph DB**: Neo4j Community (GPLv3)
- **ZK Library**: SnarkJS (GPLv3)

---

**Document Maintainer:** AI-Agent Mesh Foundation  
**Security Contact:** security@mesh.global  
**Last Security Audit:** October 2025 by Trail of Bits
