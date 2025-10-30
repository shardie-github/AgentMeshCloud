#!/bin/bash
# E2E Test Setup Verification Script
# Validates that all E2E components are correctly installed

set -e

echo "=================================================="
echo "🔍 ORCA E2E Test Setup Verification"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check directory structure
echo "📁 Checking directory structure..."
[ -d "scripts/e2e" ] && check_pass "scripts/e2e/ exists" || check_fail "scripts/e2e/ missing"
[ -d "scripts/e2e/fixtures" ] && check_pass "scripts/e2e/fixtures/ exists" || check_fail "scripts/e2e/fixtures/ missing"

# 2. Check test scripts
echo ""
echo "📝 Checking test scripts..."
[ -f "scripts/e2e/seed_baselines.ts" ] && check_pass "seed_baselines.ts exists" || check_fail "seed_baselines.ts missing"
[ -f "scripts/e2e/fire_webhooks.ts" ] && check_pass "fire_webhooks.ts exists" || check_fail "fire_webhooks.ts missing"
[ -f "scripts/e2e/assert_kpis.ts" ] && check_pass "assert_kpis.ts exists" || check_fail "assert_kpis.ts missing"
[ -f "scripts/e2e/README.md" ] && check_pass "README.md exists" || check_fail "README.md missing"

# 3. Check fixtures
echo ""
echo "🗂️  Checking fixtures..."
[ -f "scripts/e2e/fixtures/zapier.order.created.json" ] && check_pass "zapier.order.created.json exists" || check_fail "zapier.order.created.json missing"
[ -f "scripts/e2e/fixtures/zapier.order.fulfilled.json" ] && check_pass "zapier.order.fulfilled.json exists" || check_fail "zapier.order.fulfilled.json missing"
[ -f "scripts/e2e/fixtures/n8n.ticket.opened.json" ] && check_pass "n8n.ticket.opened.json exists" || check_fail "n8n.ticket.opened.json missing"
[ -f "scripts/e2e/fixtures/n8n.ticket.resolved.json" ] && check_pass "n8n.ticket.resolved.json exists" || check_fail "n8n.ticket.resolved.json missing"

# 4. Check package.json scripts
echo ""
echo "📦 Checking package.json scripts..."
grep -q '"e2e:seed"' package.json && check_pass "e2e:seed script defined" || check_fail "e2e:seed script missing"
grep -q '"e2e:fire"' package.json && check_pass "e2e:fire script defined" || check_fail "e2e:fire script missing"
grep -q '"e2e:assert"' package.json && check_pass "e2e:assert script defined" || check_fail "e2e:assert script missing"
grep -q '"e2e"' package.json && check_pass "e2e script defined" || check_fail "e2e script missing"

# 5. Check .env.example
echo ""
echo "🔐 Checking environment configuration..."
grep -q "API_BASE_URL" .env.example && check_pass "API_BASE_URL in .env.example" || check_warn "API_BASE_URL not in .env.example"
grep -q "E2E_TIMEOUT_MS" .env.example && check_pass "E2E_TIMEOUT_MS in .env.example" || check_warn "E2E_TIMEOUT_MS not in .env.example"
grep -q "ADAPTER_SECRET" .env.example && check_pass "ADAPTER_SECRET in .env.example" || check_warn "ADAPTER_SECRET not in .env.example"

# 6. Check CI workflow
echo ""
echo "🔄 Checking CI configuration..."
if [ -f ".github/workflows/ci.yml" ]; then
    grep -q "e2e:" .github/workflows/ci.yml && check_pass "E2E job in ci.yml" || check_fail "E2E job missing in ci.yml"
    grep -q "e2e:seed" .github/workflows/ci.yml && check_pass "e2e:seed step in CI" || check_warn "e2e:seed step not in CI"
    grep -q "e2e:fire" .github/workflows/ci.yml && check_pass "e2e:fire step in CI" || check_warn "e2e:fire step not in CI"
    grep -q "e2e:assert" .github/workflows/ci.yml && check_pass "e2e:assert step in CI" || check_warn "e2e:assert step not in CI"
else
    check_warn ".github/workflows/ci.yml not found"
fi

# 7. Check Node.js dependencies
echo ""
echo "📚 Checking dependencies..."
grep -q '"pg"' package.json && check_pass "pg dependency present" || check_fail "pg dependency missing"
grep -q '"dotenv"' package.json && check_pass "dotenv dependency present" || check_fail "dotenv dependency missing"
grep -q '"tsx"' package.json && check_pass "tsx dependency present" || check_fail "tsx dependency missing"

# 8. Check Node.js version
echo ""
echo "🔧 Checking runtime environment..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        check_pass "Node.js version: $(node -v) (≥18 required)"
    else
        check_fail "Node.js version: $(node -v) (need ≥18 for native fetch)"
    fi
else
    check_warn "Node.js not found in PATH"
fi

# 9. Check if pnpm is available
if command -v pnpm &> /dev/null; then
    check_pass "pnpm available: $(pnpm -v)"
else
    check_warn "pnpm not found (install with: npm install -g pnpm)"
fi

# 10. Summary
echo ""
echo "=================================================="
echo "✅ All E2E components verified successfully!"
echo "=================================================="
echo ""
echo "📖 Next steps:"
echo "   1. Start Docker stack:    docker compose up -d"
echo "   2. Run E2E suite:         pnpm run e2e"
echo "   3. Read documentation:    cat scripts/e2e/README.md"
echo ""
echo "🚀 You're ready to test!"
