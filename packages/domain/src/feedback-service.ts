import { Context, Data, Effect } from "effect";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeedbackIssue {
  title: string;
  body: string;
}

// ── Typed errors ──────────────────────────────────────────────────────────────

export class LLMError extends Data.TaggedError("LLMError")<{
  message: string;
}> {}

export class GitHubError extends Data.TaggedError("GitHubError")<{
  message: string;
}> {}

// ── Port interfaces ───────────────────────────────────────────────────────────

export interface ILLMPort {
  readonly formatFeedback: (
    feedbackText: string,
    routePath: string,
  ) => Effect.Effect<FeedbackIssue, LLMError>;
}

export class LLMPort extends Context.Tag("@areacodes/domain/LLMPort")<
  LLMPort,
  ILLMPort
>() {}

export interface IGitHubPort {
  readonly createIssue: (
    title: string,
    body: string,
    labels: string[],
  ) => Effect.Effect<{ url: string }, GitHubError>;
}

export class GitHubPort extends Context.Tag("@areacodes/domain/GitHubPort")<
  GitHubPort,
  IGitHubPort
>() {}

// ── Service functions ─────────────────────────────────────────────────────────

export const submitFeedback = (
  feedbackText: string,
  routePath: string,
): Effect.Effect<{ issueUrl: string }, LLMError | GitHubError, LLMPort | GitHubPort> =>
  Effect.gen(function* () {
    const llm = yield* LLMPort;
    const issue = yield* llm.formatFeedback(feedbackText, routePath);

    const github = yield* GitHubPort;
    const { url } = yield* github.createIssue(issue.title, issue.body, [
      "feedback",
      "business",
    ]);

    return { issueUrl: url };
  });
