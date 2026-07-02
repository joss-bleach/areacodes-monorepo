# TASK

Review the code changes on branch `{{BRANCH}}` against the project coding standards. Improve clarity, consistency, and maintainability while preserving exact functionality.

# CONTEXT

## Branch diff

!`git diff {{MERGE_INTO}}...{{BRANCH}}`

## Commits on this branch

!`git log {{MERGE_INTO}}..{{BRANCH}} --oneline`

# REVIEW PROCESS

1. **Understand the change**: Read the diff and commits to understand the intent.

2. **Check against coding standards**: Follow the standards defined in @.sandcastle/CODING_STANDARDS.md. Key things to watch:
   - File/folder placement and naming conventions
   - Named exports only; no default exports from components or hooks
   - Path aliases (`~/*`, `@repo/*`) used correctly
   - Component patterns: early returns for loading/null states, props typed inline or via interface
   - TypeScript: `type` over `interface` for aliases, `import type` for type-only imports
   - Tailwind class ordering: layout → spacing → colors
   - Effect style guide: `Effect.gen` for sequential business logic, `.pipe()` for cross-cutting concerns
   - React Native: RN primitives only, no web-only deps, min 48px touch targets

3. **Check code quality**:
   - Reduce unnecessary complexity and nesting
   - Eliminate redundant code and abstractions
   - Improve readability through clear naming
   - Avoid nested ternaries - prefer switch or if/else
   - Remove comments that describe obvious code

4. **Maintain balance**: Don't over-simplify. Preserve helpful abstractions and avoid combining too many concerns into one function or component.

5. **Preserve functionality**: Never change what the code does - only how it does it.

# EXECUTION

If you find violations or improvements:

1. Make the changes directly on this branch
2. Run `bun run check-types` and `bun run test` to confirm nothing is broken
3. Commit describing the refinements - do NOT add any `Co-Authored-By:` lines to the commit message

If the code already meets standards and is well-structured, do nothing.

Once complete, output <promise>COMPLETE</promise>.
