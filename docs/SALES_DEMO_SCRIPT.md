# ORCA AgentMesh: 7-Minute Sales Demo Script

**Goal**: Show how ORCA provides instant visibility, governance, and ROI for AI agents.

**Audience**: Technical decision-makers (CTO, VP Eng, Head of AI, Security Lead)

**Prerequisites**:
- Demo environment running (`DEMO_MODE=true`)
- Browser tabs pre-loaded
- Backup recordings ready

---

## 0:00 - 1:00: Hook & Problem Statement

**SAY**:
> "Thanks for joining. Let me start with a question: *How many AI agents are running in your organization right now?*"

**PAUSE** for answer. Common responses:
- "Maybe 5-10?" → **Reality**: Usually 3-5x more (shadow AI)
- "I don't know" → **Perfect segue** to ORCA's value

**SAY**:
> "Most companies we talk to are in the same boat. AI agents are proliferating—OpenAI, Anthropic, Azure, custom models—but there's no unified way to govern, monitor, or trust them. That's the problem ORCA solves."

**SHOW**: Slide with problem bullets (or skip slides, go straight to demo)

---

## 1:00 - 2:30: Dashboard Overview - Instant Visibility

**ACTION**: Navigate to `https://demo.orca.agentmesh.dev/dashboard`

**SAY**:
> "This is the ORCA dashboard. In 10 minutes from signup, you get a unified view of every AI agent in your org."

**POINT OUT**:
1. **Agent Count**: "10 agents discovered across OpenAI, Anthropic, Azure..."
2. **Trust Score (85%)**: "This is our proprietary UADSI Trust Score—more on that in a sec"
3. **Risk Avoided ($62K)**: "Estimated dollar value of incidents ORCA prevented this month"
4. **Policy Coverage (98%)**: "98% of your API routes are protected by policies"

**SAY**:
> "Notice these aren't just technical metrics. We translate KPIs into **dollars**—because executives care about ROI, not just latency."

---

## 2:30 - 3:30: Trust Scoring (UADSI)

**ACTION**: Click on "Trust Score" card to expand details

**SAY**:
> "ORCA's Trust Score is based on five dimensions—we call it UADSI: **Uniformity, Alignment, Drift, Sync, Integrity**."

**SHOW**: Breakdown chart (5 bars: 88, 85, 90, 82, 87)

**EXPLAIN** (pick 2-3):
- **Uniformity**: "Are agent configs consistent across dev/staging/prod?"
- **Drift**: "Has the agent's behavior changed unexpectedly?"
- **Sync**: "Is context synchronized in real-time across your agent mesh?"

**SAY**:
> "A low trust score triggers automatic alerts—or even blocks actions—before they become incidents."

**VALUE PROP**:
> "One customer avoided a $2M GDPR fine because ORCA caught a low-trust agent trying to access PII."

---

## 3:30 - 4:30: Policy Enforcement (Live Demo)

**ACTION**: Click "Policies" tab

**SAY**:
> "ORCA uses OPA—Open Policy Agent—industry standard for policy as code. Here's a live policy."

**SHOW**: Pre-configured policy (e.g., `pii_protection.rego`)

**READ ALOUD** (simplified):
```rego
# Block low-trust agents from accessing PII
deny {
  input.agent.trust_score < 75
  contains(input.data, "ssn")
}
```

**SAY**:
> "This says: if an agent's trust score drops below 75 **and** it's trying to access Social Security Numbers, block it. No manual intervention needed."

**ACTION**: Click "Test Policy" button → Show blocked result

**SAY**:
> "In production, this runs in real-time on every API call. We're seeing sub-10ms policy evaluation latency."

---

## 4:30 - 5:30: AI-Ops & Self-Healing

**ACTION**: Navigate to "Incidents" or "AI-Ops" tab

**SAY**:
> "Now here's where it gets interesting. When ORCA detects an anomaly—say, a latency spike or config drift—our AI-Ops engine doesn't just alert you. It **automatically remediates**."

**SHOW**: Recent remediation action (pre-seeded):
- **Anomaly**: Latency spike on Agent #3
- **Root Cause**: Overloaded model endpoint
- **Action Taken**: Rerouted traffic to backup endpoint
- **Result**: MTTR 12 minutes (vs. 60 min industry avg)

**SAY**:
> "This is self-healing in action. You wake up, check Slack, and see: 'Incident detected and resolved automatically.'"

**VALUE PROP**:
> "One customer reduced their MTTR by 75%—that's **$56K/year in saved engineering time**."

---

## 5:30 - 6:30: ROI & Business Value

**ACTION**: Click "Reports" → "ROI Summary"

**SAY**:
> "Let's talk money. Every KPI in ORCA maps to a dollar value."

**SHOW**: ROI breakdown table (demo data):
| KPI | Value | Monthly ROI |
|-----|-------|-------------|
| Trust Score | 85% | $8,500 |
| Risk Avoided | $62K | $62,000 |
| MTTR Reduction | 15 min | $4,688 |
| Compliance SLA | 99% | $20,625 |
| **TOTAL** | | **$95,813/mo** |

**SAY**:
> "For a Pro plan at $99/month, you're seeing nearly **$96K in monthly value**. That's a **968x ROI**."

**PAUSE** for effect.

**SAY**:
> "And this is based on **your actual baselines**—we customize these formulas to your risk exposure and incident costs."

---

## 6:30 - 7:00: Call to Action

**SAY**:
> "So to recap: ORCA gives you  
> **1)** Instant visibility across all AI agents  
> **2)** Real-time trust scoring with UADSI  
> **3)** Automated policy enforcement  
> **4)** Self-healing AI-Ops  
> **5)** Clear ROI reporting  
>  
> All in a platform that takes **10 minutes to set up**."

**ACTION**: Show "Get Started" onboarding checklist (3-4 steps checked off)

**SAY**:
> "We can get you from zero to production-ready governance in **under 30 minutes** on our onboarding call."

**ASK**:
> "What questions do you have? And should we schedule a technical deep-dive with your team?"

---

## Q&A Preparation

### Common Questions

**Q: "Does this work with our custom agents?"**  
A: Yes. ORCA supports any agent via API or webhook adapters (Zapier, n8n, etc.). We also support MCP (Model Context Protocol) for auto-discovery.

**Q: "What about data residency (GDPR, etc.)?"**  
A: Enterprise plans include EU/US region selection. All data encrypted at rest (AES-256) and in transit (TLS 1.3). SOC2 Type II certified.

**Q: "How do you calculate ROI?"**  
A: We use tenant-specific baselines (avg incident cost, hourly rates, etc.) pulled from your finance team. Formulas are transparent and customizable.

**Q: "What if we already have Datadog/New Relic?"**  
A: ORCA complements existing observability. We focus on **AI-specific governance**—trust scoring, policy enforcement, agent context—not generic infrastructure monitoring. We integrate via OpenTelemetry.

**Q: "How long is implementation?"**  
A: Free/Pro: Self-service, 10 minutes. Enterprise: 1-2 weeks with dedicated onboarding (SSO, custom policies, integrations).

**Q: "Can we try this ourselves first?"**  
A: Absolutely. Free plan (no credit card) gives you 5 agents, 7-day retention. Or book a 30-minute sandbox session with us.

---

## Follow-Up

**SEND** within 1 hour:
1. **Recording** of this demo
2. **Link** to interactive demo environment (demo.orca.agentmesh.dev)
3. **ROI calculator** spreadsheet pre-filled with their numbers
4. **Case study** relevant to their industry
5. **Next steps**: Calendar link for technical deep-dive

**INTERNAL NOTE** in CRM:
- Pain points mentioned
- Decision timeline
- Key stakeholders identified
- Objections raised

---

## Demo Troubleshooting

**If demo environment is down**:
1. Use backup recording (Loom link: TK)
2. Apologize, pivot to architecture whiteboard discussion
3. Offer reschedule with $100 Amazon gift card

**If dashboard loads slowly**:
- Pre-load all pages in tabs before call
- Use incognito mode to avoid cache issues

**If prospect seems skeptical**:
- Offer to run demo with **their real agents** (integration call, 1 hour)
- Share Gartner/Forrester reports on AI governance market

---

## Success Metrics

**Good demo** = Questions, engaged, asks about pricing  
**Great demo** = Books follow-up technical call before hanging up  
**Perfect demo** = "Can we start a pilot next week?"

**Goal conversion**: 40% of demos → pipeline opportunities  
**Close rate**: 25% of qualified demos → closed/won within 90 days

---

**Demo script version**: 1.0  
**Last updated**: 2025-10-31  
**Owner**: Sales Engineering Team
