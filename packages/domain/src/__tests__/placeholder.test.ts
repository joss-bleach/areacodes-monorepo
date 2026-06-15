import { Effect } from "effect";
import { describe, expect, test } from "vitest";

describe("domain toolchain", () => {
  test("Effect.runPromise resolves a successful effect", async () => {
    const result = await Effect.runPromise(Effect.succeed("ok"));
    expect(result).toBe("ok");
  });
});
