#!/usr/bin/env tsx
/**
 * Code Comment Enhancer ("Humanizer")
 * 
 * Automatically generates descriptive JSDoc comments for exported
 * functions and classes that lack proper documentation.
 */

import fs from 'fs';
import path from 'path';

interface CommentStats {
  totalExports: number;
  documented: number;
  undocumented: number;
  enhanced: number;
  coverage: number;
}

interface ExportInfo {
  file: string;
  line: number;
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const';
  signature: string;
  hasComment: boolean;
}

class CommentEnhancer {
  private stats: CommentStats = {
    totalExports: 0,
    documented: 0,
    undocumented: 0,
    enhanced: 0,
    coverage: 0
  };

  private exports: ExportInfo[] = [];

  /**
   * Analyze directory for documentation coverage
   */
  async analyzeDirectory(dir: string): Promise<CommentStats> {
    const files = this.getSourceFiles(dir);
    console.log(`🔍 Analyzing ${files.length} files for comment coverage...\n`);

    for (const file of files) {
      await this.analyzeFile(file);
    }

    this.stats.coverage = this.stats.totalExports > 0
      ? (this.stats.documented / this.stats.totalExports) * 100
      : 100;

    return this.stats;
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Find all exports
    const exportRegex = /export\s+((?:async\s+)?(?:function|class|interface|type|const|let|var))\s+(\w+)/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      const type = match[1].replace('async ', '');
      const name = match[2];
      const lineNum = content.substring(0, match.index).split('\n').length;

      // Check if this export has a comment
      const hasComment = this.hasJSDocComment(lines, lineNum - 1);

      const exportInfo: ExportInfo = {
        file: filePath,
        line: lineNum,
        name,
        type: type.trim() as any,
        signature: this.extractSignature(content, match.index),
        hasComment
      };

      this.exports.push(exportInfo);
      this.stats.totalExports++;

      if (hasComment) {
        this.stats.documented++;
      } else {
        this.stats.undocumented++;
      }
    }
  }

  /**
   * Check if a line has a JSDoc comment above it
   */
  private hasJSDocComment(lines: string[], lineIdx: number): boolean {
    // Check previous lines for JSDoc
    for (let i = lineIdx - 1; i >= Math.max(0, lineIdx - 10); i--) {
      const line = lines[i].trim();
      
      if (line.startsWith('/**')) {
        return true;
      }
      
      // Stop if we hit another declaration
      if (line && !line.startsWith('*') && !line.startsWith('//') && !line.startsWith('/*')) {
        break;
      }
    }

    return false;
  }

  /**
   * Extract function/class signature
   */
  private extractSignature(content: string, startIdx: number): string {
    let endIdx = content.indexOf('\n', startIdx);
    if (endIdx === -1) endIdx = content.length;

    // Extend to closing parenthesis for functions
    let parenCount = 0;
    let inParams = false;
    
    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '(') {
        parenCount++;
        inParams = true;
      } else if (content[i] === ')') {
        parenCount--;
        if (inParams && parenCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }

    return content.substring(startIdx, endIdx).trim();
  }

  /**
   * Generate JSDoc comment for an export
   */
  private generateComment(exportInfo: ExportInfo): string {
    const { type, name, signature } = exportInfo;

    let comment = '/**\n';

    // Generate description based on name and type
    const description = this.generateDescription(name, type, signature);
    comment += ` * ${description}\n`;

    // Extract parameters if function
    if (type === 'function' || type === 'const') {
      const params = this.extractParameters(signature);
      if (params.length > 0) {
        comment += ' *\n';
        for (const param of params) {
          comment += ` * @param ${param.name} ${param.description}\n`;
        }
      }

      // Add return if function
      if (signature.includes('function') || signature.includes('=>')) {
        const returnType = this.guessReturnType(signature);
        comment += ` * @returns ${returnType}\n`;
      }
    }

    // Add TODO for manual verification
    comment += ' *\n';
    comment += ' * @todo Verify and enhance this generated documentation\n';
    comment += ' */';

    return comment;
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(name: string, type: string, signature: string): string {
    // Convert camelCase/PascalCase to words
    const words = name.replace(/([A-Z])/g, ' $1').trim().toLowerCase();

    switch (type) {
      case 'function':
        return `${words.charAt(0).toUpperCase() + words.slice(1)} function`;
      case 'class':
        return `${words.charAt(0).toUpperCase() + words.slice(1)} class`;
      case 'interface':
        return `Interface defining ${words}`;
      case 'type':
        return `Type definition for ${words}`;
      case 'const':
        if (signature.includes('=>')) {
          return `${words.charAt(0).toUpperCase() + words.slice(1)} function`;
        }
        return `Constant for ${words}`;
      default:
        return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${words}`;
    }
  }

  /**
   * Extract function parameters
   */
  private extractParameters(signature: string): Array<{ name: string; description: string }> {
    const params: Array<{ name: string; description: string }> = [];
    
    const match = signature.match(/\(([^)]*)\)/);
    if (!match || !match[1]) return params;

    const paramString = match[1];
    const paramList = paramString.split(',').map(p => p.trim());

    for (const param of paramList) {
      if (!param) continue;

      // Extract param name (handle destructuring, defaults, etc.)
      let paramName = param.split(':')[0].split('=')[0].trim();
      
      // Handle destructured params
      if (paramName.startsWith('{')) {
        paramName = paramName.replace(/[{}]/g, '').trim();
      }

      const words = paramName.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
      params.push({
        name: paramName,
        description: `The ${words}`
      });
    }

    return params;
  }

  /**
   * Guess return type description
   */
  private guessReturnType(signature: string): string {
    if (signature.includes('Promise')) return 'Promise that resolves when operation completes';
    if (signature.includes('void')) return 'void';
    if (signature.includes('boolean')) return 'boolean indicating success';
    if (signature.includes('string')) return 'string result';
    if (signature.includes('number')) return 'numeric result';
    return 'The result of the operation';
  }

  /**
   * Enhance files with missing comments
   */
  async enhanceFiles(dryRun: boolean = false): Promise<void> {
    const undocumented = this.exports.filter(e => !e.hasComment);
    
    if (undocumented.length === 0) {
      console.log('✅ All exports are already documented!\n');
      return;
    }

    console.log(`📝 Enhancing ${undocumented.length} undocumented exports...\n`);

    // Group by file
    const byFile = new Map<string, ExportInfo[]>();
    for (const exp of undocumented) {
      const existing = byFile.get(exp.file) || [];
      existing.push(exp);
      byFile.set(exp.file, existing);
    }

    // Process each file
    for (const [filePath, exports] of byFile.entries()) {
      if (dryRun) {
        console.log(`\n📄 ${filePath}`);
        for (const exp of exports) {
          console.log(`   Line ${exp.line}: ${exp.name}`);
          console.log(this.generateComment(exp));
          console.log('');
        }
      } else {
        await this.enhanceFile(filePath, exports);
        this.stats.enhanced += exports.length;
        console.log(`✅ Enhanced ${filePath} (${exports.length} comments added)`);
      }
    }

    console.log(`\n✨ Enhanced ${this.stats.enhanced} exports\n`);
  }

  /**
   * Enhance a single file
   */
  private async enhanceFile(filePath: string, exports: ExportInfo[]): Promise<void> {
    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Sort exports by line number (descending) to avoid offset issues
    exports.sort((a, b) => b.line - a.line);

    for (const exp of exports) {
      const comment = this.generateComment(exp);
      const commentLines = comment.split('\n');
      
      // Insert comment before the export
      const insertIdx = exp.line - 1;
      lines.splice(insertIdx, 0, ...commentLines);
    }

    // Write back
    fs.writeFileSync(filePath, lines.join('\n'));
  }

  /**
   * Get all source files
   */
  private getSourceFiles(dir: string): string[] {
    const extensions = ['.ts', '.tsx'];
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
          // Skip test files
          if (!entry.name.match(/\.(test|spec)\./)) {
            files.push(fullPath);
          }
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
    console.log('       📚 CODE COMMENT COVERAGE REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 Statistics:');
    console.log(`   Total exports: ${this.stats.totalExports}`);
    console.log(`   Documented: ${this.stats.documented}`);
    console.log(`   Undocumented: ${this.stats.undocumented}`);
    console.log(`   Coverage: ${this.stats.coverage.toFixed(1)}%\n`);

    if (this.stats.coverage >= 95) {
      console.log('✅ Excellent documentation coverage!');
    } else if (this.stats.coverage >= 75) {
      console.log('🟡 Good coverage, but room for improvement');
    } else {
      console.log('🔴 Documentation coverage needs improvement');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }
}

// Main execution
async function main() {
  const enhancer = new CommentEnhancer();
  const targetDir = process.argv[2] || './src';
  const dryRun = process.argv.includes('--dry-run');
  const enhance = process.argv.includes('--enhance');

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }

  // Analyze
  await enhancer.analyzeDirectory(targetDir);
  enhancer.generateReport();

  // Enhance if requested
  if (enhance) {
    await enhancer.enhanceFiles(dryRun);
    
    // Re-analyze to show new coverage
    const newEnhancer = new CommentEnhancer();
    await newEnhancer.analyzeDirectory(targetDir);
    console.log('📊 Updated coverage:');
    console.log(`   Coverage: ${newEnhancer.stats.coverage.toFixed(1)}%\n`);
  } else {
    console.log('💡 Tip: Run with --enhance to add missing comments (--dry-run to preview)');
  }
}

main().catch(console.error);
