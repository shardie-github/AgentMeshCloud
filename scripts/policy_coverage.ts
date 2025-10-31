#!/usr/bin/env tsx
/**
 * Policy Coverage Checker
 * Ensures 100% of routes are protected by policies
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

const WORKSPACE = process.cwd();

interface Route {
  method: string;
  path: string;
  operationId: string;
}

interface Policy {
  id: string;
  routes: string[];
}

async function getRoutes(): Promise<Route[]> {
  const routes: Route[] = [];
  
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
              routes.push({
                method: method.toUpperCase(),
                path: routePath,
                operationId: details.operationId
              });
            }
          }
        }
      }
    } catch (err) {
      // Skip if file doesn't exist
    }
  }
  
  return routes;
}

async function getPolicies(): Promise<Policy[]> {
  const policies: Policy[] = [];
  
  // Load policy registry if it exists
  const registryPath = path.join(WORKSPACE, 'catalog/policy.registry.json');
  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    const registry = JSON.parse(content);
    
    if (registry.policies) {
      return registry.policies.map((p: any) => ({
        id: p.id,
        routes: p.routes || []
      }));
    }
  } catch (err) {
    console.warn('Policy registry not found, checking source files...');
  }
  
  // Fallback: scan policy files directly
  const policyYamlPath = path.join(WORKSPACE, 'policy_rules.yaml');
  try {
    const content = await fs.readFile(policyYamlPath, 'utf-8');
    const policyConfig = yaml.load(content) as any;
    
    if (policyConfig && policyConfig.policies) {
      for (const [policyId, config] of Object.entries(policyConfig.policies)) {
        policies.push({
          id: policyId,
          routes: (config as any).routes || []
        });
      }
    }
  } catch (err) {
    // No policies file
  }
  
  return policies;
}

function isRouteProtected(route: Route, policies: Policy[]): boolean {
  // Public routes don't need protection
  const publicRoutes = ['/status', '/health', '/docs', '/.well-known'];
  if (publicRoutes.some(pr => route.path.startsWith(pr))) {
    return true;
  }
  
  // Check if any policy covers this route
  for (const policy of policies) {
    for (const policyRoute of policy.routes) {
      // Exact match
      if (route.path === policyRoute) {
        return true;
      }
      
      // Wildcard match
      const pattern = policyRoute.replace(/\*/g, '.*').replace(/\{[^}]+\}/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(route.path)) {
        return true;
      }
    }
  }
  
  return false;
}

async function main() {
  console.log('🔐 Checking policy coverage...\n');
  
  const routes = await getRoutes();
  const policies = await getPolicies();
  
  console.log(`Found ${routes.length} routes`);
  console.log(`Found ${policies.length} policies\n`);
  
  const unprotectedRoutes: Route[] = [];
  
  for (const route of routes) {
    if (!isRouteProtected(route, policies)) {
      unprotectedRoutes.push(route);
    }
  }
  
  const coverage = ((routes.length - unprotectedRoutes.length) / routes.length) * 100;
  
  console.log(`Policy Coverage: ${coverage.toFixed(1)}%`);
  console.log(`Protected routes: ${routes.length - unprotectedRoutes.length}`);
  console.log(`Unprotected routes: ${unprotectedRoutes.length}\n`);
  
  if (unprotectedRoutes.length > 0) {
    console.error('❌ The following routes lack policy coverage:\n');
    
    unprotectedRoutes.forEach(route => {
      console.error(`  - ${route.method} ${route.path} (${route.operationId})`);
    });
    
    console.error('\n');
    console.error('Action required: Add OPA policy or RBAC check for these routes.');
    process.exit(1);
  } else {
    console.log('✅ 100% policy coverage achieved!');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
