# AI-Agent Mesh Deployment Playbook

**Document Version:** 1.0  
**Last Updated:** 2025-10-30  
**Classification:** Operations  
**Status:** Production Ready  

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Local Development Setup](#2-local-development-setup)
3. [Docker Compose Deployment](#3-docker-compose-deployment)
4. [Kubernetes Deployment](#4-kubernetes-deployment)
5. [Cloud Provider Deployment](#5-cloud-provider-deployment)
6. [Post-Deployment Verification](#6-post-deployment-verification)
7. [Monitoring Setup](#7-monitoring-setup)
8. [Backup & Recovery](#8-backup--recovery)
9. [Scaling Guidelines](#9-scaling-guidelines)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Pre-Deployment Checklist

### 1.1 Infrastructure Requirements

**Minimum Requirements (Small Deployment: 1-50 agents)**
- **Compute:** 8 vCPUs, 16GB RAM
- **Storage:** 100GB SSD
- **Network:** 1Gbps bandwidth
- **Database:** PostgreSQL 14+ (RDS or equivalent)
- **Cache:** Redis 7+ (ElastiCache or equivalent)

**Recommended Requirements (Medium Deployment: 50-500 agents)**
- **Compute:** 32 vCPUs, 64GB RAM (distributed across services)
- **Storage:** 500GB SSD, 5TB object storage (S3/GCS)
- **Network:** 10Gbps bandwidth
- **Database:** PostgreSQL 14+ with read replicas
- **Cache:** Redis 7+ cluster mode

**Enterprise Requirements (Large Deployment: 500+ agents)**
- **Compute:** 128+ vCPUs, 256GB+ RAM (multi-region)
- **Storage:** 2TB+ SSD, 50TB+ object storage
- **Network:** 100Gbps (multi-region)
- **Database:** PostgreSQL 14+ with multi-region replication
- **Cache:** Redis 7+ cluster with multi-AZ

### 1.2 External Dependencies

- [ ] **AI Model API Keys** (OpenAI, Anthropic, etc.)
- [ ] **Vector Database** (Pinecone, Weaviate, or self-hosted FAISS)
- [ ] **Identity Provider** (Okta, Auth0, Azure AD)
- [ ] **Monitoring** (Prometheus, Grafana, Datadog)
- [ ] **Alerting** (Slack, PagerDuty, email SMTP)
- [ ] **Object Storage** (AWS S3, Azure Blob, GCS)
- [ ] **Domain & SSL Certificates**

### 1.3 Security Setup

- [ ] Generate JWT secret (32+ characters)
- [ ] Generate encryption keys (AES-256)
- [ ] Configure OAuth/OIDC provider
- [ ] Set up WAF rules
- [ ] Configure network security groups/firewalls
- [ ] Enable audit logging
- [ ] Set up secret management (AWS Secrets Manager, Vault)

---

## 2. Local Development Setup

### 2.1 Prerequisites

```bash
# Required software
- Node.js 20+
- Docker 24+
- Docker Compose 2.0+
- Git
```

### 2.2 Clone and Setup

```bash
# Clone repository
git clone https://github.com/your-org/ai-agent-mesh.git
cd ai-agent-mesh

# Copy environment template
cp .env.template .env

# Edit .env with your configuration
nano .env

# Install dependencies for each service
cd src/registry && npm install && cd ../..
cd src/telemetry && npm install && cd ../..
cd src/policy && npm install && cd ../..
cd src/api && npm install && cd ../..
cd src/federation && npm install && cd ../..
cd src/ui && npm install && cd ../..
```

### 2.3 Start Development Environment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health

# Access UI
open http://localhost:3005
```

---

## 3. Docker Compose Deployment

### 3.1 Production Docker Compose

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Start services
docker-compose -f docker-compose.yml up -d

# Monitor startup
docker-compose ps
docker-compose logs -f api-gateway

# Verify health
./scripts/health-check.sh
```

### 3.2 Update Deployment

```bash
# Pull latest images
docker-compose pull

# Recreate containers with zero downtime
docker-compose up -d --no-deps --build api-gateway
docker-compose up -d --no-deps --build registry
# Repeat for other services

# Clean up old images
docker image prune -f
```

---

## 4. Kubernetes Deployment

### 4.1 Create Namespace

```bash
kubectl create namespace ai-mesh
kubectl config set-context --current --namespace=ai-mesh
```

### 4.2 Deploy with Helm (Recommended)

```bash
# Add Helm repository
helm repo add ai-mesh https://charts.ai-mesh.io
helm repo update

# Install with custom values
helm install ai-mesh ai-mesh/ai-agent-mesh \
  --namespace ai-mesh \
  --values values.yaml \
  --wait

# Verify deployment
kubectl get pods
kubectl get services
kubectl get ingress
```

### 4.3 Manual Kubernetes Deployment

```bash
# Deploy services
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/registry.yaml
kubectl apply -f k8s/telemetry.yaml
kubectl apply -f k8s/policy.yaml
kubectl apply -f k8s/federation.yaml
kubectl apply -f k8s/api-gateway.yaml
kubectl apply -f k8s/ui.yaml
kubectl apply -f k8s/ingress.yaml

# Check rollout status
kubectl rollout status deployment/api-gateway
kubectl rollout status deployment/registry
kubectl rollout status deployment/telemetry
kubectl rollout status deployment/policy
kubectl rollout status deployment/federation
kubectl rollout status deployment/ui
```

### 4.4 Update Kubernetes Deployment

```bash
# Update image
kubectl set image deployment/api-gateway \
  api-gateway=ghcr.io/your-org/ai-mesh-api:v1.1.0

# Watch rollout
kubectl rollout status deployment/api-gateway

# Rollback if needed
kubectl rollout undo deployment/api-gateway
```

---

## 5. Cloud Provider Deployment

### 5.1 AWS Deployment

#### 5.1.1 ECS Fargate

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name ai-mesh-prod

# Create task definitions
aws ecs register-task-definition --cli-input-json file://ecs/api-gateway-task.json
aws ecs register-task-definition --cli-input-json file://ecs/registry-task.json
# ... repeat for other services

# Create services
aws ecs create-service --cli-input-json file://ecs/api-gateway-service.json
# ... repeat for other services

# Verify
aws ecs list-services --cluster ai-mesh-prod
```

#### 5.1.2 EKS (Elastic Kubernetes Service)

```bash
# Create EKS cluster
eksctl create cluster \
  --name ai-mesh-prod \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed

# Deploy with Helm (see section 4.2)
helm install ai-mesh ai-mesh/ai-agent-mesh --namespace ai-mesh
```

### 5.2 Azure Deployment

#### 5.2.1 Azure Container Instances (ACI)

```bash
# Create resource group
az group create --name ai-mesh-prod --location eastus

# Create container group
az container create \
  --resource-group ai-mesh-prod \
  --name ai-mesh \
  --image ghcr.io/your-org/ai-mesh-api:latest \
  --cpu 4 \
  --memory 8 \
  --restart-policy Always \
  --environment-variables NODE_ENV=production

# Repeat for other services
```

#### 5.2.2 AKS (Azure Kubernetes Service)

```bash
# Create AKS cluster
az aks create \
  --resource-group ai-mesh-prod \
  --name ai-mesh-cluster \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-managed-identity \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group ai-mesh-prod --name ai-mesh-cluster

# Deploy with Helm (see section 4.2)
```

### 5.3 Google Cloud Deployment

#### 5.3.1 Cloud Run

```bash
# Deploy services
gcloud run deploy api-gateway \
  --image gcr.io/your-project/ai-mesh-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2

# Repeat for other services
```

#### 5.3.2 GKE (Google Kubernetes Engine)

```bash
# Create GKE cluster
gcloud container clusters create ai-mesh-prod \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-4 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10

# Get credentials
gcloud container clusters get-credentials ai-mesh-prod --zone us-central1-a

# Deploy with Helm (see section 4.2)
```

---

## 6. Post-Deployment Verification

### 6.1 Health Checks

```bash
#!/bin/bash
# health-check.sh

SERVICES=(
  "http://api-gateway:3000/health"
  "http://registry:3001/health"
  "http://telemetry:3002/health"
  "http://policy:3003/health"
  "http://federation:3004/health"
)

for service in "${SERVICES[@]}"; do
  response=$(curl -s -o /dev/null -w "%{http_code}" $service)
  if [ $response -eq 200 ]; then
    echo "✅ $service is healthy"
  else
    echo "❌ $service returned $response"
    exit 1
  fi
done

echo "✅ All services are healthy"
```

### 6.2 Smoke Tests

```bash
# Test agent registration
curl -X POST http://api-gateway:3000/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"test-agent","type":"chatbot","vendor":"openai","model":"gpt-4"}'

# Test policy evaluation
curl -X POST http://policy:3003/api/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{"request":{"prompt":"Hello"},"context":{"user_id":"test"}}'

# Test telemetry
curl -X POST http://telemetry:3002/api/v1/metrics \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"test","metric_type":"requests","value":1}'

# Verify GraphQL
curl http://api-gateway:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ agents { count } }"}'
```

---

## 7. Monitoring Setup

### 7.1 Prometheus Configuration

Already configured in `prometheus.yml`. Access at:
- **Prometheus UI:** http://prometheus:9090
- **Grafana:** http://grafana:3100

### 7.2 Key Metrics to Monitor

- **Request Rate:** `ai_mesh_requests_total`
- **Error Rate:** `ai_mesh_errors_total / ai_mesh_requests_total`
- **Latency:** `histogram_quantile(0.95, ai_mesh_latency_seconds_bucket)`
- **Agent Count:** `ai_mesh_agents_total`
- **Policy Violations:** `ai_mesh_policy_violations_total`

### 7.3 Alerting Rules

Configure in Prometheus `alert.rules.yml`:

```yaml
groups:
  - name: ai_mesh_alerts
    rules:
      - alert: HighErrorRate
        expr: (rate(ai_mesh_errors_total[5m]) / rate(ai_mesh_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%"
```

---

## 8. Backup & Recovery

### 8.1 Database Backup

```bash
# PostgreSQL backup
pg_dump -h postgres -U mesh mesh_registry > backup_$(date +%Y%m%d).sql

# Automated daily backup
0 2 * * * /usr/local/bin/backup-db.sh
```

### 8.2 Configuration Backup

```bash
# Backup mcp_registry.yaml
kubectl get configmap mcp-registry -o yaml > backup/mcp-registry.yaml

# Backup secrets (encrypted)
kubectl get secrets -o yaml > backup/secrets.yaml.enc
```

### 8.3 Disaster Recovery

**Recovery Time Objective (RTO):** < 30 minutes  
**Recovery Point Objective (RPO):** < 1 hour

```bash
# Restore database
psql -h postgres -U mesh mesh_registry < backup_20251030.sql

# Redeploy services
kubectl apply -f k8s/
kubectl rollout restart deployment/api-gateway
```

---

## 9. Scaling Guidelines

### 9.1 Horizontal Scaling (Kubernetes)

```bash
# Manual scaling
kubectl scale deployment api-gateway --replicas=5

# Autoscaling
kubectl autoscale deployment api-gateway \
  --min=2 \
  --max=10 \
  --cpu-percent=70
```

### 9.2 Vertical Scaling

Update resource limits in deployment YAML:

```yaml
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

---

## 10. Troubleshooting

### 10.1 Common Issues

**Issue:** Service won't start  
**Solution:** Check logs for missing environment variables

```bash
docker-compose logs api-gateway
kubectl logs deployment/api-gateway
```

**Issue:** Database connection failed  
**Solution:** Verify DATABASE_URL and network connectivity

```bash
kubectl exec -it api-gateway-pod -- env | grep DATABASE_URL
psql $DATABASE_URL
```

**Issue:** High latency  
**Solution:** Check cache hit rate and database query performance

```bash
# Check Redis
redis-cli INFO stats
# Check PostgreSQL slow queries
psql -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

---

**Document Owner:** DevOps Team  
**Review Cycle:** Quarterly  
**Next Update:** 2026-01-30
