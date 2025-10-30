#!/usr/bin/env tsx
/**
 * Doctor Script - One-click local health summary
 * Checks: DB connection, env variables, open ports, dependencies
 */

import { spawn } from 'child_process';
import { createConnection } from 'net';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

const results: CheckResult[] = [];

function logResult(result: CheckResult): void {
  const emoji = { pass: '✅', fail: '❌', warn: '⚠️' }[result.status];
  console.log(`${emoji} ${result.name}: ${result.message}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }
  results.push(result);
}

/**
 * Check Node.js version
 */
function checkNodeVersion(): CheckResult {
  const version = process.version;
  const major = parseInt(version.split('.')[0].substring(1));
  
  if (major >= 18) {
    return { name: 'Node.js Version', status: 'pass', message: version };
  } else {
    return { 
      name: 'Node.js Version', 
      status: 'fail', 
      message: `${version} (requires >= 18.18.0)`,
    };
  }
}

/**
 * Check environment variables
 */
function checkEnvVars(): CheckResult {
  const required = ['DATABASE_URL', 'PORT'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length === 0) {
    return { name: 'Environment Variables', status: 'pass', message: 'All required vars set' };
  } else {
    return {
      name: 'Environment Variables',
      status: 'fail',
      message: `Missing: ${missing.join(', ')}`,
      details: 'Run: cp .env.example .env',
    };
  }
}

/**
 * Check if port is available
 */
async function checkPort(port: number): Promise<CheckResult> {
  return new Promise((resolve) => {
    const server = createConnection({ port, host: 'localhost' }, () => {
      server.destroy();
      resolve({
        name: `Port ${port}`,
        status: 'warn',
        message: 'Port already in use',
      });
    });

    server.on('error', () => {
      resolve({
        name: `Port ${port}`,
        status: 'pass',
        message: 'Available',
      });
    });
  });
}

/**
 * Check database connection
 */
async function checkDatabase(): Promise<CheckResult> {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    return {
      name: 'Database',
      status: 'fail',
      message: 'DATABASE_URL not set',
    };
  }

  try {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    await client.query('SELECT 1');
    await client.end();

    return {
      name: 'Database',
      status: 'pass',
      message: 'Connected successfully',
    };
  } catch (error) {
    return {
      name: 'Database',
      status: 'fail',
      message: (error as Error).message,
      details: 'Ensure PostgreSQL is running: docker-compose up -d postgres',
    };
  }
}

/**
 * Check dependencies
 */
function checkDependencies(): CheckResult {
  const packageJsonPath = join(process.cwd(), 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    return {
      name: 'Dependencies',
      status: 'fail',
      message: 'package.json not found',
    };
  }

  const nodeModulesPath = join(process.cwd(), 'node_modules');
  
  if (!existsSync(nodeModulesPath)) {
    return {
      name: 'Dependencies',
      status: 'fail',
      message: 'node_modules not found',
      details: 'Run: pnpm install',
    };
  }

  return {
    name: 'Dependencies',
    status: 'pass',
    message: 'Installed',
  };
}

/**
 * Check TypeScript compilation
 */
async function checkTypeScript(): Promise<CheckResult> {
  return new Promise((resolve) => {
    const tsc = spawn('npx', ['tsc', '--noEmit'], { stdio: 'pipe' });
    let output = '';

    tsc.stderr.on('data', (data) => {
      output += data.toString();
    });

    tsc.on('close', (code) => {
      if (code === 0) {
        resolve({
          name: 'TypeScript',
          status: 'pass',
          message: 'No type errors',
        });
      } else {
        resolve({
          name: 'TypeScript',
          status: 'warn',
          message: 'Type errors found',
          details: 'Run: pnpm run typecheck',
        });
      }
    });
  });
}

/**
 * Check Docker services
 */
async function checkDocker(): Promise<CheckResult> {
  return new Promise((resolve) => {
    const docker = spawn('docker', ['ps', '--format', '{{.Names}}'], { stdio: 'pipe' });
    let output = '';

    docker.stdout.on('data', (data) => {
      output += data.toString();
    });

    docker.on('close', (code) => {
      if (code === 0) {
        const services = output.trim().split('\n').filter(s => s.includes('orca'));
        if (services.length > 0) {
          resolve({
            name: 'Docker Services',
            status: 'pass',
            message: `${services.length} services running`,
          });
        } else {
          resolve({
            name: 'Docker Services',
            status: 'warn',
            message: 'No ORCA services running',
            details: 'Run: docker-compose up -d',
          });
        }
      } else {
        resolve({
          name: 'Docker Services',
          status: 'warn',
          message: 'Docker not available',
        });
      }
    });

    docker.on('error', () => {
      resolve({
        name: 'Docker Services',
        status: 'warn',
        message: 'Docker not installed',
      });
    });
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 ORCA Health Check\n');

  // Synchronous checks
  logResult(checkNodeVersion());
  logResult(checkEnvVars());
  logResult(checkDependencies());

  // Asynchronous checks
  logResult(await checkPort(3000));
  logResult(await checkDatabase());
  logResult(await checkDocker());
  logResult(await checkTypeScript());

  // Summary
  console.log('\n📊 Summary');
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warned: ${warned}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Health check failed. Fix the issues above before starting ORCA.');
    process.exit(1);
  } else if (warned > 0) {
    console.log('\n⚠️  Health check passed with warnings. ORCA may not function fully.');
    process.exit(0);
  } else {
    console.log('\n✅ All checks passed! ORCA is ready to run.');
    console.log('   Start with: pnpm run orca:dev');
    process.exit(0);
  }
}

main().catch(console.error);
