/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

async function seedBusiness(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const industryId = await ctx.db.insert("industries", {
      name: "Retail",
      category: "Shopping",
      slug: `retail-pin-${Math.random()}`,
    });
    return ctx.db.insert("businesses", {
      userId: "owner-1",
      name: "Pin Test Shop",
      slug: `pin-shop-${Math.random()}`,
      description: "A test shop for PIN",
      websiteUrl: "https://example.com",
      industryId,
      address: "1 High St",
      latitude: 50.82,
      longitude: -0.14,
    });
  });
}

// ── getRedemptionPinStatus ───────────────────────────────────────────────────

describe("getRedemptionPinStatus", () => {
  test("returns isSet:false when no PIN has been set", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    const status = await ownerT.query(
      api.functions.redemptionAuth.getRedemptionPinStatus,
      { businessId },
    );

    expect(status.isSet).toBe(false);
  });

  test("returns isSet:true with setAt after PIN is stored", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("redemptionAuth", {
        businessId,
        redemptionPinHash: "$argon2id$v=19$m=1024,t=1,p=1$fakesalt$fakehash",
        redemptionPinSetAt: 1_700_000_000_000,
      });
    });

    const status = await ownerT.query(
      api.functions.redemptionAuth.getRedemptionPinStatus,
      { businessId },
    );

    expect(status.isSet).toBe(true);
    expect(status.setAt).toBe(1_700_000_000_000);
  });

  test("never returns the hash", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("redemptionAuth", {
        businessId,
        redemptionPinHash: "$argon2id$secret",
        redemptionPinSetAt: 1_700_000_000_000,
      });
    });

    const status = await ownerT.query(
      api.functions.redemptionAuth.getRedemptionPinStatus,
      { businessId },
    );

    expect(status).not.toHaveProperty("redemptionPinHash");
  });

  test("rejects a non-owner", async () => {
    const t = convexTest(schema, modules);
    const intruderT = t.withIdentity({ subject: "intruder-1" });
    const businessId = await seedBusiness(t);

    await expect(
      intruderT.query(api.functions.redemptionAuth.getRedemptionPinStatus, {
        businessId,
      }),
    ).rejects.toThrow();
  });
});

// ── setRedemptionPin ─────────────────────────────────────────────────────────

describe("setRedemptionPin", () => {
  test("throws for unauthenticated requests", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    await expect(
      t.action(api.functions.redemptionAuth.setRedemptionPin, {
        businessId,
        pin: "1234",
      }),
    ).rejects.toThrow();
  });

  test("rejects a non-owner", async () => {
    const t = convexTest(schema, modules);
    const intruderT = t.withIdentity({ subject: "intruder-1" });
    const businessId = await seedBusiness(t);

    await expect(
      intruderT.action(api.functions.redemptionAuth.setRedemptionPin, {
        businessId,
        pin: "1234",
      }),
    ).rejects.toThrow();

    const record = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionAuth")
        .withIndex("by_business", (q) => q.eq("businessId", businessId))
        .first(),
    );
    expect(record).toBeNull();
  });

  test("stores a hash (not the plaintext PIN)", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await ownerT.action(api.functions.redemptionAuth.setRedemptionPin, {
      businessId,
      pin: "5678",
    });

    const record = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionAuth")
        .withIndex("by_business", (q) => q.eq("businessId", businessId))
        .first(),
    );

    expect(record).not.toBeNull();
    expect(record!.redemptionPinHash).not.toBe("5678");
    expect(record!.redemptionPinHash).toContain("argon2id");
  });

  test("sets redemptionPinSetAt timestamp", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    const before = Date.now();
    await ownerT.action(api.functions.redemptionAuth.setRedemptionPin, {
      businessId,
      pin: "1234",
    });
    const after = Date.now();

    const record = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionAuth")
        .withIndex("by_business", (q) => q.eq("businessId", businessId))
        .first(),
    );

    expect(record!.redemptionPinSetAt).toBeGreaterThanOrEqual(before);
    expect(record!.redemptionPinSetAt).toBeLessThanOrEqual(after);
  });

  test("rotation bumps redemptionPinSetAt", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await ownerT.action(api.functions.redemptionAuth.setRedemptionPin, {
      businessId,
      pin: "1111",
    });

    const first = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionAuth")
        .withIndex("by_business", (q) => q.eq("businessId", businessId))
        .first(),
    );
    const firstSetAt = first!.redemptionPinSetAt;

    // Wait a tick to ensure timestamp advances
    await new Promise((r) => setTimeout(r, 5));

    await ownerT.action(api.functions.redemptionAuth.setRedemptionPin, {
      businessId,
      pin: "2222",
    });

    const second = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionAuth")
        .withIndex("by_business", (q) => q.eq("businessId", businessId))
        .first(),
    );

    expect(second!.redemptionPinSetAt).toBeGreaterThan(firstSetAt);
  });

  test("only one redemptionAuth record per business after multiple sets", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await ownerT.action(api.functions.redemptionAuth.setRedemptionPin, {
      businessId,
      pin: "aaaa",
    });
    await ownerT.action(api.functions.redemptionAuth.setRedemptionPin, {
      businessId,
      pin: "bbbb",
    });

    const records = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionAuth")
        .withIndex("by_business", (q) => q.eq("businessId", businessId))
        .collect(),
    );

    expect(records).toHaveLength(1);
  });
});

// ── verifyRedemptionPin ──────────────────────────────────────────────────────

describe("verifyRedemptionPin", () => {
  test("returns true for correct PIN", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await ownerT.action(api.functions.redemptionAuth.setRedemptionPin, {
      businessId,
      pin: "correct-pin",
    });

    const result = await t.action(
      api.functions.redemptionAuth.verifyRedemptionPin,
      { businessId, pin: "correct-pin" },
    );

    expect(result).toBe(true);
  });

  test("returns false for incorrect PIN", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await ownerT.action(api.functions.redemptionAuth.setRedemptionPin, {
      businessId,
      pin: "correct-pin",
    });

    const result = await t.action(
      api.functions.redemptionAuth.verifyRedemptionPin,
      { businessId, pin: "wrong-pin" },
    );

    expect(result).toBe(false);
  });

  test("returns false when no PIN has been set", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    const result = await t.action(
      api.functions.redemptionAuth.verifyRedemptionPin,
      { businessId, pin: "any-pin" },
    );

    expect(result).toBe(false);
  });

  test("verify rejects old PIN after rotation", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await ownerT.action(api.functions.redemptionAuth.setRedemptionPin, {
      businessId,
      pin: "old-pin",
    });
    await ownerT.action(api.functions.redemptionAuth.setRedemptionPin, {
      businessId,
      pin: "new-pin",
    });

    const oldValid = await t.action(
      api.functions.redemptionAuth.verifyRedemptionPin,
      { businessId, pin: "old-pin" },
    );
    const newValid = await t.action(
      api.functions.redemptionAuth.verifyRedemptionPin,
      { businessId, pin: "new-pin" },
    );

    expect(oldValid).toBe(false);
    expect(newValid).toBe(true);
  });
});
