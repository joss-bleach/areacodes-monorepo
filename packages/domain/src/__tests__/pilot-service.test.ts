import { Effect, Either, Layer } from "effect";
import { describe, expect, test } from "vitest";
import {
  PilotConfigRepo,
  type IPilotConfigRepo,
} from "../pilot-service.js";
import * as PilotService from "../pilot-service.js";

function makeTestRepo(initialFeatures: string[] = []) {
  let features = [...initialFeatures];

  const repo: IPilotConfigRepo = {
    getActiveFeatures: () => Effect.succeed([...features]),
    setActiveFeatures: (next) => {
      features = [...next];
      return Effect.void;
    },
  };

  const layer = Layer.succeed(PilotConfigRepo, repo);
  return { layer, getFeatures: () => [...features] };
}

describe("PilotService.getActiveFeatures", () => {
  test("returns empty array when no features are active", async () => {
    const { layer } = makeTestRepo([]);

    const result = await Effect.runPromise(
      Effect.provide(PilotService.getActiveFeatures(), layer),
    );

    expect(result).toEqual([]);
  });

  test("returns the current active features", async () => {
    const { layer } = makeTestRepo(["feedback_widget", "onboarding_walkthrough"]);

    const result = await Effect.runPromise(
      Effect.provide(PilotService.getActiveFeatures(), layer),
    );

    expect(result).toEqual(["feedback_widget", "onboarding_walkthrough"]);
  });
});

describe("PilotService.addFeature", () => {
  test("adds a new feature key to the active list", async () => {
    const { layer, getFeatures } = makeTestRepo([]);

    await Effect.runPromise(
      Effect.provide(PilotService.addFeature("feedback_widget"), layer),
    );

    expect(getFeatures()).toContain("feedback_widget");
  });

  test("is idempotent — adding an existing key does not duplicate it", async () => {
    const { layer, getFeatures } = makeTestRepo(["feedback_widget"]);

    await Effect.runPromise(
      Effect.provide(PilotService.addFeature("feedback_widget"), layer),
    );

    expect(getFeatures().filter((k) => k === "feedback_widget")).toHaveLength(1);
  });

  test("does not remove other active features when adding a new one", async () => {
    const { layer, getFeatures } = makeTestRepo(["onboarding_walkthrough"]);

    await Effect.runPromise(
      Effect.provide(PilotService.addFeature("feedback_widget"), layer),
    );

    expect(getFeatures()).toContain("onboarding_walkthrough");
    expect(getFeatures()).toContain("feedback_widget");
  });
});

describe("PilotService.removeFeature", () => {
  test("removes a feature key from the active list", async () => {
    const { layer, getFeatures } = makeTestRepo(["feedback_widget", "onboarding_walkthrough"]);

    await Effect.runPromise(
      Effect.provide(PilotService.removeFeature("feedback_widget"), layer),
    );

    expect(getFeatures()).not.toContain("feedback_widget");
    expect(getFeatures()).toContain("onboarding_walkthrough");
  });

  test("is a no-op when the key is not present", async () => {
    const { layer, getFeatures } = makeTestRepo(["onboarding_walkthrough"]);

    await Effect.runPromise(
      Effect.provide(PilotService.removeFeature("feedback_widget"), layer),
    );

    expect(getFeatures()).toEqual(["onboarding_walkthrough"]);
  });

  test("results in empty list when the only feature is removed", async () => {
    const { layer, getFeatures } = makeTestRepo(["feedback_widget"]);

    await Effect.runPromise(
      Effect.provide(PilotService.removeFeature("feedback_widget"), layer),
    );

    expect(getFeatures()).toEqual([]);
  });
});
