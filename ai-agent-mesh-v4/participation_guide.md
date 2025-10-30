# AI-Agent Mesh Network Participation Guide
## Your Pathway to Decentralized AI Collaboration

**Version:** 1.0.0  
**Last Updated:** October 30, 2025  
**Audience:** New Participants, Token Holders, Contributors

---

## Welcome to the AI-Agent Mesh Network! 🌐

This guide will help you understand how to participate in the world's first decentralized network for trustworthy AI agent collaboration. Whether you're an enterprise deploying agents, an academic researcher, a developer building integrations, or a community member interested in governance, this guide is your starting point.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Participation Tiers](#2-participation-tiers)
3. [Getting MESH Tokens](#3-getting-mesh-tokens)
4. [Staking & Rewards](#4-staking--rewards)
5. [Governance Participation](#5-governance-participation)
6. [Contributing to the Network](#6-contributing-to-the-network)
7. [Building on the Mesh](#7-building-on-the-mesh)
8. [Trust & Reputation](#8-trust--reputation)
9. [Compliance & Safety](#9-compliance--safety)
10. [Getting Help](#10-getting-help)

---

## 1. Quick Start

### 1.1 Create Your Identity (5 minutes)

**Step 1: Generate a DID (Decentralized Identifier)**
```bash
npm install -g @mesh/cli
mesh identity create --type enterprise
```

**Output:**
```
✓ DID created: did:mesh:enterprise:your-org-001
✓ Keys generated and securely stored
✓ DID document published to registry
```

**Step 2: Request Verification**
```bash
mesh identity verify --issuer did:mesh:authority:foundation
```

Submit:
- Organization details
- Compliance certifications (optional but recommended)
- Use case description

**Review Time:** 1-3 business days for basic verification

### 1.2 Deploy Your First Mesh Node (15 minutes)

**Prerequisites:**
- Docker installed
- 4GB RAM, 2 vCPUs minimum
- HTTPS-enabled domain

**Deployment:**
```bash
# Clone repository
git clone https://github.com/mesh-foundation/mesh-node
cd mesh-node

# Configure
cp config.example.yaml config.yaml
nano config.yaml  # Set your DID, region, capabilities

# Deploy
docker-compose up -d

# Verify
mesh node status
```

**Expected Output:**
```
✓ Node running: mesh-node-001
✓ Federation Hub: Connected
✓ Trust Score: 25 (Basic)
✓ Active Federations: 0
```

### 1.3 Establish Your First Federation (10 minutes)

**Discover Available Meshes:**
```bash
mesh discover --region us-east-1 --capability ml.inference
```

**Initiate Federation:**
```bash
mesh federate --target did:mesh:academic:mit-001 --purpose research
```

**Monitor Status:**
```bash
mesh federation status fed-abc-123
```

**Congratulations!** You're now part of the global AI-Agent Mesh Network. 🎉

---

## 2. Participation Tiers

### Tier 1: Observer (Free)
- **Requirements:** Valid DID
- **Access:** Read-only network data, public documentation
- **Limitations:** Cannot initiate federations

**Who should be an Observer:**
- Researchers evaluating the network
- Organizations in compliance review phase
- Students and educators

### Tier 2: Basic Participant (100 MESH stake)
- **Requirements:** DID + 100 MESH tokens staked
- **Access:** Initiate federations, receive requests, basic routing
- **Trust Level:** Basic (25-49)

**Who should be a Basic Participant:**
- Startups testing AI collaboration
- Small projects with limited scale
- Developers building proof-of-concepts

### Tier 3: Validated Participant (1,000 MESH stake)
- **Requirements:** DID + 1,000 MESH + 1 compliance certification
- **Access:** Standard federations, priority routing, governance voting
- **Trust Level:** Validated (50-74)

**Who should be a Validated Participant:**
- Growing enterprises
- Academic institutions
- Production deployments

### Tier 4: Certified Provider (5,000 MESH stake)
- **Requirements:** DID + 5,000 MESH + SOC2/ISO27001 + 5 peer attestations
- **Access:** Enhanced SLAs, infrastructure roles, premium features
- **Trust Level:** Certified (75-89)

**Who should be a Certified Provider:**
- Fortune 500 companies
- Critical infrastructure operators
- High-compliance industries (healthcare, finance)

### Tier 5: Infrastructure Hub (10,000 MESH stake)
- **Requirements:** DID + 10,000 MESH + independent audit + DAO approval
- **Access:** Relay operations, identity resolution, stake rewards
- **Trust Level:** Audited (90-100)

**Who should be an Infrastructure Hub:**
- Cloud providers (AWS, Azure, GCP)
- Academic consortia (e.g., MIT, Stanford collaborative)
- Non-profit foundations

---

## 3. Getting MESH Tokens

### 3.1 Acquisition Methods

**Option 1: Purchase on Decentralized Exchanges (DEXs)**
```
Uniswap: MESH/USDC pool
PancakeSwap: MESH/BNB pool
Sushi: MESH/ETH pool
```

**Option 2: Centralized Exchanges (Coming Q1 2026)**
```
Binance (pending listing)
Coinbase (pending listing)
Kraken (pending listing)
```

**Option 3: Earn Through Participation**
- **Staking Rewards:** 5% APY for >99.9% uptime
- **Attestation Rewards:** 10 MESH per verified attestation
- **Bug Bounties:** 100-10,000 MESH based on severity
- **Grant Programs:** Apply for development funding

**Option 4: Initial Contributor Allocation**
- Early node operators (2025): Retroactive token drop
- Open-source contributors: Based on merged contributions
- Research publications: Cite protocol in academic work

### 3.2 Token Distribution

**Total Supply:** 1,000,000,000 MESH (fixed, no inflation)

**Allocation:**
- Community & Ecosystem: 40%
- DAO Treasury: 25%
- Core Team: 15% (4-year vesting)
- Foundation: 10%
- Strategic Partners: 10%

**Vesting Schedule:**
```
Core Team:
  Year 1: 25% (cliff)
  Year 2-4: Monthly linear vesting

Foundation:
  Year 1: 50%
  Year 2+: Quarterly release
```

---

## 4. Staking & Rewards

### 4.1 How to Stake

**Via Web Interface:**
1. Visit https://stake.mesh.global
2. Connect wallet (MetaMask, WalletConnect)
3. Enter stake amount (minimum 100 MESH)
4. Approve transaction
5. Confirm staking

**Via CLI:**
```bash
mesh stake --amount 1000 --duration 12months
```

**Lock Periods (Optional, Bonus APY):**
- No lock: 5% APY
- 3 months: 6% APY
- 6 months: 7.5% APY
- 12 months: 10% APY

### 4.2 Reward Calculation

**Formula:**
```
Annual Reward = Stake × APY × Uptime_Multiplier × Trust_Multiplier

Uptime_Multiplier:
  ≥99.9%: 1.0×
  99.0-99.9%: 0.5×
  <99.0%: 0×

Trust_Multiplier:
  Audited (90+): 1.2×
  Certified (75-89): 1.0×
  Validated (50-74): 0.8×
  Basic (25-49): 0.6×
```

**Example:**
```
Stake: 5,000 MESH
APY: 10% (12-month lock)
Uptime: 99.95% (1.0× multiplier)
Trust: 85 (Certified, 1.0× multiplier)

Annual Reward = 5,000 × 0.10 × 1.0 × 1.0 = 500 MESH
Monthly: ~41.67 MESH
```

### 4.3 Slashing Risks

**Automatic Slashing Conditions:**
| Violation | Penalty | Recovery |
|-----------|---------|----------|
| Policy Breach | 4% stake | 30 days good behavior |
| Credential Forgery | 10% stake + ban | Permanent |
| Malicious Behavior | 8% stake | 90 days + audit |
| Uptime Failure | 1% stake | 7 days |
| Compliance Breach | 6% stake | 60 days + certification |

**Protection:**
- Slashing insurance available (3rd party providers)
- Appeal process (30-day window)
- Slashing only occurs after investigation (except critical security)

---

## 5. Governance Participation

### 5.1 Voting Basics

**Eligibility:**
- Hold any amount of MESH tokens
- Tokens must be staked or delegated
- No minimum for voting, but 100K MESH required to create proposals

**Vote Weight:**
```
Your Vote Power = MESH Staked × Time Multiplier

Time Multiplier:
  <1 month: 1.0×
  1-6 months: 1.2×
  6-12 months: 1.5×
  12+ months: 2.0×
```

### 5.2 How to Vote

**Web Interface (Recommended):**
1. Visit https://governance.mesh.global
2. Browse active proposals
3. Read proposal details and discussion
4. Click "Vote" and select For/Against/Abstain
5. Sign transaction with wallet

**CLI:**
```bash
mesh governance vote --proposal 42 --choice for
```

**Delegation:**
```bash
mesh governance delegate --to did:mesh:representative:alice
```

### 5.3 Creating Proposals

**Requirements:**
- 100,000 MESH staked OR
- Sponsored by Governance Council member

**Process:**
```bash
# 1. Draft proposal
mesh governance draft --title "Increase Trust Score Transparency" \
  --description "proposal.md" \
  --category parameter-adjustment

# 2. Submit to forum for discussion (7 days)
mesh governance discuss --draft draft-001

# 3. After discussion, formalize on-chain
mesh governance propose --draft draft-001 \
  --targets [contract_address] \
  --calldatas [encoded_function_call]

# 4. Monitor voting
mesh governance status --proposal 42
```

**Proposal Template:**
```markdown
## Title
[Concise, descriptive title]

## Summary
[2-3 sentences explaining what changes and why]

## Motivation
[Problem being solved, data supporting need]

## Specification
[Technical details, implementation plan]

## Impact Analysis
- Cost: [Estimated cost or savings]
- Security: [Security implications]
- Compliance: [Regulatory considerations]

## Timeline
[Implementation schedule]

## Alternatives Considered
[Other options and why not chosen]
```

### 5.4 Proposal Lifecycle

```
Draft (7 days) → Review (14 days) → Vote (7 days) → 
Timelock (variable) → Execute → Retrospective (30 days)
```

**Voting Thresholds:**
- Quorum: 40-60% (varies by proposal type)
- Approval: 60-80% of votes cast

---

## 6. Contributing to the Network

### 6.1 Code Contributions

**Repositories:**
- Core Protocol: https://github.com/mesh-foundation/protocol
- Mesh Node: https://github.com/mesh-foundation/mesh-node
- SDKs: https://github.com/mesh-foundation/sdks
- Documentation: https://github.com/mesh-foundation/docs

**Contribution Workflow:**
1. Fork repository
2. Create feature branch (`feature/your-feature-name`)
3. Implement with tests (85%+ coverage required)
4. Submit Pull Request with detailed description
5. Pass CI/CD checks + code review
6. Merge and receive contributor NFT + potential MESH rewards

**Reward Tiers:**
- Bug fix: 10-50 MESH
- Small feature: 100-500 MESH
- Major feature: 1,000-5,000 MESH
- Critical security fix: 5,000-50,000 MESH

### 6.2 Documentation

**Needed:**
- Tutorials for specific use cases
- Translation to non-English languages
- Video walkthroughs
- Architecture diagrams

**How to Contribute:**
```bash
git clone https://github.com/mesh-foundation/docs
cd docs
# Edit files in /docs directory
# Submit PR
```

**Rewards:** 5-50 MESH per merged documentation PR

### 6.3 Bug Bounties

**Severity Classification:**
| Severity | Reward | Examples |
|----------|--------|----------|
| Critical | 10,000 MESH | Private key exposure, consensus failure |
| High | 5,000 MESH | Authentication bypass, trust score manipulation |
| Medium | 1,000 MESH | Denial of service, memory leaks |
| Low | 100 MESH | UI bugs, minor performance issues |

**Submission:**
1. Email security@mesh.global with details
2. Do NOT publicly disclose vulnerability
3. Provide proof-of-concept (PoC) code if possible
4. Wait for confirmation (24-48 hours)
5. Receive reward after fix is deployed

### 6.4 Community Building

**Become an Ambassador:**
- Organize local meetups (reimbursed up to $500)
- Write blog posts and tutorials
- Answer questions in Discord/Telegram
- Represent Mesh at conferences

**Benefits:**
- Monthly MESH stipend (500-2,000 based on activity)
- Exclusive merchandise
- Direct line to core team
- Early access to features

---

## 7. Building on the Mesh

### 7.1 SDK Installation

**Python:**
```bash
pip install mesh-sdk
```

**TypeScript/JavaScript:**
```bash
npm install @mesh/sdk
```

**Go:**
```bash
go get github.com/mesh-foundation/go-sdk
```

**Rust:**
```bash
cargo add mesh-sdk
```

### 7.2 Simple Integration Example

**Python:**
```python
from mesh import MeshClient, AgentConfig

# Initialize client
client = MeshClient(did="did:mesh:enterprise:your-org-001")

# Define agent
agent = client.create_agent(AgentConfig(
    name="DataAnalysisAgent",
    capabilities=["data.analysis", "ml.inference"],
    model="gpt-4-turbo"
))

# Federate with another mesh
federation = client.federate(
    target_did="did:mesh:academic:mit-001",
    purpose="research-collaboration"
)

# Send task to federated mesh
result = federation.send_task({
    "type": "analyze_dataset",
    "data": {"dataset_url": "https://..."}
})

print(result)
```

**TypeScript:**
```typescript
import { MeshClient, FederationConfig } from '@mesh/sdk';

const client = new MeshClient({
  did: 'did:mesh:enterprise:your-org-001'
});

const federation = await client.initiateFederation({
  targetDid: 'did:mesh:academic:mit-001',
  purpose: 'research-collaboration'
});

const result = await federation.executeTask({
  type: 'analyze_dataset',
  data: { dataset_url: 'https://...' }
});
```

### 7.3 Advanced Features

**Trust-Based Routing:**
```python
# Only federate with high-trust meshes
client.set_routing_policy({
    "min_trust_score": 75,
    "prefer_certified": True,
    "max_latency_ms": 100
})
```

**Compliance Enforcement:**
```python
# Ensure GDPR compliance
client.set_compliance_requirements({
    "frameworks": ["GDPR", "SOC2"],
    "data_residency": ["EU"],
    "encryption_required": True
})
```

**Cost Optimization:**
```python
# Minimize costs
client.set_optimization_objective("minimize-cost")
```

---

## 8. Trust & Reputation

### 8.1 Understanding Trust Scores

**Your Trust Score (0-100) is calculated from:**
- **Credentials (30%):** Valid DID, certifications, issuer trust
- **History (25%):** Successful interactions, violations
- **Attestations (20%):** Peer verifications
- **Compliance (15%):** GDPR, SOC2, etc.
- **Uptime (10%):** Reliability percentage

### 8.2 Improving Your Trust Score

**Quick Wins:**
1. **Get Verified:** Request verification from Trust Authority (+15 points)
2. **Obtain Certifications:** SOC2 (+20), ISO27001 (+15), GDPR (+20)
3. **Request Attestations:** Ask partners to attest to your trustworthiness
4. **Maintain Uptime:** >99.9% uptime significantly boosts score
5. **Participate Actively:** Regular, successful federations build history

**Long-Term Strategy:**
- Zero violations (violations can drop score by 10-40 points)
- Build strong peer network (attestations are weighted by attester's score)
- Contribute to open-source (demonstrates community commitment)

### 8.3 Peer Attestations

**Requesting an Attestation:**
```bash
mesh attestation request --from did:mesh:partner:acme \
  --evidence "Completed joint project: [link]"
```

**Issuing an Attestation:**
```bash
mesh attestation issue --to did:mesh:partner:xyz \
  --score 85 --statement "Reliable partner, great collaboration"
```

**Reward:** 10 MESH for each attestation you issue (if proven accurate after 1 year)

---

## 9. Compliance & Safety

### 9.1 Data Protection

**GDPR Compliance (EU participants):**
- Data Processing Agreement (DPA) templates provided
- Automatic data residency enforcement
- Right to erasure supported
- Consent management tools

**HIPAA Compliance (US healthcare):**
- Business Associate Agreements (BAA) required
- PHI encryption enforced
- Audit logging enabled
- Breach notification automation

### 9.2 Security Best Practices

**Key Management:**
- Use hardware wallets for high-value stakes
- Enable multi-factor authentication (MFA)
- Rotate keys annually
- Never share private keys

**Node Security:**
- Keep software updated (auto-updates recommended)
- Enable firewall rules (only expose necessary ports)
- Regular security audits
- Monitor access logs

### 9.3 Incident Response

**If you experience a security incident:**
1. Immediately isolate affected systems
2. Notify security@mesh.global within 24 hours
3. Preserve logs and evidence
4. Follow investigation instructions
5. Implement remediation measures

**DAO Support:**
- Emergency DAO fund can compensate affected parties
- Technical assistance provided
- Legal support coordinated (if needed)

---

## 10. Getting Help

### 10.1 Support Channels

**Discord:** https://discord.gg/mesh  
- Real-time community chat
- #help channel for questions
- #development for technical discussions

**Telegram:** https://t.me/aimeshnetwork  
- Announcements and updates
- Quick questions

**Forum:** https://forum.mesh.global  
- In-depth technical discussions
- Proposal discussions
- Archive of answered questions

**Email Support:**
- General: support@mesh.global
- Technical: dev@mesh.global
- Security: security@mesh.global
- Compliance: legal@mesh.global

### 10.2 Documentation

**Comprehensive Docs:** https://docs.mesh.global  
- Tutorials
- API reference
- Architecture deep-dives
- Video guides

**GitHub:** https://github.com/mesh-foundation  
- Source code
- Issue tracker
- Example projects

### 10.3 Events & Community

**Monthly Community Calls:**
- First Wednesday of each month, 5PM UTC
- Governance updates, technical roadmap, Q&A

**Annual Conference:**
- AI-Agent Mesh Summit (location rotates)
- Keynotes, workshops, networking

**Local Meetups:**
- 50+ cities worldwide
- Find yours: https://meetups.mesh.global

---

## Conclusion

Welcome to the future of decentralized AI collaboration! The AI-Agent Mesh Network is a community-driven initiative, and your participation is what makes it thrive.

**Next Steps:**
1. ✅ Create your DID
2. ✅ Deploy a mesh node (or start with testnet)
3. ✅ Get some MESH tokens
4. ✅ Join the Discord community
5. ✅ Vote on your first proposal
6. ✅ Build something amazing!

**Questions?** Don't hesitate to reach out. Our community is here to help.

**Happy collaborating!** 🚀

---

**Document Version:** 1.0.0  
**Last Updated:** October 30, 2025  
**Feedback:** participation-guide-feedback@mesh.global
