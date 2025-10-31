#!/usr/bin/env tsx
/**
 * BugBot AI Assistant - Optional AI-Enhanced Analysis
 * Only runs if OPENAI_API_KEY is set
 * Provides remediation suggestions and deeper insights
 */

import { readFileSync } from 'fs';

interface AIAssistRequest {
  context: 'test_failure' | 'lint_error' | 'pr_review';
  data: Record<string, unknown>;
}

interface AIAssistResponse {
  insights: string[];
  remediationSteps: string[];
  relatedDocs: string[];
  estimatedEffort: 'quick' | 'moderate' | 'significant';
}

/**
 * Check if OpenAI is available
 */
function isOpenAIAvailable(): boolean {
  return process.env.OPENAI_API_KEY !== undefined && process.env.OPENAI_API_KEY !== '';
}

/**
 * Get AI insights using OpenAI (optional)
 */
async function getOpenAIInsights(request: AIAssistRequest): Promise<AIAssistResponse | null> {
  if (!isOpenAIAvailable()) {
    return null;
  }

  try {
    // Dynamic import to avoid errors when OpenAI is not installed
    const { OpenAI } = await import('openai');

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = buildPrompt(request);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helpful software engineering assistant for ORCA Core, 
an AI agent mesh platform. You help diagnose issues and suggest remediation steps.
Be concise, technical, and actionable.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    if (response === undefined || response === null) {
      return null;
    }

    return parseAIResponse(response);
  } catch (error) {
    console.warn('AI assist failed (continuing without AI):', error);
    return null;
  }
}

/**
 * Build prompt based on request type
 */
function buildPrompt(request: AIAssistRequest): string {
  switch (request.context) {
    case 'test_failure':
      return `A test failed with the following details:
${JSON.stringify(request.data, null, 2)}

Please provide:
1. Likely root causes (2-3 possibilities)
2. Specific remediation steps
3. Related documentation or areas to check
4. Estimated effort to fix`;

    case 'lint_error':
      return `Lint errors were detected:
${JSON.stringify(request.data, null, 2)}

Please provide:
1. Why these errors matter
2. How to fix them efficiently
3. Any architectural concerns
4. Estimated effort to resolve`;

    case 'pr_review':
      return `A PR was submitted with these characteristics:
${JSON.stringify(request.data, null, 2)}

Please provide:
1. Key things reviewers should focus on
2. Potential hidden risks
3. Suggestions for improving the PR
4. Estimated review effort`;

    default:
      return 'Unknown context';
  }
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(response: string): AIAssistResponse {
  // Simple parsing - in production, you'd want more robust parsing
  const lines = response.split('\n').filter((l) => l.trim() !== '');

  const insights: string[] = [];
  const remediationSteps: string[] = [];
  const relatedDocs: string[] = [];
  let estimatedEffort: AIAssistResponse['estimatedEffort'] = 'moderate';

  let currentSection: 'insights' | 'remediation' | 'docs' | 'effort' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      trimmed.toLowerCase().includes('root cause') ||
      trimmed.toLowerCase().includes('focus on')
    ) {
      currentSection = 'insights';
      continue;
    }

    if (
      trimmed.toLowerCase().includes('remediation') ||
      trimmed.toLowerCase().includes('fix') ||
      trimmed.toLowerCase().includes('steps')
    ) {
      currentSection = 'remediation';
      continue;
    }

    if (trimmed.toLowerCase().includes('documentation') || trimmed.toLowerCase().includes('docs')) {
      currentSection = 'docs';
      continue;
    }

    if (trimmed.toLowerCase().includes('effort') || trimmed.toLowerCase().includes('estimate')) {
      currentSection = 'effort';
      if (trimmed.toLowerCase().includes('quick') || trimmed.toLowerCase().includes('small')) {
        estimatedEffort = 'quick';
      } else if (
        trimmed.toLowerCase().includes('significant') ||
        trimmed.toLowerCase().includes('large')
      ) {
        estimatedEffort = 'significant';
      }
      continue;
    }

    // Add content to appropriate section
    if (trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
      const content = trimmed.replace(/^[-\d.]+\s*/, '');
      if (currentSection === 'insights') {
        insights.push(content);
      } else if (currentSection === 'remediation') {
        remediationSteps.push(content);
      } else if (currentSection === 'docs') {
        relatedDocs.push(content);
      }
    }
  }

  return {
    insights,
    remediationSteps,
    relatedDocs,
    estimatedEffort,
  };
}

/**
 * Get fallback insights (when AI is not available)
 */
function getFallbackInsights(request: AIAssistRequest): AIAssistResponse {
  const baseResponse: AIAssistResponse = {
    insights: [],
    remediationSteps: [
      'Review the error messages and stack traces carefully',
      'Check recent changes that might have introduced the issue',
      'Consult the project documentation',
      'Ask for help in GitHub Discussions if needed',
    ],
    relatedDocs: [
      'docs/TROUBLESHOOTING.md',
      'docs/DEVELOPER_GUIDE.md',
      'CONTRIBUTING.md',
    ],
    estimatedEffort: 'moderate',
  };

  switch (request.context) {
    case 'test_failure':
      baseResponse.insights = [
        'Test failures often indicate broken functionality or incorrect expectations',
        'Check if recent code changes affected the tested component',
        'Verify test data and mocks are still valid',
      ];
      break;

    case 'lint_error':
      baseResponse.insights = [
        'Lint errors indicate code quality or style issues',
        'Many can be auto-fixed with `pnpm run lint --fix`',
        'Some may require manual refactoring',
      ];
      baseResponse.estimatedEffort = 'quick';
      break;

    case 'pr_review':
      baseResponse.insights = [
        'Review focus areas: correctness, security, performance, maintainability',
        'Check for adequate test coverage',
        'Verify documentation is updated',
      ];
      break;
  }

  return baseResponse;
}

/**
 * Get AI assistance (with fallback)
 */
export async function getAIAssist(request: AIAssistRequest): Promise<AIAssistResponse> {
  if (isOpenAIAvailable()) {
    const aiResponse = await getOpenAIInsights(request);
    if (aiResponse !== null) {
      return aiResponse;
    }
  }

  // Fall back to static insights
  return getFallbackInsights(request);
}

/**
 * Format AI assistance as markdown
 */
export function formatAIAssist(response: AIAssistResponse, aiEnabled: boolean): string {
  return `### ${aiEnabled ? '🤖 AI-Enhanced' : '💡'} Insights

${response.insights.map((i) => `- ${i}`).join('\n')}

### 🔧 Remediation Steps

${response.remediationSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

${
  response.relatedDocs.length > 0
    ? `
### 📚 Related Documentation

${response.relatedDocs.map((d) => `- [${d}](./${d})`).join('\n')}
`
    : ''
}

### ⏱️ Estimated Effort

**${response.estimatedEffort.charAt(0).toUpperCase() + response.estimatedEffort.slice(1)}** - ${
    response.estimatedEffort === 'quick'
      ? '< 1 hour'
      : response.estimatedEffort === 'moderate'
        ? '1-4 hours'
        : '> 4 hours'
  }

${!aiEnabled ? '\n*💡 Tip: Set `OPENAI_API_KEY` for AI-enhanced analysis*\n' : ''}
`;
}

// CLI execution
if (require.main === module) {
  const contextArg = process.argv[2] as AIAssistRequest['context'] | undefined;
  const dataFile = process.argv[3];

  if (contextArg === undefined) {
    console.error('Usage: ai_assist.ts <context> [data-file]');
    console.error('Context: test_failure | lint_error | pr_review');
    process.exit(1);
  }

  let data: Record<string, unknown> = {};
  if (dataFile !== undefined) {
    data = JSON.parse(readFileSync(dataFile, 'utf-8')) as Record<string, unknown>;
  }

  getAIAssist({ context: contextArg, data })
    .then((response) => {
      console.log(formatAIAssist(response, isOpenAIAvailable()));
    })
    .catch((error) => {
      console.error('AI assist failed:', error);
      process.exit(1);
    });
}
