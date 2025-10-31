#!/usr/bin/env tsx
/**
 * Diff Summarizer
 * 
 * Generates human-readable, plain-English summaries of git diffs
 * for pull request descriptions. Supports OpenAI for enhanced summaries.
 */

import { execSync } from 'child_process';
import fs from 'fs';

interface DiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: FileDiff[];
}

interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  insertions: number;
  deletions: number;
  changes: string[];
}

class DiffSummarizer {
  private useAI: boolean;

  constructor() {
    this.useAI = !!process.env.OPENAI_API_KEY;
  }

  /**
   * Get diff stats from git
   */
  getDiffStats(base: string = 'main'): DiffStats {
    try {
      // Get overall stats
      const statsOutput = execSync(`git diff --stat ${base}...HEAD`, { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      // Get detailed diff
      const diffOutput = execSync(`git diff --numstat ${base}...HEAD`, { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      // Parse stats
      const files: FileDiff[] = [];
      let totalInsertions = 0;
      let totalDeletions = 0;

      const lines = diffOutput.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const [insertions, deletions, path] = line.split(/\s+/);
        const ins = insertions === '-' ? 0 : parseInt(insertions, 10);
        const dels = deletions === '-' ? 0 : parseInt(deletions, 10);

        totalInsertions += ins;
        totalDeletions += dels;

        // Determine status
        let status: FileDiff['status'] = 'modified';
        if (ins > 0 && dels === 0) status = 'added';
        else if (ins === 0 && dels > 0) status = 'deleted';

        files.push({
          path,
          status,
          insertions: ins,
          deletions: dels,
          changes: []
        });
      }

      return {
        filesChanged: files.length,
        insertions: totalInsertions,
        deletions: totalDeletions,
        files
      };
    } catch (error) {
      console.error('Failed to get git diff:', error);
      return {
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
        files: []
      };
    }
  }

  /**
   * Analyze changes and categorize them
   */
  analyzeChanges(stats: DiffStats): Map<string, FileDiff[]> {
    const categories = new Map<string, FileDiff[]>();

    for (const file of stats.files) {
      const category = this.categorizeFile(file.path);
      const existing = categories.get(category) || [];
      existing.push(file);
      categories.set(category, existing);
    }

    return categories;
  }

  /**
   * Categorize file by path
   */
  private categorizeFile(path: string): string {
    if (path.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) return 'Tests';
    if (path.match(/\.md$/)) return 'Documentation';
    if (path.match(/^docs\//)) return 'Documentation';
    if (path.match(/\.ya?ml$/)) return 'Configuration';
    if (path.match(/\.json$/)) return 'Configuration';
    if (path.match(/^\.github\//)) return 'CI/CD';
    if (path.match(/^scripts\//)) return 'Scripts';
    if (path.match(/^src\/api\//)) return 'API';
    if (path.match(/^src\/ui\//)) return 'UI Components';
    if (path.match(/^src\/services\//)) return 'Services';
    if (path.match(/^src\/utils\//)) return 'Utilities';
    if (path.match(/^prisma\//)) return 'Database';
    if (path.match(/^supabase\//)) return 'Database';
    return 'Core';
  }

  /**
   * Generate human-readable summary
   */
  generateSummary(stats: DiffStats): string {
    if (stats.filesChanged === 0) {
      return 'No changes detected.';
    }

    const categories = this.analyzeChanges(stats);
    let summary = '';

    // Opening statement
    summary += this.generateOpeningStatement(stats);
    summary += '\n\n';

    // Categorized changes
    summary += '## Changes by Category\n\n';
    for (const [category, files] of categories.entries()) {
      summary += `### ${category}\n`;
      summary += this.summarizeCategory(category, files);
      summary += '\n';
    }

    // Stats
    summary += '## Statistics\n\n';
    summary += `- **Files changed:** ${stats.filesChanged}\n`;
    summary += `- **Insertions:** +${stats.insertions} lines\n`;
    summary += `- **Deletions:** -${stats.deletions} lines\n`;
    summary += `- **Net change:** ${stats.insertions - stats.deletions > 0 ? '+' : ''}${stats.insertions - stats.deletions} lines\n`;

    return summary;
  }

  /**
   * Generate opening statement
   */
  private generateOpeningStatement(stats: DiffStats): string {
    const { filesChanged, insertions, deletions } = stats;
    
    let impact = 'minor';
    const totalChanges = insertions + deletions;
    if (totalChanges > 500) impact = 'major';
    else if (totalChanges > 200) impact = 'moderate';

    const categories = this.analyzeChanges(stats);
    const primaryCategories = Array.from(categories.keys()).slice(0, 3);

    let statement = `This ${impact} change affects ${filesChanged} file${filesChanged > 1 ? 's' : ''}`;
    
    if (primaryCategories.length > 0) {
      statement += `, primarily in ${primaryCategories.join(', ').toLowerCase()}`;
    }
    
    statement += '.';

    return statement;
  }

  /**
   * Summarize a category of changes
   */
  private summarizeCategory(category: string, files: FileDiff[]): string {
    let summary = '';
    
    const added = files.filter(f => f.status === 'added');
    const modified = files.filter(f => f.status === 'modified');
    const deleted = files.filter(f => f.status === 'deleted');

    if (added.length > 0) {
      summary += `- Added ${added.length} new file${added.length > 1 ? 's' : ''}\n`;
      if (added.length <= 5) {
        added.forEach(f => summary += `  - \`${f.path}\`\n`);
      }
    }

    if (modified.length > 0) {
      summary += `- Modified ${modified.length} file${modified.length > 1 ? 's' : ''}\n`;
      if (modified.length <= 5) {
        modified.forEach(f => {
          summary += `  - \`${f.path}\` (+${f.insertions}/-${f.deletions})\n`;
        });
      }
    }

    if (deleted.length > 0) {
      summary += `- Deleted ${deleted.length} file${deleted.length > 1 ? 's' : ''}\n`;
    }

    return summary;
  }

  /**
   * Generate AI-enhanced summary (if API key available)
   */
  async generateAISummary(stats: DiffStats): Promise<string> {
    if (!this.useAI) {
      return this.generateSummary(stats);
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const baseSummary = this.generateSummary(stats);
      const categories = this.analyzeChanges(stats);
      
      const prompt = `Given the following code change summary, write a concise 2-3 sentence description suitable for a pull request:

${baseSummary}

Categories: ${Array.from(categories.keys()).join(', ')}

Focus on the purpose and impact, not the technical details. Be clear and professional.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a technical writer creating PR descriptions.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const aiSummary = response.choices[0]?.message?.content?.trim() || '';
      
      if (aiSummary) {
        return `${aiSummary}\n\n${baseSummary}`;
      }
    } catch (error) {
      console.warn('AI summary failed, falling back to standard summary:', error);
    }

    return this.generateSummary(stats);
  }
}

// Main execution
async function main() {
  const summarizer = new DiffSummarizer();
  const base = process.argv[2] || 'main';

  console.log(`📊 Analyzing changes from ${base}...HEAD\n`);

  const stats = summarizer.getDiffStats(base);
  
  if (stats.filesChanged === 0) {
    console.log('No changes detected.');
    return;
  }

  console.log('Generating summary...\n');
  const summary = await summarizer.generateAISummary(stats);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('          📝 CHANGE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(summary);
  console.log('\n═══════════════════════════════════════════════════════════');

  // Save to file if requested
  if (process.argv.includes('--output')) {
    const outputFile = 'PR_SUMMARY.md';
    fs.writeFileSync(outputFile, summary);
    console.log(`\n✅ Summary saved to ${outputFile}`);
  }
}

main().catch(console.error);
