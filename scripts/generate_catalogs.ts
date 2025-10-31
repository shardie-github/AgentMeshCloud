#!/usr/bin/env tsx
/**
 * Catalog Generator
 * Generates unified schema, API, event, policy, and dependency catalogs
 * Single source of truth for all contracts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as yaml from 'js-yaml';

const WORKSPACE = process.cwd();
const CATALOG_DIR = path.join(WORKSPACE, 'catalog');

interface SchemaEntry {
  name: string;
  type: 'interface' | 'type' | 'class' | 'enum' | 'zod' | 'sql';
  source: string;
  properties?: Record<string, { type: string; required: boolean; description?: string }>;
  deprecated?: boolean;
  since?: string;
}

interface ApiEntry {
  operationId: string;
  method: string;
  path: string;
  tags: string[];
  requestSchema?: string;
  responseSchema?: string;
  deprecated: boolean;
  consumers?: string[];
  since: string;
}

interface EventEntry {
  name: string;
  version: string;
  schema: string;
  producers: string[];
  consumers: string[];
  deprecated: boolean;
}

interface PolicyEntry {
  id: string;
  name: string;
  type: 'rego' | 'yaml' | 'rbac';
  source: string;
  routes: string[];
  resources: string[];
  enabled: boolean;
}

interface DependencyEntry {
  name: string;
  version: string;
  type: 'npm' | 'sdk' | 'service' | 'external';
  usedBy: string[];
  criticality: 'critical' | 'high' | 'medium' | 'low';
  lastUpdated: string;
}

async function generateSchemaRegistry(): Promise<SchemaEntry[]> {
  console.log('📋 Generating schema registry...');
  
  const entries: SchemaEntry[] = [];
  
  // Scan TypeScript files for types/interfaces
  const tsFiles = await glob('src/**/*.ts', { 
    cwd: WORKSPACE, 
    absolute: true,
    ignore: ['**/*.test.ts', '**/*.spec.ts']
  });
  
  for (const file of tsFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(WORKSPACE, file);
    
    // Extract interfaces
    const interfaceRegex = /export\s+interface\s+(\w+)\s*\{([^}]+)\}/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      
      const properties: Record<string, any> = {};
      const propLines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      for (const line of propLines) {
        const propMatch = line.match(/(\w+)(\?)?:\s*([^;]+)/);
        if (propMatch) {
          properties[propMatch[1]] = {
            type: propMatch[3].trim(),
            required: !propMatch[2]
          };
        }
      }
      
      entries.push({
        name,
        type: 'interface',
        source: relativePath,
        properties,
        deprecated: content.includes(`@deprecated`) && content.indexOf(`@deprecated`) < content.indexOf(name),
        since: '1.0.0'
      });
    }
    
    // Extract type aliases
    const typeRegex = /export\s+type\s+(\w+)\s*=\s*([^;]+);/g;
    while ((match = typeRegex.exec(content)) !== null) {
      entries.push({
        name: match[1],
        type: 'type',
        source: relativePath,
        deprecated: false,
        since: '1.0.0'
      });
    }
  }
  
  // Scan SQL schemas
  const sqlFiles = await glob('supabase/migrations/**/*.sql', { cwd: WORKSPACE, absolute: true });
  
  for (const file of sqlFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(WORKSPACE, file);
    
    // Extract table schemas
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+\.\w+|\w+)\s*\(([^)]+)\)/gi;
    let match;
    
    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const columns = match[2];
      
      const properties: Record<string, any> = {};
      const columnLines = columns.split(',').map(l => l.trim());
      
      for (const col of columnLines) {
        const colMatch = col.match(/(\w+)\s+(\w+(?:\([^)]+\))?)/);
        if (colMatch) {
          properties[colMatch[1]] = {
            type: colMatch[2],
            required: col.includes('NOT NULL')
          };
        }
      }
      
      entries.push({
        name: tableName,
        type: 'sql',
        source: relativePath,
        properties,
        since: '1.0.0'
      });
    }
  }
  
  console.log(`  ✓ Found ${entries.length} schema entries`);
  return entries;
}

async function generateApiRegistry(): Promise<ApiEntry[]> {
  console.log('🌐 Generating API registry...');
  
  const entries: ApiEntry[] = [];
  
  // Parse OpenAPI specs
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
              entries.push({
                operationId: details.operationId,
                method: method.toUpperCase(),
                path: routePath,
                tags: details.tags || [],
                requestSchema: details.requestBody?.content?.['application/json']?.schema?.$ref,
                responseSchema: details.responses?.['200']?.content?.['application/json']?.schema?.$ref,
                deprecated: details.deprecated || false,
                consumers: [],
                since: '1.0.0'
              });
            }
          }
        }
      }
    } catch (err) {
      // File might not exist
    }
  }
  
  console.log(`  ✓ Found ${entries.length} API endpoints`);
  return entries;
}

async function generateEventRegistry(): Promise<EventEntry[]> {
  console.log('📡 Generating event registry...');
  
  const entries: EventEntry[] = [];
  
  // Parse mesh event schemas
  const eventSchemaFiles = ['mesh_event.schema.json', 'mesh_event.schema.orca.json'];
  
  for (const file of eventSchemaFiles) {
    const filePath = path.join(WORKSPACE, file);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const schema = JSON.parse(content);
      
      if (schema.definitions || schema.$defs) {
        const defs = schema.definitions || schema.$defs;
        for (const [eventName, eventSchema] of Object.entries(defs)) {
          entries.push({
            name: eventName,
            version: '1.0',
            schema: JSON.stringify(eventSchema),
            producers: [],
            consumers: [],
            deprecated: false
          });
        }
      }
    } catch (err) {
      // File might not exist
    }
  }
  
  // Also scan context_bus.yaml
  try {
    const contextBusPath = path.join(WORKSPACE, 'context_bus.yaml');
    const content = await fs.readFile(contextBusPath, 'utf-8');
    const config = yaml.load(content) as any;
    
    if (config.events) {
      for (const [eventName, eventConfig] of Object.entries(config.events as any)) {
        entries.push({
          name: eventName,
          version: eventConfig.version || '1.0',
          schema: JSON.stringify(eventConfig.schema || {}),
          producers: eventConfig.producers || [],
          consumers: eventConfig.consumers || [],
          deprecated: eventConfig.deprecated || false
        });
      }
    }
  } catch (err) {
    // File might not exist
  }
  
  console.log(`  ✓ Found ${entries.length} event types`);
  return entries;
}

async function generatePolicyRegistry(): Promise<PolicyEntry[]> {
  console.log('🔐 Generating policy registry...');
  
  const entries: PolicyEntry[] = [];
  
  // Scan Rego policies
  const regoFiles = await glob('**/*.rego', { cwd: WORKSPACE, absolute: true, ignore: ['node_modules/**'] });
  
  for (const file of regoFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(WORKSPACE, file);
    
    const packageMatch = content.match(/package\s+([\w.]+)/);
    if (packageMatch) {
      // Extract routes and resources from policy
      const routeMatches = content.matchAll(/['"`](\/[\w\/-]+)['"`]/g);
      const routes = Array.from(routeMatches).map(m => m[1]);
      
      entries.push({
        id: packageMatch[1],
        name: path.basename(file, '.rego'),
        type: 'rego',
        source: relativePath,
        routes: [...new Set(routes)],
        resources: [],
        enabled: true
      });
    }
  }
  
  // Scan YAML policies
  const policyYamlFiles = await glob('**/policy*.yaml', { 
    cwd: WORKSPACE, 
    absolute: true, 
    ignore: ['node_modules/**', 'catalog/**']
  });
  
  for (const file of policyYamlFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(WORKSPACE, file);
    
    try {
      const policies = yaml.load(content) as any;
      
      if (policies && typeof policies === 'object') {
        for (const [policyId, policyConfig] of Object.entries(policies)) {
          entries.push({
            id: policyId,
            name: policyId,
            type: 'yaml',
            source: relativePath,
            routes: (policyConfig as any).routes || [],
            resources: (policyConfig as any).resources || [],
            enabled: (policyConfig as any).enabled !== false
          });
        }
      }
    } catch (err) {
      // Invalid YAML
    }
  }
  
  console.log(`  ✓ Found ${entries.length} policies`);
  return entries;
}

async function generateDependencyRegistry(): Promise<DependencyEntry[]> {
  console.log('📦 Generating dependency registry...');
  
  const entries: DependencyEntry[] = [];
  
  // Parse package.json
  const packageJsonPath = path.join(WORKSPACE, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
  
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  for (const [name, version] of Object.entries(allDeps)) {
    // Determine criticality based on package name
    let criticality: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    
    if (name.includes('supabase') || name.includes('prisma') || name === 'express') {
      criticality = 'critical';
    } else if (name.includes('opentelemetry') || name.includes('security')) {
      criticality = 'high';
    } else if (name.startsWith('@types/') || name.includes('eslint') || name.includes('prettier')) {
      criticality = 'low';
    }
    
    entries.push({
      name,
      version: version as string,
      type: 'npm',
      usedBy: [],
      criticality,
      lastUpdated: new Date().toISOString()
    });
  }
  
  console.log(`  ✓ Found ${entries.length} dependencies`);
  return entries;
}

async function main() {
  console.log('🏗️  Generating system catalogs...\n');
  
  // Ensure catalog directory exists
  await fs.mkdir(CATALOG_DIR, { recursive: true });
  
  // Generate all catalogs in parallel
  const [schemas, apis, events, policies, dependencies] = await Promise.all([
    generateSchemaRegistry(),
    generateApiRegistry(),
    generateEventRegistry(),
    generatePolicyRegistry(),
    generateDependencyRegistry()
  ]);
  
  // Write catalog files
  await Promise.all([
    fs.writeFile(
      path.join(CATALOG_DIR, 'schema.registry.json'),
      JSON.stringify({ version: '1.0', generatedAt: new Date().toISOString(), schemas }, null, 2)
    ),
    fs.writeFile(
      path.join(CATALOG_DIR, 'api.registry.json'),
      JSON.stringify({ version: '1.0', generatedAt: new Date().toISOString(), apis }, null, 2)
    ),
    fs.writeFile(
      path.join(CATALOG_DIR, 'event.registry.json'),
      JSON.stringify({ version: '1.0', generatedAt: new Date().toISOString(), events }, null, 2)
    ),
    fs.writeFile(
      path.join(CATALOG_DIR, 'policy.registry.json'),
      JSON.stringify({ version: '1.0', generatedAt: new Date().toISOString(), policies }, null, 2)
    ),
    fs.writeFile(
      path.join(CATALOG_DIR, 'dependency.registry.json'),
      JSON.stringify({ version: '1.0', generatedAt: new Date().toISOString(), dependencies }, null, 2)
    )
  ]);
  
  console.log('\n✅ All catalogs generated successfully!\n');
  console.log('Generated files:');
  console.log('  - catalog/schema.registry.json');
  console.log('  - catalog/api.registry.json');
  console.log('  - catalog/event.registry.json');
  console.log('  - catalog/policy.registry.json');
  console.log('  - catalog/dependency.registry.json');
  console.log('');
}

if (require.main === module) {
  main().catch(console.error);
}

export {
  generateSchemaRegistry,
  generateApiRegistry,
  generateEventRegistry,
  generatePolicyRegistry,
  generateDependencyRegistry
};
