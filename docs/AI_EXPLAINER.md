# 🤖 AI Code Explainer Guide

> Intelligent code documentation and onboarding tool for ORCA/AgentMesh

## Overview

The AI Explainer helps developers understand complex codebases by generating comprehensive explanations of code files and API endpoints. It's particularly useful for:

- **New developers** joining the team
- **Code reviews** requiring context
- **Documentation** generation
- **Knowledge transfer** and onboarding

## Features

### Code Explanation (`explain_code.ts`)

Analyzes any code file and provides:

- **Purpose**: High-level description of what the file does
- **Exports**: All exported functions, classes, and types
- **Imports**: Dependencies and their purposes
- **Complexity**: Assessment of code complexity
- **API Touchpoints**: External services and APIs used
- **Flow Diagram**: Visual representation of code flow
- **Warnings**: Potential issues or concerns

### Endpoint Explanation (`explain_endpoint.ts`)

Documents API endpoints with:

- **HTTP Methods**: GET, POST, PUT, DELETE, etc.
- **Parameters**: Path, query, and body parameters
- **Authentication**: Required auth mechanisms
- **Responses**: Status codes and response formats
- **Examples**: cURL commands for testing

## Usage

### Explain a Code File

```bash
# Basic usage
npm run ai:explain src/api/server.ts

# Direct execution
npx tsx scripts/ai_explain/explain_code.ts src/services/WorkflowOrchestrator.ts

# Save explanation to file
npx tsx scripts/ai_explain/explain_code.ts src/utils/retry.ts --save
```

### Explain API Endpoints

```bash
# Analyze route file
npm run ai:explain:api src/api/routes/workflows.ts

# Direct execution
npx tsx scripts/ai_explain/explain_endpoint.ts src/api/routes/agents.ts

# Save to file
npx tsx scripts/ai_explain/explain_endpoint.ts src/api/routes/users.ts --save
```

## Example Outputs

### Code Explanation Example

```markdown
# Code Explanation: WorkflowOrchestrator.ts

> 🤖 AI-powered analysis

## 📄 Purpose

Service module providing workflow orchestration business logic. 
Manages the complete lifecycle of multi-agent workflows including 
execution, error handling, and observability.

## 📊 Complexity

**Level:** complex

## 📤 Exports

### WorkflowOrchestrator (class)
Class implementing workflow orchestrator functionality. Handles 
agent coordination, state management, and failure recovery.

### executeWorkflow (function)
Function that handles execute workflow operations. Primary entry 
point for workflow execution with full telemetry.

## 📥 Imports

| Import | From | Purpose |
|--------|------|---------|
| Agent | `./types` | Internal module |
| Telemetry | `@/telemetry` | Internal module |
| supabase | `@supabase/supabase-js` | Database operations |
| OpenAI | `openai` | OpenAI API integration |

## 🌐 API Touchpoints

- Database queries
- OpenAI API
- External HTTP requests

## 🔄 Flow Diagram

```
┌─────────────────┐
│  File Start     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Import Deps    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Define Classes │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Export Module  │
└─────────────────┘
```

## ⚠️  Warnings

- High complexity detected - consider refactoring
- ⚠️  AI-generated, verify manually
```

### Endpoint Explanation Example

```markdown
# API Endpoints: workflows.ts

> Analyzed from: `src/api/routes/workflows.ts`

## Table of Contents

1. [GET /workflows](#1-get-workflows)
2. [POST /workflows](#2-post-workflows)
3. [GET /workflows/:id](#3-get-workflowsid)
4. [DELETE /workflows/:id](#4-delete-workflowsid)

---

## 1. GET /workflows

**Description:** List all workflows

🔒 **Authentication Required**

**Middleware:** requireAuth

### Parameters

| Name | Location | Type | Required | Description |
|------|----------|------|----------|-------------|
| limit | query | string | ❌ | Query parameter: limit |
| offset | query | string | ❌ | Query parameter: offset |

### Responses

- **200**: Successful response
- **404**: Resource not found
- **500**: Internal server error

### Example

```bash
curl -X GET 'http://localhost:3000/workflows'
```

---

## 2. POST /workflows

**Description:** Create a new workflow

🔒 **Authentication Required**

### Parameters

| Name | Location | Type | Required | Description |
|------|----------|------|----------|-------------|
| body | body | object | ✅ | Request body payload |

### Responses

- **201**: Resource created successfully
- **400**: Bad request - validation failed
- **500**: Internal server error

### Example

```bash
curl -X POST 'http://localhost:3000/workflows' \
  -H 'Content-Type: application/json' \
  -d '{"key": "value"}'
```
```

## AI vs. AST Mode

### AI Mode (with OpenAI API)

**Advantages:**
- More context-aware explanations
- Better understanding of business logic
- Natural language descriptions
- Adaptive to code patterns

**Requires:**
```bash
export OPENAI_API_KEY=sk-...
```

### AST Mode (fallback)

**Advantages:**
- No API key required
- Fast and deterministic
- No external dependencies
- Privacy-friendly (no code sent externally)

**Limitations:**
- Less context-aware
- Generic descriptions
- May miss business logic nuances

## Configuration

### Enable AI Mode

```bash
# Set OpenAI API key
export OPENAI_API_KEY=sk-proj-...

# Verify it's set
echo $OPENAI_API_KEY
```

### Customize Output Format

Edit the scripts to customize markdown generation:

```typescript
// In explain_code.ts
formatMarkdown(explanation: CodeExplanation): string {
  // Customize markdown format here
}
```

## Best Practices

### 1. Use for Onboarding

Create an onboarding document for new developers:

```bash
#!/bin/bash
# Generate explanations for key files

echo "# ORCA/AgentMesh Code Guide" > ONBOARDING.md
echo "" >> ONBOARDING.md

for file in src/api/server.ts src/services/*.ts; do
  echo "Processing $file..."
  npx tsx scripts/ai_explain/explain_code.ts "$file" >> ONBOARDING.md
  echo "" >> ONBOARDING.md
done

echo "Onboarding guide generated: ONBOARDING.md"
```

### 2. Document APIs

Auto-generate API documentation:

```bash
# Document all route files
for route in src/api/routes/*.ts; do
  npx tsx scripts/ai_explain/explain_endpoint.ts "$route" --save
done

# Combine into single doc
cat src/api/routes/*.ENDPOINTS.md > docs/API_REFERENCE.md
```

### 3. Code Review Prep

Before reviews, generate explanations:

```bash
# Get list of changed files
git diff --name-only main... | grep '\.ts$' > changed_files.txt

# Explain each changed file
while read file; do
  echo "=== $file ===" >> PR_CONTEXT.md
  npx tsx scripts/ai_explain/explain_code.ts "$file" >> PR_CONTEXT.md
done < changed_files.txt
```

### 4. Knowledge Base

Build a searchable knowledge base:

```bash
# Generate explanations for all files
find src -name '*.ts' | while read file; do
  output_file="docs/code_explanations/$(echo $file | sed 's/\//_/g').md"
  npx tsx scripts/ai_explain/explain_code.ts "$file" > "$output_file"
done
```

## Integration with CI

Add to `.github/workflows/documentation.yml`:

```yaml
name: Auto-Generate Documentation

on:
  push:
    branches: [main]
    paths:
      - 'src/**/*.ts'

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate code explanations
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          npm run ai:explain src/api/server.ts --save
          npm run ai:explain:api src/api/routes/*.ts --save
      
      - name: Commit documentation
        run: |
          git config --local user.email "actions@github.com"
          git config --local user.name "GitHub Actions"
          git add docs/*.md
          git commit -m "docs: auto-generate code explanations" || exit 0
          git push
```

## Troubleshooting

### "OpenAI API failed"

The tool automatically falls back to AST mode. Check:

```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### "File not found"

Use absolute or relative paths:

```bash
# Relative from project root
npm run ai:explain src/api/server.ts

# Absolute path
npm run ai:explain /full/path/to/file.ts
```

### "Explanation too generic"

This is normal in AST mode. To improve:

1. Add more inline comments to the source file
2. Use AI mode with OpenAI API key
3. Manually enhance the generated explanation

## Advanced Usage

### Batch Processing

```bash
# Explain all service files
find src/services -name '*.ts' -exec \
  npx tsx scripts/ai_explain/explain_code.ts {} --save \;
```

### Custom Analysis

Extend the explainer for custom needs:

```typescript
// custom_explainer.ts
import { CodeExplainer } from './scripts/ai_explain/explain_code';

class CustomExplainer extends CodeExplainer {
  async explainWithMetrics(filePath: string) {
    const explanation = await this.explainFile(filePath);
    
    // Add custom metrics
    const securityIssues = this.analyzeSecurityIssues(filePath);
    const performanceMetrics = this.analyzePerformance(filePath);
    
    return {
      ...explanation,
      securityIssues,
      performanceMetrics
    };
  }
}
```

### Integration with IDEs

**VS Code Extension:**
```json
{
  "tasks": [
    {
      "label": "Explain Current File",
      "type": "shell",
      "command": "npx tsx scripts/ai_explain/explain_code.ts ${file}",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```

## Privacy & Security

### Data Handling

**AI Mode (OpenAI):**
- Code is sent to OpenAI API for analysis
- Subject to OpenAI's data usage policy
- Use for non-sensitive code only

**AST Mode:**
- All analysis happens locally
- No data leaves your machine
- Safe for sensitive/proprietary code

### Recommendations

1. **Use AST mode** for sensitive code
2. **Use AI mode** for open-source or internal tools
3. **Never commit** API keys to repository
4. **Review outputs** before sharing externally

## Examples

### Example 1: Onboard New Developer

```bash
# Create personalized onboarding doc
cat > WELCOME.md << 'EOF'
# Welcome to ORCA/AgentMesh!

Here are the key files you should understand:

EOF

npx tsx scripts/ai_explain/explain_code.ts src/index.ts >> WELCOME.md
npx tsx scripts/ai_explain/explain_code.ts src/api/server.ts >> WELCOME.md

echo "See WELCOME.md for your onboarding guide!"
```

### Example 2: Document Complex Algorithm

```bash
# Explain complex retry logic
npx tsx scripts/ai_explain/explain_code.ts src/utils/retry.ts --save

# Add to docs
mv src/utils/retry.ts.EXPLANATION.md docs/algorithms/RETRY_LOGIC.md
```

### Example 3: API Catalog

```bash
# Generate full API catalog
echo "# API Catalog" > docs/API_CATALOG.md

for route_file in src/api/routes/*.ts; do
  npx tsx scripts/ai_explain/explain_endpoint.ts "$route_file" >> docs/API_CATALOG.md
done
```

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [TypeScript AST Viewer](https://ts-ast-viewer.com/)
- [JSDoc Guide](https://jsdoc.app/)

## Support

For questions or issues:
1. Check this guide
2. Review example outputs above
3. Open a GitHub issue
4. Contact the platform team

---

**Tip:** Use AI Explainer regularly to keep documentation in sync with code changes!
