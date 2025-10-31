# 🎯 AI Lint & Refactor Guide

> Intelligent code analysis and refactoring suggestions for ORCA/AgentMesh

## Overview

The AI Lint & Refactor Engine provides automated code quality analysis, detecting anti-patterns, suggesting refactoring opportunities, and identifying dead code. It combines AST-based static analysis with optional AI-powered insights.

## Features

### 1. Refactor Suggestions (`suggest_refactor.ts`)

Analyzes your codebase for:
- **Code Complexity**: Cyclomatic complexity, long functions, deep nesting
- **Anti-patterns**: God classes, magic numbers, commented code
- **Code Smells**: Duplicate strings, long parameter lists
- **TODO/FIXME tracking**: Surfaces unresolved technical debt

### 2. Dead Code Detection (`detect_dead_code.ts`)

Identifies:
- Unused exports
- Unused imports
- Unused variables
- Unreachable code after returns/throws

### 3. Diff Summarization (`summarize_diff.ts`)

Generates human-readable PR descriptions:
- Categorizes changes by type (API, UI, Tests, etc.)
- Calculates impact metrics
- Creates AI-enhanced summaries (optional)
- Exports markdown for PR bodies

## Usage

### Basic Commands

```bash
# Analyze entire codebase for refactoring opportunities
npm run ai:lint

# Or specify a directory
npm run ai:lint src/api

# Show all issues including low-severity
npm run ai:lint -- --verbose

# Exit with error on high-severity issues
npm run ai:lint -- --strict

# Detect dead code
npm run ai:dead-code

# Generate PR summary
npm run ai:summarize
npm run ai:summarize -- --output  # Save to PR_SUMMARY.md
```

### Direct Script Execution

```bash
# Refactor suggestions
npx tsx scripts/ai_lint/suggest_refactor.ts ./src

# Dead code detection
npx tsx scripts/ai_lint/detect_dead_code.ts ./src --verbose

# Diff summary (compares against main)
npx tsx scripts/ai_lint/summarize_diff.ts main
```

## Configuration

### Enable AI Features (Optional)

To use AI-powered analysis and enhanced PR summaries:

```bash
export OPENAI_API_KEY=sk-...
```

Without an API key, the tools fall back to AST-based analysis (which is still very effective).

### Customize Thresholds

Edit the constants in `suggest_refactor.ts`:

```typescript
const COMPLEXITY_THRESHOLD = 15;  // Max cyclomatic complexity
const LOC_THRESHOLD = 300;        // Max lines per file
const MAX_PARAMS = 4;             // Max function parameters
```

## Understanding the Output

### Severity Levels

- 🔴 **HIGH**: Critical issues requiring immediate attention (deep nesting, very long functions)
- 🟡 **MEDIUM**: Important issues to address soon (file too large, god classes)
- 🟢 **LOW**: Nice-to-have improvements (TODO comments, magic numbers)

### Example Output

```
═══════════════════════════════════════════════════════════
          🎯 REFACTOR SUGGESTION REPORT
═══════════════════════════════════════════════════════════

📊 Summary:
   Total files analyzed: 45
   Total issues found: 23
   🔴 High severity: 3
   🟡 Medium severity: 12
   🟢 Low severity: 8

🔴 HIGH SEVERITY ISSUES:

📁 src/services/DataProcessor.ts:156
   Type: deep-nesting
   Issue: Deep nesting detected (5 levels)
   💡 Extract nested logic into separate functions or use early returns.
```

## Best Practices

### 1. Run Regularly

- **Pre-commit**: Catch issues before they're committed
- **PR reviews**: Generate summaries automatically
- **Weekly**: Full codebase scan via CI

### 2. Prioritize Fixes

1. Fix all HIGH severity issues immediately
2. Address MEDIUM issues in the current sprint
3. Create backlog items for LOW severity improvements

### 3. Refactoring Patterns

#### Deep Nesting → Early Returns

**Before:**
```typescript
function processData(data: Data) {
  if (data) {
    if (data.isValid) {
      if (data.hasPermission) {
        // deeply nested logic
      }
    }
  }
}
```

**After:**
```typescript
function processData(data: Data) {
  if (!data) return;
  if (!data.isValid) return;
  if (!data.hasPermission) return;
  
  // flat logic
}
```

#### Long Functions → Extract Methods

**Before:**
```typescript
function handleRequest(req, res) {
  // 100 lines of mixed logic
}
```

**After:**
```typescript
function handleRequest(req, res) {
  const validated = validateRequest(req);
  const processed = processData(validated);
  const response = formatResponse(processed);
  return sendResponse(res, response);
}
```

#### Magic Numbers → Constants

**Before:**
```typescript
if (user.age > 18 && balance < 1000) { }
```

**After:**
```typescript
const LEGAL_AGE = 18;
const MINIMUM_BALANCE = 1000;

if (user.age > LEGAL_AGE && balance < MINIMUM_BALANCE) { }
```

## CI Integration

The AI Lint tools run automatically on:

- **Pull Requests**: Dry-run analysis, comment with suggestions
- **Weekly**: Full scan with artifacts uploaded

See `.github/workflows/ai-maintenance.yml` for configuration.

## Limitations

### Current Limitations

1. **False Positives**: AST-based analysis may flag intentional patterns
2. **Language Support**: Optimized for TypeScript/JavaScript
3. **Context Awareness**: Limited understanding of business logic

### When to Ignore

- Complex algorithms that genuinely need nesting
- Generated code (don't refactor auto-generated files)
- Third-party integrations with specific patterns

## Troubleshooting

### "No files found"

Make sure you're in the project root:
```bash
cd /path/to/project
npm run ai:lint
```

### "Permission denied"

Make scripts executable:
```bash
chmod +x scripts/ai_lint/*.ts
```

### "AI analysis failed"

Check your OpenAI API key:
```bash
echo $OPENAI_API_KEY
```

Or run without AI (fallback mode is automatic).

## Advanced Usage

### Custom Filters

Filter by specific issue types:

```bash
# Only show deep nesting issues
npx tsx scripts/ai_lint/suggest_refactor.ts | grep "deep-nesting"

# Count console.log statements
npx tsx scripts/ai_lint/suggest_refactor.ts | grep -c "console-log"
```

### Integration with Pre-commit

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm run ai:lint -- --strict || {
  echo "⚠️  High-severity refactor issues detected"
  echo "Fix issues or use --no-verify to bypass"
  exit 1
}
```

## Examples

### Example 1: Find All TODOs

```bash
npm run ai:lint | grep -A 3 "todo-comment"
```

### Example 2: Generate Weekly Report

```bash
npm run ai:lint > weekly_lint_report.txt
npm run ai:dead-code >> weekly_lint_report.txt
echo "Report generated: weekly_lint_report.txt"
```

### Example 3: PR Template Integration

```markdown
## Changes

<!-- AUTO-GENERATED SUMMARY -->
${AI_SUMMARY}

## Refactor Notes

- Addressed ${HIGH_SEVERITY_COUNT} high-severity issues
- Remaining TODOs: ${TODO_COUNT}
```

## Resources

- [ESLint Configuration](../.eslintrc.js)
- [TypeScript Compiler Options](../tsconfig.json)
- [Contributing Guide](../CONTRIBUTING.md)

## Support

For issues or questions:
1. Check [GitHub Issues](https://github.com/your-org/agentmesh/issues)
2. Review this documentation
3. Contact the platform team

---

**Next Steps:**
- Run your first analysis: `npm run ai:lint`
- Review the output and prioritize fixes
- Set up pre-commit hooks for continuous improvement
