# Security Baseline & Hardening Guide

**Version:** 1.0  
**Last Updated:** 2025-10-31  
**Compliance:** SOC 2, ISO 27001, NIST CSF

---

## Overview

This document defines ORCA's security baseline configuration and hardening requirements for production deployments.

---

## Encryption Standards

### Data in Transit
- **TLS 1.3** for all external communication
- **TLS 1.2 minimum** for backward compatibility
- **Certificate Management:** Let's Encrypt with auto-renewal
- **Perfect Forward Secrecy (PFS):** Required

### Data at Rest
- **Database:** AES-256-GCM encryption
- **Backups:** AES-256 with separate key management
- **Logs:** Encrypted at rest in S3/GCS
- **Secrets:** AWS KMS / HashiCorp Vault

---

## Authentication & Authorization

### User Authentication
- **Multi-Factor Authentication (MFA):** Required for all users
- **Password Policy:**
  - Minimum 12 characters
  - Complexity: uppercase, lowercase, numbers, symbols
  - No dictionary words
  - 90-day expiration (enterprise)
  - 10 failed login attempts → account lock

### API Authentication
- **API Keys:** SHA-256 hashed, scoped by resource
- **OAuth 2.0:** Authorization code flow with PKCE
- **JWT Tokens:** RS256 algorithm, 1-hour expiration
- **Service Accounts:** Rotated every 90 days

### SSO Integration (Enterprise)
- **SAML 2.0:** Okta, Azure AD, Google Workspace
- **OIDC:** Auth0, Keycloak
- **Just-In-Time (JIT) Provisioning:** Supported

---

## Network Security

### Firewall Rules
- **Ingress:** Only ports 443 (HTTPS), 22 (SSH with key-only)
- **Egress:** Restricted to known service endpoints
- **IP Allowlisting:** Optional for enterprise customers

### DDoS Protection
- **Cloudflare:** Layer 7 protection
- **Rate Limiting:** 100 req/sec per IP (burst: 500)
- **Auto-scaling:** Handles traffic spikes

### VPN / Private Link
- **AWS PrivateLink:** Available for enterprise
- **VPN:** Site-to-site for on-premises integration

---

## Access Control

### RBAC Model
- **Roles:** Admin, Developer, Viewer, Auditor
- **Principle of Least Privilege:** Enforced via OPA
- **Just-In-Time Access:** For production systems

### Audit Logging
- **All Access:** Logged with timestamp, user, resource, action
- **Retention:** 90 days (SOC 2 requirement)
- **Immutable Logs:** Write-once, append-only

---

## Vulnerability Management

### Scanning Frequency
- **Dependencies:** Daily (npm audit, Snyk)
- **Code:** On every commit (CodeQL)
- **Infrastructure:** Weekly (Trivy, Checkov)
- **Penetration Testing:** Annual (external firm)

### Patching SLA
- **Critical:** 24 hours
- **High:** 7 days
- **Medium:** 30 days
- **Low:** 90 days

---

## Incident Response

### Severity Levels
- **P0 (Critical):** Data breach, complete outage
- **P1 (High):** Partial outage, security vulnerability
- **P2 (Medium):** Degraded performance, non-critical bug
- **P3 (Low):** Minor issue, cosmetic bug

### Response SLA
- **P0:** 15 minutes
- **P1:** 1 hour
- **P2:** 4 hours
- **P3:** 24 hours

---

## Compliance Controls

### SOC 2 Type II
- **Certified:** Yes (2025-09-15)
- **Auditor:** Prescient Assurance
- **Next Audit:** 2026-01-15

### ISO 27001
- **Certified:** Yes (2025-09-01)
- **Certifying Body:** BSI
- **Next Audit:** 2026-03-01

### GDPR
- **Compliant:** Yes
- **DPO:** dpo@orca-mesh.io
- **Data Subject Requests:** support@orca-mesh.io

---

## Hardening Checklist

- [ ] TLS 1.3 enabled on all endpoints
- [ ] MFA enforced for all accounts
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] Database encryption at rest enabled
- [ ] Automated backups configured (daily, 90-day retention)
- [ ] Firewall rules restricted to necessary ports only
- [ ] SSH key-based auth only (no passwords)
- [ ] Secrets stored in KMS/Vault (not in code)
- [ ] Log aggregation configured (centralized logging)
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented
- [ ] DR/BC plan tested quarterly

---

**Owner:** Security Team  
**Review Cycle:** Quarterly
