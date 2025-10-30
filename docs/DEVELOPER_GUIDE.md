# ORCA Developer Guide

**Complete guide for contributing to ORCA Core**

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Architecture Overview](#architecture-overview)
4. [Code Structure](#code-structure)
5. [Building & Testing](#building--testing)
6. [Debugging](#debugging)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- **Node.js**: >= 18.18.0
- **pnpm**: >= 8.0.0
- **Docker**: Latest version
- **PostgreSQL**: 16+ (via Docker)
- **Git**: Latest version

### Quick Start

```bash
# Clone repository
git clone https://github.com/orca-mesh/orca-core.git
cd orca-core

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Start infrastructure
docker-compose up -d

# Run health check
pnpm run doctor

# Start development server
pnpm run orca:dev
```

---

## Development Setup

### Environment Variables

Create `.env` file with:

```bash
# Database
DATABASE_URL=postgresql://orca:orca_dev_pass@localhost:5432/orca_mesh

# API
PORT=3000
API_HOST=0.0.0.0
NODE_ENV=development

# Telemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=orca-agentmesh

# Features
ENABLE_SELF_HEALING=true
ENABLE_DISCOVERY=true

# Security (optional)
API_KEYS=dev-key-123,dev-key-456
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
BLOCKED_IPS=

# Alerts (optional)
ALERT_WEBHOOK_URL=https://hooks.slack.com/...
```

### Docker Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset everything
docker-compose down -v
```

**Services:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- OTEL Collector: `localhost:4317`
- Jaeger UI: `http://localhost:16686`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│            API Layer (Express)          │
│  • Rate limiting & security             │
│  • Correlation ID injection             │
│  • Health probes                        │
└─────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌────────┐   ┌──────────┐   ┌──────────┐
│Registry│   │  UADSI   │   │  Policy  │
│        │   │          │   │          │
└────────┘   └──────────┘   └──────────┘
                   │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
    ┌────────┐ ┌────────┐ ┌────────┐
    │Context │ │Telemetry│ │Security│
    │  Bus   │ │ (OTEL) │ │        │
    └────────┘ └────────┘ └────────┘
```

### Key Components

1. **Registry**: Agent registration and lifecycle management
2. **UADSI**: Discovery, trust scoring, sync analysis
3. **Policy**: RBAC, data classification, compliance
4. **Context Bus**: Shared state with PostgreSQL + pgvector
5. **Telemetry**: OpenTelemetry traces and metrics
6. **Security**: Secrets management, PII redaction

---

## Code Structure

```
/workspace
├── src/
│   ├── api/              # REST API routes
│   │   ├── server.ts     # Main Express server
│   │   └── routes/       # Endpoint handlers
│   ├── common/           # Shared utilities
│   │   ├── logger.ts     # Structured logging
│   │   ├── cache.ts      # LRU cache
│   │   ├── circuit-breaker.ts
│   │   └── job-queue.ts
│   ├── registry/         # Agent registry
│   ├── uadsi/            # Discovery & trust scoring
│   ├── policy/           # Policy enforcement
│   ├── telemetry/        # OTEL setup
│   ├── security/         # Auth, rate limiting
│   └── adapters/         # Integration adapters
├── scripts/              # Utility scripts
│   ├── doctor.ts         # Health check
│   ├── deps_audit.ts     # Dependency audit
│   ├── resilience_test.ts # Chaos testing
│   └── restore_latest_backup.ts
├── docs/                 # Documentation
├── prisma/               # Database schema
└── docker-compose.yml    # Local infrastructure
```

---

## Building & Testing

### Build

```bash
# TypeScript compilation
pnpm run build

# Type checking (no emit)
pnpm run typecheck

# Lint
pnpm run lint

# Format
pnpm run format
```

### Testing

```bash
# Run all tests
pnpm run test

# E2E tests
pnpm run e2e

# Resilience tests
tsx scripts/resilience_test.ts

# Load tests
pnpm run load:test
```

### Database

```bash
# Generate Prisma client
pnpm run db:generate

# Apply migrations
pnpm run db:migrate

# Seed database
pnpm run db:seed

# Open Prisma Studio
pnpm run db:studio
```

---

## Debugging

### Logging

All logs are JSON-structured with:
- `timestamp`: ISO 8601
- `level`: trace, debug, info, warn, error
- `service`: Module name
- `correlation_id`: Request correlation ID
- `trace_id`, `span_id`: OpenTelemetry IDs

```typescript
import { createLogger } from '../common/logger.js';

const logger = createLogger('my-module');
logger.info('Operation completed', { userId: 123, duration: 45 });
```

### Tracing

View distributed traces in Jaeger: http://localhost:16686

```typescript
import { withSpan } from '../telemetry/otel.js';

await withSpan('compute-trust-score', async () => {
  // Your code here
}, { agent_id: 'agent-123' });
```

### Metrics

View metrics in Prometheus: http://localhost:9090

Custom metrics:
```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('orca-agentmesh');
const counter = meter.createCounter('orca.custom.counter');
counter.add(1, { label: 'value' });
```

### VS Code Debugging

`.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug ORCA",
  "runtimeExecutable": "tsx",
  "args": ["src/index.ts"],
  "env": {
    "NODE_ENV": "development"
  }
}
```

---

## Best Practices

### Code Style

1. **TypeScript Strict Mode**: Always enabled
2. **ESLint**: Run before commit
3. **Prettier**: Auto-format on save
4. **Naming**: camelCase for variables, PascalCase for classes

### Error Handling

```typescript
import { AppError } from '../common/errors.js';

// Throw typed errors
throw new AppError('Agent not found', 404, { agentId });

// Catch and log
try {
  // ...
} catch (error) {
  logger.error('Operation failed', error as Error, { context });
  throw error;
}
```

### Database Queries

```typescript
// ✅ Use parameterized queries
await client.query('SELECT * FROM agents WHERE id = $1', [agentId]);

// ❌ Never concatenate user input
await client.query(`SELECT * FROM agents WHERE id = '${agentId}'`);
```

### Security

1. **PII Redaction**: Logger auto-redacts SSN, credit cards, emails
2. **Secrets**: Never commit to git, use env vars
3. **Input Validation**: Use Zod schemas
4. **Rate Limiting**: Applied globally and per-route

### Performance

1. **Caching**: Use `agentCache` and `policyCache` for hot data
2. **Async Jobs**: Use `jobQueue` for heavy processing
3. **Database**: Add indexes for frequently queried columns
4. **N+1 Queries**: Batch with `Promise.all()` or joins

---

## Troubleshooting

### Common Issues

#### "Cannot connect to database"

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

#### "Port 3000 already in use"

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

#### "Type errors after pulling latest"

```bash
# Regenerate types
pnpm run db:generate

# Clean and rebuild
rm -rf node_modules dist
pnpm install
pnpm run build
```

#### "Tests failing"

```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
pnpm run db:migrate
pnpm run db:seed

# Run tests again
pnpm run test
```

### Health Check

```bash
# Run comprehensive health check
pnpm run doctor

# Check API
curl http://localhost:3000/health

# Check readiness
curl http://localhost:3000/status/readiness
```

### Performance Profiling

```bash
# Enable profiling
NODE_ENV=development node --prof dist/api/server.js

# Generate report
node --prof-process isolate-*.log > profile.txt
```

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for:
- Git workflow
- Branch naming
- Commit conventions
- Pull request process

---

## Support

- **Documentation**: https://docs.orca-mesh.io
- **Issues**: https://github.com/orca-mesh/orca-core/issues
- **Discussions**: https://github.com/orca-mesh/orca-core/discussions

---

**Happy coding! 🚀**
