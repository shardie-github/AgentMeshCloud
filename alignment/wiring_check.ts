#!/usr/bin/env tsx
/**
 * Wiring Check - Call Graph Verifier
 * Verifies integration between API ↔ DB ↔ Telemetry ↔ AI-Ops ↔ UI
 * Detects broken links, dead code, orphan resources
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import type { Inventory, InventoryItem } from './inventory_scan';

interface WiringIssue {
  severity: 'red' | 'yellow' | 'green';
  category: 'missing' | 'orphan' | 'duplicate' | 'unreachable' | 'drift';
  item: string;
  description: string;
  location?: string;
  suggestedFix?: string;
}

interface WiringReport {
  checkedAt: string;
  issues: WiringIssue[];
  summary: {
    red: number;
    yellow: number;
    green: number;
    total: number;
  };
  callGraphs: {
    apiToDb: { connected: string[]; missing: string[] };
    apiToTelemetry: { connected: string[]; missing: string[] };
    dbToTelemetry: { connected: string[]; missing: string[] };
  };
}

const WORKSPACE = process.cwd();

async function loadInventory(): Promise<Inventory> {
  const inventoryPath = path.join(WORKSPACE, 'alignment/inventory.json');
  const content = await fs.readFile(inventoryPath, 'utf-8');
  return JSON.parse(content) as Inventory;
}

async function checkApiToDbWiring(inventory: Inventory): Promise<WiringIssue[]> {
  const issues: WiringIssue[] = [];
  const routes = inventory.items.filter(i => i.type === 'route');
  const tables = inventory.items.filter(i => i.type === 'table');
  
  // Read route handler files to check for DB queries
  const routeFiles = await glob('src/api/routes/**/*.ts', { cwd: WORKSPACE, absolute: true });
  
  for (const file of routeFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(WORKSPACE, file);
    
    // Check if route file uses database but has no imports
    const hasDbUsage = content.includes('supabase') || content.includes('prisma') || 
                       content.includes('.from(') || content.includes('.select(');
    const hasDbImport = content.includes('@supabase/supabase-js') || 
                        content.includes('@prisma/client') ||
                        content.includes('supabase');
    
    if (hasDbUsage && !hasDbImport) {
      issues.push({
        severity: 'red',
        category: 'missing',
        item: relativePath,
        description: 'Route uses database operations but missing DB client import',
        location: relativePath,
        suggestedFix: 'Import Supabase client or Prisma client at top of file'
      });
    }
    
    // Check for hardcoded table names that don't exist in inventory
    const tableNameMatches = content.matchAll(/\.from\s*\(\s*['"`](\w+)['"`]\s*\)/g);
    for (const match of tableNameMatches) {
      const tableName = match[1];
      const tableExists = tables.some(t => t.name === tableName || t.name.endsWith(`.${tableName}`));
      
      if (!tableExists) {
        issues.push({
          severity: 'yellow',
          category: 'missing',
          item: `Table: ${tableName}`,
          description: `Route references table '${tableName}' that doesn't exist in DB schema`,
          location: relativePath,
          suggestedFix: `Create migration for table '${tableName}' or fix table name`
        });
      }
    }
  }
  
  return issues;
}

async function checkApiToTelemetryWiring(inventory: Inventory): Promise<WiringIssue[]> {
  const issues: WiringIssue[] = [];
  const routes = inventory.items.filter(i => i.type === 'route');
  
  // Check route handlers for telemetry integration
  const routeFiles = await glob('src/api/routes/**/*.ts', { cwd: WORKSPACE, absolute: true });
  
  for (const file of routeFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(WORKSPACE, file);
    
    // Check if critical routes have telemetry
    const isCriticalRoute = content.includes('router.post') || content.includes('router.put') || content.includes('router.delete');
    const hasTelemetry = content.includes('tracer') || content.includes('logger') || 
                         content.includes('metrics') || content.includes('@opentelemetry');
    
    if (isCriticalRoute && !hasTelemetry) {
      issues.push({
        severity: 'yellow',
        category: 'missing',
        item: relativePath,
        description: 'Critical route mutation missing telemetry/logging',
        location: relativePath,
        suggestedFix: 'Add tracer, logger, or metrics instrumentation'
      });
    }
  }
  
  return issues;
}

async function checkPolicyRoutesCoverage(inventory: Inventory): Promise<WiringIssue[]> {
  const issues: WiringIssue[] = [];
  const routes = inventory.items.filter(i => i.type === 'route');
  const policies = inventory.items.filter(i => i.type === 'policy');
  
  // Read policy files to extract route patterns they protect
  const protectedRoutes = new Set<string>();
  
  for (const policy of policies) {
    const policyPath = path.join(WORKSPACE, policy.location);
    try {
      const content = await fs.readFile(policyPath, 'utf-8');
      
      // Extract route patterns from Rego or YAML
      const routeMatches = content.matchAll(/['"`](\/[\w\/-]+)['"`]/g);
      for (const match of routeMatches) {
        protectedRoutes.add(match[1]);
      }
    } catch (err) {
      // Skip if file can't be read
    }
  }
  
  // Check each route for policy coverage
  for (const route of routes) {
    const routePath = route.name.split(' ')[1]; // Extract path from "GET /path"
    const isProtected = Array.from(protectedRoutes).some(pattern => {
      return routePath === pattern || routePath.startsWith(pattern);
    });
    
    // Public routes are OK without policies
    const isPublicRoute = routePath === '/status' || routePath === '/health' || routePath.startsWith('/docs');
    
    if (!isProtected && !isPublicRoute) {
      issues.push({
        severity: 'red',
        category: 'missing',
        item: route.name,
        description: `Route has no policy coverage`,
        location: route.location,
        suggestedFix: 'Add OPA policy or RBAC check for this route'
      });
    }
  }
  
  return issues;
}

async function checkOrphanResources(inventory: Inventory): Promise<WiringIssue[]> {
  const issues: WiringIssue[] = [];
  
  // Check for exported functions that are never imported
  const tsFiles = await glob('src/**/*.ts', { cwd: WORKSPACE, absolute: true, ignore: ['**/*.test.ts', '**/*.spec.ts'] });
  
  const exports = new Map<string, { file: string; exports: string[] }>();
  const imports = new Set<string>();
  
  // First pass: collect all exports
  for (const file of tsFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(WORKSPACE, file);
    
    const exportMatches = content.matchAll(/export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+(\w+)/g);
    const exportedNames: string[] = [];
    
    for (const match of exportMatches) {
      exportedNames.push(match[1]);
    }
    
    if (exportedNames.length > 0) {
      exports.set(relativePath, { file: relativePath, exports: exportedNames });
    }
    
    // Collect imports
    const importMatches = content.matchAll(/import\s+(?:\{([^}]+)\}|(\w+))\s+from/g);
    for (const match of importMatches) {
      const importedItems = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
      importedItems.forEach(item => imports.add(item));
    }
  }
  
  // Second pass: find exports that are never imported
  for (const [file, data] of exports) {
    for (const exportName of data.exports) {
      if (!imports.has(exportName) && !exportName.startsWith('_')) {
        // Skip if it's the default export or used in the same file
        const fileContent = await fs.readFile(path.join(WORKSPACE, file), 'utf-8');
        const usedInFile = fileContent.includes(`${exportName}(`);
        
        if (!usedInFile) {
          issues.push({
            severity: 'yellow',
            category: 'orphan',
            item: `${exportName} in ${file}`,
            description: `Exported ${exportName} is never imported elsewhere`,
            location: file,
            suggestedFix: 'Remove export or create usage; possible dead code'
          });
        }
      }
    }
  }
  
  return issues;
}

async function checkDuplicateSchemas(): Promise<WiringIssue[]> {
  const issues: WiringIssue[] = [];
  
  // Find duplicate type/interface definitions
  const tsFiles = await glob('src/**/*.ts', { cwd: WORKSPACE, absolute: true, ignore: ['**/*.test.ts'] });
  const typeDefinitions = new Map<string, string[]>();
  
  for (const file of tsFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(WORKSPACE, file);
    
    const typeMatches = content.matchAll(/(?:interface|type)\s+(\w+)\s*[={]/g);
    for (const match of typeMatches) {
      const typeName = match[1];
      if (!typeDefinitions.has(typeName)) {
        typeDefinitions.set(typeName, []);
      }
      typeDefinitions.get(typeName)!.push(relativePath);
    }
  }
  
  // Report duplicates
  for (const [typeName, locations] of typeDefinitions) {
    if (locations.length > 1) {
      issues.push({
        severity: 'yellow',
        category: 'duplicate',
        item: `Type: ${typeName}`,
        description: `Type '${typeName}' defined in ${locations.length} files`,
        location: locations.join(', '),
        suggestedFix: 'Consolidate into single source in src/common/types.ts'
      });
    }
  }
  
  return issues;
}

async function checkTODOs(): Promise<WiringIssue[]> {
  const issues: WiringIssue[] = [];
  
  const allFiles = await glob('**/*.{ts,tsx,js,yaml,md}', { 
    cwd: WORKSPACE, 
    absolute: true, 
    ignore: ['node_modules/**', 'dist/**', '.next/**', 'coverage/**']
  });
  
  for (const file of allFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(WORKSPACE, file);
    
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('TODO') || line.includes('FIXME') || line.includes('XXX')) {
        issues.push({
          severity: 'yellow',
          category: 'drift',
          item: `${relativePath}:${idx + 1}`,
          description: line.trim(),
          location: relativePath,
          suggestedFix: 'Address TODO or remove if no longer relevant'
        });
      }
    });
  }
  
  return issues.slice(0, 50); // Limit to first 50 TODOs
}

async function generateReport(): Promise<WiringReport> {
  console.log('🔌 Checking system wiring and integration...\n');
  
  const inventory = await loadInventory();
  
  const [
    apiDbIssues,
    apiTelemetryIssues,
    policyCoverageIssues,
    orphanIssues,
    duplicateIssues,
    todoIssues
  ] = await Promise.all([
    checkApiToDbWiring(inventory),
    checkApiToTelemetryWiring(inventory),
    checkPolicyRoutesCoverage(inventory),
    checkOrphanResources(inventory),
    checkDuplicateSchemas(),
    checkTODOs()
  ]);
  
  const allIssues = [
    ...apiDbIssues,
    ...apiTelemetryIssues,
    ...policyCoverageIssues,
    ...orphanIssues,
    ...duplicateIssues,
    ...todoIssues
  ];
  
  const report: WiringReport = {
    checkedAt: new Date().toISOString(),
    issues: allIssues,
    summary: {
      red: allIssues.filter(i => i.severity === 'red').length,
      yellow: allIssues.filter(i => i.severity === 'yellow').length,
      green: allIssues.filter(i => i.severity === 'green').length,
      total: allIssues.length
    },
    callGraphs: {
      apiToDb: {
        connected: [],
        missing: apiDbIssues.filter(i => i.category === 'missing').map(i => i.item)
      },
      apiToTelemetry: {
        connected: [],
        missing: apiTelemetryIssues.map(i => i.item)
      },
      dbToTelemetry: {
        connected: [],
        missing: []
      }
    }
  };
  
  return report;
}

async function main() {
  const report = await generateReport();
  
  // Save report
  const outputPath = path.join(WORKSPACE, 'alignment/wiring_report.json');
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
  
  console.log('✅ Wiring check complete!\n');
  console.log('Summary:');
  console.log(`  🔴 Red (Critical):  ${report.summary.red}`);
  console.log(`  🟡 Yellow (Warning): ${report.summary.yellow}`);
  console.log(`  🟢 Green (Info):     ${report.summary.green}`);
  console.log(`  Total Issues:       ${report.summary.total}\n`);
  console.log(`📄 Wiring report saved to: ${outputPath}`);
  
  // Return exit code based on red issues
  if (report.summary.red > 0) {
    console.error(`\n❌ Found ${report.summary.red} critical issues. Fix before proceeding.`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { generateReport, checkApiToDbWiring, checkPolicyRoutesCoverage };
export type { WiringReport, WiringIssue };
