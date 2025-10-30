# Rollback Playbook

## Overview

This playbook provides step-by-step procedures for rolling back deployments in the Mesh OS multi-region environment.

## Table of Contents

1. [Pre-Rollback Checklist](#pre-rollback-checklist)
2. [Automated Rollback](#automated-rollback)
3. [Manual Rollback Procedures](#manual-rollback-procedures)
4. [Region-Specific Rollback](#region-specific-rollback)
5. [Database Rollback](#database-rollback)
6. [Post-Rollback Verification](#post-rollback-verification)
7. [Communication](#communication)

---

## Pre-Rollback Checklist

Before initiating a rollback, verify:

- [ ] Incident has been confirmed and documented
- [ ] Rollback decision has been approved by on-call engineer or manager
- [ ] Current deployment version is known
- [ ] Target rollback version is identified
- [ ] Customer impact is assessed
- [ ] Communication has been sent to stakeholders
- [ ] Backup of current state has been captured (if time permits)

## Automated Rollback

### Canary Deployment Auto-Rollback

The canary deployment system automatically rolls back if:

- Error rate exceeds baseline + 0.5%
- Latency P95 exceeds baseline × 1.5
- CPU usage exceeds 90%
- Memory usage exceeds 90%

**Trigger automatic rollback:**

```bash
# Rollback is automatic during canary deployment
# Monitor progress:
node deploy_canary.mjs --region us-east-1

# Manual trigger if needed:
node scripts/rollback-canary.mjs --region us-east-1 --reason "Manual trigger"
```

### CI/CD Pipeline Rollback

**Via GitHub Actions:**

1. Navigate to Actions tab in repository
2. Find the deployment workflow run
3. Click "Re-run jobs" on the previous successful deployment
4. Select regions to rollback
5. Monitor deployment progress

## Manual Rollback Procedures

### Application Rollback

**AWS ECS:**

```bash
# Get previous task definition
PREVIOUS_TASK_DEF=$(aws ecs describe-services \
  --cluster meshos-${REGION} \
  --services meshos-api \
  --query 'services[0].deployments[1].taskDefinition' \
  --output text)

# Update service to previous task definition
aws ecs update-service \
  --cluster meshos-${REGION} \
  --service meshos-api \
  --task-definition ${PREVIOUS_TASK_DEF} \
  --force-new-deployment

# Wait for deployment to stabilize
aws ecs wait services-stable \
  --cluster meshos-${REGION} \
  --services meshos-api
```

**Kubernetes:**

```bash
# Rollback deployment
kubectl rollout undo deployment/meshos-api -n production

# Check rollout status
kubectl rollout status deployment/meshos-api -n production

# Verify pods are running
kubectl get pods -n production -l app=meshos-api
```

### Container Image Rollback

```bash
# Tag previous known-good image
docker tag meshos/mesh-kernel:sha-abc123 meshos/mesh-kernel:latest

# Push to registry
docker push meshos/mesh-kernel:latest

# Trigger deployment with previous image
node deploy_canary.mjs --image meshos/mesh-kernel:sha-abc123
```

### Load Balancer Rollback

**AWS ALB Target Groups:**

```bash
# Shift 100% traffic back to stable target group
aws elbv2 modify-listener \
  --listener-arn ${LISTENER_ARN} \
  --default-actions Type=forward,TargetGroupArn=${STABLE_TARGET_GROUP_ARN}

# Verify traffic distribution
aws elbv2 describe-target-health \
  --target-group-arn ${STABLE_TARGET_GROUP_ARN}
```

### DNS Rollback

```bash
# Update Route53 to point to previous endpoint
aws route53 change-resource-record-sets \
  --hosted-zone-id ${ZONE_ID} \
  --change-batch file://rollback-dns.json

# rollback-dns.json:
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "api.meshos.io",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "${ALB_ZONE_ID}",
        "DNSName": "${PREVIOUS_ALB_DNS}",
        "EvaluateTargetHealth": true
      }
    }
  }]
}
```

## Region-Specific Rollback

### Single Region Rollback

When rolling back a single region while keeping others running:

```bash
# Rollback specific region
./scripts/rollback-region.sh us-east-1

# Verify other regions remain healthy
node SLA_dashboard.mjs --check-all-regions

# Update federation routing to exclude rolled-back region
node federation_manager.mjs --exclude-region us-east-1
```

### Multi-Region Rollback

For rolling back all regions:

```bash
# Execute parallel rollback across regions
regions=("us-east-1" "us-west-2" "eu-west-1" "eu-central-1")

for region in "${regions[@]}"; do
  echo "Rolling back $region..."
  ./scripts/rollback-region.sh $region &
done

wait
echo "All regions rolled back"
```

## Database Rollback

### Schema Rollback

```bash
# Rollback database migration
npm run migrate:rollback

# Or manually with specific migration
npm run migrate:down -- --name 20251030_add_feature_column

# Verify schema version
npm run migrate:status
```

### Data Rollback

**From Backup:**

```bash
# List available backups
aws rds describe-db-snapshots \
  --db-instance-identifier meshos-db-${REGION}

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier meshos-db-${REGION}-restored \
  --db-snapshot-identifier ${SNAPSHOT_ID}

# Update connection strings to point to restored instance
kubectl set env deployment/meshos-api \
  DATABASE_URL="postgresql://restored-db-endpoint"
```

**Point-in-Time Recovery:**

```bash
# Restore to specific timestamp
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier meshos-db-${REGION} \
  --target-db-instance-identifier meshos-db-${REGION}-restored \
  --restore-time 2025-10-30T10:00:00Z
```

## Post-Rollback Verification

### Health Checks

```bash
# Check all region health
node SLA_dashboard.mjs

# Run smoke tests
npm run test:smoke -- --region us-east-1

# Verify API endpoints
curl -f https://us-east-1.meshos.io/health
curl -f https://us-east-1.meshos.io/api/v1/status
```

### Metrics Verification

Monitor for 15-30 minutes:

- **Error Rate**: Should return to < 0.1%
- **Latency P95**: Should return to baseline (< 200ms)
- **Request Rate**: Should stabilize at normal levels
- **CPU/Memory**: Should be < 70%

```bash
# Check metrics dashboard
open https://grafana.meshos.io/d/rollback-verification

# Query Prometheus metrics
curl -g 'http://prometheus.meshos.io/api/v1/query?query=http_request_duration_seconds{job="meshos-api",quantile="0.95"}'
```

### Customer Impact Assessment

```bash
# Check for customer-reported issues
node scripts/check-customer-issues.mjs --since "30 minutes ago"

# Review error logs
aws logs tail /aws/ecs/meshos-api --follow --since 30m
```

## Communication

### During Rollback

**Slack Announcement:**

```
🔄 ROLLBACK IN PROGRESS
Region: us-east-1
Reason: High error rate detected
Started: 10:15 UTC
ETA: 10:20 UTC
Status updates every 2 minutes
```

### After Rollback

**Incident Report Template:**

```markdown
## Incident Summary

- **Incident ID**: INC-20251030-001
- **Severity**: High
- **Affected Region(s)**: us-east-1
- **Duration**: 10:00 UTC - 10:25 UTC (25 minutes)
- **Customer Impact**: ~150 customers experienced elevated error rates

## Timeline

- 10:00 UTC: Deployment v2.5.0 completed
- 10:05 UTC: Alert triggered - error rate 5%
- 10:08 UTC: Decision to rollback
- 10:10 UTC: Rollback initiated
- 10:20 UTC: Rollback completed
- 10:25 UTC: Health checks passing

## Root Cause

[To be completed after investigation]

## Resolution

Rolled back to v2.4.9 using automated rollback procedure.

## Follow-up Actions

- [ ] Complete root cause analysis
- [ ] Fix identified bug
- [ ] Add additional test coverage
- [ ] Update deployment procedures
- [ ] Schedule post-mortem meeting
```

### Stakeholder Communication

**Email Template:**

```
Subject: [RESOLVED] Service Incident - Region us-east-1

We experienced a service disruption in the us-east-1 region from 10:00-10:25 UTC.

Impact: Approximately 150 customers may have experienced elevated error rates.

Resolution: We rolled back to the previous stable version and all systems are now operating normally.

We are conducting a thorough investigation and will provide a detailed post-mortem within 48 hours.

If you experienced any issues, please contact support@meshos.io.
```

## Rollback Decision Matrix

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | > 1% | Monitor closely |
| Error Rate | > 5% | Initiate rollback |
| Latency P95 | > 2x baseline | Monitor closely |
| Latency P95 | > 3x baseline | Initiate rollback |
| Customer Reports | > 5 in 5 min | Investigate immediately |
| Customer Reports | > 20 in 5 min | Initiate rollback |
| SLA Violation | Any | Initiate rollback |
| Data Corruption | Any | Stop all deployments, escalate |

## Emergency Contacts

- **On-Call Engineer**: PagerDuty #mesh-os-oncall
- **Engineering Manager**: Slack @eng-manager
- **VP Engineering**: Slack @vp-engineering
- **Security Team**: Slack #security-incidents
- **Support Team**: Slack #customer-support

## Additional Resources

- [Federation Manager Documentation](./federation_manager.mjs)
- [SLA Dashboard](./SLA_dashboard.mjs)
- [Canary Deployment](./deploy_canary.mjs)
- [Regional Pipeline](./region_pipeline.yaml)
- [Runbook Repository](https://github.com/meshos/runbooks)
