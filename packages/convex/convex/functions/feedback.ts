import { action } from "../_generated/server";
import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import { Effect, Layer } from "effect";
import {
  FeedbackService,
  LLMPort,
  GitHubPort,
  LLMError,
  GitHubError,
  type ILLMPort,
  type IGitHubPort,
} from "@areacodes/domain";

async function requireAuth(ctx: ActionCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

function makeLLMImpl(): ILLMPort {
  return {
    formatFeedback: (feedbackText, routePath) =>
      Effect.tryPromise({
        try: async () => {
          const apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

          const systemPrompt = `You are a product feedback formatter. Convert raw user feedback into a well-structured GitHub issue. Return valid JSON with exactly two fields: "title" (a concise issue title, max 80 characters) and "body" (a markdown-formatted issue body). The body should include the original feedback, the page where it was submitted, and any relevant context. Do not include code fences around the JSON.`;

          const userPrompt = `Feedback submitted from route: ${routePath}\n\nFeedback text:\n${feedbackText}`;

          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://business.acbrighton.com",
              "X-Title": "AreaCodes Business Portal",
            },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              response_format: { type: "json_object" },
            }),
          });

          if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
          }

          const data = (await response.json()) as {
            choices: Array<{ message: { content: string } }>;
          };
          const content = data.choices[0]?.message?.content;
          if (!content) throw new Error("Empty response from LLM");

          const parsed = JSON.parse(content) as { title?: string; body?: string };
          if (!parsed.title || !parsed.body) {
            throw new Error("LLM response missing title or body");
          }

          return { title: parsed.title, body: parsed.body };
        },
        catch: (e) => new LLMError({ message: String(e) }),
      }),
  };
}

function makeGitHubImpl(): IGitHubPort {
  return {
    createIssue: (title, body, labels) =>
      Effect.tryPromise({
        try: async () => {
          const token = process.env.GITHUB_TOKEN;
          if (!token) throw new Error("GITHUB_TOKEN not set");

          const response = await fetch(
            "https://api.github.com/repos/joss-bleach/areacodes-monorepo/issues",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
              },
              body: JSON.stringify({ title, body, labels }),
            },
          );

          if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
          }

          const data = (await response.json()) as { html_url: string };
          return { url: data.html_url };
        },
        catch: (e) => new GitHubError({ message: String(e) }),
      }),
  };
}

export const submitFeedback = action({
  args: {
    feedbackText: v.string(),
    routePath: v.string(),
  },
  handler: async (ctx, { feedbackText, routePath }) => {
    await requireAuth(ctx);

    const layer = Layer.mergeAll(
      Layer.succeed(LLMPort, makeLLMImpl()),
      Layer.succeed(GitHubPort, makeGitHubImpl()),
    );

    return await Effect.runPromise(
      Effect.provide(
        FeedbackService.submitFeedback(feedbackText, routePath),
        layer,
      ),
    );
  },
});
