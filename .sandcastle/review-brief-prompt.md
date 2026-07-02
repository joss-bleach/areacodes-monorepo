# TASK

Review the implementation on branch `{{BRANCH}}` against the original issue brief. Verify it does what was asked — nothing more, nothing less.

# CONTEXT

## Issue brief

!`gh issue view {{TASK_ID}}`

## Branch diff

!`git diff {{MERGE_INTO}}...{{BRANCH}}`

## Commits on this branch

!`git log {{MERGE_INTO}}..{{BRANCH}} --oneline`

# REVIEW PROCESS

1. **Understand the brief**: Read the issue carefully. What was asked for? What are the acceptance criteria?

2. **Check coverage**: Does the implementation address every requirement in the brief?
   - Missing features or behaviours?
   - Edge cases the brief implies but aren't handled?
   - Anything implemented that wasn't asked for (scope creep)?

3. **Check correctness**: Does it actually work as described?
   - Does the logic match the intent?
   - Are there bugs that would cause it to fail at runtime?
   - Are there unsafe assumptions or unchecked nulls that could cause crashes?

4. **Check tests**: Are new behaviours covered by tests?
   - Unit/integration tests via Vitest for Convex functions
   - E2E tests via Playwright in `apps/e2e/tests/` for any user-facing flows

# EXECUTION

If you find gaps or bugs:

1. Fix them directly on this branch
2. Run `bun run check-types` and `bun run test` to confirm nothing is broken
   - If you added or changed E2E tests, note them in the commit message
3. Commit the fixes - do NOT add any `Co-Authored-By:` lines to the commit message

If the implementation fully satisfies the brief, do nothing.

Once complete, output <promise>COMPLETE</promise>.
