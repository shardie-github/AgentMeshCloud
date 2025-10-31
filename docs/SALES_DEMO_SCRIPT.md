# ORCA Platform - Sales Demo Script

**Duration:** 7 minutes  
**Mode:** Live demo with synthetic data  
**Audience:** Enterprise buyers, investors, technical stakeholders  
**Last Updated:** 2025-10-31

---

## Pre-Demo Setup (2 minutes before)

### Technical Checklist
- [ ] Demo environment running: `DEMO_MODE=true pnpm run orca:dev`
- [ ] Demo data seeded: `DEMO_MODE=true tsx src/demo/synth_seed.ts`
- [ ] Demo banner visible
- [ ] All demo agents showing in registry
- [ ] KPI dashboard populated with 30 days data
- [ ] Browser tabs prepared:
  - Tab 1: Dashboard (trust score view)
  - Tab 2: Agent registry
  - Tab 3: Incidents panel
  - Tab 4: ROI calculator
  - Tab 5: AI-Ops actions

### Environment Variables
```bash
export DEMO_MODE=true
export DEMO_TENANT_ID=demo_tenant_001
export DEMO_BANNER_ENABLED=true
```

---

## Demo Flow (7 minutes)

### Opening (30 seconds)

**[Show Dashboard - Trust Score View]**

> "Welcome! I'm going to show you how ORCA solves the AI agent governance problem that every enterprise faces today. You probably have dozens or even hundreds of AI agents scattered across your organization - ChatGPT plugins, Zapier workflows, custom automations - and you have no visibility or control over them.
> 
> ORCA gives you complete governance, policy enforcement, and trust scoring across all your AI agents. Let me show you how."

**[Point to demo banner]**

> "Quick note: This is our demo environment with Acme Corporation's synthetic data. Everything you'll see is realistic but simulated for demonstration purposes."

---

### Section 1: The Problem - Shadow AI (1 minute)

**[Navigate to Agent Registry]**

> "Here's the core problem: **shadow AI**. This is Acme Corp's agent registry after ORCA's automatic discovery ran for 24 hours.
> 
> **[Point to agents list]**
> 
> Look at these:
> - Customer Support Bot from OpenAI
> - Sales Automation from Zapier
> - Legacy CRM Sync - this one's interesting...
> 
> **[Click on 'Legacy CRM Sync' agent]**
> 
> See this agent? Trust Score of **45/100** - that's failing. It was quarantined automatically because ORCA detected it's syncing customer PII without encryption and violating our data classification policies.
> 
> Before ORCA, nobody even knew this agent existed. It was set up two years ago by an intern who left the company. It's been running unsupervised ever since, and it's a massive compliance risk."

**Key Message:** *Shadow AI is everywhere, and you can't govern what you can't see.*

---

### Section 2: Trust Scoring & KPIs (1.5 minutes)

**[Navigate to Dashboard - Trust Score Widget]**

> "This is ORCA's differentiator: **Trust Score**. It's a single number (0-100) that tells you how trustworthy your entire AI fleet is.
> 
> Acme Corp's current Trust Score is **85** - that's good. It means:
> - 85% policy compliance
> - Low drift rate
> - Fresh data synchronization
> - Most incidents being auto-resolved
> 
> **[Show KPI breakdown]**
> 
> Here's how we calculate it:
> - **Incidents Avoided:** 12 this month
> - **Sync Freshness:** 92% - data is current
> - **Drift Rate:** 3.5% - very low configuration drift
> - **Self-Resolution Ratio:** 60% - most issues fixed automatically
> 
> But here's the business impact..."

**[Navigate to ROI Widget]**

> "**Risk Avoided: $51,000 per month.**
> 
> Here's the math:
> - 12 incidents avoided
> - Average incident cost: $5,000 (industry average)
> - Trust Score factor: 85%
> - Result: **$51,000** in avoided risk
> 
> Their platform cost? $99/month for the Pro plan.
> 
> **ROI: 51,000% or 514× return multiple.**
> 
> And this is just one month. Annualized, that's over $600,000 in savings."

**Key Message:** *Trust Score converts governance into measurable business value.*

---

### Section 3: Policy Enforcement (1.5 minutes)

**[Navigate to Incidents Panel]**

> "Now let's look at what ORCA caught. These are real policy violations that happened in the last 30 days.
> 
> **[Click on 'PII Exposure Risk' incident]**
> 
> This one's critical: The Data Sync Connector was about to log customer social security numbers in plain text. ORCA's PII detector caught it, blocked the operation, and auto-redacted the data.
> 
> **[Show incident timeline]**
> 
> Look at the timeline:
> - 10:34 AM: Policy violation detected
> - 10:34 AM: Operation blocked automatically
> - 10:35 AM: PII redacted from logs
> - 10:36 AM: Alert sent to security team
> - 10:42 AM: Root cause fixed by AI-Ops
> 
> Total incident duration: **8 minutes**. Zero human intervention until the alert.
> 
> Without ORCA? This would have been a GDPR violation, potential fine of up to €20 million, and a PR nightmare."

**[Navigate to Policy Rules]**

> "Here are our policy rules. We support:
> - NIST AI RMF alignment
> - OWASP LLM Top 10
> - Custom OPA policies
> - RBAC and data classification
> - Content safety checks
> 
> You can customize these for your compliance frameworks - SOC 2, HIPAA, ISO 27001, whatever you need."

**Key Message:** *Automated policy enforcement prevents incidents before they become breaches.*

---

### Section 4: AI-Ops Automation (1.5 minutes)

**[Navigate to AI-Ops Actions Panel]**

> "This is where it gets really powerful: **AI-Ops automation**. ORCA doesn't just detect issues - it fixes them.
> 
> **[Show recent AI-Ops actions]**
> 
> Look at these automated actions from the last week:
> 
> 1. **Auto-Heal** - The Data Sync Connector failed at 2 AM. ORCA detected the failure, restarted the job, and verified successful completion. The on-call engineer never even woke up.
> 
> 2. **Drift Correction** - The Invoice Processing agent's configuration drifted from the approved baseline. ORCA automatically reverted to the last known-good config.
> 
> 3. **Capacity Scaling** - During a traffic spike, ORCA detected the Customer Support Bot hitting rate limits and automatically scaled up capacity.
> 
> 4. **Auto-Quarantine** - Remember that Legacy CRM Sync agent with Trust Score 45? ORCA quarantined it automatically after detecting repeated policy violations.
> 
> All of this happened **without human intervention**. No pagers, no runbooks, no manual remediation."

**[Show AI-Ops metrics]**

> "Over 30 days:
> - 23 automated healing actions
> - 60% self-resolution ratio
> - Average resolution time: 12 minutes
> - Zero escalations to on-call
> 
> This is like having a Site Reliability Engineer who never sleeps and responds in seconds."

**Key Message:** *AI-Ops automation means fewer incidents become pages, and fewer pages become incidents.*

---

### Section 5: Enterprise Features (1 minute)

**[Navigate to Settings/Features]**

> "For enterprise customers, we offer:
> 
> **Multi-Region Deployment**
> - US, EU, APAC data centers
> - Data residency compliance (GDPR, PDPA)
> - 99.9% SLA with automatic failover
> - Sub-700ms P95 latency globally
> 
> **Integrations**
> - MCP-compliant (Model Context Protocol)
> - Zapier, Make, n8n, Airflow, Lambda
> - Custom webhook adapters
> - REST API + upcoming GraphQL
> 
> **Security & Compliance**
> - SOC 2 Type II certified
> - ISO 27001 certified
> - GDPR, HIPAA, PDPA compliant
> - SSO with SAML/OIDC
> - Custom SLA agreements
> 
> **Customization**
> - White-label deployment
> - Custom branding
> - Dedicated instances
> - On-premises option"

**Key Message:** *Enterprise-ready out of the box, with flexibility for custom requirements.*

---

### Closing (30 seconds)

**[Return to Dashboard - Show overall Trust Score trending up]**

> "Let me show you one last thing: this is Acme Corp's Trust Score over the last 30 days.
> 
> **[Point to trend graph]**
> 
> It started at 73 when they first deployed ORCA, and it's climbed to 85. That's not by accident - it's because ORCA is continuously discovering shadow AI, enforcing policies, and auto-healing issues.
> 
> The trend is always upward with ORCA, which means your risk is always going down.
> 
> **Next steps:**
> 1. I can set up a proof-of-concept with your actual agents in about 30 minutes
> 2. We'll connect to your Zapier/Make/MCP servers
> 3. You'll see your real Trust Score and get a customized ROI projection
> 4. No credit card needed for the 14-day trial
> 
> Questions?"

---

## Q&A Preparation

### Common Questions & Answers

#### "How does discovery work?"

> "ORCA scans your MCP servers, Zapier accounts, Make organizations, n8n instances, and cloud functions (AWS Lambda, Azure Functions, etc.). It uses API keys you provide (with read-only scopes for security) and builds an inventory automatically. Discovery runs continuously in the background, so new agents are detected within minutes of creation."

#### "What about false positives?"

> "Great question. Our policy engine has tunable sensitivity. For example, PII detection uses a multi-model approach with configurable confidence thresholds. In production, we see less than 2% false positive rate on PII detection, and you can adjust that based on your risk tolerance. Every blocked action is logged with a justification that you can review."

#### "Can we use our own policies?"

> "Absolutely. ORCA supports custom Open Policy Agent (OPA) policies written in Rego. You can also extend our built-in policies (NIST AI RMF, OWASP LLM Top 10) or start from scratch. We have a policy library with 50+ pre-built rules you can customize."

#### "How long does deployment take?"

> "For the cloud version, you can be up and running in 30 minutes:
> - Sign up and choose your region
> - Connect your first integration (Zapier, MCP, etc.)
> - Set up initial policies (or use our defaults)
> - Start seeing Trust Score immediately
> 
> For on-premises deployment, it's typically 1-2 weeks including infrastructure setup, security review, and custom configuration."

#### "What's the pricing?"

> "Three tiers:
> - **Free:** $0, up to 5 agents, great for trying it out
> - **Pro:** $99/month, 50 agents, includes AI-Ops automation
> - **Enterprise:** Custom pricing, unlimited agents, dedicated support, SLA guarantees
> 
> Most mid-size companies start with Pro and upgrade to Enterprise within 3-6 months as they scale. ROI is typically achieved in the first month."

#### "How do you handle data privacy?"

> "We're SOC 2 Type II and ISO 27001 certified. Key points:
> - **Data residency:** Your data stays in your chosen region (US, EU, or APAC)
> - **Encryption:** TLS 1.3 in transit, AES-256 at rest
> - **Retention:** Configurable (7, 30, 90, or 365 days)
> - **PII redaction:** Automatic in logs and exports
> - **Zero trust:** No agent credentials stored; you manage via secure key vaults
> 
> For regulated industries (healthcare, finance), we offer HIPAA BAA and dedicated instances."

#### "What happens if ORCA goes down?"

> "Two layers of protection:
> 1. **Multi-region failover:** If one region fails, traffic automatically routes to healthy regions within 60 seconds. We have 99.9% uptime SLA (Enterprise) or 99.5% (Pro).
> 2. **Agent autonomy:** Your agents continue running even if ORCA is offline. ORCA is observability and governance, not a control plane. When ORCA comes back, it catches up on events and re-establishes policy enforcement."

#### "Can we integrate with our existing tools?"

> "Yes! We integrate with:
> - **Monitoring:** Grafana, Datadog, New Relic, Prometheus
> - **Alerting:** PagerDuty, Slack, Teams, email, webhooks
> - **SIEM:** Splunk, Elastic, Azure Sentinel
> - **Ticketing:** Jira, ServiceNow, Zendesk
> - **Auth:** Okta, Auth0, Azure AD, Google Workspace
> 
> We also have a REST API and webhooks for custom integrations."

---

## Demo Troubleshooting

### Issue: Demo data not showing
**Solution:** Re-run seed script: `DEMO_MODE=true tsx src/demo/synth_seed.ts`

### Issue: Trust Score shows 0
**Solution:** Ensure KPI calculation job has run: `tsx scripts/calculate_trust_score.ts --tenant=demo_tenant_001`

### Issue: Agents not appearing
**Solution:** Check Supabase connection and verify `agents` table has demo data

### Issue: Demo banner not showing
**Solution:** Verify `DEMO_MODE=true` in environment and `demo_mode: true` in tenant record

---

## Post-Demo Follow-Up

### Immediately After Demo (Email Template)

**Subject:** ORCA Demo Follow-Up - Next Steps for [Company Name]

```
Hi [Name],

Great connecting today! As discussed, here's a quick summary of what we showed:

✅ Trust Score of 85 for Acme Corp (demo)
✅ $51,000/month in Risk Avoided
✅ 60% auto-resolution of incidents
✅ Enterprise features: multi-region, SSO, compliance

Next Steps:
1. Schedule 30-min POC setup call (I'll send calendar invite)
2. Gather integration credentials (Zapier, MCP, etc.) - read-only is fine
3. Start 14-day Pro trial (no credit card required)

Quick wins you can expect in first week:
• Complete inventory of all AI agents
• First Trust Score and ROI calculation
• 5-10 shadow AI agents discovered
• 2-3 policy violations caught and prevented

Questions? Reply to this email or call me directly at [phone].

Best regards,
[Your Name]
[Title]
ORCA Platform
```

### POC Success Metrics (Week 1)

Track these to demonstrate value:
- [ ] Number of agents discovered
- [ ] Shadow AI agents identified
- [ ] Policy violations caught
- [ ] Incidents auto-resolved
- [ ] Calculated ROI (RA$ vs platform cost)
- [ ] Trust Score achieved

---

## Sales Engineering Notes

### Win Themes
1. **Visibility:** "You can't govern what you can't see"
2. **Automation:** "AI-Ops = SRE that never sleeps"
3. **Value:** "514× ROI is not a typo"
4. **Compliance:** "SOC 2, GDPR, HIPAA out of the box"

### Objection Handling
- **"We don't have that many agents"** → Discovery typically finds 3-5× more than expected
- **"We already use [competitor]"** → ORCA is agent-focused, not just infra monitoring
- **"Too expensive"** → ROI calculator shows payback in first month
- **"Not ready yet"** → Free tier requires zero commitment

### Deal Acceleration
- Offer POC with real data (not demo)
- Provide reference customers in their industry
- Show compliance audit readiness (for regulated industries)
- Demonstrate integration with their existing tools

---

## Assets & Links

**Demo Environment:** https://demo.orca-mesh.io (password protected)

**Video Recording:** https://orca-mesh.io/demo-video

**ROI Calculator:** https://orca-mesh.io/roi

**Documentation:** https://docs.orca-mesh.io

**Case Studies:** https://orca-mesh.io/customers

**Pricing:** https://orca-mesh.io/pricing

---

**Script Version:** 1.0  
**Owner:** Sales Engineering Team  
**Last Updated:** 2025-10-31  
**Review Cycle:** Monthly
