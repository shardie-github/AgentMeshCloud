#!/usr/bin/env tsx
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createContextBus } from '../src/context-bus/context_bus.js';

interface Check {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

async function runDoctor() {
  console.log('🔧 ORCA AgentMesh Suite Doctor\n');
  console.log('Running health checks...\n');

  const checks: Check[] = [];

  // Check 1: Environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    'JWT_SECRET',
    'HMAC_SECRET',
  ];

  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingEnvVars.length === 0) {
    checks.push({
      name: 'Environment Variables',
      status: 'pass',
      message: 'All required environment variables present',
    });
  } else {
    checks.push({
      name: 'Environment Variables',
      status: 'fail',
      message: `Missing: ${missingEnvVars.join(', ')}`,
    });
  }

  // Check 2: .env.example exists
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (fs.existsSync(envExamplePath)) {
    checks.push({
      name: '.env.example',
      status: 'pass',
      message: 'File exists',
    });
  } else {
    checks.push({
      name: '.env.example',
      status: 'fail',
      message: 'File not found',
    });
  }

  // Check 3: Database connection
  try {
    const contextBus = createContextBus({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/orcamesh',
    });
    
    const healthy = await contextBus.healthCheck();
    await contextBus.close();
    
    if (healthy) {
      checks.push({
        name: 'Database Connection',
        status: 'pass',
        message: 'Successfully connected',
      });
    } else {
      checks.push({
        name: 'Database Connection',
        status: 'fail',
        message: 'Connection failed',
      });
    }
  } catch (error) {
    checks.push({
      name: 'Database Connection',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check 4: Schema file exists
  const schemaPath = path.join(process.cwd(), 'src', 'context-bus', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    checks.push({
      name: 'Database Schema',
      status: 'pass',
      message: 'schema.sql exists',
    });
  } else {
    checks.push({
      name: 'Database Schema',
      status: 'fail',
      message: 'schema.sql not found',
    });
  }

  // Check 5: OpenTelemetry endpoint
  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (otelEndpoint && otelEndpoint !== 'http://localhost:4317') {
    checks.push({
      name: 'OpenTelemetry',
      status: 'pass',
      message: `Configured: ${otelEndpoint}`,
    });
  } else if (otelEndpoint) {
    checks.push({
      name: 'OpenTelemetry',
      status: 'warn',
      message: 'Using default localhost endpoint',
    });
  } else {
    checks.push({
      name: 'OpenTelemetry',
      status: 'fail',
      message: 'Not configured',
    });
  }

  // Check 6: Required source files
  const requiredFiles = [
    'src/api/server.ts',
    'src/context-bus/context_bus.ts',
    'src/telemetry/otel.ts',
    'src/policy/policy_enforcer.ts',
    'src/uadsi/trust_scoring.ts',
    'src/registry/registry.service.ts',
  ];

  const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(process.cwd(), f)));
  
  if (missingFiles.length === 0) {
    checks.push({
      name: 'Source Files',
      status: 'pass',
      message: 'All required files present',
    });
  } else {
    checks.push({
      name: 'Source Files',
      status: 'fail',
      message: `Missing: ${missingFiles.join(', ')}`,
    });
  }

  // Check 7: Docker Compose file
  const dockerComposePath = path.join(process.cwd(), 'docker-compose.orca.yml');
  if (fs.existsSync(dockerComposePath)) {
    checks.push({
      name: 'Docker Compose',
      status: 'pass',
      message: 'docker-compose.orca.yml exists',
    });
  } else {
    checks.push({
      name: 'Docker Compose',
      status: 'warn',
      message: 'docker-compose.orca.yml not found',
    });
  }

  // Check 8: TypeScript config
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    if (tsconfig.compilerOptions?.strict) {
      checks.push({
        name: 'TypeScript Config',
        status: 'pass',
        message: 'Strict mode enabled',
      });
    } else {
      checks.push({
        name: 'TypeScript Config',
        status: 'warn',
        message: 'Strict mode not enabled',
      });
    }
  } else {
    checks.push({
      name: 'TypeScript Config',
      status: 'fail',
      message: 'tsconfig.json not found',
    });
  }

  // Print results
  console.log('┌─────────────────────────────┬────────┬─────────────────────────────────┐');
  console.log('│ Check                       │ Status │ Message                         │');
  console.log('├─────────────────────────────┼────────┼─────────────────────────────────┤');

  for (const check of checks) {
    const statusSymbol =
      check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️ ';
    const name = check.name.padEnd(27);
    const status = statusSymbol.padEnd(6);
    const message = check.message.substring(0, 31).padEnd(31);
    
    console.log(`│ ${name} │ ${status} │ ${message} │`);
  }

  console.log('└─────────────────────────────┴────────┴─────────────────────────────────┘\n');

  // Summary
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const warnings = checks.filter(c => c.status === 'warn').length;

  console.log(`Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);

  if (failed > 0) {
    console.log('\n❌ Some checks failed. Please fix the issues above.');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('\n⚠️  All critical checks passed, but some warnings were found.');
    process.exit(0);
  } else {
    console.log('\n✅ All checks passed! System is ready.');
    process.exit(0);
  }
}

runDoctor().catch(error => {
  console.error('❌ Doctor failed:', error);
  process.exit(1);
});
