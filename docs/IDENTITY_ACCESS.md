# Identity & Access Management

This document describes ORCA's identity, authentication, and access control systems for enterprise deployments.

## Overview

ORCA implements defense-in-depth security with multiple layers:

1. **SSO/OIDC Authentication** - Enterprise identity integration
2. **RBAC** - Role-based access control with 4 standard roles
3. **Secrets Management** - Centralized secrets via bridge pattern
4. **HMAC API Authentication** - Secure API key management
5. **Signed URLs** - Time-limited access to sensitive resources

## Authentication Methods

### 1. OIDC SSO (Human Users)

**Implementation**: `src/security/auth_oidc.ts`

Supports standard OIDC providers:
- Auth0
- Okta
- Azure AD
- Google Workspace
- Keycloak

**Configuration** (via secrets bridge):
```env
OIDC_ISSUER=https://auth.example.com
OIDC_CLIENT_ID=orca-platform
OIDC_CLIENT_SECRET=<secret>
OIDC_REDIRECT_URI=https://orca.example.com/auth/callback
OIDC_ROLE_CLAIM=roles  # JWT claim containing user roles
```

**Flow**:
1. User clicks "Sign in with SSO"
2. Redirect to `oidcProvider.getAuthorizationUrl(state)`
3. User authenticates with IdP
4. IdP redirects to callback with authorization code
5. Exchange code for tokens: `oidcProvider.exchangeCodeForTokens(code)`
6. Verify ID token: `oidcProvider.verifyIdToken(idToken)`
7. Extract roles and issue session

**JWT Claims**:
```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "name": "Jane Doe",
  "roles": ["admin", "analyst"],
  "iss": "https://auth.example.com",
  "exp": 1234567890
}
```

### 2. HMAC API Keys (Machine-to-Machine)

**Implementation**: `src/security/hmac.ts`

For programmatic access (integrations, CLI, scripts).

**Request Signing**:
```typescript
import { computeSignature } from '@/security/hmac.js';

const signature = computeSignature(
  secret,
  'POST',
  '/api/workflows',
  Date.now().toString(),
  JSON.stringify(body)
);

// Include headers:
headers['x-api-key'] = apiKey;
headers['x-signature'] = signature;
headers['x-timestamp'] = timestamp;
```

**Signature Verification**:
- Timestamp freshness: ±5 minutes (prevents replay attacks)
- Constant-time comparison (prevents timing attacks)
- Signature = HMAC-SHA256(secret, method + path + timestamp + body)

**Middleware**:
```typescript
router.post('/api/workflows', requireHMAC(), async (req, res) => {
  // req.apiKey and req.tenantId available
});
```

## Authorization (RBAC)

**Implementation**: `src/security/rbac.ts`

### Roles & Permissions

| Role     | Description                           | Permissions                          |
|----------|---------------------------------------|--------------------------------------|
| `owner`  | Full system access                    | `*:admin`                           |
| `admin`  | Org management, all workflows/reports | workflows, agents, reports, settings |
| `analyst`| View workflows, create reports        | workflows:read, reports:write        |
| `viewer` | Read-only access                      | workflows:read, reports:read         |

### Permission Model

Format: `resource:action`

**Actions** (hierarchical):
- `read` - View resource
- `write` - Create/update resource (includes read)
- `delete` - Remove resource (includes write)
- `admin` - Full control (includes all)

**Resources**:
- `workflows` - Workflow definitions
- `agents` - Agent registry
- `reports` - UADSI reports & dashboards
- `settings` - Platform configuration
- `users` - User management
- `billing` - Billing & quotas

### Middleware Usage

**Require Authentication**:
```typescript
router.get('/api/workflows', requireAuth(), async (req, res) => {
  const user = req.user; // UserToken
});
```

**Require Role**:
```typescript
router.post('/api/settings',
  requireAuth(),
  requireRole('owner', 'admin'),
  async (req, res) => { ... }
);
```

**Require Permission**:
```typescript
router.delete('/api/workflows/:id',
  requireAuth(),
  requirePermission('workflows', 'delete'),
  async (req, res) => { ... }
);
```

**Require Ownership** (multi-tenant):
```typescript
router.put('/api/workflows/:id',
  requireAuth(),
  requireOwnership((req) => getWorkflowOwnerId(req.params.id)),
  async (req, res) => { ... }
);
```

## Secrets Management

**Implementation**: `src/security/secrets_bridge.ts`

All secrets MUST be accessed via the secrets bridge (enforced by lint rule).

### Providers

1. **Supabase KMS** (production) - `SECRETS_PROVIDER=supabase-kms`
2. **Environment Variables** (fallback/dev) - Default

### Usage

**Synchronous** (from cache):
```typescript
import { secretsBridge } from '@/security/secrets_bridge.js';

const apiKey = secretsBridge.get('STRIPE_API_KEY');
const dbUrl = secretsBridge.get('DATABASE_URL', 'postgres://localhost/orca');
```

**Asynchronous** (fresh fetch):
```typescript
const secret = await secretsBridge.getAsync('WEBHOOK_SECRET');
```

**Validation**:
```typescript
const required = secretsBridge.getRequired([
  'DATABASE_URL',
  'JWT_SECRET',
  'OIDC_CLIENT_SECRET'
]);
```

**Audit**:
```typescript
const stats = secretsBridge.getAccessStats();
// { "DATABASE_URL": 42, "JWT_SECRET": 156, ... }
```

### Migration from process.env

**❌ Bad**:
```typescript
const apiKey = process.env.API_KEY;
```

**✅ Good**:
```typescript
const apiKey = secretsBridge.get('API_KEY');
```

## Signed URLs

**Implementation**: `src/security/signed_urls.ts`

Enables secure, time-limited access to resources without authentication.

### Report Downloads

```typescript
import { generateReportDownloadUrl } from '@/security/signed_urls.js';

const url = generateReportDownloadUrl(
  'report-123',
  'tenant-456',
  3600  // 1 hour TTL
);

// url: https://orca.example.com/api/reports/download?token=...&signature=...
```

**Endpoint Protection**:
```typescript
router.get('/api/reports/download',
  requireSignedUrl(),
  async (req, res) => {
    const { resource, metadata } = req.signedUrl;
    // resource: "report:report-123"
    // metadata: { tenantId: "tenant-456" }
  }
);
```

### Use Cases

- **Report Downloads**: Share reports with external stakeholders
- **Upload URLs**: Pre-signed S3-style uploads
- **Webhook Callbacks**: Secure webhook endpoints

## Security Best Practices

### 1. Secrets Hygiene
- ✅ Use secrets bridge exclusively
- ✅ Rotate secrets regularly (90 days recommended)
- ✅ Never log secrets
- ✅ Use KMS in production (not env vars)

### 2. API Keys
- ✅ Set expiration dates
- ✅ Scope to minimum permissions
- ✅ Rotate after suspected compromise
- ✅ Monitor usage via `last_used_at`

### 3. JWT Tokens
- ✅ Short expiration (1 hour access, 30 days refresh)
- ✅ Verify signature against JWKS
- ✅ Check issuer and audience
- ✅ Implement token revocation (logout)

### 4. Signed URLs
- ✅ Minimum TTL necessary
- ✅ Include scope restrictions
- ✅ Validate resource ownership
- ✅ Log access for audit

## Multi-Tenancy

All authentication methods include tenant isolation:

1. **SSO**: Tenant mapped from email domain or IdP metadata
2. **API Keys**: Each key bound to single tenant
3. **Signed URLs**: Tenant ID in metadata
4. **RBAC**: Ownership checks enforce tenant boundaries

## Compliance

### Audit Logging
All authentication events logged:
- Login attempts (success/failure)
- Permission denials
- API key usage
- Signed URL validation

### Standards Support
- ✅ OIDC/OAuth 2.0 (RFC 6749, RFC 7519)
- ✅ HMAC-SHA256 (RFC 2104)
- ✅ JWT (RFC 7519)
- ✅ RBAC (NIST RBAC model)

### Privacy
- Passwords never stored (SSO only)
- Secrets encrypted at rest (KMS)
- PII access logged for GDPR

## Testing

### SSO Login (Development)
```bash
# Start server
npm run dev

# Visit http://localhost:3000/auth/login
# Stub provider returns test JWT
```

### API Key Authentication
```bash
export TEST_API_KEY="orca_test123"
export TEST_API_SECRET="secret456"

curl -X POST http://localhost:3000/api/workflows \
  -H "x-api-key: $TEST_API_KEY" \
  -H "x-signature: $(compute_signature)" \
  -H "x-timestamp: $(date +%s)000"
```

### RBAC Testing
```typescript
// tests/rbac.test.ts
import { hasPermission } from '@/security/rbac.js';

const viewer: UserToken = {
  sub: 'user-1',
  email: 'viewer@test.com',
  roles: ['viewer'],
  // ...
};

assert(!hasPermission(viewer, 'workflows', 'write')); // ❌
assert(hasPermission(viewer, 'workflows', 'read'));   // ✅
```

## Troubleshooting

### "Missing HMAC authentication headers"
- Ensure all three headers present: `x-api-key`, `x-signature`, `x-timestamp`
- Check timestamp is milliseconds since epoch

### "Invalid signature"
- Verify secret matches
- Ensure payload format: `METHOD\nPATH\nTIMESTAMP\nBODY`
- Check URL path matches exactly (including query params)

### "Signed URL expired"
- URLs expire after TTL (default 1 hour)
- Generate new URL for download

### "Insufficient permissions"
- Check user roles: `GET /api/auth/me`
- Verify role has required permission in `ROLE_PERMISSIONS`
- Contact admin to adjust roles

## Integration Examples

See `docs/examples/` for:
- Python SDK with HMAC auth
- JavaScript/TypeScript client
- CLI tool with token caching
- Webhook signature verification
