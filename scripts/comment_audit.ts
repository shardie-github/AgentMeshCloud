#!/usr/bin/env tsx
/**
 * Comment Audit Script
 * Counts exported symbols lacking JSDoc documentation
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

interface AuditResult {
  file: string;
  exports: ExportInfo[];
  documented: number;
  undocumented: number;
  coverage: number;
}

interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const';
  line: number;
  documented: boolean;
}

/**
 * Find all TypeScript files in directory
 */
function findTypeScriptFiles(dir: string, exclude: string[] = []): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const relativePath = relative(process.cwd(), fullPath);

      // Skip excluded paths
      if (exclude.some((pattern) => relativePath.includes(pattern))) {
        continue;
      }

      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Check if export has JSDoc comment
 */
function hasJSDoc(lines: string[], lineIndex: number): boolean {
  // Look backwards for JSDoc comment
  for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 10); i--) {
    const line = lines[i]?.trim() ?? '';

    // Found JSDoc comment
    if (line.includes('/**') || line.includes('*/')) {
      return true;
    }

    // Found non-comment, non-empty line - no JSDoc
    if (line !== '' && !line.startsWith('//') && !line.startsWith('*')) {
      break;
    }
  }

  return false;
}

/**
 * Audit a single file
 */
function auditFile(filePath: string): AuditResult {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const exports: ExportInfo[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? '';

    // Skip empty lines and comments
    if (line === '' || line.startsWith('//') || line.startsWith('*')) {
      continue;
    }

    // Match exported symbols
    const exportMatch = line.match(/export\s+(function|class|interface|type|const)\s+([A-Z]\w+)/);
    if (exportMatch !== null) {
      const type = exportMatch[1] as ExportInfo['type'];
      const name = exportMatch[2];

      if (name !== undefined && type !== undefined) {
        const documented = hasJSDoc(lines, i);
        exports.push({
          name,
          type,
          line: i + 1,
          documented,
        });
      }
    }
  }

  const documented = exports.filter((e) => e.documented).length;
  const undocumented = exports.length - documented;
  const coverage = exports.length > 0 ? Math.round((documented / exports.length) * 100) : 100;

  return {
    file: relative(process.cwd(), filePath),
    exports,
    documented,
    undocumented,
    coverage,
  };
}

/**
 * Generate audit report
 */
function generateReport(results: AuditResult[]): void {
  console.log('\n📊 Comment Audit Report\n');
  console.log('='.repeat(80));

  // Overall stats
  const totalExports = results.reduce((sum, r) => sum + r.exports.length, 0);
  const totalDocumented = results.reduce((sum, r) => sum + r.documented, 0);
  const totalUndocumented = totalExports - totalDocumented;
  const overallCoverage = totalExports > 0 ? Math.round((totalDocumented / totalExports) * 100) : 100;

  console.log(`\n📈 Overall Coverage: ${overallCoverage}%`);
  console.log(`   Total Exports: ${totalExports}`);
  console.log(`   Documented: ${totalDocumented}`);
  console.log(`   Undocumented: ${totalUndocumented}\n`);

  // Files needing attention
  const needsAttention = results.filter((r) => r.coverage < 80 && r.exports.length > 0);

  if (needsAttention.length > 0) {
    console.log('⚠️  Files Needing Attention (< 80% coverage):\n');
    
    needsAttention.sort((a, b) => a.coverage - b.coverage).forEach((result) => {
      console.log(`   ${result.coverage}% - ${result.file} (${result.undocumented} undocumented)`);
      
      // Show undocumented exports
      const undoc = result.exports.filter((e) => !e.documented);
      if (undoc.length <= 5) {
        undoc.forEach((exp) => {
          console.log(`      - ${exp.name} (${exp.type}) at line ${exp.line}`);
        });
      } else {
        undoc.slice(0, 3).forEach((exp) => {
          console.log(`      - ${exp.name} (${exp.type}) at line ${exp.line}`);
        });
        console.log(`      ... and ${undoc.length - 3} more`);
      }
      console.log();
    });
  } else {
    console.log('✅ All files meet coverage threshold!\n');
  }

  // Summary by coverage level
  const excellent = results.filter((r) => r.coverage >= 90).length;
  const good = results.filter((r) => r.coverage >= 80 && r.coverage < 90).length;
  const needsWork = results.filter((r) => r.coverage >= 50 && r.coverage < 80).length;
  const poor = results.filter((r) => r.coverage < 50 && r.exports.length > 0).length;

  console.log('📊 Coverage Distribution:\n');
  console.log(`   90-100%: ${excellent} files (excellent)`);
  console.log(`   80-89%:  ${good} files (good)`);
  console.log(`   50-79%:  ${needsWork} files (needs work)`);
  console.log(`   0-49%:   ${poor} files (poor)\n`);

  console.log('='.repeat(80));

  // Exit with error if below threshold
  if (overallCoverage < 70) {
    console.error('\n❌ Comment coverage below threshold (70%)');
    process.exit(1);
  } else if (overallCoverage < 80) {
    console.warn('\n⚠️  Comment coverage below target (80%)');
  } else {
    console.log('\n✅ Comment coverage meets target!');
  }
}

/**
 * Main audit function
 */
async function main(): Promise<void> {
  const targetDirs = ['src', 'packages'];
  const exclude = ['node_modules', 'dist', 'build', 'coverage', '.test.', '.spec.'];

  const allResults: AuditResult[] = [];

  for (const dir of targetDirs) {
    try {
      const files = findTypeScriptFiles(dir, exclude);
      console.log(`\n🔍 Auditing ${files.length} files in ${dir}/...`);

      for (const file of files) {
        const result = auditFile(file);
        if (result.exports.length > 0) {
          allResults.push(result);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Skipping ${dir}/ (not found)`);
    }
  }

  if (allResults.length === 0) {
    console.log('\n⚠️  No TypeScript files found to audit');
    return;
  }

  generateReport(allResults);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
}

export { auditFile, main as runCommentAudit };
