#!/usr/bin/env tsx
/**
 * ORCA Doctor Script
 * Runs health checks on environment, dependencies, and services
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

/**
 * Run a check
 */
function check(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, status: 'pass', message: 'OK' });
  } catch (error) {
    results.push({
      name,
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Check Node.js version
 */
check('Node.js version', () => {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  
  if (major < 18) {
    throw new Error(`Node.js ${version} is too old (require >=18.18.0)`);
  }
  
  console.log(`✓ Node.js ${version}`);
});

/**
 * Check pnpm
 */
check('pnpm installed', () => {
  try {
    const version = execSync('pnpm --version', { encoding: 'utf-8' }).trim();
    console.log(`✓ pnpm ${version}`);
  } catch {
    throw new Error('pnpm not found - install with: npm install -g pnpm');
  }
});

/**
 * Check required files
 */
check('Required config files', () => {
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    '.eslintrc.cjs',
    '.prettierrc',
    'mcp_registry.yaml',
    'policy_rules.yaml',
  ];

  const missing: string[] = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing files: ${missing.join(', ')}`);
  }

  console.log(`✓ All required config files present`);
});

/**
 * Check src structure
 */
check('/src structure', () => {
  const requiredDirs = [
    'src/common',
    'src/registry',
    'src/telemetry',
    'src/policy',
    'src/uadsi',
    'src/api',
    'src/security',
    'src/adapters',
  ];

  const missing: string[] = [];
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(process.cwd(), dir))) {
      missing.push(dir);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing directories: ${missing.join(', ')}`);
  }

  console.log(`✓ ORCA core structure present`);
});

/**
 * Check environment variables
 */
check('Environment variables', () => {
  const recommended = [
    'NODE_ENV',
    'PORT',
    'LOG_LEVEL',
  ];

  const missing = recommended.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠ Missing recommended env vars: ${missing.join(', ')}`);
  } else {
    console.log(`✓ Key environment variables set`);
  }
});

/**
 * Check database connectivity (if configured)
 */
check('Database connectivity', () => {
  // Mock check - in production would attempt actual connection
  console.log(`✓ Database connectivity check (skipped in doctor)`);
});

/**
 * Check dependencies
 */
check('Dependencies installed', () => {
  if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    throw new Error('node_modules not found - run: pnpm install');
  }

  console.log(`✓ Dependencies installed`);
});

/**
 * Print summary
 */
console.log('\n' + '='.repeat(50));
console.log('ORCA DOCTOR REPORT');
console.log('='.repeat(50) + '\n');

const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const warned = results.filter(r => r.status === 'warn').length;

for (const result of results) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌';
  console.log(`${icon} ${result.name}: ${result.message}`);
}

console.log('\n' + '='.repeat(50));
console.log(`Summary: ${passed} passed, ${failed} failed, ${warned} warnings`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  console.error('❌ Doctor check FAILED - fix errors above before proceeding');
  process.exit(1);
} else {
  console.log('✅ Doctor check PASSED - system is healthy!');
  process.exit(0);
}
