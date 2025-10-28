#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Patterns to detect secrets
const SECRET_PATTERNS = [
  // Service role keys
  { pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/gi, name: 'Supabase Service Role Key' },
  { pattern: /service_role_key\s*[:=]\s*['"][^'"]+['"]/gi, name: 'Service Role Key' },
  
  // Database URLs
  { pattern: /DATABASE_URL\s*=\s*['"][^'"]+['"]/gi, name: 'Database URL' },
  { pattern: /postgres:\/\/[^'"]+/gi, name: 'PostgreSQL URL' },
  
  // API Keys
  { pattern: /API_KEY\s*=\s*['"][^'"]+['"]/gi, name: 'API Key' },
  { pattern: /SECRET_KEY\s*=\s*['"][^'"]+['"]/gi, name: 'Secret Key' },
  { pattern: /PRIVATE_KEY\s*=\s*['"][^'"]+['"]/gi, name: 'Private Key' },
  
  // Tokens
  { pattern: /VERCEL_TOKEN\s*=\s*['"][^'"]+['"]/gi, name: 'Vercel Token' },
  { pattern: /GITHUB_TOKEN\s*=\s*['"][^'"]+['"]/gi, name: 'GitHub Token' },
  { pattern: /RAILWAY_TOKEN\s*=\s*['"][^'"]+['"]/gi, name: 'Railway Token' },
  { pattern: /TURBO_TOKEN\s*=\s*['"][^'"]+['"]/gi, name: 'Turbo Token' },
  
  // JWT secrets
  { pattern: /JWT_SECRET\s*=\s*['"][^'"]+['"]/gi, name: 'JWT Secret' },
  { pattern: /SESSION_SECRET\s*=\s*['"][^'"]+['"]/gi, name: 'Session Secret' },
  
  // AWS credentials
  { pattern: /AWS_ACCESS_KEY_ID\s*=\s*['"][^'"]+['"]/gi, name: 'AWS Access Key' },
  { pattern: /AWS_SECRET_ACCESS_KEY\s*=\s*['"][^'"]+['"]/gi, name: 'AWS Secret Key' },
  
  // Generic patterns
  { pattern: /['"][A-Za-z0-9+/]{40,}['"]/g, name: 'Potential Base64 Secret' },
  { pattern: /['"][A-Za-z0-9]{32,}['"]/g, name: 'Potential Long Secret' },
];

// Files to scan
const SCAN_PATHS = [
  'apps/**/*.{ts,tsx,js,jsx}',
  'packages/**/*.{ts,tsx,js,jsx}',
  'ecosystem/**/*.{ts,tsx,js,jsx}',
  'digital-twin/**/*.{ts,tsx,js,jsx}',
  'aiops/**/*.{ts,tsx,js,jsx}',
  'partners/**/*.{ts,tsx,js,jsx}',
  'feedback/**/*.{ts,tsx,js,jsx}',
  'marketing/**/*.{ts,tsx,js,jsx}',
  'growth/**/*.{ts,tsx,js,jsx}',
  'supabase/**/*.{ts,js,sql}',
  'scripts/**/*.{ts,js,mjs}',
  '*.{ts,js,json,md}',
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.next/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '*.d.ts',
  'package-lock.json',
  'pnpm-lock.yaml',
  'bundle-report.json',
];

function scanFile(filePath) {
  const violations = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    SECRET_PATTERNS.forEach(({ pattern, name }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Check if it's a placeholder or example
          if (isPlaceholder(match)) {
            return;
          }
          
          violations.push({
            file: filePath,
            pattern: name,
            match: match.substring(0, 50) + '...',
            line: getLineNumber(content, match),
          });
        });
      }
    });
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
  }
  
  return violations;
}

function isPlaceholder(match) {
  const placeholders = [
    'your-',
    'example-',
    'placeholder',
    'replace-me',
    'change-me',
    'TODO',
    'FIXME',
    'localhost',
    '127.0.0.1',
    'example.com',
    'test-',
    'demo-',
  ];
  
  return placeholders.some(placeholder => 
    match.toLowerCase().includes(placeholder)
  );
}

function getLineNumber(content, match) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match)) {
      return i + 1;
    }
  }
  return 0;
}

function scanGitHistory() {
  console.log('🔍 Scanning git history for secrets...');
  
  try {
    // Check for secrets in git history
    const command = `git log --all --full-history --oneline --name-only | grep -E '\\.(ts|tsx|js|jsx|json|md)$' | head -20`;
    const output = execSync(command, { encoding: 'utf8' });
    const files = output.split('\n').filter(f => f.trim());
    
    const violations = [];
    files.forEach(file => {
      if (fs.existsSync(file)) {
        const fileViolations = scanFile(file);
        violations.push(...fileViolations);
      }
    });
    
    return violations;
  } catch (error) {
    console.warn('Warning: Could not scan git history:', error.message);
    return [];
  }
}

function scanWorkspace() {
  console.log('🔍 Scanning workspace for secrets...');
  
  const violations = [];
  
  // Use find command to get all files
  const findCommand = `find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" \\) -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./dist/*" -not -path "./build/*" -not -path "./coverage/*"`;
  
  try {
    const output = execSync(findCommand, { encoding: 'utf8' });
    const files = output.split('\n').filter(f => f.trim());
    
    files.forEach(file => {
      const fileViolations = scanFile(file);
      violations.push(...fileViolations);
    });
  } catch (error) {
    console.error('Error scanning workspace:', error.message);
  }
  
  return violations;
}

function checkEnvironmentFiles() {
  console.log('🔍 Checking environment files...');
  
  const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.env.example',
  ];
  
  const violations = [];
  
  envFiles.forEach(envFile => {
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for SERVICE_ROLE in any form
        if (line.includes('SERVICE_ROLE') && !line.startsWith('#')) {
          violations.push({
            file: envFile,
            pattern: 'SERVICE_ROLE detected',
            match: line.trim(),
            line: index + 1,
            severity: 'critical',
          });
        }
      });
    }
  });
  
  return violations;
}

function main() {
  console.log('🔐 Starting secrets scan...');
  
  const report = {
    timestamp: new Date().toISOString(),
    violations: [],
    summary: {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
    },
  };
  
  // Scan workspace files
  const workspaceViolations = scanWorkspace();
  report.violations.push(...workspaceViolations);
  
  // Scan git history
  const gitViolations = scanGitHistory();
  report.violations.push(...gitViolations);
  
  // Check environment files
  const envViolations = checkEnvironmentFiles();
  report.violations.push(...envViolations);
  
  // Categorize violations
  report.violations.forEach(violation => {
    report.summary.total++;
    
    if (violation.severity === 'critical') {
      report.summary.critical++;
    } else if (violation.pattern.includes('SERVICE_ROLE') || violation.pattern.includes('Database URL')) {
      report.summary.high++;
    } else {
      report.summary.medium++;
    }
  });
  
  // Print results
  console.log('\n📋 Secrets Scan Results:');
  console.log(`Total violations: ${report.summary.total}`);
  console.log(`Critical: ${report.summary.critical}`);
  console.log(`High: ${report.summary.high}`);
  console.log(`Medium: ${report.summary.medium}`);
  
  if (report.violations.length > 0) {
    console.log('\n⚠️  Detected Secrets:');
    report.violations.forEach((violation, index) => {
      console.log(`  ${index + 1}. ${violation.pattern}`);
      console.log(`     File: ${violation.file}:${violation.line}`);
      console.log(`     Match: ${violation.match}`);
      console.log('');
    });
  }
  
  // Write report
  fs.writeFileSync('./secrets-scan-report.json', JSON.stringify(report, null, 2));
  
  // Exit with error if critical or high severity violations found
  if (report.summary.critical > 0 || report.summary.high > 0) {
    console.log('❌ Critical or high severity secrets detected!');
    process.exit(1);
  } else if (report.summary.medium > 0) {
    console.log('⚠️  Medium severity secrets detected.');
  } else {
    console.log('✅ No secrets detected!');
  }
}

main();