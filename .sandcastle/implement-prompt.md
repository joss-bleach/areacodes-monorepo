# TASK

Fix issue {{TASK_ID}}: {{ISSUE_TITLE}}

Pull in the issue using `gh issue view <ID>`. If it has a parent PRD, pull that in too.

Only work on the issue specified.

Work on branch {{BRANCH}}. Make commits and run tests.

# CONTEXT

Here are the last 10 commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

Pay extra attention to test files that touch the relevant parts of the code.

# DESIGN REFERENCES

If the issue or its PRD references UI/UX screens under `docs/design/` (e.g.
`docs/design/voucher-provisioning/`), READ those PNG files with the Read tool before implementing any
UI — they render as images and are the source of truth for layout, copy, states, and on-brand styling.
Match them precisely (pixel-perfect): spacing, typography (Poppins UI, Geist Mono for codes), pure
black/white, zero border-radius. Start from the folder's `README.md`, which maps each screen to its flow
step. Build against the committed PNGs, not a live design tool.

# EXECUTION

If applicable, use RGR to complete the task.

1. RED: write one test
2. GREEN: write the implementation to pass that test
3. REPEAT until done
4. REFACTOR the code

# FEEDBACK LOOPS

Before committing, run `bun run check-types` and `bun run test` to ensure the tests pass.

# COMMIT

Make a git commit. The commit message must:

1. Start with `RALPH:` prefix
2. Include task completed + PRD reference
3. Key decisions made
4. Files changed
5. Blockers or notes for next iteration

Keep it concise. Do NOT add any `Co-Authored-By:` lines to the commit message.

# THE ISSUE

If the task is not complete, leave a comment on the issue with what was done.

Do not close the issue - this will be done later.

Once complete, output <promise>COMPLETE</promise>.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
