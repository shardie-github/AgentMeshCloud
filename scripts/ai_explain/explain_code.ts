#!/usr/bin/env tsx
/**
 * AI Code Explainer
 * 
 * Generates comprehensive explanations of code files including:
 * - Purpose and functionality
 * - Flow diagrams
 * - API touchpoints
 * - Dependencies
 * 
 * Uses OpenAI if available, falls back to static AST analysis.
 */

import fs from 'fs';
import path from 'path';

interface CodeExplanation {
  file: string;
  purpose: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  complexity: string;
  apiTouchpoints: string[];
  flowDiagram: string;
  warnings: string[];
}

interface ExportInfo {
  name: string;
  type: string;
  description: string;
}

interface ImportInfo {
  name: string;
  from: string;
  usage: string;
}

class CodeExplainer {
  private useAI: boolean;

  constructor() {
    this.useAI = !!process.env.OPENAI_API_KEY;
  }

  /**
   * Explain a code file
   */
  async explainFile(filePath: string): Promise<CodeExplanation> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    console.log(`🔍 Analyzing ${filePath}...\n`);

    const content = fs.readFileSync(filePath, 'utf-8');

    // Generate explanation
    if (this.useAI) {
      return await this.explainWithAI(filePath, content);
    } else {
      return this.explainWithAST(filePath, content);
    }
  }

  /**
   * Explain using AI (OpenAI)
   */
  private async explainWithAI(filePath: string, content: string): Promise<CodeExplanation> {
    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      console.log('🤖 Generating AI-powered explanation...\n');

      const prompt = `Analyze this TypeScript/JavaScript code and provide a comprehensive explanation:

FILE: ${filePath}

CODE:
\`\`\`typescript
${content.substring(0, 4000)} // Truncated for API limits
\`\`\`

Provide:
1. Purpose (2-3 sentences)
2. Main exports and their functions
3. Key imports and why they're used
4. Complexity assessment (simple/moderate/complex)
5. Any API endpoints or external services it interacts with
6. A simple flow diagram using text/ASCII
7. Any warnings or concerns

Format as JSON with keys: purpose, exports (array of {name, type, description}), imports (array of {name, from, usage}), complexity, apiTouchpoints (array), flowDiagram (string), warnings (array)`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-16k',
        messages: [
          { role: 'system', content: 'You are a code analysis expert. Provide clear, concise explanations.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      const aiResponse = response.choices[0]?.message?.content?.trim() || '{}';
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(aiResponse);
        return {
          file: filePath,
          ...parsed
        };
      } catch (e) {
        // If not JSON, wrap in explanation
        return {
          file: filePath,
          purpose: aiResponse,
          exports: [],
          imports: [],
          complexity: 'unknown',
          apiTouchpoints: [],
          flowDiagram: '',
          warnings: ['AI response could not be parsed as structured data']
        };
      }
    } catch (error) {
      console.warn('AI explanation failed, falling back to AST analysis:', error);
      return this.explainWithAST(filePath, content);
    }
  }

  /**
   * Explain using static AST analysis
   */
  private explainWithAST(filePath: string, content: string): CodeExplanation {
    console.log('📊 Performing static AST analysis...\n');

    const explanation: CodeExplanation = {
      file: filePath,
      purpose: this.inferPurpose(filePath, content),
      exports: this.extractExports(content),
      imports: this.extractImports(content),
      complexity: this.assessComplexity(content),
      apiTouchpoints: this.findAPITouchpoints(content),
      flowDiagram: this.generateFlowDiagram(content),
      warnings: []
    };

    // Add warnings
    if (explanation.complexity === 'complex' || explanation.complexity === 'very complex') {
      explanation.warnings.push('High complexity detected - consider refactoring');
    }

    if (explanation.exports.length === 0) {
      explanation.warnings.push('No exports found - this may be a utility file');
    }

    explanation.warnings.push('⚠️  AI-generated, verify manually');

    return explanation;
  }

  /**
   * Infer purpose from file path and content
   */
  private inferPurpose(filePath: string, content: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    const dirName = path.dirname(filePath).split(path.sep).pop() || '';

    // Check for common patterns
    if (fileName.includes('test') || fileName.includes('spec')) {
      return `Test file for ${fileName.replace(/\.(test|spec)/, '')} module`;
    }

    if (dirName === 'api' || content.includes('express') || content.includes('router')) {
      return `API endpoint handler for ${fileName} operations`;
    }

    if (dirName === 'services' || fileName.includes('Service')) {
      return `Service module providing ${fileName.replace(/Service/, '')} business logic`;
    }

    if (dirName === 'utils' || dirName === 'helpers') {
      return `Utility functions for ${fileName} operations`;
    }

    if (content.includes('class') && content.includes('extends')) {
      return `Class-based module implementing ${fileName} functionality`;
    }

    return `Module providing ${fileName.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} functionality`;
  }

  /**
   * Extract exports
   */
  private extractExports(content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    
    // Named exports
    const exportRegex = /export\s+((?:async\s+)?(?:function|class|interface|type|const|let|var))\s+(\w+)/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      const type = match[1].replace('async ', '').trim();
      const name = match[2];
      
      exports.push({
        name,
        type,
        description: this.generateExportDescription(name, type, content)
      });
    }

    // Default exports
    const defaultExportRegex = /export\s+default\s+(\w+)/g;
    while ((match = defaultExportRegex.exec(content)) !== null) {
      exports.push({
        name: 'default',
        type: 'default export',
        description: `Default export: ${match[1]}`
      });
    }

    return exports;
  }

  /**
   * Generate export description
   */
  private generateExportDescription(name: string, type: string, content: string): string {
    const words = name.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
    
    switch (type) {
      case 'function':
        return `Function that handles ${words} operations`;
      case 'class':
        return `Class implementing ${words} functionality`;
      case 'interface':
        return `Interface defining ${words} structure`;
      case 'type':
        return `Type definition for ${words}`;
      case 'const':
        if (content.includes(`${name} = (`)) {
          return `Function that handles ${words} operations`;
        }
        return `Constant value for ${words}`;
      default:
        return `${type} export`;
    }
  }

  /**
   * Extract imports
   */
  private extractImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const names = match[1] ? match[1].split(',').map(n => n.trim()) : [match[2]];
      const from = match[3];

      for (const name of names) {
        imports.push({
          name: name.split(/\s+as\s+/)[0].trim(),
          from,
          usage: this.inferImportUsage(from)
        });
      }
    }

    return imports;
  }

  /**
   * Infer import usage
   */
  private inferImportUsage(from: string): string {
    if (from.includes('express')) return 'Web framework';
    if (from.includes('axios')) return 'HTTP client';
    if (from.includes('fs') || from === 'fs') return 'File system operations';
    if (from.includes('path')) return 'Path utilities';
    if (from.includes('uuid')) return 'ID generation';
    if (from.includes('openai')) return 'OpenAI API integration';
    if (from.includes('supabase')) return 'Database operations';
    if (from.includes('@/')) return 'Internal module';
    if (from.startsWith('.')) return 'Local module';
    return 'External dependency';
  }

  /**
   * Assess complexity
   */
  private assessComplexity(content: string): string {
    let complexity = 0;

    // Count decision points
    const patterns = {
      if: (content.match(/\bif\b/g) || []).length,
      for: (content.match(/\bfor\b/g) || []).length,
      while: (content.match(/\bwhile\b/g) || []).length,
      switch: (content.match(/\bswitch\b/g) || []).length,
      catch: (content.match(/\bcatch\b/g) || []).length
    };

    complexity = Object.values(patterns).reduce((sum, count) => sum + count, 0);

    const loc = content.split('\n').length;

    if (complexity > 30 || loc > 400) return 'very complex';
    if (complexity > 15 || loc > 200) return 'complex';
    if (complexity > 5 || loc > 100) return 'moderate';
    return 'simple';
  }

  /**
   * Find API touchpoints
   */
  private findAPITouchpoints(content: string): string[] {
    const touchpoints: string[] = [];

    // HTTP methods
    if (content.match(/\.(get|post|put|patch|delete)\(/g)) {
      touchpoints.push('REST API endpoints');
    }

    // Axios/fetch calls
    if (content.match(/axios\.|fetch\(/g)) {
      touchpoints.push('External HTTP requests');
    }

    // Database operations
    if (content.match(/supabase|prisma|pg\.|pool\.|query\(/g)) {
      touchpoints.push('Database queries');
    }

    // OpenAI
    if (content.includes('openai')) {
      touchpoints.push('OpenAI API');
    }

    return touchpoints;
  }

  /**
   * Generate flow diagram
   */
  private generateFlowDiagram(content: string): string {
    let diagram = '```\n';
    
    // Simple flow based on structure
    const hasImports = content.includes('import');
    const hasExports = content.includes('export');
    const hasFunctions = content.includes('function') || content.includes('=>');
    const hasClasses = content.includes('class');
    const hasAPI = content.includes('.get(') || content.includes('.post(');

    diagram += '┌─────────────────┐\n';
    diagram += '│  File Start     │\n';
    diagram += '└────────┬────────┘\n';
    diagram += '         │\n';

    if (hasImports) {
      diagram += '         ▼\n';
      diagram += '┌─────────────────┐\n';
      diagram += '│  Import Deps    │\n';
      diagram += '└────────┬────────┘\n';
      diagram += '         │\n';
    }

    if (hasClasses) {
      diagram += '         ▼\n';
      diagram += '┌─────────────────┐\n';
      diagram += '│  Define Classes │\n';
      diagram += '└────────┬────────┘\n';
      diagram += '         │\n';
    }

    if (hasFunctions) {
      diagram += '         ▼\n';
      diagram += '┌─────────────────┐\n';
      diagram += '│ Define Functions│\n';
      diagram += '└────────┬────────┘\n';
      diagram += '         │\n';
    }

    if (hasAPI) {
      diagram += '         ▼\n';
      diagram += '┌─────────────────┐\n';
      diagram += '│  Setup Routes   │\n';
      diagram += '└────────┬────────┘\n';
      diagram += '         │\n';
    }

    if (hasExports) {
      diagram += '         ▼\n';
      diagram += '┌─────────────────┐\n';
      diagram += '│  Export Module  │\n';
      diagram += '└─────────────────┘\n';
    } else {
      diagram += '         ▼\n';
      diagram += '┌─────────────────┐\n';
      diagram += '│   File End      │\n';
      diagram += '└─────────────────┘\n';
    }

    diagram += '```\n';
    return diagram;
  }

  /**
   * Format explanation as markdown
   */
  formatMarkdown(explanation: CodeExplanation): string {
    let md = `# Code Explanation: ${path.basename(explanation.file)}\n\n`;
    
    md += `> 🤖 ${this.useAI ? 'AI-powered' : 'AST-based'} analysis\n\n`;

    md += '## 📄 Purpose\n\n';
    md += `${explanation.purpose}\n\n`;

    md += '## 📊 Complexity\n\n';
    md += `**Level:** ${explanation.complexity}\n\n`;

    if (explanation.exports.length > 0) {
      md += '## 📤 Exports\n\n';
      for (const exp of explanation.exports) {
        md += `### ${exp.name} (${exp.type})\n`;
        md += `${exp.description}\n\n`;
      }
    }

    if (explanation.imports.length > 0) {
      md += '## 📥 Imports\n\n';
      md += '| Import | From | Purpose |\n';
      md += '|--------|------|----------|\n';
      for (const imp of explanation.imports) {
        md += `| ${imp.name} | \`${imp.from}\` | ${imp.usage} |\n`;
      }
      md += '\n';
    }

    if (explanation.apiTouchpoints.length > 0) {
      md += '## 🌐 API Touchpoints\n\n';
      for (const touchpoint of explanation.apiTouchpoints) {
        md += `- ${touchpoint}\n`;
      }
      md += '\n';
    }

    if (explanation.flowDiagram) {
      md += '## 🔄 Flow Diagram\n\n';
      md += explanation.flowDiagram;
      md += '\n';
    }

    if (explanation.warnings.length > 0) {
      md += '## ⚠️  Warnings\n\n';
      for (const warning of explanation.warnings) {
        md += `- ${warning}\n`;
      }
      md += '\n';
    }

    return md;
  }
}

// Main execution
async function main() {
  const explainer = new CodeExplainer();
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: tsx explain_code.ts <file-path>');
    console.error('Example: tsx explain_code.ts src/api/server.ts');
    process.exit(1);
  }

  try {
    const explanation = await explainer.explainFile(filePath);
    const markdown = explainer.formatMarkdown(explanation);

    console.log(markdown);

    // Save if requested
    if (process.argv.includes('--save')) {
      const outputFile = `${filePath}.EXPLANATION.md`;
      fs.writeFileSync(outputFile, markdown);
      console.log(`\n✅ Explanation saved to ${outputFile}`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
