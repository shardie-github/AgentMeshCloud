# 📚 Code Comment Style Guide

> Documentation standards for ORCA/AgentMesh codebase

## Philosophy

**Comments should explain WHY, not WHAT.**

- ✅ Good: `// Retry on network failure to handle transient errors`
- ❌ Bad: `// Call retry function`

## JSDoc Standards

### Functions

All exported functions MUST have JSDoc comments:

```typescript
/**
 * Calculate the total cost of agent execution including overhead.
 * 
 * This accounts for:
 * - Base compute cost
 * - Network transfer fees
 * - AI model API calls
 * - Storage costs
 * 
 * @param execution - The completed execution record
 * @param config - Cost calculation configuration
 * @returns Total cost in USD
 * 
 * @throws {ValidationError} If execution data is incomplete
 * 
 * @example
 * ```typescript
 * const cost = calculateExecutionCost(execution, defaultConfig);
 * console.log(`Total: $${cost.toFixed(2)}`);
 * ```
 */
export function calculateExecutionCost(
  execution: ExecutionRecord,
  config: CostConfig
): number {
  // Implementation
}
```

### Classes

```typescript
/**
 * Orchestrates multi-agent workflows with error recovery and observability.
 * 
 * The orchestrator manages:
 * - Agent lifecycle (spawn, execute, terminate)
 * - Workflow coordination and state management
 * - Error handling and retry logic
 * - Telemetry and cost tracking
 * 
 * @example
 * ```typescript
 * const orchestrator = new WorkflowOrchestrator(config);
 * await orchestrator.executeWorkflow(workflowId);
 * ```
 */
export class WorkflowOrchestrator {
  /**
   * Create a new workflow orchestrator.
   * 
   * @param config - Orchestrator configuration including retry policies
   * @param telemetry - Optional telemetry provider for observability
   */
  constructor(
    private config: OrchestratorConfig,
    private telemetry?: TelemetryProvider
  ) {}
}
```

### Interfaces & Types

```typescript
/**
 * Configuration for agent execution policies.
 * 
 * Controls timeout, retry behavior, and resource limits.
 */
export interface AgentExecutionPolicy {
  /** Maximum execution time in milliseconds */
  timeoutMs: number;
  
  /** Number of retry attempts on failure */
  maxRetries: number;
  
  /** Exponential backoff multiplier (default: 2.0) */
  retryBackoff?: number;
  
  /** Maximum memory usage in MB */
  memoryLimitMb: number;
}
```

## Inline Comments

### When to Use

Use inline comments for:

1. **Non-obvious logic**
   ```typescript
   // Use Set for O(1) lookup instead of Array.includes()
   const uniqueIds = new Set(ids);
   ```

2. **Workarounds**
   ```typescript
   // HACK: Temporary fix for race condition in upstream library
   // TODO(issue-123): Remove when library v2.0 is released
   await sleep(100);
   ```

3. **Important invariants**
   ```typescript
   // INVARIANT: Array is always sorted by timestamp
   events.push(newEvent);
   ```

4. **Complex algorithms**
   ```typescript
   // Dijkstra's algorithm for shortest path in workflow graph
   while (queue.length > 0) {
     // ...
   }
   ```

### When NOT to Use

Don't comment obvious code:

```typescript
// ❌ BAD: Obvious
// Increment counter
counter++;

// ❌ BAD: Redundant
// Return the result
return result;

// ✅ GOOD: Explains reasoning
// Cache for 5 minutes to reduce database load
return cache.set(key, result, 300);
```

## Special Markers

### TODO Comments

Format: `// TODO(issue-number): Description`

```typescript
// TODO(ORCA-456): Add support for async webhooks
// TODO(john): Refactor this to use the new API
// TODO: Consider using a priority queue for better performance
```

### FIXME Comments

For bugs that need addressing:

```typescript
// FIXME(ORCA-789): Memory leak when processing large datasets
// Temporary workaround - needs proper fix
return smallDatasetOnly(data.slice(0, 1000));
```

### HACK Comments

For temporary workarounds:

```typescript
// HACK: Library doesn't support cancellation, so we timeout manually
// Remove this when we upgrade to v3.x
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Timeout')), 5000)
);
```

### NOTE Comments

For important context:

```typescript
// NOTE: This method is called from multiple threads, ensure thread-safety
// NOTE: Performance-critical path - avoid allocations
```

## File-Level Comments

Every file should start with a description:

```typescript
/**
 * @fileoverview
 * Agent execution engine with retry logic and telemetry.
 * 
 * This module handles:
 * - Agent process spawning and lifecycle
 * - Execution monitoring and timeout handling
 * - Error recovery with exponential backoff
 * - Cost and performance tracking
 * 
 * @author Platform Team
 * @see https://docs.orca.ai/architecture/agents
 */

import { Agent } from './types';
// ... rest of file
```

## API Documentation

### Public APIs

All public APIs must document:

1. **Purpose**: What it does
2. **Parameters**: What it accepts
3. **Returns**: What it produces
4. **Throws**: What errors it might throw
5. **Example**: How to use it

### Internal APIs

Internal functions should have brief descriptions:

```typescript
/**
 * Internal: Parse agent response payload.
 * Assumes pre-validated input.
 */
function parseResponse(raw: string): Response {
  // ...
}
```

## Comment Coverage Standards

Target metrics:

- **Exported functions**: 100% coverage
- **Exported classes**: 100% coverage
- **Public methods**: 100% coverage
- **Complex private methods**: 80% coverage
- **Simple getters/setters**: Optional

Check coverage:

```bash
npm run comment:check
```

Enhance missing comments:

```bash
npm run comment:enhance --enhance
```

## AI-Generated Comments

When using `comment_enhancer.ts`, always:

1. **Review generated comments** - AI isn't perfect
2. **Enhance descriptions** - Add business context
3. **Remove placeholder TODOs** - Once verified
4. **Update examples** - Make them realistic

Example flow:

```bash
# Generate initial comments
npm run comment:enhance --enhance

# Review the diff
git diff

# Edit files to improve AI-generated comments
# Commit when satisfied
git commit -m "docs: enhance function documentation"
```

## Anti-Patterns

### Don't Comment Out Code

```typescript
// ❌ BAD: Commented-out code
// function oldImplementation() {
//   return legacyLogic();
// }

// ✅ GOOD: Use version control
// If you need old code, check git history
```

### Don't Write Novels

```typescript
// ❌ BAD: Too verbose
/**
 * This function takes in a user object and then it checks
 * whether or not the user has the proper permissions and if
 * they do then it will allow them to proceed but if they don't
 * then it will return false and log an error message...
 */

// ✅ GOOD: Concise
/**
 * Verify user has required permissions for the operation.
 * 
 * @returns true if authorized, false otherwise
 */
```

### Don't State the Obvious

```typescript
// ❌ BAD
interface User {
  /** The user's name */
  name: string;
  /** The user's email */
  email: string;
}

// ✅ GOOD (for non-obvious fields)
interface User {
  name: string;
  email: string;
  /** Unix timestamp of last successful login */
  lastSeenAt: number;
}
```

## Examples

### Before Enhancement

```typescript
export function processWorkflow(id: string, options: any) {
  const workflow = getWorkflow(id);
  const result = execute(workflow);
  return result;
}
```

### After Enhancement

```typescript
/**
 * Execute a workflow by ID with the provided options.
 * 
 * This orchestrates the full workflow lifecycle:
 * 1. Retrieves workflow definition from registry
 * 2. Validates inputs and permissions
 * 3. Executes steps in dependency order
 * 4. Handles errors with retry logic
 * 5. Records telemetry and costs
 * 
 * @param id - Workflow UUID from registry
 * @param options - Execution options including timeout and retry policy
 * @returns Workflow execution result with outputs and metadata
 * 
 * @throws {WorkflowNotFoundError} If workflow ID doesn't exist
 * @throws {ValidationError} If options are invalid
 * @throws {ExecutionError} If workflow execution fails after retries
 * 
 * @example
 * ```typescript
 * const result = await processWorkflow(
 *   'wf_abc123',
 *   { timeoutMs: 30000, maxRetries: 3 }
 * );
 * console.log('Workflow completed:', result.outputs);
 * ```
 */
export async function processWorkflow(
  id: string,
  options: WorkflowOptions
): Promise<WorkflowResult> {
  // Retrieve workflow definition
  const workflow = await getWorkflow(id);
  
  // Execute with error handling
  const result = await execute(workflow, options);
  
  return result;
}
```

## Tools

### Check Coverage

```bash
# Check current comment coverage
npm run comment:check

# Output:
# ✅ Coverage: 87.3%
# 📊 Documented: 124 / 142 exports
```

### Auto-Enhance

```bash
# Dry run (preview only)
npm run comment:enhance --dry-run

# Apply enhancements
npm run comment:enhance --enhance

# After enhancement, review and commit
git add -p
git commit -m "docs: enhance API documentation"
```

### Lint Comments

```bash
# Check for TODO/FIXME without issue numbers
npm run lint:comments

# Check for overly long comments
npm run lint:comments -- --max-length=80
```

## References

- [JSDoc Official Documentation](https://jsdoc.app/)
- [TypeScript JSDoc Support](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

---

**Remember**: Good comments age gracefully. Write for the developer who will maintain your code in 6 months (probably you!).
