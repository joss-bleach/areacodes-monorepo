import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

// Glob must be relative to this file's location (convex/__tests__/)
// so that paths like ../_generated/api.js give convex-test the correct prefix.
const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

describe("industries", () => {
  test("getAllIndustries returns empty array initially", async () => {
    const t = convexTest(schema, modules);
    const industries = await t.query(
      api.functions.industries.getAllIndustries,
      {}
    );
    expect(industries).toHaveLength(0);
  });

  test("seedIndustries inserts all industries", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(
      api.functions.industries.seedIndustries,
      {}
    );
    expect(result.seeded).toBeGreaterThan(0);
    expect(result.existing).toBe(0);
  });

  test("seedIndustries is idempotent", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(
      api.functions.industries.seedIndustries,
      {}
    );
    const second = await t.mutation(
      api.functions.industries.seedIndustries,
      {}
    );
    expect(second.seeded).toBe(0);
    expect(second.existing).toBe(first.seeded);
  });

  test("getAllIndustries returns seeded industries with correct shape", async () => {
    const t = convexTest(schema, modules);
    const { seeded } = await t.mutation(
      api.functions.industries.seedIndustries,
      {}
    );
    const industries = await t.query(
      api.functions.industries.getAllIndustries,
      {}
    );
    expect(industries).toHaveLength(seeded);
    const first = industries[0];
    expect(first).toBeDefined();
    expect(typeof first!.name).toBe("string");
    expect(typeof first!.slug).toBe("string");
    expect(typeof first!.category).toBe("string");
    expect(first!.slug).toMatch(/^[a-z0-9-]+$/);
  });

  test("industries include Food & Drink category", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.functions.industries.seedIndustries, {});
    const industries = await t.query(
      api.functions.industries.getAllIndustries,
      {}
    );
    const foodDrink = industries.filter((i) => i.category === "Food & Drink");
    expect(foodDrink.length).toBeGreaterThan(0);
  });
});
