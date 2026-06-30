/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

describe("submitFeedback", () => {
  test("throws for unauthenticated requests", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.functions.feedback.submitFeedback, {
        feedbackText: "This is feedback",
        routePath: "/b/test-cafe",
      }),
    ).rejects.toThrow("Unauthenticated");
  });

  test("authenticated business user call is accepted (env vars absent so LLM errors)", async () => {
    const t = convexTest(schema, modules);
    const businessT = t.withIdentity({ subject: "biz_user_1", role: "business" });

    // Without OPENROUTER_API_KEY the LLM impl throws, which surfaces as an Effect error.
    // The important thing is that the auth guard is passed (no "Unauthenticated" error).
    await expect(
      businessT.action(api.functions.feedback.submitFeedback, {
        feedbackText: "Some feedback",
        routePath: "/b/test-cafe",
      }),
    ).rejects.not.toThrow("Unauthenticated");
  });
});
