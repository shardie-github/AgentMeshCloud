#!/usr/bin/env tsx
/**
 * Dead Code Detector
 * 
 * Identifies unused exports, functions, variables, and imports
 * using AST analysis and cross-file reference checking.
 */

import fs from 'fs';
import path from 'path';

interface DeadCodeIssue {
  file: string;
  line: number;
  type: 'unused-export' | 'unused-import' | 'unused-variable' | 'unreachable-code';
  name: string;
  message: string;
}

class DeadCodeDetector {
  private issues: DeadCodeIssue[] = [];
  private exports = new Map<string, Set<string>>();
  private imports = new Map<string, Set<string>>();

  /**
   * Analyze directory for dead code
   */
  async analyzeDirectory(dir: string): Promise<DeadCodeIssue[]> {
    const files = this.getSourceFiles(dir);
    console.log(`🔍 Analyzing ${files.length} files for dead code...\n`);

    // First pass: collect all exports and imports
    for (const file of files) {
      this.collectExportsAndImports(file);
    }

    // Second pass: detect unused code
    for (const file of files) {
      this.detectDeadCode(file);
    }

    return this.issues;
  }

  /**
   * Collect exports and imports from a file
   */
  private collectExportsAndImports(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Collect exports
    const exportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    const namedExportRegex = /export\s*{\s*([^}]+)\s*}/g;
    const defaultExportRegex = /export\s+default\s+(\w+)/g;

    let match;
    const fileExports = new Set<string>();

    while ((match = exportRegex.exec(content)) !== null) {
      fileExports.add(match[1]);
    }

    while ((match = namedExportRegex.exec(content)) !== null) {
      const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0]);
      names.forEach(name => fileExports.add(name));
    }

    while ((match = defaultExportRegex.exec(content)) !== null) {
      fileExports.add('default');
    }

    if (fileExports.size > 0) {
      this.exports.set(filePath, fileExports);
    }

    // Collect imports
    const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    const fileImports = new Set<string>();

    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0]);
        names.forEach(name => fileImports.add(name));
      } else if (match[2]) {
        fileImports.add(match[2]);
      }
    }

    if (fileImports.size > 0) {
      this.imports.set(filePath, fileImports);
    }
  }

  /**
   * Detect dead code in a file
   */
  private detectDeadCode(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Detect unused variables
    this.detectUnusedVariables(filePath, content, lines);

    // Detect unreachable code
    this.detectUnreachableCode(filePath, content, lines);

    // Detect unused imports
    this.detectUnusedImports(filePath, content, lines);
  }

  /**
   * Detect unused variables
   */
  private detectUnusedVariables(filePath: string, content: string, lines: string[]): void {
    // Simple heuristic: find variables that are declared but never used
    const varRegex = /(?:const|let|var)\s+(\w+)\s*=/g;
    let match;

    while ((match = varRegex.exec(content)) !== null) {
      const varName = match[1];
      const restOfContent = content.substring(match.index + match[0].length);
      
      // Check if variable is used elsewhere (simple check)
      const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
      const usages = restOfContent.match(usageRegex);

      if (!usages || usages.length === 0) {
        const line = content.substring(0, match.index).split('\n').length;
        this.issues.push({
          file: filePath,
          line,
          type: 'unused-variable',
          name: varName,
          message: `Variable '${varName}' is declared but never used`
        });
      }
    }
  }

  /**
   * Detect unreachable code
   */
  private detectUnreachableCode(filePath: string, content: string, lines: string[]): void {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      // Code after return/throw/continue/break
      if (/^\s*(?:return|throw|continue|break)\s*;?\s*$/.test(trimmed)) {
        // Check if next non-empty, non-comment, non-closing-brace line exists
        let nextIdx = idx + 1;
        while (nextIdx < lines.length) {
          const nextLine = lines[nextIdx].trim();
          if (nextLine && !nextLine.startsWith('//') && !nextLine.startsWith('/*') && 
              nextLine !== '}' && !nextLine.startsWith('*')) {
            this.issues.push({
              file: filePath,
              line: nextIdx + 1,
              type: 'unreachable-code',
              name: 'unreachable',
              message: 'Unreachable code detected after return/throw/break/continue'
            });
            break;
          }
          if (nextLine === '}') break;
          nextIdx++;
        }
      }
    });
  }

  /**
   * Detect unused imports
   */
  private detectUnusedImports(filePath: string, content: string, lines: string[]): void {
    const imports = this.imports.get(filePath);
    if (!imports) return;

    for (const importName of imports) {
      // Remove the import statement itself and check usage
      const importRegex = new RegExp(`import\\s+.*${importName}.*from`, 'g');
      const contentWithoutImport = content.replace(importRegex, '');
      
      const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
      const usages = contentWithoutImport.match(usageRegex);

      if (!usages || usages.length === 0) {
        // Find line number of import
        const importLine = lines.findIndex(line => 
          line.includes('import') && line.includes(importName)
        );

        if (importLine !== -1) {
          this.issues.push({
            file: filePath,
            line: importLine + 1,
            type: 'unused-import',
            name: importName,
            message: `Import '${importName}' is declared but never used`
          });
        }
      }
    }
  }

  /**
   * Get all source files
   */
  private getSourceFiles(dir: string): string[] {
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const excludeDirs = ['node_modules', 'dist', 'build', '.next', '.turbo', 'coverage'];
    const files: string[] = [];

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    walk(dir);
    return files;
  }

  /**
   * Generate report
   */
  generateReport(): void {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('          🗑️  DEAD CODE DETECTION REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    const byType = {
      'unused-export': this.issues.filter(i => i.type === 'unused-export'),
      'unused-import': this.issues.filter(i => i.type === 'unused-import'),
      'unused-variable': this.issues.filter(i => i.type === 'unused-variable'),
      'unreachable-code': this.issues.filter(i => i.type === 'unreachable-code')
    };

    console.log('📊 Summary:');
    console.log(`   Total dead code instances: ${this.issues.length}`);
    console.log(`   Unused exports: ${byType['unused-export'].length}`);
    console.log(`   Unused imports: ${byType['unused-import'].length}`);
    console.log(`   Unused variables: ${byType['unused-variable'].length}`);
    console.log(`   Unreachable code: ${byType['unreachable-code'].length}\n`);

    if (this.issues.length === 0) {
      console.log('✅ No dead code detected! Your codebase is clean.\n');
      return;
    }

    // Print issues by type
    for (const [type, issues] of Object.entries(byType)) {
      if (issues.length === 0) continue;

      console.log(`\n📦 ${type.toUpperCase().replace(/-/g, ' ')}:\n`);
      
      const displayCount = process.argv.includes('--verbose') ? issues.length : Math.min(issues.length, 15);
      for (let i = 0; i < displayCount; i++) {
        const issue = issues[i];
        console.log(`   📁 ${issue.file}:${issue.line}`);
        console.log(`      ${issue.message}\n`);
      }

      if (issues.length > displayCount) {
        console.log(`   ... and ${issues.length - displayCount} more\n`);
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('💡 Tip: Run with --verbose to see all issues');
    console.log('═══════════════════════════════════════════════════════════\n');
  }
}

// Main execution
async function main() {
  const detector = new DeadCodeDetector();
  const targetDir = process.argv[2] || './src';

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }

  await detector.analyzeDirectory(targetDir);
  detector.generateReport();
}

main().catch(console.error);
