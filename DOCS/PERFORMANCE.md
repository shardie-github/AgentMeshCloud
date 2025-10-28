# Performance Guidelines & Budgets

This document outlines performance budgets, monitoring strategies, and optimization guidelines for the AgentMesh Cloud platform.

## Performance Budgets

### Bundle Size Budgets

| Type | Warning | Failure | Notes |
|------|---------|---------|-------|
| Client Bundle | 250 KB | 400 KB | Per page/route |
| Serverless Bundle | 1.2 MB | 1.5 MB | API routes & server components |
| Edge Bundle | 1.2 MB | 1.5 MB | Edge functions |

### Database Performance Budgets

| Metric | Warning | Failure | Notes |
|--------|---------|---------|-------|
| Query P95 | 300 ms | 500 ms | 95th percentile response time |
| Query P99 | 500 ms | 1000 ms | 99th percentile response time |
| Connection Pool | 80% | 95% | Maximum pool utilization |
| Database Size | 1 GB | 2 GB | Total database size |

### API Performance Budgets

| Metric | Warning | Failure | Notes |
|--------|---------|---------|-------|
| API P95 | 400 ms | 700 ms | Under micro-load test |
| API P99 | 800 ms | 1500 ms | Under micro-load test |
| Error Rate | 1% | 5% | HTTP 5xx errors |
| Availability | 99.5% | 99.9% | Uptime percentage |

## Monitoring & Alerting

### Automated Checks

1. **Bundle Analysis** - Runs on every PR
   - Analyzes client and server bundle sizes
   - Fails CI if budgets exceeded
   - Generates detailed reports

2. **Database Performance** - Runs on every PR
   - Tests common query patterns
   - Measures response times
   - Identifies slow queries

3. **RLS Smoke Tests** - Runs on every PR
   - Validates Row Level Security policies
   - Tests anonymous vs service role access
   - Ensures tenant isolation

4. **Cost Guard** - Runs on deployments
   - Monitors Vercel and Supabase usage
   - Alerts on cost threshold breaches
   - Generates cost optimization recommendations

### Health Checks

- **Endpoint**: `/api/health`
- **Frequency**: Every deployment
- **Checks**: Database connectivity, Supabase health, memory usage
- **Response Format**: JSON with detailed status information

## Optimization Strategies

### Frontend Optimizations

1. **Bundle Splitting**
   - Vendor chunks separated from app code
   - Supabase client in separate chunk
   - Dynamic imports for heavy components

2. **Image Optimization**
   - Next.js Image component with WebP/AVIF
   - Proper remotePatterns configuration
   - Lazy loading for below-fold images

3. **Caching Strategy**
   - Static assets cached for 1 year
   - API responses cached appropriately
   - ISR for dynamic content where safe

### Database Optimizations

1. **Indexing Strategy**
   - Composite indexes for common query patterns
   - Tenant-based indexes for multi-tenancy
   - Time-based indexes for audit logs

2. **Query Optimization**
   - Avoid N+1 queries with proper includes
   - Use select to limit returned fields
   - Implement pagination for large datasets

3. **Connection Management**
   - Connection pooling configured
   - Proper connection lifecycle management
   - Timeout configurations

### API Optimizations

1. **Response Caching**
   - Cache headers for static content
   - ETags for conditional requests
   - CDN integration where appropriate

2. **Request Optimization**
   - Compression enabled
   - Minification of responses
   - Proper HTTP status codes

## Performance Testing

### Load Testing

```bash
# Run micro-load test (CI)
pnpm run performance:test

# Run full load test (manual)
k6 run scripts/load-test.js
```

### Bundle Analysis

```bash
# Analyze bundle sizes
pnpm run bundle:analyze

# Generate bundle analyzer report
ANALYZE=true pnpm run build
```

### Database Performance

```bash
# Test database performance
pnpm run db:performance

# Run RLS smoke tests
pnpm run rls:smoke
```

## Troubleshooting

### Common Issues

1. **Bundle Size Exceeded**
   - Check for heavy dependencies
   - Review dynamic imports
   - Analyze bundle report

2. **Slow Database Queries**
   - Review query patterns
   - Check index usage
   - Consider query optimization

3. **High API Response Times**
   - Check database queries
   - Review external API calls
   - Analyze server resources

### Performance Debugging

1. **Bundle Analysis**
   - Use `ANALYZE=true pnpm run build`
   - Review bundle analyzer output
   - Identify heavy dependencies

2. **Database Profiling**
   - Enable Prisma query logging
   - Use database query analyzer
   - Monitor slow query logs

3. **API Monitoring**
   - Check Vercel function logs
   - Monitor response times
   - Analyze error rates

## Cost Optimization

### Vercel Optimizations

- Use edge functions where appropriate
- Optimize bundle sizes to reduce cold starts
- Implement proper caching strategies
- Monitor function invocations and duration

### Supabase Optimizations

- Optimize database queries
- Use proper indexing
- Implement data archiving
- Monitor bandwidth usage

### General Cost Controls

- Set up cost alerts
- Regular cost reviews
- Optimize resource usage
- Implement usage monitoring

## Best Practices

1. **Development**
   - Test performance locally
   - Use performance budgets
   - Monitor bundle sizes
   - Optimize early and often

2. **Deployment**
   - Run all performance checks
   - Monitor deployment metrics
   - Set up alerts
   - Review cost reports

3. **Monitoring**
   - Regular performance reviews
   - Cost analysis
   - User experience monitoring
   - Continuous optimization

## Tools & Resources

- **Bundle Analysis**: @next/bundle-analyzer
- **Performance Testing**: k6, Artillery
- **Database Monitoring**: Prisma metrics, Supabase dashboard
- **Cost Monitoring**: Vercel dashboard, Supabase usage
- **Health Checks**: Custom health endpoints

## Getting Help

- Check CI logs for performance failures
- Review generated reports
- Consult team for optimization strategies
- Use monitoring dashboards for insights