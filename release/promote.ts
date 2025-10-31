#!/usr/bin/env tsx

/**
 * Release Promotion Script
 * 
 * Promotes RC → production after all gates pass
 * Validates SLOs, security, performance, and compliance
 * Creates final release tag and evidence pack
 * 
 * Usage:
 *   pnpm tsx release/promote.ts --rc=v1.0.0-rc.1
 *   pnpm tsx release/promote.ts --rc=v1.0.0-rc.1 --force (skip gates)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface GateResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

interface PromotionConfig {
  rcTag: string;
  finalVersion: string;
  force: boolean;
}

class ReleasePromoter {
  private config: PromotionConfig;
  private gateResults: GateResult[] = [];

  constructor() {
    this.config = this.parseConfig();
  }

  private parseConfig(): PromotionConfig {
    const args = process.argv.slice(2);
    const rcArg = args.find(a => a.startsWith('--rc='));
    const force = args.includes('--force');

    if (!rcArg) {
      throw new Error('Missing required --rc argument. Usage: --rc=v1.0.0-rc.1');
    }

    const rcTag = rcArg.split('=')[1];
    const finalVersion = rcTag.replace(/-rc\.\d+$/, '');

    return { rcTag, finalVersion, force };
  }

  private exec(command: string, silent = false): string {
    try {
      return execSync(command, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' }).trim();
    } catch (error: any) {
      if (!silent) {
        console.error(`Command failed: ${command}`);
        console.error(error.message);
      }
      throw error;
    }
  }

  private async checkGate(name: string, command: string, validator?: (output: string) => boolean): Promise<GateResult> {
    console.log(`🔍 Checking gate: ${name}...`);

    try {
      const output = this.exec(command, true);
      const passed = validator ? validator(output) : true;

      const result: GateResult = {
        name,
        passed,
        message: passed ? 'Gate passed' : 'Gate failed',
        details: output,
      };

      this.gateResults.push(result);

      if (passed) {
        console.log(`  ✅ ${name} passed`);
      } else {
        console.log(`  ❌ ${name} failed`);
      }

      return result;
    } catch (error: any) {
      const result: GateResult = {
        name,
        passed: false,
        message: error.message,
      };
      this.gateResults.push(result);
      console.log(`  ❌ ${name} failed: ${error.message}`);
      return result;
    }
  }

  private async validateAllGates(): Promise<boolean> {
    console.log('\n🚦 Running promotion gates...\n');

    // Gate 1: Tests
    await this.checkGate('Unit Tests', 'pnpm test', output => !output.includes('failed'));

    // Gate 2: Type checking
    await this.checkGate('Type Checking', 'pnpm typecheck');

    // Gate 3: Linting
    await this.checkGate('Linting', 'pnpm lint');

    // Gate 4: Security audit
    await this.checkGate('Security Audit', 'pnpm audit --audit-level moderate');

    // Gate 5: Load tests
    await this.checkGate('Load Tests', 'pnpm run load:test', output => {
      return !output.includes('✗') && output.includes('passed');
    });

    // Gate 6: SLO checks
    await this.checkGate('SLO Validation', 'pnpm run slo:check', output => {
      return output.includes('All SLOs met') || output.includes('passed');
    });

    // Gate 7: Chaos/DR
    await this.checkGate('Chaos/DR', 'pnpm run chaos:test', output => {
      return output.includes('Recovery successful');
    });

    // Gate 8: E2E tests
    await this.checkGate('E2E Tests', 'pnpm run e2e', output => {
      return !output.includes('failed');
    });

    // Gate 9: Check for evidence pack
    const evidencePack = path.join('evidence', `pack-${this.config.rcTag}.zip`);
    await this.checkGate('Evidence Pack', `test -f ${evidencePack} && echo "exists"`, output => {
      return output === 'exists';
    });

    const allPassed = this.gateResults.every(r => r.passed);
    console.log(`\n📊 Gates Summary: ${this.gateResults.filter(r => r.passed).length}/${this.gateResults.length} passed\n`);

    return allPassed;
  }

  private createFinalTag(): void {
    console.log(`\n🏷️  Creating final release tag ${this.config.finalVersion}...`);

    // Update package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    packageJson.version = this.config.finalVersion.replace(/^v/, '');
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');

    // Commit version change
    this.exec('git add package.json');
    this.exec(`git commit -m "chore(release): promote ${this.config.rcTag} to ${this.config.finalVersion}"`);

    // Create final tag
    this.exec(`git tag -a ${this.config.finalVersion} -m "Release ${this.config.finalVersion}\n\nPromoted from ${this.config.rcTag}"`);

    console.log(`✅ Tag ${this.config.finalVersion} created`);
  }

  private unfreezeStaging(): void {
    console.log('\n🔓 Unfreezing staging branch...');

    if (fs.existsSync('.staging-freeze')) {
      fs.unlinkSync('.staging-freeze');
      console.log('✅ Staging unfrozen');
    } else {
      console.log('ℹ️  No freeze marker found');
    }
  }

  private generatePromotionReport(): void {
    console.log('\n📄 Generating promotion report...');

    const report = {
      timestamp: new Date().toISOString(),
      rcTag: this.config.rcTag,
      finalVersion: this.config.finalVersion,
      gateResults: this.gateResults,
      promotedBy: process.env.USER || 'unknown',
      forced: this.config.force,
    };

    const reportPath = path.join('release', `promotion-${this.config.finalVersion}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ Promotion report saved: ${reportPath}`);
  }

  private updateEvidencePack(): void {
    console.log('\n📦 Updating evidence pack...');

    const rcPackPath = path.join('evidence', `pack-${this.config.rcTag}.zip`);
    const finalPackPath = path.join('evidence', `pack-${this.config.finalVersion}.zip`);

    if (fs.existsSync(rcPackPath)) {
      fs.copyFileSync(rcPackPath, finalPackPath);
      console.log(`✅ Evidence pack copied to ${finalPackPath}`);
    } else {
      console.warn('⚠️  Warning: RC evidence pack not found');
    }
  }

  public async run(): Promise<void> {
    console.log('🚀 ORCA Release Promotion\n');
    console.log(`RC Tag: ${this.config.rcTag}`);
    console.log(`Final Version: ${this.config.finalVersion}`);
    console.log(`Force: ${this.config.force}\n`);

    try {
      // Validate all gates
      const gatesPassed = await this.validateAllGates();

      if (!gatesPassed && !this.config.force) {
        console.error('\n❌ Promotion blocked: Not all gates passed');
        console.error('Run with --force to override (not recommended)');
        process.exit(1);
      }

      if (!gatesPassed && this.config.force) {
        console.warn('\n⚠️  WARNING: Forcing promotion despite failed gates!');
      }

      // Create final release tag
      this.createFinalTag();

      // Unfreeze staging
      this.unfreezeStaging();

      // Generate promotion report
      this.generatePromotionReport();

      // Update evidence pack
      this.updateEvidencePack();

      console.log('\n✅ Promotion successful!');
      console.log(`\nNext steps:`);
      console.log(`  1. Push tag: git push origin ${this.config.finalVersion}`);
      console.log(`  2. Push commit: git push origin $(git branch --show-current)`);
      console.log(`  3. Deploy to production: pnpm run deploy:blue-green`);
      console.log(`  4. Monitor SLOs: pnpm run slo:check`);
      console.log(`  5. Notify stakeholders`);

    } catch (error: any) {
      console.error('\n❌ Promotion failed:');
      console.error(error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const promoter = new ReleasePromoter();
  promoter.run().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export default ReleasePromoter;
