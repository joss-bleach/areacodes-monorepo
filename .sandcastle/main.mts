// Parallel Planner with Review — four-phase orchestration loop
//
// Phase 1 (Plan):             An opus agent reads all Sandcastle-labelled issues,
//                             builds a dependency graph, and emits a <plan> JSON.
// Phase 2 (Execute + Review): Implementer then reviewer run per issue in a shared
//                             Vercel Firecracker sandbox. All issue pipelines run
//                             concurrently via Promise.allSettled().
// Phase 3 (Merge):            A single agent merges completed branches into BASE_BRANCH.
// Phase 4 (Labels):           Issues are closed and labelled agent:done on success,
//                             or labelled agent:blocked with a comment on failure.
//
// Triggered by GitHub Actions when the Sandcastle label is added to an issue.

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { execSync } from "child_process";
import { z } from "zod";

const planSchema = z.object({
  issues: z.array(
    z.object({ id: z.string(), title: z.string(), branch: z.string() }),
  ),
});

const MAX_ITERATIONS = 10;

const BASE_BRANCH = process.env.BASE_BRANCH ?? "main";

// ---------------------------------------------------------------------------
// Sandbox configuration
// ---------------------------------------------------------------------------

// Docker sandbox: runs containers on the GitHub Actions runner using the
// pre-built image from .sandcastle/Dockerfile (gh + bun + claude are already
// baked in — no slow installs on every run). The worktree is bind-mounted so
// patches sync instantly via the filesystem instead of over the network.
const makeSandbox = () =>
  docker({
    env: {
      GH_TOKEN: process.env.GH_TOKEN ?? "",
      GITHUB_TOKEN: process.env.GH_TOKEN ?? "",
      CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "",
      GH_REPO: process.env.GITHUB_REPOSITORY ?? "",
    },
  });

// The Dockerfile pre-bakes gh/bun/claude — onSandboxReady only needs to
// install project deps and configure git identity for commits/pushes.
const hooks = {
  sandbox: {
    onSandboxReady: [
      {
        command: [
          'git config --global user.name "Sandcastle"',
          'git config --global user.email "sandcastle@users.noreply.github.com"',
          "git config --global --add safe.directory /home/agent/workspace",
          "git config --global credential.helper '!f() { echo username=x-access-token; echo password=$GH_TOKEN; }; f'",
          "bun install",
          "(git checkout -- bun.lockb 2>/dev/null || true)",
        ].join(" && "),
      },
    ],
  },
};

const copyToWorktree: string[] = [];

// ---------------------------------------------------------------------------
// Label helpers — run on the GH Actions host via gh CLI
// ---------------------------------------------------------------------------

function ghLabel(issueId: string, add: string, remove?: string) {
  try {
    const removeFlag = remove ? ` --remove-label "${remove}"` : "";
    execSync(`gh issue edit ${issueId} --add-label "${add}"${removeFlag}`, {
      stdio: "pipe",
    });
  } catch {
    console.warn(`  ⚠ Could not update labels on #${issueId}`);
  }
}

function ghClose(issueId: string) {
  try {
    execSync(`gh issue close ${issueId}`, { stdio: "pipe" });
  } catch {
    console.warn(`  ⚠ Could not close #${issueId}`);
  }
}

function ghComment(issueId: string, body: string) {
  try {
    execSync(`gh issue comment ${issueId} --body "${body}"`, { stdio: "pipe" });
  } catch {
    console.warn(`  ⚠ Could not comment on #${issueId}`);
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // -------------------------------------------------------------------------
  // Phase 1: Plan
  //
  // Opus reads all Sandcastle-labelled issues, builds a dependency graph, and
  // selects the unblocked subset to work on. Runs on the host runner (no
  // sandbox) so gh and git work without any extra setup. Output.object
  // extracts and validates the <plan> JSON block — throws if malformed.
  // -------------------------------------------------------------------------
  const plan = await sandcastle.run({
    sandbox: noSandbox(),
    name: "planner",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-opus-4-8"),
    promptFile: "./.sandcastle/plan-prompt.md",
    output: sandcastle.Output.object({ tag: "plan", schema: planSchema }),
  });

  const issues = plan.output.issues;

  if (issues.length === 0) {
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }

  console.log(
    `Planning complete. ${issues.length} issue(s) to work in parallel:`,
  );
  for (const issue of issues) {
    console.log(`  #${issue.id}: ${issue.title} → ${issue.branch}`);
    // Transition label now that the planner has committed to this issue.
    ghLabel(issue.id, "agent:in-progress", "Sandcastle");
  }

  // -------------------------------------------------------------------------
  // Phase 2: Execute + Review
  //
  // Each issue gets its own Vercel sandbox. Implementer runs first; reviewer
  // runs only when commits were produced. Promise.allSettled keeps all
  // pipelines independent — one failure won't cancel the others.
  // -------------------------------------------------------------------------

  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        baseBranch: BASE_BRANCH,
        sandbox: makeSandbox(),
        hooks,
        copyToWorktree,
      });

      try {
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          agent: sandcastle.claudeCode("claude-sonnet-4-6"),
          promptFile: "./.sandcastle/implement-prompt.md",
          promptArgs: {
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
          },
        });

        if (implement.commits.length > 0) {
          const review = await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            agent: sandcastle.claudeCode("claude-opus-4-8"),
            promptFile: "./.sandcastle/review-prompt.md",
            promptArgs: {
              BRANCH: issue.branch,
              MERGE_INTO: BASE_BRANCH,
            },
          });

          return {
            ...review,
            commits: [...implement.commits, ...review.commits],
          };
        }

        return implement;
      } finally {
        await sandbox.close();
      }
    }),
  );

  // Separate outcomes into completed (commits produced) and failed.
  const completedIssues: typeof issues = [];

  for (const [i, outcome] of settled.entries()) {
    const issue = issues[i]!;

    if (outcome.status === "rejected") {
      console.error(`  ✗ #${issue.id} failed: ${outcome.reason}`);
      ghLabel(issue.id, "agent:blocked", "agent:in-progress");
      ghComment(
        issue.id,
        `Sandcastle could not complete this issue.\n\nError: ${outcome.reason}\n\n[View workflow run](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`,
      );
    } else if (outcome.value.commits.length === 0) {
      console.log(`  ~ #${issue.id}: no commits produced`);
      ghLabel(issue.id, "agent:blocked", "agent:in-progress");
      ghComment(
        issue.id,
        `Sandcastle ran but produced no commits. The issue may need more detail or clarification.`,
      );
    } else {
      completedIssues.push(issue);
    }
  }

  const completedBranches = completedIssues.map((i) => i.branch);

  console.log(
    `\nExecution complete. ${completedBranches.length} branch(es) with commits:`,
  );
  for (const branch of completedBranches) {
    console.log(`  ${branch}`);
  }

  if (completedBranches.length === 0) {
    console.log("No commits produced. Nothing to merge.");
    continue;
  }

  // -------------------------------------------------------------------------
  // Phase 3: Merge
  //
  // One agent merges all completed branches into BASE_BRANCH, resolves
  // conflicts, and runs tests to confirm everything works.
  // -------------------------------------------------------------------------
  await sandcastle.run({
    hooks,
    sandbox: makeSandbox(),
    name: "merger",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-opus-4-8"),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BRANCHES: completedBranches.map((b) => `- ${b}`).join("\n"),
      ISSUES: completedIssues.map((i) => `- #${i.id}: ${i.title}`).join("\n"),
    },
  });

  // Phase 4: Mark completed issues done (merge-prompt already closed them)
  for (const issue of completedIssues) {
    ghLabel(issue.id, "agent:done", "agent:in-progress");
    console.log(`  ✓ #${issue.id} done`);
  }

  console.log("\nBranches merged.");
}

console.log("\nAll done.");
