#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Bundle size budgets (in bytes)
const BUDGETS = {
  client: {
    warn: 250 * 1024, // 250 KB
    fail: 400 * 1024, // 400 KB
  },
  serverless: {
    warn: 1.2 * 1024 * 1024, // 1.2 MB
    fail: 1.5 * 1024 * 1024, // 1.5 MB
  },
  edge: {
    warn: 1.2 * 1024 * 1024, // 1.2 MB
    fail: 1.5 * 1024 * 1024, // 1.5 MB
  },
};

const FRONTEND_DIR = './apps/front';
const REPORT_FILE = './bundle-report.json';

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  console.log('📊 Analyzing bundle sizes...');
  
  try {
    // Build the frontend
    console.log('🔨 Building frontend...');
    execSync('pnpm run build --filter=@agentmesh/front', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    const report = {
      timestamp: new Date().toISOString(),
      budgets: BUDGETS,
      bundles: {},
      violations: [],
      summary: {
        totalBundles: 0,
        warnings: 0,
        failures: 0,
      }
    };

    // Analyze Next.js build output
    const nextDir = path.join(FRONTEND_DIR, '.next');
    if (fs.existsSync(nextDir)) {
      analyzeNextBuild(nextDir, report);
    }

    // Check for heavy dependencies
    analyzeDependencies(report);

    // Write report
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n📋 Bundle Analysis Summary:');
    console.log(`Total bundles analyzed: ${report.summary.totalBundles}`);
    console.log(`Warnings: ${report.summary.warnings}`);
    console.log(`Failures: ${report.summary.failures}`);
    
    if (report.violations.length > 0) {
      console.log('\n⚠️  Bundle Size Violations:');
      report.violations.forEach(violation => {
        console.log(`  ${violation.type}: ${violation.bundle} (${formatBytes(violation.size)}) - ${violation.severity}`);
      });
    }

    // Exit with error code if failures
    if (report.summary.failures > 0) {
      console.log('\n❌ Bundle size budget exceeded!');
      process.exit(1);
    } else if (report.summary.warnings > 0) {
      console.log('\n⚠️  Bundle size warnings detected.');
    } else {
      console.log('\n✅ All bundle sizes within budget!');
    }

  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

function analyzeNextBuild(nextDir, report) {
  const staticDir = path.join(nextDir, 'static');
  const serverDir = path.join(nextDir, 'server');
  
  // Analyze client bundles
  if (fs.existsSync(staticDir)) {
    const chunksDir = path.join(staticDir, 'chunks');
    if (fs.existsSync(chunksDir)) {
      const files = fs.readdirSync(chunksDir);
      files.forEach(file => {
        if (file.endsWith('.js')) {
          const filePath = path.join(chunksDir, file);
          const stats = fs.statSync(filePath);
          const size = stats.size;
          
          report.bundles[`client-${file}`] = {
            type: 'client',
            size,
            path: filePath,
          };
          
          report.summary.totalBundles++;
          
          if (size > BUDGETS.client.fail) {
            report.violations.push({
              type: 'client',
              bundle: file,
              size,
              severity: 'fail',
            });
            report.summary.failures++;
          } else if (size > BUDGETS.client.warn) {
            report.violations.push({
              type: 'client',
              bundle: file,
              size,
              severity: 'warn',
            });
            report.summary.warnings++;
          }
        }
      });
    }
  }

  // Analyze server bundles
  if (fs.existsSync(serverDir)) {
    analyzeServerBundles(serverDir, report);
  }
}

function analyzeServerBundles(serverDir, report) {
  const pagesDir = path.join(serverDir, 'pages');
  const appDir = path.join(serverDir, 'app');
  
  // Analyze pages directory
  if (fs.existsSync(pagesDir)) {
    analyzeDirectory(pagesDir, report, 'serverless');
  }
  
  // Analyze app directory
  if (fs.existsSync(appDir)) {
    analyzeDirectory(appDir, report, 'serverless');
  }
}

function analyzeDirectory(dir, report, type) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      analyzeDirectory(filePath, report, type);
    } else if (file.name.endsWith('.js')) {
      const stats = fs.statSync(filePath);
      const size = stats.size;
      
      report.bundles[`${type}-${file.name}`] = {
        type,
        size,
        path: filePath,
      };
      
      report.summary.totalBundles++;
      
      const budget = BUDGETS[type];
      if (size > budget.fail) {
        report.violations.push({
          type,
          bundle: file.name,
          size,
          severity: 'fail',
        });
        report.summary.failures++;
      } else if (size > budget.warn) {
        report.violations.push({
          type,
          bundle: file.name,
          size,
          severity: 'warn',
        });
        report.summary.warnings++;
      }
    }
  });
}

function analyzeDependencies(report) {
  console.log('🔍 Analyzing dependencies...');
  
  const packageJsonPath = path.join(FRONTEND_DIR, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check for known heavy dependencies
    const heavyDeps = [
      'lodash',
      'moment',
      'jquery',
      'bootstrap',
      'antd',
      'material-ui',
      '@mui/material',
      'recharts', // Already in use
    ];
    
    const foundHeavy = heavyDeps.filter(dep => dependencies[dep]);
    if (foundHeavy.length > 0) {
      report.violations.push({
        type: 'dependency',
        bundle: 'heavy-dependencies',
        size: 0,
        severity: 'warn',
        message: `Heavy dependencies detected: ${foundHeavy.join(', ')}`,
      });
      report.summary.warnings++;
    }
  }
}

// Run analysis
analyzeBundle();