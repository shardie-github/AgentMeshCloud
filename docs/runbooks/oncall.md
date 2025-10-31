# On-Call Runbook

**Version:** 1.0.0  
**Last Updated:** 2025-10-31  
**Owner:** SRE Team

---

## Quick Reference

**Emergency Hotline:** See #oncall Slack channel pinned message  
**PagerDuty:** https://orca-mesh.pagerduty.com  
**Dashboards:** https://dashboards.orca-mesh.io  
**Status Page:** https://status.orca-mesh.io  
**Runbooks:** /workspace/docs/runbooks/

---

## On-Call Schedule

**Rotation:** Weekly (Monday 9am → Monday 9am UTC)

**Current On-Call:** Check PagerDuty or Slack `/whoisoncall`

**Primary On-Call:**
- First responder for all alerts
- Response time: <15 minutes for P1, <30 minutes for P2

**Secondary On-Call (Backup):**
- Responds if primary unavailable
- Escalation point for complex issues

**Escalation Path:**
1. Primary On-Call
2. Secondary On-Call
3. SRE Lead
4. CTO

---

## Incident Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **P0 (Emergency)** | Total outage, data loss | <5 minutes | Database down, API completely unavailable |
| **P1 (Critical)** | Major functionality broken, all users affected | <15 minutes | Error rate >5%, auth broken, payments failing |
| **P2 (High)** | Significant degradation, subset of users affected | <30 minutes | High latency, intermittent errors, 1 region down |
| **P3 (Medium)** | Minor issue, workaround available | <1 hour | UI bug, slow admin panel, non-critical feature broken |
| **P4 (Low)** | Cosmetic issue, no user impact | <4 hours | Typo, minor UI glitch, documentation error |

---

## Alert Response Workflow

### Step 1: Acknowledge Alert

**Within response time SLA:**
1. Check PagerDuty notification
2. Acknowledge alert (stops escalation)
3. Post in #incidents Slack channel:
   ```
   🚨 P1 Alert: High error rate
   Incident Lead: @john.doe
   Status: Investigating
   ```

### Step 2: Triage & Assess

**Gather information (5 minutes):**
```bash
# Check dashboards
open https://dashboards.orca-mesh.io

# Check API health
curl https://api.orca-mesh.io/health | jq

# Check recent deployments
vercel list --prod | head -5

# Check logs
vercel logs --prod --follow | grep "ERROR" | tail -100
```

**Key Questions:**
- What is the blast radius? (all users, subset, single tenant?)
- When did it start? (correlate with recent deployment?)
- What is the user impact? (can't login, slow pages, errors?)
- Is it getting worse or stable?

### Step 3: Mitigate

**Immediate Actions (in order of priority):**

**Option 1: Rollback (if recent deployment)**
```bash
pnpm run release:rollback
```

**Option 2: Kill Switch (if specific feature failing)**
```bash
# Disable problematic feature
vercel env rm ENABLE_FAILING_FEATURE --env=production
vercel --prod  # Redeploy
```

**Option 3: Scale Up (if capacity issue)**
```bash
# Increase function timeout
# Edit vercel.json, increase maxDuration
vercel --prod
```

**Option 4: Failover (if regional outage)**
```bash
# Route traffic to backup region
pnpm run failover:activate --region=us-east-1
```

### Step 4: Communicate

**Update Status Page:**
```bash
# Automated status update
pnpm run status:update --message="Investigating elevated error rates" --status=investigating
```

**Slack #incidents:**
```
🔍 UPDATE: Investigating P1 incident

**Root Cause:** Recent deployment introduced bug in /trust endpoint
**Impact:** 20% of API requests failing
**Mitigation:** Rolling back to v1.0.9
**ETA:** 5 minutes

Next update in 15 minutes or when resolved.
```

**Email/Twitter (for major outages only):**
- If outage >30 minutes
- If >50% of users affected
- Coordinate with marketing/comms team

### Step 5: Resolve

**Confirm Fix:**
```bash
# Run smoke tests
pnpm run smoke:test --env=production

# Check metrics
# Error rate back to baseline?
# Latency back to normal?
# No new errors in logs?
```

**Update Status Page:**
```bash
pnpm run status:update --message="Issue resolved. Monitoring for stability." --status=resolved
```

**Slack #incidents:**
```
✅ RESOLVED: P1 incident resolved

**Duration:** 18 minutes (14:00 - 14:18 UTC)
**Root Cause:** Bug in trust scoring calculation
**Fix:** Rolled back to v1.0.9
**Impact:** ~2,000 failed requests, no data loss
**Post-Mortem:** Tomorrow 10am

Thank you for your patience! 🙏
```

### Step 6: Post-Incident

**Within 24 hours:**
- [ ] Schedule post-mortem meeting
- [ ] Write incident report
- [ ] Document root cause
- [ ] Create action items
- [ ] Update runbooks if needed

**Post-Mortem Template:**
See `/docs/templates/post-mortem.md`

---

## Common Alerts & Runbooks

### Alert: High Error Rate (>1.5%)

**Symptoms:**
- PagerDuty: "Error rate above threshold"
- Grafana: Error rate spike in dashboard

**Diagnosis:**
```bash
# Check recent deployments
vercel list --prod | head -3

# Check error logs
vercel logs --prod --follow | grep "ERROR" | tail -50

# Check specific endpoints
curl https://api.orca-mesh.io/agents  # Should return 200
curl https://api.orca-mesh.io/trust   # Should return 200
```

**Common Causes:**
- Recent deployment introduced bug
- External API down (Zapier, Supabase)
- Database connection pool exhausted

**Mitigation:**
```bash
# If recent deployment (within 1h)
pnpm run release:rollback

# If external API down
# Disable integration temporarily
vercel env rm ENABLE_EXTERNAL_API --env=production
vercel --prod
```

---

### Alert: High Latency (P95 >700ms)

**Symptoms:**
- PagerDuty: "Latency above SLO"
- User reports: "App is slow"

**Diagnosis:**
```bash
# Check Grafana for slow endpoints
open https://dashboards.orca-mesh.io

# Check for slow database queries
pnpm run db:slowquery-check

# Check Vercel function logs
vercel logs --prod | grep "duration"
```

**Common Causes:**
- Slow database queries (missing indexes)
- Cold starts (function not warmed up)
- External API latency
- Large payload (inefficient JSON serialization)

**Mitigation:**
```bash
# Warm up functions
curl https://api.orca-mesh.io/health

# Add database index (if slow query identified)
pnpm run db:add-index --table=agents --column=status

# Increase function timeout (temporary)
# Edit vercel.json, increase maxDuration to 60s
vercel --prod
```

---

### Alert: Database Connection Pool Exhausted

**Symptoms:**
- Errors: "Too many connections"
- Supabase dashboard shows max connections

**Diagnosis:**
```bash
# Check Supabase connection count
supabase db connections --count

# Check for long-running queries
pnpm run db:long-queries
```

**Mitigation:**
```bash
# Kill long-running queries
pnpm run db:kill-query --id=<query-id>

# Increase connection pool (temporary)
# Edit DATABASE_URL, add ?connection_limit=20
vercel env add DATABASE_URL --env=production
vercel --prod

# Long-term: Fix code to close connections properly
```

---

### Alert: Trust Score Dropped Below 80

**Symptoms:**
- PagerDuty: "Trust Score below threshold"
- Dashboard: Trust Score = 75

**Diagnosis:**
```bash
# Check trust score details
curl https://api.orca-mesh.io/trust | jq

# Check for sync gaps
curl https://api.orca-mesh.io/trust/sync-gaps | jq
```

**Common Causes:**
- Agents offline
- Sync failures (Zapier, n8n)
- Policy violations

**Mitigation:**
```bash
# Restart self-healing engine
pnpm run ops:self-heal

# Check agent status
curl https://api.orca-mesh.io/agents | jq '.[] | select(.status=="offline")'

# Re-sync integrations
pnpm run sync:force --integration=zapier
```

---

### Alert: Deployment Failed

**Symptoms:**
- PagerDuty: "Deployment failed"
- Vercel: Build error in logs

**Diagnosis:**
```bash
# Check Vercel build logs
vercel logs --prod | grep "ERROR"

# Check for TypeScript errors
pnpm run typecheck

# Check for lint errors
pnpm run lint
```

**Mitigation:**
```bash
# Fix locally
git pull origin main
pnpm install
pnpm run build  # Test build locally

# If cannot fix quickly, revert
git revert <bad-commit>
git push origin main
```

---

## Monitoring Dashboards

### Grafana Dashboards

**Main Dashboard:** https://dashboards.orca-mesh.io

**Key Panels:**
- **API Health:** Error rate, latency (P50/P95/P99), throughput
- **Trust KPIs:** Trust Score, Risk Avoided ($), Sync Freshness, Drift Rate
- **Database:** Connection pool, query latency, slow queries
- **Infrastructure:** CPU, memory, disk, event loop lag

**How to Use:**
1. Select time range (default: last 1 hour)
2. Look for anomalies (spikes, drops, trends)
3. Drill down into specific metrics
4. Correlate with recent deployments (check deployment markers)

### Logs (Vercel)

```bash
# Real-time logs
vercel logs --prod --follow

# Filter by error
vercel logs --prod --follow | grep "ERROR"

# Filter by correlation ID
vercel logs --prod --follow | grep "correlation-id-123"
```

### Traces (Jaeger)

**Jaeger UI:** http://localhost:16686 (local) or https://jaeger.orca-mesh.io (prod)

**Use Cases:**
- Trace slow requests (find bottlenecks)
- Debug errors (see full request flow)
- Identify external API latency

---

## Escalation Paths

### Level 1: Primary On-Call
- **Who:** Current on-call engineer
- **Response Time:** <15 min (P1), <30 min (P2)
- **Scope:** Most incidents
- **Escalate if:** Cannot resolve within 30 minutes, or complexity exceeds expertise

### Level 2: Secondary On-Call
- **Who:** Backup on-call engineer
- **Response Time:** <30 min (P1), <1 hour (P2)
- **Scope:** Complex incidents, primary unavailable
- **Escalate if:** Cannot resolve within 1 hour

### Level 3: SRE Lead
- **Who:** @sre-lead
- **Response Time:** <1 hour
- **Scope:** Critical incidents affecting all users, data loss risk
- **Escalate if:** Major outage, security breach, data integrity issue

### Level 4: CTO
- **Who:** @cto
- **Response Time:** <2 hours
- **Scope:** Exec-level decisions, major business impact
- **Escalate if:** Extended outage (>2 hours), legal/compliance issue

---

## On-Call Responsibilities

### Daily
- [ ] Check #oncall Slack channel
- [ ] Review overnight alerts (if any)
- [ ] Check dashboard for anomalies
- [ ] Respond to alerts within SLA

### Weekly (during your shift)
- [ ] Review runbooks (refresh knowledge)
- [ ] Test rollback procedure on staging
- [ ] Update on-call contact info (if changed)
- [ ] Hand-off meeting with next on-call

### After Incident
- [ ] Write incident report (within 24h)
- [ ] Schedule post-mortem
- [ ] Update runbooks if needed
- [ ] Create tickets for action items

---

## On-Call Checklist (Start of Shift)

- [ ] PagerDuty app installed and notifications enabled
- [ ] Slack mobile app with #oncall channel notifications on
- [ ] VPN configured (if remote)
- [ ] Laptop charged and accessible
- [ ] Know how to rollback: `pnpm run release:rollback`
- [ ] Dashboards bookmarked
- [ ] Escalation contacts saved
- [ ] On-call schedule reviewed

---

## On-Call Best Practices

### Do's ✅
- ✅ Acknowledge alerts immediately (even if investigating)
- ✅ Communicate early and often (Slack #incidents)
- ✅ Focus on mitigation first, root cause later
- ✅ Ask for help if stuck (escalate!)
- ✅ Document everything (write it down as you go)
- ✅ Update status page proactively
- ✅ Take breaks during long incidents (hand-off if needed)

### Don'ts ❌
- ❌ Ignore alerts (even if false positive, acknowledge first)
- ❌ Make changes without testing (no cowboy fixes)
- ❌ Skip communication (users need updates)
- ❌ Blame people (blameless post-mortems)
- ❌ Work alone for >1 hour on P1 (ask for help!)
- ❌ Deploy during incidents (unless it's the fix)

---

## Tools & Access

### Required Access
- [ ] Vercel (dashboard + CLI)
- [ ] Supabase (dashboard)
- [ ] PagerDuty (account + mobile app)
- [ ] Grafana (dashboard)
- [ ] Slack (#oncall, #incidents, #engineering)
- [ ] GitHub (repo admin)

### CLI Tools
```bash
# Vercel CLI
npm install -g vercel
vercel login

# Supabase CLI
npm install -g supabase
supabase login

# ORCA scripts
pnpm install  # In repo root
```

### Mobile Apps
- PagerDuty (iOS/Android)
- Slack (iOS/Android)
- Vercel (iOS/Android)

---

## Communication Templates

### P1 Incident Declaration (Slack #incidents)

```
🚨 P1 INCIDENT: High Error Rate

**Severity:** P1 (Critical)
**Impact:** 30% of API requests failing, all users affected
**Started:** 14:00 UTC
**Status:** Investigating
**Incident Lead:** @john.doe
**Dashboard:** https://dashboards.orca-mesh.io

Updates every 15 minutes or when status changes.
```

### P1 Status Update (every 15 min)

```
🔍 UPDATE (14:15 UTC): P1 Incident

**Root Cause:** Identified bug in /trust endpoint introduced in v1.1.0
**Mitigation:** Rolling back to v1.0.9
**ETA:** 5 minutes
**Status:** Mitigating

Next update at 14:30 or when resolved.
```

### P1 Resolution (Slack #incidents)

```
✅ RESOLVED (14:20 UTC): P1 Incident

**Duration:** 20 minutes (14:00 - 14:20 UTC)
**Root Cause:** Bug in trust scoring calculation (divide by zero)
**Fix:** Rolled back to v1.0.9
**Impact:** ~3,000 failed requests, no data loss
**Post-Mortem:** Tomorrow 10am, #eng-all

Services are fully operational. Thank you! 🙏
```

---

## Post-Mortem Process

**Within 24 hours:**
1. Write incident report (see template)
2. Schedule post-mortem meeting (30-60 min)
3. Invite: incident lead, on-call, relevant eng, PM

**Post-Mortem Meeting Agenda:**
1. Timeline of events (5 min)
2. Root cause analysis (10 min)
3. What went well? (5 min)
4. What could be improved? (10 min)
5. Action items (10 min)

**Action Items:**
- Assign owners
- Set deadlines
- Track in GitHub issues
- Follow up in 1 week

**Post-Mortem Template:**
See `/docs/templates/post-mortem.md`

---

## SLOs & Error Budget

### Service Level Objectives

| Metric | Target | Error Budget | Current |
|--------|--------|--------------|---------|
| Uptime | 99.5% | 3.6h/month | 99.7% |
| Error Rate | <1.5% | 1.5% errors | 0.8% |
| P95 Latency | <700ms | 30% over budget | 450ms |
| Trust Score | ≥80 | 5 points buffer | 85 |

**Error Budget Policy:**
- ✅ **In Budget:** Ship fast, take risks
- ⚠️ **Near Budget (>80% consumed):** Slow down, focus on reliability
- 🚨 **Over Budget:** Freeze features, fix reliability issues only

**Check Error Budget:**
```bash
pnpm run slo:check
```

---

## Useful Commands

```bash
# Health check
curl https://api.orca-mesh.io/health | jq

# Rollback
pnpm run release:rollback

# View logs
vercel logs --prod --follow

# Database status
pnpm run db:status

# Self-healing
pnpm run ops:self-heal

# Update status page
pnpm run status:update --message="All systems operational" --status=resolved

# Create incident
pnpm run incident:create --title="High error rate" --severity=p1
```

---

## Emergency Contacts

| Role | Name | Slack | Phone | Backup |
|------|------|-------|-------|--------|
| Primary On-Call | (Rotation) | @oncall | PagerDuty | @oncall-secondary |
| Secondary On-Call | (Rotation) | @oncall-secondary | PagerDuty | @sre-lead |
| SRE Lead | TBD | @sre-lead | +1-555-0100 | @cto |
| CTO | TBD | @cto | +1-555-0101 | N/A |

**Slack Channels:**
- `#oncall` - On-call discussions, questions
- `#incidents` - Active incidents only (keep signal high)
- `#eng-all` - General engineering updates

**PagerDuty:** https://orca-mesh.pagerduty.com

---

**Last Updated:** 2025-10-31  
**Next Review:** Quarterly

**Questions?** Slack #oncall or email sre@orca-mesh.io

**Good luck, and may your shift be quiet! 🤞**
