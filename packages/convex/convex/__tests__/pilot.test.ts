/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

describe("getActivePilotFeatures", () => {
  test("returns empty array when no config document exists", async () => {
    const t = convexTest(schema, modules);

    const features = await t.query(api.functions.pilot.getActivePilotFeatures, {});
    expect(features).toEqual([]);
  });

  test("returns the current active features when config exists", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("config", {
        activePilotFeatures: ["feedback_widget", "onboarding_walkthrough"],
      });
    });

    const features = await t.query(api.functions.pilot.getActivePilotFeatures, {});
    expect(features).toEqual(["feedback_widget", "onboarding_walkthrough"]);
  });
});

describe("addPilotFeature", () => {
  test("admin can add a pilot feature key", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    await adminT.mutation(api.functions.pilot.addPilotFeature, {
      key: "feedback_widget",
    });

    const features = await t.query(api.functions.pilot.getActivePilotFeatures, {});
    expect(features).toContain("feedback_widget");
  });

  test("adding same key twice does not duplicate it", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    await adminT.mutation(api.functions.pilot.addPilotFeature, { key: "feedback_widget" });
    await adminT.mutation(api.functions.pilot.addPilotFeature, { key: "feedback_widget" });

    const features = await t.query(api.functions.pilot.getActivePilotFeatures, {});
    expect(features.filter((k: string) => k === "feedback_widget")).toHaveLength(1);
  });

  test("non-admin cannot add a pilot feature key", async () => {
    const t = convexTest(schema, modules);
    const userT = t.withIdentity({ subject: "user_1" });

    await expect(
      userT.mutation(api.functions.pilot.addPilotFeature, { key: "feedback_widget" }),
    ).rejects.toThrow();
  });
});

describe("removePilotFeature", () => {
  test("admin can remove a pilot feature key", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    await t.run(async (ctx) => {
      await ctx.db.insert("config", {
        activePilotFeatures: ["feedback_widget", "onboarding_walkthrough"],
      });
    });

    await adminT.mutation(api.functions.pilot.removePilotFeature, {
      key: "feedback_widget",
    });

    const features = await t.query(api.functions.pilot.getActivePilotFeatures, {});
    expect(features).not.toContain("feedback_widget");
    expect(features).toContain("onboarding_walkthrough");
  });

  test("removing a key that does not exist is a no-op", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    await t.run(async (ctx) => {
      await ctx.db.insert("config", {
        activePilotFeatures: ["onboarding_walkthrough"],
      });
    });

    await adminT.mutation(api.functions.pilot.removePilotFeature, {
      key: "feedback_widget",
    });

    const features = await t.query(api.functions.pilot.getActivePilotFeatures, {});
    expect(features).toEqual(["onboarding_walkthrough"]);
  });

  test("non-admin cannot remove a pilot feature key", async () => {
    const t = convexTest(schema, modules);
    const userT = t.withIdentity({ subject: "user_1" });

    await expect(
      userT.mutation(api.functions.pilot.removePilotFeature, { key: "feedback_widget" }),
    ).rejects.toThrow();
  });
});
