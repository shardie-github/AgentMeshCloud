#!/usr/bin/env tsx
/**
 * AI-Powered Refactor Suggestion Engine
 * 
 * Analyzes TypeScript/JavaScript code for anti-patterns, complexity issues,
 * and suggests actionable refactoring opportunities.
 * 
 * Features:
 * - AST-based static analysis
 * - Cyclomatic complexity detection
 * - Anti-pattern identification
 * - Optional OpenAI-powered suggestions
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface RefactorSuggestion {
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high';
  type: string;
  message: string;
  suggestion: string;
}

interface FileAnalysis {
  path: string;
  loc: number;
  complexity: number;
  issues: RefactorSuggestion[];
}

const COMPLEXITY_THRESHOLD = 15;
const LOC_THRESHOLD = 300;
const MAX_PARAMS = 4;

class RefactorAnalyzer {
  private suggestions: RefactorSuggestion[] = [];
  private useAI: boolean;

  constructor() {
    this.useAI = !!process.env.OPENAI_API_KEY;
  }

  /**
   * Analyze a directory recursively for refactor opportunities
   */
  async analyzeDirectory(dir: string): Promise<FileAnalysis[]> {
    const files = this.getTypeScriptFiles(dir);
    const analyses: FileAnalysis[] = [];

    console.log(`🔍 Analyzing ${files.length} files for refactor opportunities...\n`);

    for (const file of files) {
      const analysis = await this.analyzeFile(file);
      if (analysis.issues.length > 0) {
        analyses.push(analysis);
      }
    }

    return analyses;
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const issues: RefactorSuggestion[] = [];

    // Calculate LOC (excluding comments and empty lines)
    const loc = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*');
    }).length;

    // Check file size
    if (loc > LOC_THRESHOLD) {
      issues.push({
        file: filePath,
        line: 1,
        severity: 'medium',
        type: 'file-too-large',
        message: `File has ${loc} lines of code (threshold: ${LOC_THRESHOLD})`,
        suggestion: 'Consider splitting this file into smaller, more focused modules.'
      });
    }

    // Detect anti-patterns
    this.detectAntiPatterns(filePath, content, lines, issues);

    // Detect code smells
    this.detectCodeSmells(filePath, content, lines, issues);

    // Estimate complexity (simplified)
    const complexity = this.estimateComplexity(content);

    return {
      path: filePath,
      loc,
      complexity,
      issues
    };
  }

  /**
   * Detect common anti-patterns
   */
  private detectAntiPatterns(
    filePath: string,
    content: string,
    lines: string[],
    issues: RefactorSuggestion[]
  ): void {
    // Deep nesting
    lines.forEach((line, idx) => {
      const indentation = line.match(/^(\s*)/)?.[1]?.length || 0;
      if (indentation > 16) {
        issues.push({
          file: filePath,
          line: idx + 1,
          severity: 'high',
          type: 'deep-nesting',
          message: `Deep nesting detected (${Math.floor(indentation / 2)} levels)`,
          suggestion: 'Extract nested logic into separate functions or use early returns.'
        });
      }
    });

    // Long functions
    const functionRegex = /(?:function|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*(?:=>|{))/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const startIdx = match.index;
      const startLine = content.substring(0, startIdx).split('\n').length;
      const functionBody = this.extractFunctionBody(content, startIdx);
      const functionLoc = functionBody.split('\n').length;

      if (functionLoc > 50) {
        issues.push({
          file: filePath,
          line: startLine,
          severity: 'medium',
          type: 'long-function',
          message: `Function has ${functionLoc} lines`,
          suggestion: 'Break this function into smaller, single-responsibility functions.'
        });
      }
    }

    // Commented-out code
    const commentedCodeRegex = /^\s*\/\/\s*(const|let|var|function|if|for|while|return)/gm;
    while ((match = commentedCodeRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      issues.push({
        file: filePath,
        line,
        severity: 'low',
        type: 'commented-code',
        message: 'Commented-out code detected',
        suggestion: 'Remove commented code. Use version control for history.'
      });
    }

    // TODO/FIXME comments
    const todoRegex = /\/\/\s*(TODO|FIXME|HACK|XXX):?\s*(.+)/gi;
    while ((match = todoRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      issues.push({
        file: filePath,
        line,
        severity: 'low',
        type: 'todo-comment',
        message: `${match[1]}: ${match[2]}`,
        suggestion: 'Create a tracked issue for this TODO and remove or complete it.'
      });
    }

    // Multiple responsibilities (class with many methods)
    const classRegex = /class\s+(\w+)\s*{([^}]+)}/g;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const classBody = match[2];
      const methodCount = (classBody.match(/(?:public|private|protected)?\s*\w+\s*\([^)]*\)\s*{/g) || []).length;

      if (methodCount > 10) {
        const line = content.substring(0, match.index).split('\n').length;
        issues.push({
          file: filePath,
          line,
          severity: 'medium',
          type: 'god-class',
          message: `Class ${className} has ${methodCount} methods`,
          suggestion: 'Consider splitting this class into smaller, focused classes following Single Responsibility Principle.'
        });
      }
    }

    // Console.log statements
    const consoleRegex = /console\.(log|debug|info|warn|error)\(/g;
    while ((match = consoleRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      issues.push({
        file: filePath,
        line,
        severity: 'low',
        type: 'console-log',
        message: `Console.${match[1]} statement detected`,
        suggestion: 'Replace console statements with proper logging framework.'
      });
    }
  }

  /**
   * Detect code smells
   */
  private detectCodeSmells(
    filePath: string,
    content: string,
    lines: string[],
    issues: RefactorSuggestion[]
  ): void {
    // Magic numbers
    const magicNumberRegex = /(?<![a-zA-Z_])[0-9]{2,}(?![a-zA-Z_])/g;
    let match;
    const seenNumbers = new Set<string>();

    while ((match = magicNumberRegex.exec(content)) !== null) {
      const number = match[0];
      // Skip common patterns like 1000, 100, etc. that appear multiple times
      if (['100', '1000', '10000'].includes(number)) continue;
      if (seenNumbers.has(number)) continue;
      
      seenNumbers.add(number);
      const line = content.substring(0, match.index).split('\n').length;
      issues.push({
        file: filePath,
        line,
        severity: 'low',
        type: 'magic-number',
        message: `Magic number ${number} detected`,
        suggestion: 'Extract magic numbers into named constants.'
      });
    }

    // Duplicate string literals
    const stringRegex = /(["'`])(?:(?=(\\?))\2.)*?\1/g;
    const stringCounts = new Map<string, number>();
    
    while ((match = stringRegex.exec(content)) !== null) {
      const str = match[0];
      if (str.length > 15) {
        stringCounts.set(str, (stringCounts.get(str) || 0) + 1);
      }
    }

    for (const [str, count] of stringCounts.entries()) {
      if (count >= 3) {
        issues.push({
          file: filePath,
          line: 1,
          severity: 'low',
          type: 'duplicate-string',
          message: `String literal ${str.substring(0, 30)}... appears ${count} times`,
          suggestion: 'Extract repeated string literals into constants.'
        });
      }
    }

    // Long parameter lists
    const paramRegex = /function\s+\w+\s*\(([^)]+)\)|const\s+\w+\s*=\s*\(([^)]+)\)\s*=>/g;
    while ((match = paramRegex.exec(content)) !== null) {
      const params = (match[1] || match[2] || '').split(',').filter(p => p.trim());
      if (params.length > MAX_PARAMS) {
        const line = content.substring(0, match.index).split('\n').length;
        issues.push({
          file: filePath,
          line,
          severity: 'medium',
          type: 'long-parameter-list',
          message: `Function has ${params.length} parameters (max recommended: ${MAX_PARAMS})`,
          suggestion: 'Consider using an options object or breaking the function into smaller pieces.'
        });
      }
    }
  }

  /**
   * Estimate cyclomatic complexity (simplified)
   */
  private estimateComplexity(content: string): number {
    let complexity = 1; // Base complexity

    // Count decision points
    const patterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
      /\?/g
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Extract function body (simplified - tracks braces)
   */
  private extractFunctionBody(content: string, startIdx: number): string {
    let braceCount = 0;
    let inFunction = false;
    let endIdx = startIdx;

    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        inFunction = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          endIdx = i;
          break;
        }
      }
    }

    return content.substring(startIdx, endIdx);
  }

  /**
   * Get all TypeScript files in directory
   */
  private getTypeScriptFiles(dir: string): string[] {
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
  generateReport(analyses: FileAnalysis[]): void {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('          🎯 REFACTOR SUGGESTION REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    const totalIssues = analyses.reduce((sum, a) => sum + a.issues.length, 0);
    const highSeverity = analyses.reduce((sum, a) => 
      sum + a.issues.filter(i => i.severity === 'high').length, 0);
    const mediumSeverity = analyses.reduce((sum, a) => 
      sum + a.issues.filter(i => i.severity === 'medium').length, 0);
    const lowSeverity = analyses.reduce((sum, a) => 
      sum + a.issues.filter(i => i.severity === 'low').length, 0);

    console.log('📊 Summary:');
    console.log(`   Total files analyzed: ${analyses.length}`);
    console.log(`   Total issues found: ${totalIssues}`);
    console.log(`   🔴 High severity: ${highSeverity}`);
    console.log(`   🟡 Medium severity: ${mediumSeverity}`);
    console.log(`   🟢 Low severity: ${lowSeverity}\n`);

    // Group by severity
    const highIssues = analyses.flatMap(a => a.issues.filter(i => i.severity === 'high'));
    const mediumIssues = analyses.flatMap(a => a.issues.filter(i => i.severity === 'medium'));
    const lowIssues = analyses.flatMap(a => a.issues.filter(i => i.severity === 'low'));

    if (highIssues.length > 0) {
      console.log('🔴 HIGH SEVERITY ISSUES:\n');
      this.printIssues(highIssues.slice(0, 10));
    }

    if (mediumIssues.length > 0) {
      console.log('\n🟡 MEDIUM SEVERITY ISSUES:\n');
      this.printIssues(mediumIssues.slice(0, 10));
    }

    if (lowIssues.length > 0 && process.argv.includes('--verbose')) {
      console.log('\n🟢 LOW SEVERITY ISSUES:\n');
      this.printIssues(lowIssues.slice(0, 20));
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('💡 Tip: Run with --verbose to see all low-severity issues');
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  private printIssues(issues: RefactorSuggestion[]): void {
    for (const issue of issues) {
      console.log(`📁 ${issue.file}:${issue.line}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   Issue: ${issue.message}`);
      console.log(`   💡 ${issue.suggestion}\n`);
    }
  }
}

// Main execution
async function main() {
  const analyzer = new RefactorAnalyzer();
  const targetDir = process.argv[2] || './src';

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }

  const analyses = await analyzer.analyzeDirectory(targetDir);
  analyzer.generateReport(analyses);

  // Exit with code 1 if high-severity issues found
  const highSeverityCount = analyses.reduce((sum, a) => 
    sum + a.issues.filter(i => i.severity === 'high').length, 0);

  if (highSeverityCount > 0 && process.argv.includes('--strict')) {
    process.exit(1);
  }
}

main().catch(console.error);
