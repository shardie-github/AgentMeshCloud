# 🔄 Environment Sync Guide

> Keep environment variables synchronized across local, Supabase, and Vercel

## Overview

The Environment Sync Assistant helps you manage environment variables across multiple platforms, ensuring consistency and preventing deployment issues caused by missing or mismatched configuration.

## Features

- **Multi-platform support**: Local .env, Supabase secrets, Vercel environment variables
- **Drift detection**: Identifies variables that exist in some platforms but not others
- **Safety-first**: Never exposes sensitive values in stdout
- **Validation**: Checks required variables are present
- **Sync recommendations**: Suggests which variables to push/pull

## Usage

### Basic Check

```bash
# Check sync status across all platforms
npm run env:sync

# Direct execution
npx tsx scripts/env_sync.ts
```

### Validate Required Variables

The script automatically validates critical environment variables:

```bash
npx tsx scripts/env_sync.ts
# Validates: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, etc.
```

### Dry-Run Fix Mode

```bash
# See what would be synced (no actual changes)
npm run env:sync -- --fix
```

## Understanding the Output

### Sync Status Report

```
═══════════════════════════════════════════════════════════
         🔄 ENVIRONMENT SYNC REPORT
═══════════════════════════════════════════════════════════

📊 Summary:
   Fully synced: 12
   Local only: 3
   Supabase only: 1
   Vercel only: 2
   Partial sync: 4

✅ FULLY SYNCED:
   DATABASE_URL
   SUPABASE_URL
   SUPABASE_ANON_KEY
   ...

📄 LOCAL ONLY (consider pushing to Supabase/Vercel):
   DEV_API_KEY = sk-1***45
   LOCAL_DEBUG_MODE = tru***se
   ...

🔐 SUPABASE ONLY (consider pulling to local):
   PROD_DATABASE_PASSWORD

☁️  VERCEL ONLY (consider pulling to local):
   VERCEL_GIT_COMMIT_SHA
   VERCEL_URL

⚠️  PARTIAL SYNC (exists in some but not all):
   OPENAI_API_KEY (in: Local, Vercel)
   WEBHOOK_SECRET (in: Local, Supabase)

═══════════════════════════════════════════════════════════
💡 Use --fix flag to sync missing variables (interactive)
⚠️  WARNING: Never commit .env files or expose secrets!
═══════════════════════════════════════════════════════════
```

### Validation Output

```
🔍 Validating required environment variables...

✅ PRESENT: DATABASE_URL (local)
✅ PRESENT: SUPABASE_URL (local)
✅ PRESENT: SUPABASE_ANON_KEY (local)
❌ MISSING: NEXTAUTH_SECRET
⚠️  OPENAI_API_KEY (remote only)
```

## Prerequisites

### Install CLI Tools

```bash
# Supabase CLI
npm install -g supabase

# Vercel CLI
npm install -g vercel

# Verify installations
supabase --version
vercel --version
```

### Link Projects

```bash
# Link Supabase project
supabase link --project-ref your-project-ref

# Link Vercel project
vercel link
```

## Manual Sync Operations

The tool provides recommendations but doesn't automatically sync for safety. Here's how to manually sync:

### Push Local → Supabase

```bash
# Single variable
supabase secrets set MY_VAR=value

# Multiple variables from .env
while IFS='=' read -r key value; do
  if [[ ! $key =~ ^# && -n $key ]]; then
    supabase secrets set "$key=$value"
  fi
done < .env
```

### Push Local → Vercel

```bash
# Single variable
vercel env add MY_VAR

# Bulk upload
vercel env pull .env.vercel.json
# Edit .env.vercel.json
vercel env push
```

### Pull Supabase → Local

```bash
# List secrets
supabase secrets list

# Manually add to .env
echo "MY_SECRET=value" >> .env
```

### Pull Vercel → Local

```bash
# Pull all environment variables
vercel env pull .env.vercel

# Merge with your .env
cat .env.vercel >> .env
```

## Environment File Structure

### Local `.env`

```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhb...

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# External APIs
OPENAI_API_KEY=sk-proj-...
STRIPE_SECRET_KEY=sk_test_...

# Feature Flags
ENABLE_AI_FEATURES=true
DEBUG_MODE=false
```

### `.env.example` (for documentation)

```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@host:5432/db
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl

# External Services (optional)
OPENAI_API_KEY=sk-proj-xxx
STRIPE_SECRET_KEY=sk_test_xxx
```

## Best Practices

### 1. Use Different Variables Per Environment

```bash
# .env.development
DATABASE_URL=postgresql://localhost:5432/dev_db
SUPABASE_URL=https://dev-project.supabase.co

# .env.production
DATABASE_URL=postgresql://prod-host:5432/prod_db
SUPABASE_URL=https://prod-project.supabase.co
```

### 2. Document Required Variables

Create a checklist:

```markdown
## Required Environment Variables

### Database
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Supabase anonymous key

### Authentication
- [ ] `NEXTAUTH_SECRET` - NextAuth.js secret (generate with `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` - Application URL

### Optional
- [ ] `OPENAI_API_KEY` - For AI features
- [ ] `ENABLE_DEBUG` - Enable debug logging
```

### 3. Rotate Secrets Regularly

```bash
# Generate new secret
openssl rand -base64 32

# Update in all platforms
supabase secrets set NEXTAUTH_SECRET=new-secret
vercel env add NEXTAUTH_SECRET
echo "NEXTAUTH_SECRET=new-secret" >> .env
```

### 4. Use Prefixes for Organization

```bash
# Database variables
DB_HOST=localhost
DB_PORT=5432
DB_NAME=orca

# API variables
API_OPENAI_KEY=sk-...
API_STRIPE_KEY=sk_test_...

# Feature flags
FEATURE_AI_ENABLED=true
FEATURE_WEBHOOKS_ENABLED=false
```

## Security Considerations

### Never Commit Secrets

Update `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.development
.env.production
.env.test

# CLI configs
.vercel
.supabase
```

### Mask Sensitive Values

The sync tool automatically masks values:

```bash
# Output shows:
API_KEY = sk-p***45  # First 4 and last 2 chars visible
```

### Limit Access

- **Local**: Protect with file permissions (`chmod 600 .env`)
- **Supabase**: Use role-based access control
- **Vercel**: Restrict team member access to production secrets

## Troubleshooting

### "Supabase CLI not available"

```bash
# Install globally
npm install -g supabase

# Or use npx
npx supabase link
```

### "Vercel CLI not authenticated"

```bash
# Login to Vercel
vercel login

# Verify
vercel whoami
```

### "Permission denied reading .env"

```bash
# Check file permissions
ls -la .env

# Fix if needed
chmod 600 .env
```

### "Environment variable not found in Vercel"

```bash
# Make sure you're targeting the right environment
vercel env ls

# Add to specific environment
vercel env add MY_VAR production
vercel env add MY_VAR preview
vercel env add MY_VAR development
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Validate Environment

on: [push, pull_request]

jobs:
  env-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Check environment sync
        run: npm run env:sync
        env:
          SKIP_REMOTE_CHECK: 'true'  # Don't check Supabase/Vercel in CI
```

### Pre-deployment Check

Add to deployment script:

```bash
#!/bin/bash
# deploy.sh

echo "🔍 Checking environment sync..."
npm run env:sync

if [ $? -ne 0 ]; then
  echo "❌ Environment sync issues detected!"
  echo "Fix sync issues before deploying."
  exit 1
fi

echo "✅ Environment check passed"
echo "🚀 Deploying..."
vercel --prod
```

## Advanced Usage

### Custom Validation Rules

Edit `scripts/env_sync.ts` to add custom validation:

```typescript
// Custom required variables per environment
const requiredByEnv = {
  development: ['DATABASE_URL', 'SUPABASE_URL'],
  production: ['DATABASE_URL', 'SUPABASE_URL', 'OPENAI_API_KEY']
};

// Validate based on NODE_ENV
const required = requiredByEnv[process.env.NODE_ENV || 'development'];
sync.validateRequired(required);
```

### Automated Sync Script

```bash
#!/bin/bash
# sync-env.sh - Automated environment sync

# Load local env
source .env

# Sync to Supabase
supabase secrets set DATABASE_URL="$DATABASE_URL"
supabase secrets set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"

# Sync to Vercel
echo "DATABASE_URL=$DATABASE_URL" | vercel env add DATABASE_URL production
echo "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" | vercel env add SUPABASE_ANON_KEY production

echo "✅ Sync complete"
```

### Diff Check

Compare environments:

```bash
# Compare local vs Vercel
vercel env pull .env.vercel
diff .env .env.vercel
```

## Examples

### Example 1: New Project Setup

```bash
# 1. Copy example file
cp .env.example .env

# 2. Fill in values
vim .env

# 3. Check what's missing
npm run env:sync

# 4. Push to Supabase
supabase secrets set DATABASE_URL=xxx
supabase secrets set SUPABASE_URL=xxx

# 5. Push to Vercel
vercel env add DATABASE_URL
vercel env add SUPABASE_URL

# 6. Verify
npm run env:sync
```

### Example 2: Onboard New Developer

```bash
# 1. Pull from Supabase
supabase secrets list > .env.supabase

# 2. Pull from Vercel  
vercel env pull .env.vercel

# 3. Combine (carefully!)
cat .env.supabase .env.vercel > .env

# 4. Verify
npm run env:sync
```

### Example 3: Rotate Secret

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Update local
sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$NEW_SECRET/" .env

# 3. Update Supabase
supabase secrets set NEXTAUTH_SECRET="$NEW_SECRET"

# 4. Update Vercel
echo "$NEW_SECRET" | vercel env add NEXTAUTH_SECRET production

# 5. Verify
npm run env:sync
```

## Resources

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [12-Factor App: Config](https://12factor.net/config)

## Support

For issues:
1. Check this guide
2. Verify CLI tools are installed and authenticated
3. Review security policies
4. Open a GitHub issue

---

**Remember**: Keeping environments in sync prevents "works on my machine" issues and deployment failures!
