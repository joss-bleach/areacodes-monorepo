/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

describe("getAllBusinesses", () => {
  test("throws for unauthenticated requests", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.functions.admin.getAllBusinesses, {}),
    ).rejects.toThrow();
  });

  test("throws for non-admin users", async () => {
    const t = convexTest(schema, modules);
    const userT = t.withIdentity({ subject: "user_1", role: "customer" });
    await expect(
      userT.query(api.functions.admin.getAllBusinesses, {}),
    ).rejects.toThrow("Forbidden: Admin only");
  });

  test("returns businesses with hasLoggedIn field for admin", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    const industryId = await t.run(async (ctx) => {
      return ctx.db.insert("industries", {
        name: "Food & Drink",
        category: "Food & Drink",
        slug: "food-drink",
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("businesses", {
        userId: "user_biz_1",
        name: "Test Cafe",
        slug: "test-cafe",
        description: "A test cafe",
        websiteUrl: "https://testcafe.com",
        industryId,
        address: "1 Test St",
        latitude: 50.82,
        longitude: -0.14,
      });
    });

    const businesses = await adminT.query(api.functions.admin.getAllBusinesses, {});
    expect(businesses).toHaveLength(1);
    expect(businesses[0]).toMatchObject({
      name: "Test Cafe",
      slug: "test-cafe",
    });
    // hasLoggedIn is derived from Better Auth user data — defaults to false when user not in auth tables
    expect(typeof businesses[0]?.hasLoggedIn).toBe("boolean");
  });
});

describe("flagBusiness / reinstateBusiness", () => {
  test("non-admin cannot flag a business", async () => {
    const t = convexTest(schema, modules);
    const userT = t.withIdentity({ subject: "user_1", role: "customer" });

    const industryId = await t.run(async (ctx) =>
      ctx.db.insert("industries", { name: "F&D", category: "F&D", slug: "fd" }),
    );
    const businessId = await t.run(async (ctx) =>
      ctx.db.insert("businesses", {
        userId: "owner_1",
        name: "Biz",
        slug: "biz",
        description: "d",
        websiteUrl: "https://biz.com",
        industryId,
        address: "1 St",
        latitude: 50.0,
        longitude: 0.0,
      }),
    );

    await expect(
      userT.mutation(api.functions.admin.flagBusiness, { businessId }),
    ).rejects.toThrow();
  });

  test("admin can flag and reinstate a business", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    const industryId = await t.run(async (ctx) =>
      ctx.db.insert("industries", { name: "F&D", category: "F&D", slug: "fd2" }),
    );
    const businessId = await t.run(async (ctx) =>
      ctx.db.insert("businesses", {
        userId: "owner_2",
        name: "Biz2",
        slug: "biz2",
        description: "d2",
        websiteUrl: "https://biz2.com",
        industryId,
        address: "2 St",
        latitude: 50.0,
        longitude: 0.0,
      }),
    );

    await adminT.mutation(api.functions.admin.flagBusiness, { businessId });
    const flagged = await t.run(async (ctx) => ctx.db.get(businessId));
    expect(flagged?.flaggedAt).toBeTypeOf("number");

    await adminT.mutation(api.functions.admin.reinstateBusiness, { businessId });
    const reinstated = await t.run(async (ctx) => ctx.db.get(businessId));
    expect(reinstated?.flaggedAt).toBeUndefined();
  });
});

describe("addBusinessByAdmin", () => {
  test("throws for non-admin users", async () => {
    const t = convexTest(schema, modules);
    const userT = t.withIdentity({ subject: "user_1", role: "customer" });

    const industryId = await t.run(async (ctx) =>
      ctx.db.insert("industries", { name: "F&D", category: "F&D", slug: "fd3" }),
    );

    await expect(
      userT.mutation(api.functions.admin.addBusinessByAdmin, {
        name: "Test Business",
        ownerEmail: "owner@test.com",
        description: "A test business",
        websiteUrl: "https://test.com",
        industryId,
        address: "1 Test St",
        latitude: 50.82,
        longitude: -0.14,
      }),
    ).rejects.toThrow("Forbidden: Admin only");
  });
});
