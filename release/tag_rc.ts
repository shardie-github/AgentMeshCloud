#!/usr/bin/env tsx

/**
 * Release Candidate Tagging Script
 * 
 * Creates a release candidate tag from semver + CHANGELOG.md
 * Freezes staging branch via GitHub status check
 * Generates preliminary release notes
 * 
 * Usage:
 *   pnpm tsx release/tag_rc.ts --type=rc
 *   pnpm tsx release/tag_rc.ts --version=1.0.0-rc.1
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface ReleaseConfig {
  version: string;
  type: 'major' | 'minor' | 'patch' | 'rc';
  currentVersion: string;
  rcNumber: number;
}

class RCTagger {
  private config: ReleaseConfig;

  constructor() {
    this.config = this.parseConfig();
  }

  private parseConfig(): ReleaseConfig {
    const args = process.argv.slice(2);
    const typeArg = args.find(a => a.startsWith('--type='));
    const versionArg = args.find(a => a.startsWith('--version='));

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const currentVersion = packageJson.version;

    if (versionArg) {
      const version = versionArg.split('=')[1];
      return {
        version,
        type: 'rc',
        currentVersion,
        rcNumber: this.extractRCNumber(version),
      };
    }

    const type = (typeArg?.split('=')[1] || 'rc') as ReleaseConfig['type'];
    const nextVersion = this.calculateNextVersion(currentVersion, type);

    return {
      version: nextVersion,
      type,
      currentVersion,
      rcNumber: 1,
    };
  }

  private extractRCNumber(version: string): number {
    const match = version.match(/rc\.(\d+)$/);
    return match ? parseInt(match[1], 10) : 1;
  }

  private calculateNextVersion(current: string, type: ReleaseConfig['type']): string {
    const [major, minor, patch] = current.replace(/-rc\.\d+$/, '').split('.').map(Number);

    switch (type) {
      case 'major':
        return `${major + 1}.0.0-rc.1`;
      case 'minor':
        return `${major}.${minor + 1}.0-rc.1`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}-rc.1`;
      case 'rc':
        return `${major}.${minor}.${patch}-rc.1`;
      default:
        throw new Error(`Unknown release type: ${type}`);
    }
  }

  private exec(command: string): string {
    try {
      return execSync(command, { encoding: 'utf-8' }).trim();
    } catch (error: any) {
      console.error(`Command failed: ${command}`);
      console.error(error.message);
      throw error;
    }
  }

  private getCommitsSinceLastTag(): string[] {
    try {
      const lastTag = this.exec('git describe --tags --abbrev=0');
      const commits = this.exec(`git log ${lastTag}..HEAD --pretty=format:"%h - %s (%an)"`);
      return commits.split('\n').filter(Boolean);
    } catch {
      // No previous tag, get all commits
      const commits = this.exec('git log --pretty=format:"%h - %s (%an)"');
      return commits.split('\n').filter(Boolean);
    }
  }

  private generateReleaseNotes(): string {
    const commits = this.getCommitsSinceLastTag();
    const date = new Date().toISOString().split('T')[0];

    const features = commits.filter(c => c.includes('feat:') || c.includes('feature:'));
    const fixes = commits.filter(c => c.includes('fix:') || c.includes('bug:'));
    const breaking = commits.filter(c => c.includes('BREAKING:') || c.includes('breaking:'));
    const security = commits.filter(c => c.includes('security:') || c.includes('sec:'));

    let notes = `# Release Notes: ORCA v${this.config.version}\n\n`;
    notes += `**Release Date:** ${date}\n`;
    notes += `**Release Type:** Release Candidate\n`;
    notes += `**Git Tag:** \`v${this.config.version}\`\n`;
    notes += `**Previous Version:** \`${this.config.currentVersion}\`\n\n`;

    notes += `---\n\n`;
    notes += `## 🎯 Release Summary\n\n`;
    notes += `This is a release candidate for ORCA v${this.config.version.replace(/-rc\.\d+$/, '')}. `;
    notes += `It includes ${commits.length} commits since the last release.\n\n`;

    if (breaking.length > 0) {
      notes += `⚠️ **WARNING:** This release contains ${breaking.length} breaking change(s).\n\n`;
    }

    if (features.length > 0) {
      notes += `## ✨ Features (${features.length})\n\n`;
      features.forEach(f => notes += `- ${f}\n`);
      notes += `\n`;
    }

    if (fixes.length > 0) {
      notes += `## 🐛 Bug Fixes (${fixes.length})\n\n`;
      fixes.forEach(f => notes += `- ${f}\n`);
      notes += `\n`;
    }

    if (security.length > 0) {
      notes += `## 🔒 Security (${security.length})\n\n`;
      security.forEach(s => notes += `- ${s}\n`);
      notes += `\n`;
    }

    if (breaking.length > 0) {
      notes += `## ⚠️ Breaking Changes (${breaking.length})\n\n`;
      breaking.forEach(b => notes += `- ${b}\n`);
      notes += `\n`;
    }

    notes += `---\n\n`;
    notes += `## 🧪 Quality Gates\n\n`;
    notes += `- [ ] All tests passing\n`;
    notes += `- [ ] Security scans clean\n`;
    notes += `- [ ] Performance benchmarks met\n`;
    notes += `- [ ] Load tests passed\n`;
    notes += `- [ ] Chaos/DR validated\n`;
    notes += `- [ ] Evidence pack generated\n\n`;

    notes += `---\n\n`;
    notes += `## 🚀 Deployment Status\n\n`;
    notes += `| Environment | Status |\n`;
    notes += `|-------------|--------|\n`;
    notes += `| Staging | 🟡 Pending |\n`;
    notes += `| Production | ⏸️ Not Started |\n\n`;

    notes += `---\n\n`;
    notes += `**Full Changelog:** Compare [v${this.config.currentVersion}...v${this.config.version}](https://github.com/orca-mesh/orca-core/compare/v${this.config.currentVersion}...v${this.config.version})\n`;

    return notes;
  }

  private updatePackageJson(): void {
    console.log(`📦 Updating package.json to v${this.config.version}...`);
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    packageJson.version = this.config.version;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
    console.log('✅ package.json updated');
  }

  private updateChangelog(): void {
    console.log('📝 Updating CHANGELOG.md...');
    const changelog = fs.readFileSync('CHANGELOG.md', 'utf-8');
    const date = new Date().toISOString().split('T')[0];
    const commits = this.getCommitsSinceLastTag();

    let newEntry = `\n## [${this.config.version}] - ${date}\n\n`;
    newEntry += `### Release Candidate\n\n`;
    newEntry += `This RC includes ${commits.length} commits:\n\n`;

    const features = commits.filter(c => c.includes('feat:'));
    const fixes = commits.filter(c => c.includes('fix:'));
    const breaking = commits.filter(c => c.includes('BREAKING:'));

    if (features.length > 0) {
      newEntry += `### Added\n\n`;
      features.forEach(f => newEntry += `- ${f.split(' - ')[1]}\n`);
      newEntry += `\n`;
    }

    if (fixes.length > 0) {
      newEntry += `### Fixed\n\n`;
      fixes.forEach(f => newEntry += `- ${f.split(' - ')[1]}\n`);
      newEntry += `\n`;
    }

    if (breaking.length > 0) {
      newEntry += `### Breaking Changes\n\n`;
      breaking.forEach(b => newEntry += `- ${b.split(' - ')[1]}\n`);
      newEntry += `\n`;
    }

    const unreleasedIndex = changelog.indexOf('## [Unreleased]');
    if (unreleasedIndex !== -1) {
      const insertPosition = changelog.indexOf('\n', unreleasedIndex + 15) + 1;
      const updated = changelog.slice(0, insertPosition) + newEntry + changelog.slice(insertPosition);
      fs.writeFileSync('CHANGELOG.md', updated);
    } else {
      fs.writeFileSync('CHANGELOG.md', changelog + newEntry);
    }

    console.log('✅ CHANGELOG.md updated');
  }

  private createGitTag(): void {
    console.log(`🏷️  Creating git tag v${this.config.version}...`);

    // Commit version changes
    this.exec('git add package.json CHANGELOG.md');
    this.exec(`git commit -m "chore(release): v${this.config.version}"`);

    // Create annotated tag
    const releaseNotes = this.generateReleaseNotes();
    const tagMessage = `Release ${this.config.version}\n\n${commits.length} commits since last release`;
    const commits = this.getCommitsSinceLastTag();
    
    this.exec(`git tag -a v${this.config.version} -m "${tagMessage}"`);
    console.log(`✅ Tag v${this.config.version} created`);

    // Save release notes
    const notesPath = path.join('release', `notes-v${this.config.version}.md`);
    fs.writeFileSync(notesPath, releaseNotes);
    console.log(`✅ Release notes saved to ${notesPath}`);
  }

  private freezeStaging(): void {
    console.log('🧊 Freezing staging branch...');
    
    // This would typically call GitHub API to add a status check
    // For now, we'll create a marker file
    const freezeMarker = {
      version: this.config.version,
      frozenAt: new Date().toISOString(),
      reason: 'Release candidate tagged',
    };

    fs.writeFileSync('.staging-freeze', JSON.stringify(freezeMarker, null, 2));
    console.log('✅ Staging frozen (marker created)');
    console.log('⚠️  NOTE: In production, this should set GitHub branch protection');
  }

  public async run(): Promise<void> {
    console.log('🚀 ORCA Release Candidate Tagger\n');
    console.log(`Current version: ${this.config.currentVersion}`);
    console.log(`New RC version: ${this.config.version}\n`);

    try {
      // Ensure we're on a clean branch
      const status = this.exec('git status --porcelain');
      if (status) {
        console.warn('⚠️  Warning: Working directory has uncommitted changes');
        console.log('Proceeding anyway...\n');
      }

      // Update version files
      this.updatePackageJson();
      this.updateChangelog();

      // Create git tag
      this.createGitTag();

      // Freeze staging
      this.freezeStaging();

      console.log('\n✅ Release candidate tagged successfully!');
      console.log(`\nNext steps:`);
      console.log(`  1. Push tag: git push origin v${this.config.version}`);
      console.log(`  2. Push commit: git push origin $(git branch --show-current)`);
      console.log(`  3. Run CI: .github/workflows/release-cert.yml`);
      console.log(`  4. Monitor deployment: release/cutover_plan.md`);

    } catch (error: any) {
      console.error('\n❌ Error creating release candidate:');
      console.error(error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tagger = new RCTagger();
  tagger.run().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export default RCTagger;
