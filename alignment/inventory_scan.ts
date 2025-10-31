#!/usr/bin/env tsx
/**
 * System Inventory Scanner
 * Crawls repository to discover services, routes, DB tables, RPCs, Rego policies, flags, jobs
 * Outputs structured inventory for integration audit
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as yaml from 'js-yaml';

interface InventoryItem {
  type: 'service' | 'route' | 'table' | 'rpc' | 'policy' | 'flag' | 'job' | 'export' | 'component';
  name: string;
  location: string;
  owner?: string;
  dependencies?: string[];
  status: 'active' | 'deprecated' | 'orphan' | 'unknown';
  metadata?: Record<string, any>;
}

interface Inventory {
  scannedAt: string;
  repository: string;
  items: InventoryItem[];
  summary: {
    services: number;
    routes: number;
    tables: number;
    policies: number;
    flags: number;
    jobs: number;
    totalItems: number;
  };
}

const WORKSPACE = process.cwd();

async function scanServices(): Promise<InventoryItem[]> {
  const items: InventoryItem[] = [];
  
  // Scan src directories for services
  const servicePatterns = [
    'src/**/index.ts',
    'src/**/server.ts',
    'src/**/*_service.ts',
    'src/**/*Service.ts',
    'aiops/**/*.ts',
    'ecosystem/**/*.ts',
    'feedback/src/index.ts'
  ];

  for (const pattern of servicePatterns) {
    const files = await glob(pattern, { cwd: WORKSPACE, absolute: true });
    for (const file of files) {
      const relativePath = path.relative(WORKSPACE, file);
      const content = await fs.readFile(file, 'utf-8');
      
      // Check if it's a service (has express, fastify, or exports service class)
      if (content.includes('express') || content.includes('fastify') || 
          content.match(/export\s+(class|const)\s+\w+Service/)) {
        items.push({
          type: 'service',
          name: path.basename(file, path.extname(file)),
          location: relativePath,
          status: 'active',
          metadata: {
            hasExpress: content.includes('express'),
            hasFastify: content.includes('fastify'),
            linesOfCode: content.split('\n').length
          }
        });
      }
    }
  }

  return items;
}

async function scanRoutes(): Promise<InventoryItem[]> {
  const items: InventoryItem[] = [];
  
  // Scan OpenAPI specs
  const openApiFiles = ['openapi.yaml', 'openapi.orca.yaml'];
  
  for (const file of openApiFiles) {
    const filePath = path.join(WORKSPACE, file);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const spec = yaml.load(content) as any;
      
      if (spec.paths) {
        for (const [routePath, methods] of Object.entries(spec.paths)) {
          for (const [method, details] of Object.entries(methods as any)) {
            if (typeof details === 'object' && details.operationId) {
              items.push({
                type: 'route',
                name: `${method.toUpperCase()} ${routePath}`,
                location: file,
                status: 'active',
                metadata: {
                  operationId: details.operationId,
                  tags: details.tags || [],
                  deprecated: details.deprecated || false
                }
              });
            }
          }
        }
      }
    } catch (err) {
      // File might not exist, continue
    }
  }

  // Also scan route files directly
  const routeFiles = await glob('src/api/routes/**/*.ts', { cwd: WORKSPACE, absolute: true });
  for (const file of routeFiles) {
    const relativePath = path.relative(WORKSPACE, file);
    const content = await fs.readFile(file, 'utf-8');
    
    // Extract route definitions (router.get, router.post, etc.)
    const routeMatches = content.matchAll(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
    for (const match of routeMatches) {
      items.push({
        type: 'route',
        name: `${match[1].toUpperCase()} ${match[2]}`,
        location: relativePath,
        status: 'active'
      });
    }
  }

  return items;
}

async function scanDatabaseTables(): Promise<InventoryItem[]> {
  const items: InventoryItem[] = [];
  
  // Scan SQL migrations
  const sqlFiles = await glob('supabase/migrations/**/*.sql', { cwd: WORKSPACE, absolute: true });
  
  for (const file of sqlFiles) {
    const relativePath = path.relative(WORKSPACE, file);
    const content = await fs.readFile(file, 'utf-8');
    
    // Extract CREATE TABLE statements
    const tableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+\.\w+|\w+)/gi);
    for (const match of tableMatches) {
      const tableName = match[1];
      items.push({
        type: 'table',
        name: tableName,
        location: relativePath,
        status: 'active'
      });
    }
    
    // Extract CREATE FUNCTION (RPCs)
    const rpcMatches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+\.\w+|\w+)\s*\(/gi);
    for (const match of rpcMatches) {
      items.push({
        type: 'rpc',
        name: match[1],
        location: relativePath,
        status: 'active'
      });
    }
  }

  // Also check Prisma schema
  const prismaPath = path.join(WORKSPACE, 'prisma/schema.prisma');
  try {
    const content = await fs.readFile(prismaPath, 'utf-8');
    const modelMatches = content.matchAll(/model\s+(\w+)\s+\{/g);
    for (const match of modelMatches) {
      items.push({
        type: 'table',
        name: match[1],
        location: 'prisma/schema.prisma',
        status: 'active',
        metadata: { source: 'prisma' }
      });
    }
  } catch (err) {
    // Prisma file might not exist
  }

  return items;
}

async function scanPolicies(): Promise<InventoryItem[]> {
  const items: InventoryItem[] = [];
  
  // Scan Rego policies
  const regoFiles = await glob('**/*.rego', { cwd: WORKSPACE, absolute: true, ignore: ['node_modules/**'] });
  
  for (const file of regoFiles) {
    const relativePath = path.relative(WORKSPACE, file);
    const content = await fs.readFile(file, 'utf-8');
    
    // Extract policy packages
    const packageMatch = content.match(/package\s+([\w.]+)/);
    if (packageMatch) {
      items.push({
        type: 'policy',
        name: packageMatch[1],
        location: relativePath,
        status: 'active',
        metadata: {
          rulesCount: (content.match(/\b\w+\s*:?=\s*\{/g) || []).length
        }
      });
    }
  }

  // Scan YAML policy files
  const yamlPolicyFiles = await glob('**/policy*.yaml', { cwd: WORKSPACE, absolute: true, ignore: ['node_modules/**'] });
  
  for (const file of yamlPolicyFiles) {
    const relativePath = path.relative(WORKSPACE, file);
    try {
      const content = await fs.readFile(file, 'utf-8');
      const policies = yaml.load(content) as any;
      
      if (policies && typeof policies === 'object') {
        items.push({
          type: 'policy',
          name: path.basename(file, '.yaml'),
          location: relativePath,
          status: 'active',
          metadata: {
            format: 'yaml',
            keysCount: Object.keys(policies).length
          }
        });
      }
    } catch (err) {
      // Invalid YAML, skip
    }
  }

  return items;
}

async function scanFlags(): Promise<InventoryItem[]> {
  const items: InventoryItem[] = [];
  
  // Look for feature flags
  const flagPatterns = ['src/flags/**/*.ts', '**/flags*.yaml', '**/feature*.yaml'];
  
  for (const pattern of flagPatterns) {
    const files = await glob(pattern, { cwd: WORKSPACE, absolute: true, ignore: ['node_modules/**'] });
    
    for (const file of files) {
      const relativePath = path.relative(WORKSPACE, file);
      const content = await fs.readFile(file, 'utf-8');
      
      if (file.endsWith('.ts')) {
        // Extract flag definitions
        const flagMatches = content.matchAll(/['"`]([A-Z_]+_FLAG|ENABLE_\w+|FEATURE_\w+)['"`]/g);
        for (const match of flagMatches) {
          items.push({
            type: 'flag',
            name: match[1],
            location: relativePath,
            status: 'active'
          });
        }
      } else if (file.endsWith('.yaml')) {
        try {
          const flags = yaml.load(content) as any;
          if (flags && typeof flags === 'object') {
            for (const flagName of Object.keys(flags)) {
              items.push({
                type: 'flag',
                name: flagName,
                location: relativePath,
                status: 'active'
              });
            }
          }
        } catch (err) {
          // Invalid YAML
        }
      }
    }
  }

  return items;
}

async function scanJobs(): Promise<InventoryItem[]> {
  const items: InventoryItem[] = [];
  
  // Scan for cron jobs, scheduled tasks
  const jobPatterns = ['**/*cron*.ts', '**/*scheduler*.ts', '**/*job*.ts', '**/*.sql'];
  
  for (const pattern of jobPatterns) {
    const files = await glob(pattern, { cwd: WORKSPACE, absolute: true, ignore: ['node_modules/**', 'dist/**'] });
    
    for (const file of files) {
      const relativePath = path.relative(WORKSPACE, file);
      const content = await fs.readFile(file, 'utf-8');
      
      if (file.endsWith('.sql')) {
        // Check for pg_cron jobs
        const cronMatches = content.matchAll(/SELECT\s+cron\.schedule\s*\(\s*['"`]([^'"`]+)['"`]/gi);
        for (const match of cronMatches) {
          items.push({
            type: 'job',
            name: match[1],
            location: relativePath,
            status: 'active',
            metadata: { type: 'pg_cron' }
          });
        }
      } else {
        // Check for node-cron or similar
        if (content.includes('cron.schedule') || content.includes('setInterval')) {
          const jobName = path.basename(file, path.extname(file));
          items.push({
            type: 'job',
            name: jobName,
            location: relativePath,
            status: 'active',
            metadata: { type: 'node' }
          });
        }
      }
    }
  }

  return items;
}

async function main() {
  console.log('🔍 Starting system inventory scan...\n');

  const [services, routes, tables, policies, flags, jobs] = await Promise.all([
    scanServices(),
    scanRoutes(),
    scanDatabaseTables(),
    scanPolicies(),
    scanFlags(),
    scanJobs()
  ]);

  const allItems = [...services, ...routes, ...tables, ...policies, ...flags, ...jobs];

  const inventory: Inventory = {
    scannedAt: new Date().toISOString(),
    repository: WORKSPACE,
    items: allItems,
    summary: {
      services: services.length,
      routes: routes.length,
      tables: tables.filter(i => i.type === 'table').length,
      policies: policies.length,
      flags: flags.length,
      jobs: jobs.length,
      totalItems: allItems.length
    }
  };

  // Write inventory to file
  const outputPath = path.join(WORKSPACE, 'alignment/inventory.json');
  await fs.writeFile(outputPath, JSON.stringify(inventory, null, 2));

  console.log('✅ Inventory scan complete!\n');
  console.log('Summary:');
  console.log(`  Services:  ${inventory.summary.services}`);
  console.log(`  Routes:    ${inventory.summary.routes}`);
  console.log(`  Tables:    ${inventory.summary.tables}`);
  console.log(`  Policies:  ${inventory.summary.policies}`);
  console.log(`  Flags:     ${inventory.summary.flags}`);
  console.log(`  Jobs:      ${inventory.summary.jobs}`);
  console.log(`  Total:     ${inventory.summary.totalItems}\n`);
  console.log(`📄 Inventory saved to: ${outputPath}`);
}

if (require.main === module) {
  main().catch(console.error);
}

export { scanServices, scanRoutes, scanDatabaseTables, scanPolicies, scanFlags, scanJobs };
export type { Inventory, InventoryItem };
