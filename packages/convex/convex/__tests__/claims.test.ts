/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

async function seedVoucher(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const industryId = await ctx.db.insert("industries", {
      name: "Food",
      category: "Food & Drink",
      slug: `food-${Math.random()}`,
    });
    const businessId = await ctx.db.insert("businesses", {
      userId: "owner-1",
      name: "Test Cafe",
      slug: `test-cafe-${Date.now()}`,
      description: "A test cafe",
      websiteUrl: "https://example.com",
      industryId,
      address: "1 High St",
      latitude: 50.82,
      longitude: -0.14,
    });
    const voucherId = await ctx.db.insert("vouchers", {
      businessId,
      userId: "owner-1",
      title: "10% Off",
      description: "Save 10%",
      voucherFormat: "generated_text",
      voucherValidFrom: 1,
      voucherValidTo: 9_999_999_999_999,
    });
    return voucherId;
  });
}

async function seedVoucherWithBusiness(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const industryId = await ctx.db.insert("industries", {
      name: "Food",
      category: "Food & Drink",
      slug: `food-gate-${Math.random()}`,
    });
    const businessId = await ctx.db.insert("businesses", {
      userId: "owner-2",
      name: "Gate Test Cafe",
      slug: `gate-cafe-${Math.random()}`,
      description: "A gate test cafe",
      websiteUrl: "https://example.com",
      industryId,
      address: "2 High St",
      latitude: 50.82,
      longitude: -0.14,
    });
    const voucherId = await ctx.db.insert("vouchers", {
      businessId,
      userId: "owner-2",
      title: "20% Off",
      description: "Save 20%",
      voucherFormat: "generated_text",
      voucherValidFrom: 1,
      voucherValidTo: 9_999_999_999_999,
    });
    return { voucherId, businessId };
  });
}

describe("claimVoucher", () => {
  test("authenticated customer can claim a voucher", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-abc" });

    const voucherId = await seedVoucher(t);

    const claimId = await customerT.mutation(api.functions.claims.claimVoucher, {
      voucherId,
    });

    expect(claimId).toBeDefined();

    const claim = await t.run(async (ctx) => ctx.db.get(claimId!));
    expect(claim?.customerId).toBe("customer-abc");
    expect(claim?.voucherId).toBe(voucherId);
  });

  test("claimVoucher is idempotent — same claimId returned on repeat call", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-abc" });

    const voucherId = await seedVoucher(t);

    const id1 = await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });
    const id2 = await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });

    expect(id1).toBe(id2);

    const claims = await t.run(async (ctx) =>
      ctx.db
        .query("claims")
        .filter((q) => q.eq(q.field("customerId"), "customer-abc"))
        .collect(),
    );
    expect(claims).toHaveLength(1);
  });

  test("unauthenticated request throws", async () => {
    const t = convexTest(schema, modules);
    const voucherId = await seedVoucher(t);

    await expect(
      t.mutation(api.functions.claims.claimVoucher, { voucherId }),
    ).rejects.toThrow();
  });
});

describe("revealVoucher", () => {
  test("generates a 12-char code with 2h expiry", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-xyz" });

    const voucherId = await seedVoucher(t);
    const claimId = await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });

    const result = await customerT.mutation(api.functions.claims.revealVoucher, { claimId: claimId! });

    expect(result.voucherCode).toMatch(/^[A-Z0-9]{12}$/);
    expect(result.expiresAt).toBeGreaterThan(Date.now());

    const reveal = await t.run(async (ctx) =>
      ctx.db
        .query("reveals")
        .withIndex("by_claim", (q) => q.eq("claimId", claimId!))
        .first(),
    );
    expect(reveal?.voucherCode).toBe(result.voucherCode);
  });

  test("revealVoucher throws AlreadyRevealed when unexpired reveal exists", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-xyz" });

    const voucherId = await seedVoucher(t);
    const claimId = await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });

    await customerT.mutation(api.functions.claims.revealVoucher, { claimId: claimId! });

    await expect(
      customerT.mutation(api.functions.claims.revealVoucher, { claimId: claimId! }),
    ).rejects.toThrow();
  });
});

describe("getWallet", () => {
  test("returns empty wallet for customer with no claims", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-empty" });

    const wallet = await customerT.query(api.functions.claims.getWallet, {});
    expect(wallet).toHaveLength(0);
  });

  test("returns claimed entry for a claimed voucher", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-wallet" });

    const voucherId = await seedVoucher(t);
    await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });

    const wallet = await customerT.query(api.functions.claims.getWallet, {});
    expect(wallet).toHaveLength(1);
    expect(wallet[0]!.state).toBe("claimed");
    expect(wallet[0]!.activeCode).toBeNull();
  });

  test("returns revealed entry after revealVoucher", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-reveal" });

    const voucherId = await seedVoucher(t);
    const claimId = await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });
    const { voucherCode } = await customerT.mutation(api.functions.claims.revealVoucher, {
      claimId: claimId!,
    });

    const wallet = await customerT.query(api.functions.claims.getWallet, {});
    expect(wallet).toHaveLength(1);
    expect(wallet[0]!.state).toBe("revealed");
    expect(wallet[0]!.activeCode).toBe(voucherCode);
  });

  test("getClaimForVoucher returns null when not claimed", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-check" });

    const voucherId = await seedVoucher(t);

    const claim = await customerT.query(api.functions.claims.getClaimForVoucher, { voucherId });
    expect(claim).toBeNull();
  });

  test("getClaimForVoucher returns claim after claiming", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-check2" });

    const voucherId = await seedVoucher(t);
    await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });

    const claim = await customerT.query(api.functions.claims.getClaimForVoucher, { voucherId });
    expect(claim).not.toBeNull();
    expect(claim!.customerId).toBe("customer-check2");
  });
});

// ── Suspension gate ───────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe("revealVoucher — suspension gate", () => {
  test("throws VouchersSuspended for a business past_due beyond 7-day grace", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-suspended" });

    const { voucherId, businessId } = await seedVoucherWithBusiness(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        businessId,
        stripeCustomerId: "cus_suspended",
        stripeSubscriptionId: "sub_suspended",
        status: "past_due",
        currentPeriodEnd: Date.now() - (SEVEN_DAYS_MS + 10_000),
      });
    });

    const claimId = await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });

    await expect(
      customerT.mutation(api.functions.claims.revealVoucher, { claimId: claimId! }),
    ).rejects.toThrow();
  });

  test("succeeds for past_due business within 7-day grace period", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-grace" });

    const { voucherId, businessId } = await seedVoucherWithBusiness(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        businessId,
        stripeCustomerId: "cus_grace",
        stripeSubscriptionId: "sub_grace",
        status: "past_due",
        currentPeriodEnd: Date.now() - (SEVEN_DAYS_MS - 60_000),
      });
    });

    const claimId = await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });
    const result = await customerT.mutation(api.functions.claims.revealVoucher, { claimId: claimId! });

    expect(result.voucherCode).toMatch(/^[A-Z0-9]{12}$/);
  });

  test("getWallet returns suspended state for claimed voucher of suspended business", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-wallet-suspended" });

    const { voucherId, businessId } = await seedVoucherWithBusiness(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        businessId,
        stripeCustomerId: "cus_wallet_suspended",
        stripeSubscriptionId: "sub_wallet_suspended",
        status: "past_due",
        currentPeriodEnd: Date.now() - (SEVEN_DAYS_MS + 10_000),
      });
    });

    await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });

    const wallet = await customerT.query(api.functions.claims.getWallet, {});
    expect(wallet).toHaveLength(1);
    expect(wallet[0]!.state).toBe("suspended");
    expect(wallet[0]!.activeCode).toBeNull();
  });
});
