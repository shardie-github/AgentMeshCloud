# Commenting Standard

Guidelines for documenting code in ORCA Core.

## Table of Contents

- [Philosophy](#philosophy)
- [JSDoc for Public APIs](#jsdoc-for-public-apis)
- [Inline Comments](#inline-comments)
- [Comment Audit](#comment-audit)
- [Examples](#examples)

## Philosophy

**Good code is self-documenting, but documentation amplifies understanding.**

### When to Comment

✅ **DO comment:**

- Public API functions/classes
- Complex algorithms
- Non-obvious business logic
- Workarounds or hacks
- Performance-critical sections

❌ **DON'T comment:**

- Obvious code
- What code does (if clear from reading)
- Redundant information

### Quality over Quantity

**Bad:**

```typescript
// Get agent by ID
function getAgent(id: string) { ... }
```

**Good:**

```typescript
/**
 * Retrieve agent details from registry
 * @param id - Unique agent identifier
 * @returns Agent details including metadata and trust score
 * @throws {NotFoundError} If agent doesn't exist
 * @throws {AuthError} If caller lacks permission
 */
async function getAgent(id: string): Promise<Agent> { ... }
```

## JSDoc for Public APIs

All **exported** functions, classes, interfaces, and types MUST have JSDoc comments.

### Function Documentation

```typescript
/**
 * Brief one-line description
 *
 * Longer description with details, examples, and context.
 * Can span multiple lines.
 *
 * @param paramName - Parameter description
 * @param optionalParam - Optional parameter description (optional)
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * ```typescript
 * const score = await computeTrustScore('agent-123');
 * console.log(score.score); // 0-100
 * ```
 */
export async function computeTrustScore(
  agentId: string,
  options?: TrustOptions
): Promise<TrustScore> {
  // Implementation...
}
```

### Class Documentation

```typescript
/**
 * Agent Registry Service
 *
 * Manages agent registration, discovery, and lifecycle.
 * Implements health monitoring and metadata storage.
 *
 * @example
 * ```typescript
 * const registry = new AgentRegistry(supabaseClient);
 * await registry.register(agentMetadata);
 * ```
 */
export class AgentRegistry {
  /**
   * Create agent registry instance
   * @param client - Supabase client for data persistence
   * @param options - Configuration options
   */
  constructor(client: SupabaseClient, options?: RegistryOptions) {
    // ...
  }

  /**
   * Register a new agent
   * @param metadata - Agent metadata including name, capabilities
   * @returns Registered agent with generated ID
   * @throws {ValidationError} If metadata is invalid
   */
  async register(metadata: AgentMetadata): Promise<Agent> {
    // ...
  }
}
```

### Interface/Type Documentation

```typescript
/**
 * Agent metadata for registration
 */
export interface AgentMetadata {
  /** Human-readable agent name */
  name: string;

  /** Agent description */
  description: string;

  /** Agent capabilities (e.g., ['text-generation', 'summarization']) */
  capabilities: string[];

  /** Contact email for agent owner */
  owner: string;

  /**
   * Agent endpoint URL
   * @example "https://api.example.com/agent"
   */
  endpoint: string;
}
```

### Required JSDoc Tags

| Tag | Required For | Description |
|-----|--------------|-------------|
| `@param` | Functions with params | Describe each parameter |
| `@returns` | Functions that return | Describe return value |
| `@throws` | Functions that throw | Describe error conditions |
| `@example` | Public APIs | Show usage example |
| `@deprecated` | Deprecated APIs | Explain alternative |

### Optional Tags

| Tag | Use Case |
|-----|----------|
| `@internal` | Private APIs not for external use |
| `@alpha` / `@beta` | APIs in preview |
| `@see` | Reference related functions/docs |
| `@since` | Version when API was added |

## Inline Comments

### When to Use

**Explain WHY, not WHAT**

**Bad:**

```typescript
// Loop through agents
for (const agent of agents) {
  // Check if agent is active
  if (agent.status === 'active') {
    // Add to list
    activeAgents.push(agent);
  }
}
```

**Good:**

```typescript
// Only process active agents to avoid wasting compute on inactive ones
const activeAgents = agents.filter(agent => agent.status === 'active');
```

### Complex Logic

```typescript
// Trust score calculation uses weighted average:
// - 40% reliability (uptime, error rate)
// - 30% compliance (policy adherence)
// - 20% reputation (user feedback)
// - 10% historical performance
const trustScore = 
  reliability * 0.4 +
  compliance * 0.3 +
  reputation * 0.2 +
  historical * 0.1;
```

### Workarounds

```typescript
// HACK: Supabase RLS doesn't support nested queries in policies,
// so we fetch related data separately and merge client-side.
// Remove once Supabase supports this (tracked in issue #123)
const agents = await fetchAgents();
const scores = await fetchScores();
const merged = mergeAgentsWithScores(agents, scores);
```

### TODOs

```typescript
// TODO(username): Implement caching for trust scores
// Target: < 50ms response time
// See: docs/PERFORMANCE.md
async function getTrustScore(id: string): Promise<number> {
  return await db.trustScores.findUnique({ where: { id } });
}
```

## Comment Audit

### Running Audit

```bash
# Check comment coverage
pnpm run comment:audit

# Or via script
tsx scripts/comment_audit.ts
```

### Coverage Thresholds

| Level | Threshold | Status |
|-------|-----------|--------|
| Excellent | ≥ 90% | ✅ |
| Good | 80-89% | ✅ |
| Needs Work | 50-79% | ⚠️ |
| Poor | < 50% | ❌ |

**Target:** 80% coverage for public APIs

### CI Integration

Comment audit runs in CI and fails PRs that:

- Reduce overall coverage below 70%
- Add new public APIs without JSDoc

## Examples

### Before (Undocumented)

```typescript
export class PolicyEngine {
  evaluate(context: Context): Decision {
    const policies = this.loadPolicies();
    
    for (const policy of policies) {
      if (!policy.rule(context)) {
        return { allow: false, reason: policy.message };
      }
    }
    
    return { allow: true };
  }
}
```

### After (Documented)

```typescript
/**
 * Policy Engine for declarative governance
 *
 * Evaluates policies against request context and returns enforcement decisions.
 * Policies are loaded from YAML configuration and compiled to JavaScript functions.
 *
 * @example
 * ```typescript
 * const engine = new PolicyEngine();
 * const decision = await engine.evaluate({
 *   agent: { id: '123', trustScore: 85 },
 *   action: 'data.read',
 * });
 *
 * if (!decision.allow) {
 *   throw new ForbiddenError(decision.reason);
 * }
 * ```
 */
export class PolicyEngine {
  /**
   * Evaluate policies against context
   *
   * Policies are evaluated in order. First policy that denies will short-circuit
   * and return denial decision. If all policies allow, returns allow decision.
   *
   * @param context - Request context including agent, action, resource
   * @returns Enforcement decision (allow/deny) with reason
   * @throws {PolicyLoadError} If policies can't be loaded
   *
   * @example
   * ```typescript
   * const decision = engine.evaluate({
   *   agent: { id: '123', trustScore: 85 },
   *   action: 'data.read',
   *   resource: { type: 'customer', id: '456' },
   * });
   * ```
   */
  evaluate(context: Context): Decision {
    const policies = this.loadPolicies();
    
    // Evaluate in order, short-circuit on first denial
    for (const policy of policies) {
      if (!policy.rule(context)) {
        return { allow: false, reason: policy.message };
      }
    }
    
    // All policies passed
    return { allow: true };
  }
}
```

## Best Practices

1. **Write comments during development**, not after
2. **Update comments when changing code**
3. **Use clear, concise language**
4. **Provide examples for complex APIs**
5. **Link to related docs or issues**
6. **Avoid redundant comments**

## Enforcement

- **Pre-commit:** Lint-staged checks formatting
- **CI:** Comment audit on PRs
- **Code Review:** Reviewers check for adequate documentation

---

**Remember:** Comments are for humans, not compilers. Make them helpful! 🚀
