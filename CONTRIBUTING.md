## Contributing to ORCA Core

Thank you for your interest in contributing to ORCA! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and professional in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/orca-core.git`
3. Add upstream remote: `git remote add upstream https://github.com/orca-mesh/orca-core.git`
4. Create a feature branch: `git checkout -b feat/your-feature-name`

## Development Setup

### Prerequisites

- Node.js >= 18.18.0
- pnpm >= 8.0.0
- Docker & Docker Compose (for local services)

### Installation

```bash
# Install dependencies
pnpm install

# Start local services
docker-compose up -d

# Run doctor check
pnpm run doctor

# Start development server
pnpm run dev
```

## Making Changes

### Branch Naming

Use descriptive branch names following this pattern:

- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `refactor/code-improvement` - Code refactoring
- `test/test-description` - Test additions/modifications
- `chore/maintenance-task` - Maintenance tasks

### Coding Standards

We follow strict TypeScript and code quality standards:

```bash
# Lint your code
pnpm run lint

# Format your code
pnpm run format

# Type check
pnpm run type-check
```

#### Code Style

- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused (< 50 lines ideally)
- Use path aliases (@/*) instead of relative imports
- Follow existing patterns in the codebase

#### File Headers

Add file headers to new files:

```typescript
/**
 * Module Name - ORCA Core
 * Brief description of the module
 */
```

## Commit Guidelines

We use **Conventional Commits** for consistent commit messages:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/modifications
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```bash
feat(uadsi): add trust score caching

Implement Redis-based caching for trust scores to improve
performance. Scores are cached for 5 minutes with automatic
invalidation on agent updates.

Closes #123
```

```bash
fix(api): handle missing agent ID in trust endpoint

Add validation for agent ID parameter and return 400
error if missing instead of crashing.

Fixes #456
```

## Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Run all checks**:
   ```bash
   pnpm run lint
   pnpm run type-check
   pnpm run test
   pnpm run build
   ```
4. **Run doctor**: `pnpm run doctor`
5. **Update CHANGELOG.md** if applicable

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All CI checks pass
- [ ] PR title follows conventional commits
- [ ] Breaking changes documented

### PR Template

Use this template for your PR description:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
```

### Review Process

1. Submit PR with descriptive title and body
2. Wait for automated checks to complete
3. Address reviewer feedback
4. Maintainer approval required for merge
5. Squash and merge strategy used

## Testing

### Running Tests

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

### Writing Tests

- Place test files next to source files: `module.test.ts`
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies
- Aim for >80% code coverage

Example:

```typescript
describe('TrustScoringEngine', () => {
  it('should compute trust score correctly', async () => {
    // Arrange
    const engine = new TrustScoringEngine();
    const agentId = 'test-agent';

    // Act
    const score = await engine.computeTrustScore(agentId);

    // Assert
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
  });
});
```

## Documentation

### Types of Documentation

1. **Code Comments**: For complex logic
2. **JSDoc**: For public APIs
3. **README**: High-level overview
4. **Wiki/Docs**: Detailed guides (see `/docs`)

### Documentation Guidelines

- Keep documentation up-to-date with code changes
- Use clear, concise language
- Include code examples where helpful
- Document breaking changes prominently

## Project Structure

```
/workspace
├── src/              # Source code
│   ├── common/       # Shared utilities
│   ├── registry/     # Agent registry
│   ├── telemetry/    # OpenTelemetry
│   ├── policy/       # Policy enforcement
│   ├── uadsi/        # Core differentiator
│   ├── api/          # REST API
│   ├── adapters/     # Integration adapters
│   └── security/     # Security utilities
├── docs/             # Documentation
├── scripts/          # Utility scripts
└── tests/            # Test files
```

## Questions?

- Open a GitHub Discussion
- Join our Slack channel (if applicable)
- Email: dev@orca-mesh.io

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

---

**Thank you for contributing to ORCA Core!**
