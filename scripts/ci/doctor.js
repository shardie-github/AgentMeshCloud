#!/usr/bin/env node
/* Minimal installer doctor for CI debugging */
const { execSync } = require('node:child_process');

console.log('╔══════════════════════════════════════════════════╗');
console.log('║  🏥  CI Doctor - Installation Health Check       ║');
console.log('╚══════════════════════════════════════════════════╝\n');

function runCommand(cmd, description) {
  console.log(`\n→ ${description}...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✓ ${description} - OK`);
    return true;
  } catch (e) {
    console.error(`✗ ${description} - FAILED`);
    return false;
  }
}

function showVersion(cmd, label) {
  try {
    const version = execSync(cmd, { encoding: 'utf8' }).trim();
    console.log(`  ${label}: ${version}`);
    return true;
  } catch (e) {
    console.log(`  ${label}: NOT FOUND`);
    return false;
  }
}

// Step 1: Show versions
console.log('\n📋 Environment Info:');
showVersion('node -v', 'Node');
showVersion('npm -v', 'npm');

// Step 2: Enable Corepack
if (!runCommand('corepack enable', 'Enable Corepack')) {
  console.error('\n❌ Doctor: FAILED - Could not enable Corepack');
  process.exit(1);
}

// Step 3: Verify pnpm
showVersion('pnpm -v', 'pnpm');

// Step 4: Install dependencies
if (!runCommand('pnpm install --frozen-lockfile --prefer-offline --ignore-scripts', 'Install dependencies (no scripts)')) {
  console.error('\n❌ Doctor: FAILED - Installation failed');
  process.exit(1);
}

// Step 5: Generate Prisma and other generated code
console.log('\n→ Generating Prisma client and other code...');
if (!runCommand('pnpm -w run generate', 'Generate Prisma & codegen')) {
  console.warn('\n⚠️  Generation failed (may be expected if no generators)');
}

// Step 6: Build
console.log('\n→ Building project...');
if (!runCommand('pnpm -w run build', 'Build project')) {
  console.error('\n❌ Doctor: FAILED - Build failed');
  process.exit(1);
}

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║  ✅  Doctor: PASS - All checks successful       ║');
console.log('╚══════════════════════════════════════════════════╝\n');
