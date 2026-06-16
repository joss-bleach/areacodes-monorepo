/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

async function seedBusiness(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const industryId = await ctx.db.insert("industries", {
      name: "Retail",
      category: "Shopping",
      slug: `retail-sub-${Math.random()}`,
    });
    const businessId = await ctx.db.insert("businesses", {
      userId: "owner-1",
      name: "Test Shop",
      slug: `test-shop-${Date.now()}`,
      description: "A test shop",
      websiteUrl: "https://example.com",
      industryId,
      address: "1 High St",
      latitude: 50.82,
      longitude: -0.14,
    });
    return businessId;
  });
}

describe("startPilot", () => {
  test("creates subscription with trialing status", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    const subId = await ownerT.mutation(api.functions.subscriptions.startPilot, {
      businessId,
      stripeCustomerId: "cus_test_123",
    });

    const sub = await t.run(async (ctx) => ctx.db.get(subId!));
    expect(sub?.businessId).toBe(businessId);
    expect(sub?.stripeCustomerId).toBe("cus_test_123");
    expect(sub?.status).toBe("trialing");
    expect(sub?.stripeSubscriptionId).toBeUndefined();
  });
});

describe("handleWebhookEvent", () => {
  test("checkout.session.completed updates subscription with stripeSubscriptionId", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    const subId = await t.run(async (ctx) =>
      ctx.db.insert("subscriptions", {
        businessId,
        stripeCustomerId: "cus_abc",
        status: "trialing",
      }),
    );

    await t.mutation(internal.functions.subscriptions.handleWebhookEvent, {
      event: {
        id: "evt_001",
        type: "checkout.session.completed",
        data: { object: { customer: "cus_abc", subscription: "sub_xyz" } },
      },
    });

    const sub = await t.run(async (ctx) => ctx.db.get(subId));
    expect(sub?.stripeSubscriptionId).toBe("sub_xyz");
    expect(sub?.lastStripeEventId).toBe("evt_001");
  });

  test("customer.subscription.updated updates status and priceId", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    const subId = await t.run(async (ctx) =>
      ctx.db.insert("subscriptions", {
        businessId,
        stripeCustomerId: "cus_abc",
        stripeSubscriptionId: "sub_xyz",
        status: "trialing",
      }),
    );

    await t.mutation(internal.functions.subscriptions.handleWebhookEvent, {
      event: {
        id: "evt_002",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_xyz",
            customer: "cus_abc",
            status: "active",
            current_period_end: 1_750_000_000,
            trial_end: null,
            items: { data: [{ price: { id: "price_monthly" } }] },
          },
        },
      },
    });

    const sub = await t.run(async (ctx) => ctx.db.get(subId));
    expect(sub?.status).toBe("active");
    expect(sub?.priceId).toBe("price_monthly");
    expect(sub?.currentPeriodEnd).toBe(1_750_000_000 * 1000);
  });

  test("same event ID processed twice produces identical state (idempotency)", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    const subId = await t.run(async (ctx) =>
      ctx.db.insert("subscriptions", {
        businessId,
        stripeCustomerId: "cus_abc",
        stripeSubscriptionId: "sub_xyz",
        status: "trialing",
      }),
    );

    const event = {
      id: "evt_dup",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_xyz",
          customer: "cus_abc",
          status: "active",
          current_period_end: 1_750_000_000,
          trial_end: null,
          items: { data: [{ price: { id: "price_monthly" } }] },
        },
      },
    };

    await t.mutation(internal.functions.subscriptions.handleWebhookEvent, { event });
    const afterFirst = await t.run(async (ctx) => ctx.db.get(subId));

    await t.mutation(internal.functions.subscriptions.handleWebhookEvent, { event });
    const afterSecond = await t.run(async (ctx) => ctx.db.get(subId));

    expect(afterFirst?.status).toBe(afterSecond?.status);
    expect(afterFirst?.priceId).toBe(afterSecond?.priceId);
    expect(afterFirst?.lastStripeEventId).toBe(afterSecond?.lastStripeEventId);
  });

  test("invoice.payment_failed sets status to past_due", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    const subId = await t.run(async (ctx) =>
      ctx.db.insert("subscriptions", {
        businessId,
        stripeCustomerId: "cus_abc",
        stripeSubscriptionId: "sub_xyz",
        status: "active",
        currentPeriodEnd: 9_999_999_999_000,
      }),
    );

    await t.mutation(internal.functions.subscriptions.handleWebhookEvent, {
      event: {
        id: "evt_003",
        type: "invoice.payment_failed",
        data: { object: { subscription: "sub_xyz", customer: "cus_abc" } },
      },
    });

    const sub = await t.run(async (ctx) => ctx.db.get(subId));
    expect(sub?.status).toBe("past_due");
  });
});

describe("getSubscription", () => {
  test("returns subscription for business", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) =>
      ctx.db.insert("subscriptions", {
        businessId,
        stripeCustomerId: "cus_abc",
        status: "trialing",
      }),
    );

    const sub = await t.query(api.functions.subscriptions.getSubscription, {
      businessId,
    });

    expect(sub?.businessId).toBe(businessId);
    expect(sub?.status).toBe("trialing");
  });
});

describe("Admin cascade flaggedAt", () => {
  test("flagBusiness cascades flaggedAt to its vouchers", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });
    const businessId = await seedBusiness(t);

    const voucherId = await t.run(async (ctx) =>
      ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "10% off",
        description: "Desc",
        voucherFormat: "generated_text",
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      }),
    );

    await adminT.mutation(api.functions.admin.flagBusiness, { businessId });

    const voucher = await t.run(async (ctx) => ctx.db.get(voucherId));
    expect(voucher?.flaggedAt).toBeDefined();
    expect(voucher?.deletedAt).toBeUndefined();
  });

  test("reinstateBusiness clears flaggedAt from business and vouchers", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });
    const businessId = await seedBusiness(t);

    const voucherId = await t.run(async (ctx) =>
      ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "20% off",
        description: "Desc",
        voucherFormat: "generated_text",
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
        flaggedAt: Date.now(),
      }),
    );

    await adminT.mutation(api.functions.admin.flagBusiness, { businessId });
    await adminT.mutation(api.functions.admin.reinstateBusiness, { businessId });

    const business = await t.run(async (ctx) => ctx.db.get(businessId));
    const voucher = await t.run(async (ctx) => ctx.db.get(voucherId));

    expect(business?.flaggedAt).toBeUndefined();
    expect(voucher?.flaggedAt).toBeUndefined();
  });
});
