#!/usr/bin/env tsx
/**
 * Documentation Build Script
 * Generates TypeDoc API reference and builds documentation site
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const DOCS_DIR = resolve(process.cwd(), 'docs');
const API_DIR = resolve(DOCS_DIR, 'api');

/**
 * Run command and handle errors
 */
function run(command: string, description: string): void {
  console.log(`\n📝 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} complete`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error);
    throw error;
  }
}

/**
 * Generate TypeDoc documentation
 */
function generateTypeDoc(): void {
  if (!existsSync('sdks/typescript')) {
    console.log('⚠️  TypeScript SDK not found, skipping TypeDoc generation');
    return;
  }

  // Ensure output directory exists
  if (!existsSync(API_DIR)) {
    mkdirSync(API_DIR, { recursive: true });
  }

  run(
    'npx typedoc --options sdks/typescript/typedoc.json',
    'Generating TypeDoc API reference'
  );
}

/**
 * Generate OpenAPI documentation
 */
function generateOpenAPI(): void {
  if (!existsSync('openapi.yaml')) {
    console.log('⚠️  openapi.yaml not found, skipping OpenAPI generation');
    return;
  }

  // Convert OpenAPI to Markdown (using redoc-cli or similar)
  // For now, just copy the YAML
  const apiRefPath = resolve(DOCS_DIR, 'API_REFERENCE.md');
  
  const apiRefContent = `# API Reference

## REST API

Complete OpenAPI specification available at: [\`openapi.yaml\`](../openapi.yaml)

### Quick Links

- **Agent Registry:** \`/api/agents/*\`
- **Trust Scoring:** \`/api/trust/*\`
- **Policy Engine:** \`/api/policies/*\`
- **Health Check:** \`/api/health\`

### Authentication

All API requests require JWT authentication:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  https://api.orca-mesh.io/api/agents
\`\`\`

### Rate Limiting

- **Authenticated:** 1000 requests/hour
- **Anonymous:** 100 requests/hour

### TypeScript SDK

For TypeScript/JavaScript projects, use our SDK:

\`\`\`bash
pnpm add @orca/sdk
\`\`\`

\`\`\`typescript
import { OrcaClient } from '@orca/sdk';

const client = new OrcaClient({
  apiKey: process.env.ORCA_API_KEY,
});

const agents = await client.agents.list();
\`\`\`

## TypeDoc API Reference

Complete TypeScript API documentation: [TypeDoc →](./api/index.html)

---

**Last Updated:** ${new Date().toISOString().split('T')[0]}
`;

  writeFileSync(apiRefPath, apiRefContent);
  console.log('✅ Generated API_REFERENCE.md');
}

/**
 * Generate index page
 */
function generateIndex(): void {
  const indexPath = resolve(DOCS_DIR, 'README.md');
  
  if (existsSync(indexPath)) {
    console.log('✅ docs/README.md already exists');
    return;
  }

  const indexContent = `# ORCA Core Documentation

Welcome to the ORCA Core documentation!

## Getting Started

- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Set up your development environment
- **[Architecture Overview](./ARCHITECTURE_OVERVIEW.md)** - Understand the system design
- **[Product One-Pager](./PRODUCT_ONEPAGER.md)** - Executive summary

## Operations

- **[Supabase Operations](./SUPABASE_OPERATIONS.md)** - Database maintenance and monitoring
- **[Vercel Deployment](./VERCEL_DEPLOYMENT.md)** - Deployment guide
- **[Rollback Playbook](./ROLLBACK_PLAYBOOK.md)** - Emergency rollback procedures

## API Reference

- **[REST API Reference](./API_REFERENCE.md)** - HTTP API documentation
- **[TypeDoc](./api/index.html)** - TypeScript API documentation

## Contributing

- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute
- **[Code of Conduct](../CODE_OF_CONDUCT.md)** - Community guidelines
- **[Security Policy](../SECURITY.md)** - Report vulnerabilities

## Support

- **[Support Guide](../SUPPORT.md)** - Get help
- **[GitHub Issues](https://github.com/orca-mesh/orca-core/issues)** - Report bugs
- **[GitHub Discussions](https://github.com/orca-mesh/orca-core/discussions)** - Ask questions

---

**Version:** 1.0.0  
**Last Updated:** ${new Date().toISOString().split('T')[0]}
`;

  writeFileSync(indexPath, indexContent);
  console.log('✅ Generated docs/README.md');
}

/**
 * Validate documentation
 */
function validateDocs(): void {
  console.log('\n🔍 Validating documentation...');

  const requiredDocs = [
    'ARCHITECTURE_OVERVIEW.md',
    'DEVELOPER_GUIDE.md',
    'PRODUCT_ONEPAGER.md',
    'SUPABASE_OPERATIONS.md',
    'VERCEL_DEPLOYMENT.md',
  ];

  let missing = 0;
  for (const doc of requiredDocs) {
    const path = resolve(DOCS_DIR, doc);
    if (!existsSync(path)) {
      console.error(`❌ Missing: ${doc}`);
      missing++;
    } else {
      console.log(`✅ Found: ${doc}`);
    }
  }

  if (missing > 0) {
    throw new Error(`${missing} required documentation file(s) missing`);
  }

  console.log('✅ All required documentation present');
}

/**
 * Main build function
 */
async function main(): Promise<void> {
  console.log('📚 Building ORCA Core Documentation\n');
  console.log('='.repeat(50));

  try {
    generateIndex();
    generateOpenAPI();
    generateTypeDoc();
    validateDocs();

    console.log('\n' + '='.repeat(50));
    console.log('✨ Documentation build complete!');
    console.log(`\n📖 View docs: file://${DOCS_DIR}/README.md`);
    console.log(`🔗 API Reference: file://${API_DIR}/index.html\n`);
  } catch (error) {
    console.error('\n❌ Documentation build failed');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { main as buildDocs };
