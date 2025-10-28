# Security Guide

This document outlines security considerations and best practices for AgentMesh Cloud.

## Environment Variable Security

### Client-Side Variables (NEXT_PUBLIC_*)
These variables are exposed to the browser and should only contain non-sensitive data:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ghqyxhbyyirveptgwoqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... # Anonymous key only
```

### Server-Side Variables
These variables are only available on the server and should never be exposed to the client:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Service role key
DATABASE_URL=postgresql://... # Database connection string
VERCEL_TOKEN=vercel_... # Vercel deployment token
```

### Security Checklist
- [ ] No service role keys in client-side code
- [ ] No database URLs in client-side code
- [ ] No API tokens in client-side code
- [ ] All sensitive variables prefixed correctly
- [ ] Environment variables validated in CI/CD

## Database Security

### Row Level Security (RLS)
All tables have RLS enabled with tenant-based isolation:

```sql
-- Example policy for agents table
CREATE POLICY "Users can view agents in their tenant" ON agents
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);
```

### Policy Testing
Regular testing ensures policies work correctly:

```bash
# Test anonymous access (should be blocked)
node scripts/supabase-policy-smoke/index.js

# Test service role access (should work)
# Test tenant isolation (should be enforced)
```

### Database Access Patterns
- **Anonymous users**: Limited read access, no write access
- **Authenticated users**: Tenant-scoped read/write access
- **Service role**: Full access for server-side operations only

## Authentication & Authorization

### Supabase Auth Integration
```typescript
// Client-side auth (browser)
const supabase = createClient(url, anonKey);

// Server-side auth (API routes)
const supabase = createClient(url, serviceKey);
```

### JWT Token Validation
All API routes validate JWT tokens:

```typescript
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Tenant Isolation
All data access is scoped to user's tenant:

```typescript
const { data } = await supabase
  .from('agents')
  .select('*')
  .eq('tenant_id', user.tenant_id);
```

## API Security

### Input Validation
All API inputs are validated using Zod schemas:

```typescript
const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const result = schema.safeParse(requestBody);
if (!result.success) {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
}
```

### Rate Limiting
API routes implement rate limiting:

```typescript
// Example rate limiting middleware
const rateLimit = new Map();

export async function middleware(request: NextRequest) {
  const ip = request.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
  } else {
    const data = rateLimit.get(ip);
    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + windowMs;
    } else {
      data.count++;
      if (data.count > maxRequests) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
      }
    }
  }
}
```

### CORS Configuration
Proper CORS headers for API routes:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com' 
    : '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## Deployment Security

### CI/CD Security
- All secrets stored in GitHub Actions secrets
- No hardcoded credentials in code
- Environment variables validated before deployment
- Automated security scanning in pipeline

### Vercel Security
- Environment variables configured per environment
- No sensitive data in build logs
- Proper CORS configuration
- HTTPS enforced

### Supabase Security
- Service role key only used server-side
- RLS policies tested regularly
- Database access logged and monitored
- Regular security updates

## Data Protection

### Encryption
- Data encrypted in transit (HTTPS/TLS)
- Data encrypted at rest (Supabase)
- Sensitive fields encrypted in application layer

### Data Retention
- Audit logs retained for compliance
- User data can be deleted on request
- Backup data encrypted and secured

### Privacy
- No PII in logs
- User consent for data collection
- GDPR compliance considerations

## Monitoring & Incident Response

### Security Monitoring
- Failed authentication attempts
- Unusual access patterns
- Policy violations
- Environment variable leaks

### Incident Response Plan
1. **Detection**: Automated alerts for security events
2. **Assessment**: Determine severity and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update security measures

### Security Alerts
- Database policy violations
- Unauthorized access attempts
- Environment variable exposure
- Suspicious API usage patterns

## Compliance & Auditing

### Audit Logging
All significant actions are logged:

```typescript
await prisma.auditLog.create({
  data: {
    entityType: 'agent',
    entityId: agentId,
    action: 'create',
    userId: user.id,
    tenantId: user.tenantId,
    ipAddress: request.ip,
    userAgent: request.headers.get('user-agent'),
  },
});
```

### Compliance Requirements
- SOC 2 Type II (planned)
- GDPR compliance
- Data residency requirements
- Regular security assessments

## Security Best Practices

### Code Security
- Regular dependency updates
- Security-focused code reviews
- Automated vulnerability scanning
- Secure coding guidelines

### Infrastructure Security
- Network segmentation
- Firewall configuration
- Regular security patches
- Access control policies

### Operational Security
- Principle of least privilege
- Regular access reviews
- Security training for team
- Incident response procedures

## Contact & Reporting

### Security Issues
Report security vulnerabilities to: security@agentmesh.com

### Security Questions
Contact the security team for questions about:
- Security policies
- Compliance requirements
- Incident response
- Security training

### Regular Reviews
- Monthly security assessments
- Quarterly policy reviews
- Annual penetration testing
- Continuous monitoring