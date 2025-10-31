# Developer Guide

Complete guide for developing with ORCA Core.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Database](#database)
- [API Development](#api-development)
- [Best Practices](#best-practices)

## Prerequisites

- **Node.js:** 18.18.0 or higher
- **pnpm:** 8.0.0 or higher
- **Docker:** For local services (optional)
- **Supabase CLI:** For database migrations
- **Git:** For version control

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/orca-mesh/orca-core.git
cd orca-core
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
vim .env
```

Required variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
DATABASE_URL=postgresql://...
```

### 4. Set Up Database

```bash
# Link to Supabase project
pnpm run supabase:link

# Push schema
pnpm run supabase:push

# Apply safety parameters
psql $SUPABASE_DB_URL -f supabase/config/parameters.sql
```

### 5. Run Development Server

```bash
pnpm run dev
```

Server runs at `http://localhost:3000`

### 6. Verify Installation

```bash
pnpm run doctor
```

Should output:

```
✅ Node.js version: 18.18.0
✅ pnpm version: 8.15.0
✅ TypeScript installed
✅ Database connection: OK
✅ Environment variables: OK
```

## Project Structure

```
/workspace
├── src/                    # Source code
│   ├── api/               # REST API routes
│   ├── registry/          # Agent registry
│   ├── uadsi/             # Trust scoring
│   ├── policy/            # Policy engine
│   ├── telemetry/         # OpenTelemetry
│   └── common/            # Shared utilities
├── scripts/               # Utility scripts
│   ├── bugbot/           # Automated triage
│   ├── db/               # Database scripts
│   └── e2e/              # E2E test helpers
├── docs/                  # Documentation
├── supabase/              # Database schema & migrations
│   ├── config/           # DB parameters
│   ├── monitoring/       # Monitoring functions
│   └── tests/            # RLS tests
├── tests/                 # Test files
├── apps/                  # Frontend applications
└── packages/              # Shared packages
```

## Development Workflow

### Daily Workflow

```bash
# Pull latest changes
git pull origin main

# Install dependencies (if package.json changed)
pnpm install

# Start dev server
pnpm run dev

# In another terminal: run tests in watch mode
pnpm run test:watch

# Make changes...

# Lint and format
pnpm run lint --fix
pnpm run format

# Run tests
pnpm run test

# Commit (commitlint validates format)
git commit -m "feat(registry): add health check endpoint"

# Push
git push
```

### Creating a Feature

```bash
# Create feature branch
git checkout -b feat/your-feature

# Make changes...

# Add tests
touch src/registry/health.test.ts

# Commit
git add .
git commit -m "feat(registry): add health check"

# Push and create PR
git push origin feat/your-feature
gh pr create
```

## Testing

### Unit Tests

```bash
# Run all tests
pnpm run test

# Run specific file
pnpm run test src/registry/agent.test.ts

# Watch mode
pnpm run test:watch

# Coverage
pnpm run test:coverage
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { computeTrustScore } from './trust';

describe('Trust Scoring', () => {
  it('should compute trust score correctly', () => {
    const score = computeTrustScore({
      uptime: 0.99,
      errorRate: 0.01,
      complianceRate: 0.95,
    });

    expect(score).toBeGreaterThanOrEqual(90);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

### E2E Tests

```bash
# Seed baseline data
pnpm run e2e:seed

# Fire test webhooks
pnpm run e2e:fire

# Assert KPIs
pnpm run e2e:assert

# Or run full suite
pnpm run e2e
```

### RLS Tests

```bash
# Test Row Level Security policies
pnpm run rls:smoke
```

## Debugging

### VS Code

Launch config (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "orca:*"
      }
    }
  ]
}
```

### Debug Logs

Enable debug logging:

```bash
export DEBUG=orca:*
export LOG_LEVEL=debug
pnpm run dev
```

### Database Queries

Log all SQL queries:

```bash
export DEBUG=prisma:query
pnpm run dev
```

### Chrome DevTools

```bash
node --inspect-brk=0.0.0.0:9229 dist/api/server.js
```

Then open `chrome://inspect`

## Database

### Migrations

```bash
# Create migration
pnpm run supabase:diff

# Apply migrations
pnpm run supabase:push

# Rollback (via Supabase dashboard)
```

### Seed Data

```bash
pnpm run db:seed
```

### Query Database

```bash
# Via Supabase Studio
pnpm run supabase:studio

# Via psql
psql $SUPABASE_DB_URL
```

### Common Queries

```sql
-- Check trust scores
SELECT * FROM trust_scores ORDER BY score DESC LIMIT 10;

-- Recent audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;

-- Active agents
SELECT * FROM agent_registry WHERE status = 'active';
```

## API Development

### Adding a New Endpoint

1. **Create route handler:**

```typescript
// src/api/routes/agents.ts
import { Router } from 'express';

const router = Router();

router.get('/agents/:id', async (req, res) => {
  const { id } = req.params;
  // Implementation...
  res.json({ agent });
});

export default router;
```

2. **Add tests:**

```typescript
// src/api/routes/agents.test.ts
import request from 'supertest';
import app from '../app';

describe('GET /agents/:id', () => {
  it('should return agent details', async () => {
    const response = await request(app)
      .get('/api/agents/test-id')
      .expect(200);

    expect(response.body).toHaveProperty('agent');
  });
});
```

3. **Update OpenAPI spec:**

```yaml
# openapi.yaml
paths:
  /agents/{id}:
    get:
      summary: Get agent details
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Agent details
```

4. **Add JSDoc:**

```typescript
/**
 * Get agent by ID
 * @param {string} id - Agent ID
 * @returns {Promise<Agent>} Agent details
 * @throws {NotFoundError} If agent doesn't exist
 */
export async function getAgent(id: string): Promise<Agent> {
  // ...
}
```

### Middleware

Create reusable middleware:

```typescript
// src/api/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Verify token...
  next();
}
```

Use in routes:

```typescript
router.get('/agents/:id', requireAuth, async (req, res) => {
  // ...
});
```

## Best Practices

### Code Style

- ✅ Use TypeScript strict mode
- ✅ Prefer `const` over `let`
- ✅ Use descriptive variable names
- ✅ Keep functions small (< 50 lines)
- ✅ Add JSDoc for public APIs
- ❌ Avoid `any` type
- ❌ Don't use `var`

### Error Handling

```typescript
// Good
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new OperationError('Failed to complete operation', { cause: error });
}

// Bad
const result = await riskyOperation(); // Unhandled error
```

### Async/Await

```typescript
// Good
async function fetchData(): Promise<Data> {
  const response = await fetch(url);
  return await response.json();
}

// Bad
function fetchData(): Promise<Data> {
  return fetch(url).then(r => r.json()); // Prefer async/await
}
```

### Logging

```typescript
import { logger } from './common/logger';

// Good
logger.info('Agent registered', {
  agentId: agent.id,
  tenantId: agent.tenantId,
});

// Bad
console.log('Agent registered:', agent.id); // Use structured logging
```

### Environment Variables

```typescript
// Good
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY is required');
}

// Bad
const apiKey = process.env.API_KEY || 'default'; // Don't default secrets
```

## Common Tasks

### Add a New Package

```bash
# Add to workspace
pnpm add <package> --filter <workspace>

# Example
pnpm add zod --filter @orca/api
```

### Update Dependencies

```bash
# Update all
pnpm update

# Update specific package
pnpm update <package>

# Check outdated
pnpm outdated
```

### Generate Types from OpenAPI

```bash
pnpm run openapi:sync
```

### Performance Profiling

```bash
# Enable CPU profiling
node --cpu-prof dist/api/server.js

# View profile in Chrome DevTools
```

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
pnpm run clean
pnpm install
pnpm run build
```

### Type Errors

```bash
# Run type checker
pnpm run typecheck

# Generate Prisma types
pnpm run db:generate
```

### Database Connection Issues

```bash
# Test connection
pnpm run db:status

# Check environment variables
env | grep SUPABASE
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Supabase Docs](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [OpenTelemetry JS](https://opentelemetry.io/docs/instrumentation/js/)

## Getting Help

- **GitHub Discussions:** Ask questions, share ideas
- **Issue Tracker:** Report bugs, request features
- **SUPPORT.md:** Support resources

---

Happy coding! 🚀
