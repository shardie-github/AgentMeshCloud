# ORCA Partner Integration Guide

**Version:** 1.0  
**Last Updated:** 2025-10-31

---

## Overview

Become an ORCA Partner and integrate AI agent governance into your platform, app, or service.

---

## Partner Tiers

### Sandbox (Free)
Perfect for testing and development.

**Includes:**
- Read-only API access
- 1,000 API calls/day
- 1 sandbox tenant with demo data
- Documentation & community support

**Get Started:** https://partners.orca-mesh.io/signup

### Integration Partner ($199/month)
Commercial integrations and apps.

**Includes:**
- Full API access (read + write)
- 100,000 API calls/day
- Up to 100 customer tenants
- Technical support
- Partner directory listing
- Co-marketing opportunities

### OEM / White-Label (Custom Pricing)
Resell ORCA under your brand.

**Includes:**
- Unlimited API access
- Unlimited customer tenants
- White-label deployment
- Custom branding
- Revenue sharing (70/30 split)
- Dedicated support
- Multi-tenant admin portal

**Contact:** partners@orca-mesh.io

---

## Quick Start

### 1. Sign Up
Create account: https://partners.orca-mesh.io/signup

### 2. Generate API Key
```bash
curl -X POST https://api.orca-mesh.io/partner/keys \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"name": "My Integration", "tier": "sandbox"}'
```

### 3. Make First API Call
```bash
curl https://api.orca-mesh.io/partner/agents \
  -H "X-API-Key: pk_live_sandbox_..."
```

---

## API Reference

### Authentication
All requests require `X-API-Key` header:

```bash
X-API-Key: pk_live_{tier}_{key}
```

### Endpoints

#### List Agents
```bash
GET /api/partner/agents
```

**Response:**
```json
{
  "data": [
    {
      "id": "agent_001",
      "name": "Customer Support Bot",
      "type": "chatbot",
      "trust_score": 92,
      "status": "active"
    }
  ],
  "metadata": {
    "partner_id": "partner_001",
    "tenant_id": "tenant_001",
    "total": 1
  }
}
```

#### Get KPIs
```bash
GET /api/partner/kpis
```

**Response:**
```json
{
  "data": {
    "trust_score": 85,
    "risk_avoided_usd": 51000,
    "incidents_total": 45,
    "incidents_avoided": 12
  }
}
```

#### Report Incident
```bash
POST /api/partner/incidents
Content-Type: application/json

{
  "agent_id": "agent_001",
  "type": "policy_violation",
  "severity": "high",
  "description": "PII detected in logs"
}
```

---

## Rate Limits

| Tier | Limit | Burst |
|------|-------|-------|
| Sandbox | 1,000/day | 10/sec |
| Integration | 100,000/day | 100/sec |
| OEM | Unlimited | 500/sec |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1635724800
```

---

## Sandbox Environment

**URL:** https://sandbox-api.orca-mesh.io

**Features:**
- Pre-seeded demo data
- Resets daily at 2 AM UTC
- Safe for testing (no real integrations)
- Identical API to production

---

## Error Handling

**Error Response Format:**
```json
{
  "error": "Insufficient permissions",
  "required_scope": "agents:write",
  "available_scopes": ["agents:read", "kpis:read"]
}
```

**Common Error Codes:**
- `401`: Invalid or missing API key
- `403`: Insufficient permissions
- `429`: Rate limit exceeded
- `500`: Server error

---

## Best Practices

1. **Cache responses** where possible (KPIs update hourly)
2. **Handle rate limits** gracefully with exponential backoff
3. **Validate data** before sending to API
4. **Use webhooks** for real-time updates (coming soon)
5. **Test in sandbox** before going to production

---

## Postman Collection

Import our Postman collection for easy testing:

**Download:** https://partners.orca-mesh.io/postman.json

---

## Support

**Documentation:** https://docs.orca-mesh.io/partners

**Slack:** #partners channel (invite on signup)

**Email:** partners@orca-mesh.io

**Office Hours:** Tuesdays 2-3 PM PT

---

## Marketplace Listing

Get listed in ORCA Marketplace:

1. Build integration
2. Test in sandbox
3. Submit listing form
4. Review (3-5 business days)
5. Go live!

**Requirements:**
- Logo (512×512 PNG)
- 3 screenshots
- 90-second demo video
- Description (50-200 words)

---

**Ready to start?** Sign up at https://partners.orca-mesh.io/signup
