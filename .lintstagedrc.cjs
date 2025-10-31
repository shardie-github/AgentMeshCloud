/**
 * Lint-staged Configuration - ORCA Core
 * Runs linters and formatters on staged files before commit
 */

module.exports = {
  // TypeScript/JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // JSON files
  '*.json': [
    'prettier --write',
  ],
  
  // YAML files
  '*.{yaml,yml}': [
    'prettier --write',
  ],
  
  // Markdown files
  '*.md': [
    'prettier --write',
    'markdownlint --fix',
  ],
  
  // SQL files
  '*.sql': [
    'prettier --write --parser sql',
  ],
};
