/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

async function seedBusiness(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const industryId = await ctx.db.insert("industries", {
      name: "Food",
      category: "Food & Drink",
      slug: `food-follow-${Math.random()}`,
    });
    const businessId = await ctx.db.insert("businesses", {
      userId: "owner-1",
      name: "Test Cafe",
      slug: `test-cafe-follow-${Math.random()}`,
      description: "A test cafe",
      websiteUrl: "https://example.com",
      industryId,
      address: "1 High St",
      latitude: 50.82,
      longitude: -0.14,
    });
    return businessId;
  });
}

describe("followBusiness", () => {
  test("authenticated customer can follow a business", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-follow-1" });
    const businessId = await seedBusiness(t);

    await customerT.mutation(api.functions.follows.followBusiness, { businessId });

    const follow = await t.run(async (ctx) =>
      ctx.db
        .query("follows")
        .withIndex("by_customer_business", (q) =>
          q.eq("customerId", "customer-follow-1").eq("businessId", businessId),
        )
        .first(),
    );
    expect(follow?.customerId).toBe("customer-follow-1");
    expect(follow?.businessId).toBe(businessId);
  });

  test("followBusiness is idempotent — no duplicate rows on repeat call", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-follow-2" });
    const businessId = await seedBusiness(t);

    await customerT.mutation(api.functions.follows.followBusiness, { businessId });
    await customerT.mutation(api.functions.follows.followBusiness, { businessId });

    const follows = await t.run(async (ctx) =>
      ctx.db
        .query("follows")
        .filter((q) =>
          q.and(
            q.eq(q.field("customerId"), "customer-follow-2"),
            q.eq(q.field("businessId"), businessId),
          ),
        )
        .collect(),
    );
    expect(follows).toHaveLength(1);
  });

  test("unauthenticated request throws", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    await expect(
      t.mutation(api.functions.follows.followBusiness, { businessId }),
    ).rejects.toThrow();
  });
});

describe("unfollowBusiness", () => {
  test("customer can unfollow a business", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-unfollow-1" });
    const businessId = await seedBusiness(t);

    await customerT.mutation(api.functions.follows.followBusiness, { businessId });
    await customerT.mutation(api.functions.follows.unfollowBusiness, { businessId });

    const follow = await t.run(async (ctx) =>
      ctx.db
        .query("follows")
        .filter((q) =>
          q.and(
            q.eq(q.field("customerId"), "customer-unfollow-1"),
            q.eq(q.field("businessId"), businessId),
          ),
        )
        .first(),
    );
    expect(follow).toBeNull();
  });

  test("unfollowBusiness on a non-existent follow is a no-op", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-unfollow-2" });
    const businessId = await seedBusiness(t);

    await expect(
      customerT.mutation(api.functions.follows.unfollowBusiness, { businessId }),
    ).resolves.not.toThrow();
  });
});

describe("getFollowForBusiness", () => {
  test("returns null when not following", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-getfollow-1" });
    const businessId = await seedBusiness(t);

    const follow = await customerT.query(
      api.functions.follows.getFollowForBusiness,
      { businessId },
    );
    expect(follow).toBeNull();
  });

  test("returns null for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    const follow = await t.query(api.functions.follows.getFollowForBusiness, {
      businessId,
    });
    expect(follow).toBeNull();
  });

  test("returns follow record when following", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-getfollow-2" });
    const businessId = await seedBusiness(t);

    await customerT.mutation(api.functions.follows.followBusiness, { businessId });

    const follow = await customerT.query(
      api.functions.follows.getFollowForBusiness,
      { businessId },
    );
    expect(follow).not.toBeNull();
    expect(follow?.customerId).toBe("customer-getfollow-2");
  });
});

describe("registerPushToken", () => {
  test("stores a push token for authenticated customer", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-token-1" });

    await customerT.mutation(api.functions.pushTokens.registerPushToken, {
      token: "ExponentPushToken[test-token-abc]",
    });

    const tokens = await t.run(async (ctx) =>
      ctx.db
        .query("pushTokens")
        .withIndex("by_customer", (q) => q.eq("customerId", "customer-token-1"))
        .collect(),
    );
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.token).toBe("ExponentPushToken[test-token-abc]");
  });

  test("registerPushToken upserts — updates token if one already exists", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-token-2" });

    await customerT.mutation(api.functions.pushTokens.registerPushToken, {
      token: "ExponentPushToken[old-token]",
    });
    await customerT.mutation(api.functions.pushTokens.registerPushToken, {
      token: "ExponentPushToken[new-token]",
    });

    const tokens = await t.run(async (ctx) =>
      ctx.db
        .query("pushTokens")
        .withIndex("by_customer", (q) => q.eq("customerId", "customer-token-2"))
        .collect(),
    );
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.token).toBe("ExponentPushToken[new-token]");
  });

  test("unauthenticated request throws", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.functions.pushTokens.registerPushToken, {
        token: "ExponentPushToken[test]",
      }),
    ).rejects.toThrow();
  });
});

describe("sendVoucherPushNotifications", () => {
  test("sends push notifications to all followers with tokens", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    // Two customers follow the business and have tokens
    const customer1T = t.withIdentity({ subject: "customer-notif-1" });
    const customer2T = t.withIdentity({ subject: "customer-notif-2" });

    await customer1T.mutation(api.functions.follows.followBusiness, { businessId });
    await customer1T.mutation(api.functions.pushTokens.registerPushToken, {
      token: "ExponentPushToken[cust-1]",
    });
    await customer2T.mutation(api.functions.follows.followBusiness, { businessId });
    await customer2T.mutation(api.functions.pushTokens.registerPushToken, {
      token: "ExponentPushToken[cust-2]",
    });

    // Seed a voucher
    const voucherId = await t.run(async (ctx) =>
      ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "20% Off",
        description: "Save 20%",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      }),
    );

    await t.action(
      internal.functions.pushTokens.sendVoucherPushNotifications,
      {
        businessId,
        voucherId,
        businessName: "Test Cafe",
        voucherTitle: "20% Off",
      },
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body) as unknown[];
    expect(body).toHaveLength(2);

    vi.unstubAllGlobals();
  });

  test("does nothing when business has no followers", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    const voucherId = await t.run(async (ctx) =>
      ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "10% Off",
        description: "Save 10%",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      }),
    );

    await t.action(
      internal.functions.pushTokens.sendVoucherPushNotifications,
      {
        businessId,
        voucherId,
        businessName: "Test Cafe",
        voucherTitle: "10% Off",
      },
    );

    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  test("does nothing when followers have no tokens", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    const customerT = t.withIdentity({ subject: "customer-notokens" });
    await customerT.mutation(api.functions.follows.followBusiness, { businessId });

    const voucherId = await t.run(async (ctx) =>
      ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "5% Off",
        description: "Save 5%",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      }),
    );

    await t.action(
      internal.functions.pushTokens.sendVoucherPushNotifications,
      {
        businessId,
        voucherId,
        businessName: "Test Cafe",
        voucherTitle: "5% Off",
      },
    );

    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
