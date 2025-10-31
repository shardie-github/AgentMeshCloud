/**
 * Commitlint Configuration - ORCA Core
 * Enforces Conventional Commits specification
 * https://www.conventionalcommits.org/
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  
  rules: {
    // Type
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only changes
        'style',    // Code style changes (formatting, missing semicolons, etc.)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'build',    // Changes to build system or external dependencies
        'ci',       // CI/CD changes
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Reverts a previous commit
      ],
    ],
    
    // Subject
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 100],
    
    // Header
    'header-max-length': [2, 'always', 100],
    
    // Body
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 100],
    
    // Footer
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 100],
    
    // Scope (optional but recommended)
    'scope-case': [2, 'always', 'lower-case'],
    'scope-empty': [0],
    
    // Scope enum (customize based on your areas)
    'scope-enum': [
      1,
      'always',
      [
        'registry',
        'trust',
        'uadsi',
        'policy',
        'api',
        'telemetry',
        'security',
        'ui',
        'database',
        'supabase',
        'deployment',
        'vercel',
        'docs',
        'ci',
        'deps',
        'config',
      ],
    ],
  },
  
  // Custom prompts for interactive mode
  prompt: {
    questions: {
      type: {
        description: "Select the type of change you're committing",
        enum: {
          feat: {
            description: 'A new feature',
            title: 'Features',
            emoji: '✨',
          },
          fix: {
            description: 'A bug fix',
            title: 'Bug Fixes',
            emoji: '🐛',
          },
          docs: {
            description: 'Documentation only changes',
            title: 'Documentation',
            emoji: '📚',
          },
          style: {
            description:
              'Changes that do not affect the meaning of the code (white-space, formatting, etc.)',
            title: 'Styles',
            emoji: '💎',
          },
          refactor: {
            description: 'A code change that neither fixes a bug nor adds a feature',
            title: 'Code Refactoring',
            emoji: '♻️',
          },
          perf: {
            description: 'A code change that improves performance',
            title: 'Performance Improvements',
            emoji: '⚡️',
          },
          test: {
            description: 'Adding missing tests or correcting existing tests',
            title: 'Tests',
            emoji: '✅',
          },
          build: {
            description:
              'Changes that affect the build system or external dependencies',
            title: 'Builds',
            emoji: '🛠',
          },
          ci: {
            description:
              'Changes to our CI configuration files and scripts',
            title: 'Continuous Integrations',
            emoji: '⚙️',
          },
          chore: {
            description: "Other changes that don't modify src or test files",
            title: 'Chores',
            emoji: '🔧',
          },
          revert: {
            description: 'Reverts a previous commit',
            title: 'Reverts',
            emoji: '⏪',
          },
        },
      },
      scope: {
        description: 'What is the scope of this change (e.g. component or file name)',
      },
      subject: {
        description: 'Write a short, imperative tense description of the change',
      },
      body: {
        description: 'Provide a longer description of the change',
      },
      isBreaking: {
        description: 'Are there any breaking changes?',
      },
      breakingBody: {
        description:
          'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself',
      },
      breaking: {
        description: 'Describe the breaking changes',
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description:
          'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself',
      },
      issues: {
        description: 'Add issue references (e.g. "fix #123", "re #456")',
      },
    },
  },
};
