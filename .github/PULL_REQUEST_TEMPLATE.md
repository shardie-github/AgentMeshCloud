## Description

<!-- Provide a clear and concise description of the changes in this PR -->

## Type of Change

<!-- Check all that apply -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] ♻️ Refactoring (no functional changes)
- [ ] 🎨 Style/formatting changes
- [ ] ⚡ Performance improvement
- [ ] ✅ Test update
- [ ] 🔧 Configuration/build changes
- [ ] 🔒 Security fix

## Related Issues

<!-- Link related issues using keywords: Closes #123, Fixes #456, Related to #789 -->

Closes #

## Changes Made

<!-- Provide a bullet-point list of specific changes -->

- 
- 
- 

## Testing

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

### Test Instructions

<!-- Describe how reviewers can test these changes -->

1. 
2. 
3. 

### Test Results

```
<!-- Paste test output or link to CI run -->
```

## Documentation

- [ ] Code comments added for complex logic
- [ ] JSDoc/TSDoc added for public APIs
- [ ] README updated (if applicable)
- [ ] Technical documentation updated (if applicable)
- [ ] API reference updated (if applicable)
- [ ] CHANGELOG.md updated

## Security & Compliance

- [ ] No sensitive data (API keys, passwords, PII) committed
- [ ] Security implications considered and documented
- [ ] RLS policies updated (if database changes)
- [ ] RBAC/permissions validated
- [ ] Policy coverage verified (for policy engine changes)
- [ ] Compliance requirements met (SOC2, GDPR, etc.)

## Performance Impact

- [ ] No performance degradation expected
- [ ] Performance impact measured and acceptable
- [ ] Performance benchmarks added/updated
- [ ] Bundle size impact assessed (if frontend changes)

### Performance Metrics

<!-- If applicable, provide before/after metrics -->

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Response time | | | |
| Throughput | | | |
| Memory usage | | | |
| Bundle size | | | |

## Accessibility (for UI changes)

- [ ] Keyboard navigation tested
- [ ] Screen reader compatibility verified
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Focus indicators visible
- [ ] ARIA labels added where needed

## Database Changes

<!-- Check all that apply -->

- [ ] No database changes
- [ ] Schema changes (migrations included)
- [ ] RLS policies updated
- [ ] Indexes added/modified
- [ ] Data migration script included
- [ ] Rollback script included

## Breaking Changes

<!-- If this is a breaking change, describe the impact and migration path -->

**Impact:**

**Migration Path:**

**Deprecation Notice:**

## Deployment Notes

<!-- Special deployment considerations, environment variables, feature flags, etc. -->

- [ ] No special deployment requirements
- [ ] Environment variables added (documented in .env.example)
- [ ] Feature flags required
- [ ] Manual steps required post-deployment
- [ ] Rollback plan documented

### New Environment Variables

<!-- List any new environment variables and their purpose -->

```bash
# Example:
# NEW_FEATURE_FLAG=true  # Enable new trust scoring algorithm
```

## Screenshots/Videos

<!-- Add screenshots or videos for UI changes -->

## Pre-merge Checklist

### Code Quality

- [ ] Code follows project style guidelines (ESLint, Prettier)
- [ ] Self-review completed
- [ ] Complex code has explanatory comments
- [ ] No console.log or debug code left in
- [ ] No commented-out code (unless with explanation)
- [ ] Error handling is comprehensive
- [ ] TypeScript strict mode compliance

### Testing & CI

- [ ] All CI checks passing
- [ ] Tests pass locally (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Coverage thresholds met
- [ ] No new security vulnerabilities introduced

### Documentation & Communication

- [ ] PR title follows conventional commits format
- [ ] PR description is clear and complete
- [ ] Reviewers assigned
- [ ] Labels applied
- [ ] Linked to project board (if applicable)

### Reviewer Guidance

<!-- Help reviewers by highlighting areas that need special attention -->

**Focus areas for review:**

- 
- 

**Known limitations:**

- 
- 

## Post-merge Tasks

<!-- List any follow-up tasks required after merge -->

- [ ] Monitor error rates post-deployment
- [ ] Update runbooks/playbooks
- [ ] Notify stakeholders
- [ ] Create follow-up issues

---

**By submitting this PR, I confirm that:**

- My code follows the project's code of conduct and contribution guidelines
- I have performed a self-review of my code
- I have tested these changes thoroughly
- I am available to address review feedback
