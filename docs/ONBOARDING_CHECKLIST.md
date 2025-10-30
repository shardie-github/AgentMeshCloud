# New Team Member Onboarding Checklist

Welcome to the ORCA Platform team! This checklist ensures you have everything needed to be productive.

---

## Week 1: Access & Setup

### Day 1
- [ ] **Email & Slack**
  - [ ] Email account created
  - [ ] Added to Slack workspace
  - [ ] Join channels: #engineering, #platform, #incidents, #on-call
  
- [ ] **GitHub Access**
  - [ ] GitHub account added to `orca-platform` organization
  - [ ] Added to `engineering-team` team
  - [ ] Repository access granted
  
- [ ] **AWS Console**
  - [ ] IAM user created
  - [ ] MFA enabled (required)
  - [ ] Added to appropriate groups (ReadOnly for engineers)
  
- [ ] **Development Tools**
  - [ ] Clone repository: `git clone https://github.com/orca-platform/orca.git`
  - [ ] Install Node.js 18+ and pnpm
  - [ ] Run `pnpm install`
  - [ ] Run `npm run dev` (verify local server starts)

### Day 2-3
- [ ] **Database Access**
  - [ ] Supabase project access granted
  - [ ] Database credentials obtained (via secrets bridge)
  - [ ] Connect to staging database
  
- [ ] **Monitoring & Observability**
  - [ ] Grafana account created
  - [ ] Access granted to ORCA dashboards
  - [ ] PagerDuty account created (if on-call eligible)
  
- [ ] **Security Training**
  - [ ] Complete security awareness training
  - [ ] Review security baseline: `docs/SECURITY_BASELINE.md`
  - [ ] Set up password manager (1Password or similar)
  - [ ] Enable 2FA on all accounts

### Day 4-5
- [ ] **Documentation Review**
  - [ ] Read platform handbook: `docs/PLATFORM_HANDBOOK.md`
  - [ ] Review architecture diagrams
  - [ ] Understand multi-tenancy model
  - [ ] Review deployment strategy: `docs/DEPLOY_STRATEGY.md`

---

## Week 2: Shadowing & Learning

- [ ] **Code Review Shadowing**
  - [ ] Shadow senior engineer on 3+ code reviews
  - [ ] Understand review checklist
  - [ ] Learn security considerations
  
- [ ] **Deployment Shadowing**
  - [ ] Observe staging deployment
  - [ ] Observe canary/blue-green deployment
  - [ ] Learn rollback procedures
  
- [ ] **Incident Response**
  - [ ] Review escalation policy: `incident/ESCALATION_POLICY.yaml`
  - [ ] Read 3 recent post-mortems
  - [ ] Understand on-call rotation (if applicable)

---

## Week 3: First Contributions

- [ ] **First PR**
  - [ ] Pick "good first issue" from backlog
  - [ ] Write tests
  - [ ] Get code review
  - [ ] Merge to staging
  
- [ ] **Documentation Update**
  - [ ] Find documentation gap
  - [ ] Submit documentation PR
  
- [ ] **Runbook Review**
  - [ ] Review runbooks: `incident/RUNBOOKS/`
  - [ ] Suggest improvements

---

## Week 4: Integration & Specialization

- [ ] **Area of Focus**
  - [ ] Identify primary area (API, UADSI, integrations, etc.)
  - [ ] Deep dive into codebase for that area
  - [ ] Meet with area expert
  
- [ ] **On-Call Preparation** (if applicable)
  - [ ] Complete on-call training
  - [ ] Shadow on-call shift
  - [ ] Practice incident response in GameDay
  
- [ ] **Team Integration**
  - [ ] Attend sprint planning
  - [ ] Attend retrospective
  - [ ] Pair program with team member

---

## Ongoing (First 90 Days)

- [ ] **Certifications** (optional but encouraged)
  - [ ] AWS Certified Developer
  - [ ] Certified Kubernetes Administrator
  - [ ] SOC 2 Compliance training
  
- [ ] **Regular Check-ins**
  - [ ] 30-day check-in with manager
  - [ ] 60-day check-in with manager
  - [ ] 90-day performance review

---

## Resources

### Documentation
- Platform Handbook: `docs/PLATFORM_HANDBOOK.md`
- Identity & Access: `docs/IDENTITY_ACCESS.md`
- Privacy & Governance: `docs/PRIVACY_GOVERNANCE.md`
- Deployment Strategy: `docs/DEPLOY_STRATEGY.md`
- Disaster Recovery: `docs/DISASTER_RECOVERY.md`

### Tools
- GitHub: https://github.com/orca-platform/orca
- Grafana: https://grafana.orca.example
- Slack: https://orca-team.slack.com
- PagerDuty: https://orca.pagerduty.com

### Contacts
- **Manager**: [Your Manager]
- **Buddy**: [Assigned Buddy]
- **Platform Team**: platform-team@orca-platform.example
- **Security**: security@orca-platform.example

---

**Checklist Owner**: Engineering Manager  
**Last Updated**: 2025-10-30
