# Partner Enablement Guide

**Version:** 1.0  
**Last Updated:** 2025-10-30  
**Audience:** Reseller Partners, System Integrators, Solution Providers

---

## Welcome to the Mesh OS Partner Program

This guide provides everything you need to successfully deploy, manage, and monetize Mesh OS for your customers.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Partner Tiers & Benefits](#partner-tiers--benefits)
3. [Technical Onboarding](#technical-onboarding)
4. [Deploying Tenant Instances](#deploying-tenant-instances)
5. [Customization & Branding](#customization--branding)
6. [Billing & Commission](#billing--commission)
7. [Support & Escalation](#support--escalation)
8. [Partner SDK Reference](#partner-sdk-reference)
9. [Sample Integrations](#sample-integrations)
10. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- Active Mesh OS partner account
- API credentials (API key + Partner ID)
- Basic knowledge of REST APIs
- Node.js 18+ or Python 3.9+ (for SDK)

### Quick Start (5 minutes)

```bash
# Install Partner CLI
npm install -g @meshos/partner-cli

# Authenticate
partner-cli auth <your-api-key> <your-partner-id>

# Deploy your first tenant
partner-cli deploy "My First Customer" us-east-1 professional

# List tenants
partner-cli list
```

---

## Partner Tiers & Benefits

### Bronze Tier
**Requirements:** 0-9 active tenants

**Benefits:**
- 15% commission
- Standard support (email, 48-hour SLA)
- Access to partner portal
- Marketing materials
- Maximum 25 tenants

### Silver Tier
**Requirements:** 10-24 active tenants

**Benefits:**
- 20% commission
- Priority support (email + chat, 24-hour SLA)
- Co-marketing opportunities
- Dedicated partner success manager
- Partner training & certification
- Maximum 50 tenants

### Gold Tier ⭐
**Requirements:** 25-49 active tenants

**Benefits:**
- 25% commission
- Premium support (email + chat + phone, 12-hour SLA)
- Joint go-to-market initiatives
- Executive sponsorship
- Early access to new features
- Custom contract terms
- Maximum 100 tenants

### Platinum Tier 💎
**Requirements:** 50+ active tenants

**Benefits:**
- 30% commission
- White-glove support (24/7, 4-hour SLA)
- Strategic partnership agreement
- Custom pricing & packaging
- Product roadmap influence
- Unlimited tenants
- Revenue share opportunities

---

## Technical Onboarding

### Step 1: Get Your Credentials

1. Sign up at [partner.meshos.io/signup](https://partner.meshos.io/signup)
2. Complete partner agreement
3. Receive API credentials via email
4. Verify credentials:

```bash
partner-cli auth <api-key> <partner-id>
```

### Step 2: Choose Integration Method

**Option A: Partner CLI (Easiest)**
- Command-line tool for manual deployments
- Great for getting started
- No coding required

**Option B: JavaScript SDK**
- Programmatic tenant management
- Ideal for custom portals
- Node.js 18+

**Option C: Python SDK**
- Python-based automation
- Great for data pipelines
- Python 3.9+

**Option D: Direct API**
- Full REST API access
- Language-agnostic
- Maximum flexibility

### Step 3: Set Up Development Environment

```bash
# Clone sample integration
git clone https://github.com/meshos/partner-samples.git
cd partner-samples

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your credentials to .env
MESHOS_API_KEY=your-api-key
MESHOS_PARTNER_ID=your-partner-id
```

### Step 4: Deploy Test Tenant

```bash
# Deploy test tenant
npm run deploy:test

# Verify deployment
npm run verify
```

---

## Deploying Tenant Instances

### CLI Deployment

```bash
# Basic deployment
partner-cli deploy "Customer Name" us-east-1 professional

# With custom domain
partner-cli deploy "Customer Name" us-east-1 professional \
  --domain customer.example.com

# With branding
partner-cli deploy "Customer Name" us-east-1 enterprise \
  --color "#FF6B6B" \
  --logo "https://cdn.example.com/logo.png" \
  --company "Acme Corp"
```

### SDK Deployment (JavaScript)

```javascript
import MeshOSPartnerSDK from '@meshos/partner-sdk';

const sdk = new MeshOSPartnerSDK(
  process.env.API_KEY,
  process.env.PARTNER_ID
);

// Deploy tenant
const tenant = await sdk.deployTenant({
  name: 'Acme Corporation',
  region: 'us-east-1',
  plan: 'enterprise',
  domain: 'acme.meshos.io',
  branding: {
    primaryColor: '#FF6B6B',
    companyName: 'Acme Corporation',
    logo: 'https://acme.com/logo.png'
  }
});

console.log('Tenant ID:', tenant.id);
console.log('Dashboard URL:', tenant.endpoints.dashboard);
```

### SDK Deployment (Python)

```python
from meshos_partner_sdk import MeshOSPartnerSDK

sdk = MeshOSPartnerSDK(
    api_key=os.getenv('API_KEY'),
    partner_id=os.getenv('PARTNER_ID')
)

# Deploy tenant
tenant = sdk.deploy_tenant(
    name='Acme Corporation',
    region='us-east-1',
    plan='enterprise',
    domain='acme.meshos.io',
    branding={
        'primaryColor': '#FF6B6B',
        'companyName': 'Acme Corporation',
        'logo': 'https://acme.com/logo.png'
    }
)

print(f"Tenant ID: {tenant['id']}")
print(f"Dashboard: {tenant['endpoints']['dashboard']}")
```

### Deployment Time

- **Starter:** ~2 minutes
- **Professional:** ~3 minutes
- **Enterprise:** ~5 minutes

---

## Customization & Branding

### White-Label Configuration

```javascript
await sdk.updateBranding(tenantId, {
  colors: {
    primary: '#4F46E5',      // Main brand color
    secondary: '#9333EA',    // Accent color
    success: '#10B981',      // Success states
    warning: '#F59E0B',      // Warnings
    error: '#EF4444'         // Errors
  },
  assets: {
    logo: 'https://cdn.example.com/logo.svg',
    favicon: 'https://cdn.example.com/favicon.ico',
    loginBackground: 'https://cdn.example.com/login-bg.jpg'
  },
  content: {
    companyName: 'Your Company',
    supportEmail: 'support@yourcompany.com',
    supportPhone: '+1-555-0100',
    termsUrl: 'https://yourcompany.com/terms',
    privacyUrl: 'https://yourcompany.com/privacy'
  },
  customCSS: `
    /* Custom styling */
    .dashboard-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
  `
});
```

### Custom Domain Setup

1. **Create CNAME record:**
   ```
   app.customer.com  CNAME  tenants.meshos.io
   ```

2. **Update tenant configuration:**
   ```bash
   partner-cli domain-add tenant-123 app.customer.com
   ```

3. **SSL certificate:** Automatically provisioned via Let's Encrypt

---

## Billing & Commission

### Pricing Plans

| Plan | Monthly Price | Your Commission (Gold) |
|------|---------------|------------------------|
| Starter | $99 | $24.75 |
| Professional | $299 | $74.75 |
| Enterprise | $999 | $249.75 |

### Commission Structure

- **Recurring:** Monthly percentage of subscription
- **Payment Terms:** NET-30
- **Payment Method:** ACH, Wire Transfer, or PayPal
- **Minimum Payout:** $500

### Invoicing

Monthly partner invoices include:
- Total active tenants
- Revenue by plan
- Commission calculation
- Add-on revenue
- Usage overages

### Get Partner Metrics

```bash
# View partner dashboard
partner-cli metrics

# Example output:
📊 Partner Metrics:
   Total Tenants: 15
   Active: 14
   MRR: $4,485
   ARR: $53,820
   Commission: $1,121 (25%)
   Growth Rate: 18.5%
```

---

## Support & Escalation

### Partner Support Tiers

**Standard (Bronze/Silver):**
- Email: partner-support@meshos.io
- Response: 24-48 hours
- Hours: Business hours (9am-5pm PT, Mon-Fri)

**Priority (Gold):**
- Email + Chat
- Response: 12-24 hours
- Hours: Extended (7am-9pm PT, Mon-Fri)

**Premium (Platinum):**
- Email + Chat + Phone
- Response: 4-12 hours
- Hours: 24/7

### Customer Support

Partners handle Tier 1 support. Escalate to Mesh OS for:
- Platform bugs
- Service outages
- Security incidents
- Feature requests

### Escalation Process

1. **Tier 1 (Partner):** Basic troubleshooting, account management
2. **Tier 2 (Partner Support):** Technical issues, API questions
3. **Tier 3 (Engineering):** Platform bugs, critical incidents

---

## Partner SDK Reference

### Installation

```bash
# JavaScript/Node.js
npm install @meshos/partner-sdk

# Python
pip install meshos-partner-sdk
```

### Authentication

```javascript
import MeshOSPartnerSDK from '@meshos/partner-sdk';

const sdk = new MeshOSPartnerSDK(
  'your-api-key',
  'your-partner-id',
  {
    baseUrl: 'https://partner-api.meshos.io',  // Optional
    timeout: 30000  // Optional (30s default)
  }
);
```

### Core Methods

#### Tenant Management

```javascript
// Deploy tenant
await sdk.deployTenant(config);

// Get tenant details
await sdk.getTenant(tenantId);

// List all tenants
await sdk.listTenants({ status: 'active', region: 'us-east-1' });

// Update tenant
await sdk.updateTenant(tenantId, updates);

// Suspend tenant
await sdk.suspendTenant(tenantId, 'non-payment');

// Resume tenant
await sdk.resumeTenant(tenantId);

// Delete tenant
await sdk.deleteTenant(tenantId);
```

#### License Management

```javascript
// Issue license
await sdk.issueLicense(tenantId, {
  type: 'enterprise',
  duration: 365,  // days
  features: ['multi-region', 'sso', 'advanced-analytics'],
  maxUsers: 500,
  maxAgents: 1000
});

// Revoke license
await sdk.revokeLicense(licenseKey);
```

#### Branding

```javascript
// Update branding
await sdk.updateBranding(tenantId, brandingConfig);
```

#### Metrics & Analytics

```javascript
// Get partner metrics
const metrics = await sdk.getMetrics('current_month');

// Get tenant usage
const usage = await sdk.getTenantUsage(tenantId, '2025-10-01', '2025-10-31');

// Get billing info
const billing = await sdk.getBilling(tenantId);
```

---

## Sample Integrations

### Shopify Integration

Deploy Mesh OS automatically when customer subscribes to your Shopify app:

```javascript
// Shopify webhook handler
app.post('/webhooks/subscription-created', async (req, res) => {
  const { shop, customer } = req.body;
  
  // Deploy tenant
  const tenant = await sdk.deployTenant({
    name: shop.name,
    region: 'us-east-1',
    plan: 'professional',
    branding: {
      companyName: shop.name,
      logo: shop.logo
    }
  });
  
  // Store tenant ID
  await db.shops.update(shop.id, { tenantId: tenant.id });
  
  res.json({ success: true });
});
```

### Slack Integration

Send deployment notifications to Slack:

```javascript
async function deployWithNotifications(customerName) {
  // Send starting notification
  await slack.send(`🚀 Deploying Mesh OS for ${customerName}...`);
  
  try {
    const tenant = await sdk.deployTenant({
      name: customerName,
      region: 'us-east-1',
      plan: 'professional'
    });
    
    await slack.send(`✅ Deployment complete!
      Tenant ID: ${tenant.id}
      Dashboard: ${tenant.endpoints.dashboard}
    `);
    
    return tenant;
  } catch (error) {
    await slack.send(`❌ Deployment failed: ${error.message}`);
    throw error;
  }
}
```

### HubSpot CRM Integration

Sync tenant data to HubSpot:

```javascript
// Sync tenant to HubSpot
async function syncToHubSpot(tenant) {
  const hubspot = new HubSpotClient(process.env.HUBSPOT_API_KEY);
  
  await hubspot.crm.companies.createOrUpdate({
    properties: {
      name: tenant.name,
      meshos_tenant_id: tenant.id,
      meshos_plan: tenant.plan,
      meshos_mrr: tenant.billing.price,
      meshos_region: tenant.region,
      meshos_dashboard_url: tenant.endpoints.dashboard
    }
  });
}
```

---

## Best Practices

### Security

1. **API Key Protection**
   - Store in environment variables
   - Never commit to version control
   - Rotate keys quarterly

2. **Tenant Isolation**
   - Each customer gets dedicated tenant
   - No data sharing between tenants
   - Regional isolation for compliance

3. **Access Control**
   - Use RBAC for partner portal
   - Audit logs for all actions
   - MFA for partner accounts

### Performance

1. **Deployment**
   - Use nearest region to customer
   - Pre-validate inputs before deployment
   - Handle async deployments gracefully

2. **Monitoring**
   - Monitor tenant health regularly
   - Set up alerts for downtime
   - Track usage metrics

### Customer Success

1. **Onboarding**
   - Provide customer training
   - Share best practices documentation
   - Offer implementation services

2. **Support**
   - Respond to customer issues quickly
   - Escalate technical issues appropriately
   - Maintain knowledge base

3. **Growth**
   - Monitor customer usage
   - Identify upsell opportunities
   - Recommend appropriate plans

---

## Resources

### Documentation
- API Reference: https://docs.meshos.io/api
- SDK Documentation: https://docs.meshos.io/sdk
- Video Tutorials: https://youtube.com/meshos

### Community
- Partner Slack: https://partners-slack.meshos.io
- Partner Forum: https://forum.meshos.io/partners
- Monthly Office Hours: First Tuesday, 10am PT

### Support
- Email: partner-support@meshos.io
- Chat: partner.meshos.io (click support icon)
- Phone: 1-888-MESH-OS1 (Platinum partners)

---

## Appendix: API Endpoints

### Base URL
```
https://partner-api.meshos.io/v1
```

### Authentication
All requests require:
```
Authorization: Bearer <api-key>
X-Partner-ID: <partner-id>
```

### Endpoints
- `POST /tenants` - Deploy tenant
- `GET /tenants` - List tenants
- `GET /tenants/:id` - Get tenant details
- `PATCH /tenants/:id` - Update tenant
- `DELETE /tenants/:id` - Delete tenant
- `POST /licenses` - Issue license
- `GET /metrics` - Get partner metrics

---

**Need Help?**

Contact your Partner Success Manager or email partner-support@meshos.io

**Document Version:** 1.0  
**Last Updated:** 2025-10-30
