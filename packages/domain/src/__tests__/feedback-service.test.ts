import { Effect, Either, Layer } from "effect";
import { describe, expect, test } from "vitest";
import {
  LLMPort,
  GitHubPort,
  LLMError,
  GitHubError,
  type ILLMPort,
  type IGitHubPort,
  type FeedbackIssue,
} from "../feedback-service.js";
import * as FeedbackService from "../feedback-service.js";

function makeTestLLMPort(
  result: { ok: true; issue: FeedbackIssue } | { ok: false; message: string },
): ILLMPort {
  return {
    formatFeedback: (_feedbackText, _routePath) =>
      result.ok
        ? Effect.succeed(result.issue)
        : Effect.fail(new LLMError({ message: result.message })),
  };
}

function makeTestGitHubPort(
  fail = false,
): { port: IGitHubPort; calls: Array<{ title: string; body: string; labels: string[] }> } {
  const calls: Array<{ title: string; body: string; labels: string[] }> = [];
  const port: IGitHubPort = {
    createIssue: (title, body, labels) =>
      fail
        ? Effect.fail(new GitHubError({ message: "GitHub API error" }))
        : Effect.sync(() => {
            calls.push({ title, body, labels });
            return { url: "https://github.com/joss-bleach/areacodes-monorepo/issues/1" };
          }),
  };
  return { port, calls };
}

function makeLayer(llm: ILLMPort, github: IGitHubPort) {
  return Layer.mergeAll(
    Layer.succeed(LLMPort, llm),
    Layer.succeed(GitHubPort, github),
  );
}

const MOCK_ISSUE: FeedbackIssue = {
  title: "Dashboard chart not loading",
  body: "## Feedback\n\nThe analytics chart on the dashboard does not load.\n\n**Route:** /b/test-cafe\n\n**Submitted from:** Business Portal",
};

describe("FeedbackService.submitFeedback", () => {
  test("happy path: formats feedback via LLM and creates GitHub issue", async () => {
    const llm = makeTestLLMPort({ ok: true, issue: MOCK_ISSUE });
    const { port: github, calls: githubCalls } = makeTestGitHubPort();

    const result = await Effect.runPromise(
      Effect.provide(
        FeedbackService.submitFeedback("Chart not loading", "/b/test-cafe"),
        makeLayer(llm, github),
      ),
    );

    expect(result).toEqual({
      issueUrl: "https://github.com/joss-bleach/areacodes-monorepo/issues/1",
    });
    expect(githubCalls).toHaveLength(1);
    expect(githubCalls[0]).toMatchObject({
      title: MOCK_ISSUE.title,
      body: MOCK_ISSUE.body,
      labels: ["feedback", "business"],
    });
  });

  test("short-circuits with LLMError when LLM call fails", async () => {
    const llm = makeTestLLMPort({ ok: false, message: "OpenRouter timeout" });
    const { port: github, calls: githubCalls } = makeTestGitHubPort();

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(FeedbackService.submitFeedback("Some feedback", "/b/test-cafe")),
        makeLayer(llm, github),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("LLMError");
      expect(result.left.message).toBe("OpenRouter timeout");
    }
    expect(githubCalls).toHaveLength(0);
  });

  test("propagates GitHubError when issue creation fails", async () => {
    const llm = makeTestLLMPort({ ok: true, issue: MOCK_ISSUE });
    const { port: github } = makeTestGitHubPort(true);

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(FeedbackService.submitFeedback("Some feedback", "/b/test-cafe")),
        makeLayer(llm, github),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("GitHubError");
    }
  });

  test("passes feedbackText and routePath to the LLM port", async () => {
    const capturedCalls: Array<{ feedbackText: string; routePath: string }> = [];
    const llm: ILLMPort = {
      formatFeedback: (feedbackText, routePath) => {
        capturedCalls.push({ feedbackText, routePath });
        return Effect.succeed(MOCK_ISSUE);
      },
    };
    const { port: github } = makeTestGitHubPort();

    await Effect.runPromise(
      Effect.provide(
        FeedbackService.submitFeedback("Great analytics view!", "/b/test-cafe/analytics"),
        makeLayer(llm, github),
      ),
    );

    expect(capturedCalls).toHaveLength(1);
    expect(capturedCalls[0]).toEqual({
      feedbackText: "Great analytics view!",
      routePath: "/b/test-cafe/analytics",
    });
  });
});
