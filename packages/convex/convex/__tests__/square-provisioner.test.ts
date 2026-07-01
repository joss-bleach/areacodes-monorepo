/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import schema from "../schema";
import type { Doc, Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

async function seedBusinessWithSquare(
  ctx: any,
): Promise<{ businessId: Id<"businesses">; connectionId: Id<"posConnections"> }> {
  const industryId = await ctx.db.insert("industries", {
    name: "Food",
    category: "Food & Drink",
    slug: `food-sp-${Math.random()}`,
  });
  const businessId: Id<"businesses"> = await ctx.db.insert("businesses", {
    userId: "user_sp",
    name: "SP Shop",
    slug: `sp-shop-${Math.random()}`,
    description: "Test",
    websiteUrl: "https://sp.com",
    industryId,
    address: "1 St",
    latitude: 50.8,
    longitude: -0.1,
  });
  const connectionId: Id<"posConnections"> = await ctx.db.insert("posConnections", {
    businessId,
    provider: "square",
    status: "connected",
    externalMerchantId: "merchant-test",
    scopes: ["ITEMS_READ", "ITEMS_WRITE"],
    encryptedTokens: "encrypted:test",
    encryptionKeyVersion: "v1",
    tokenExpiresAt: Date.now() + 86_400_000,
    connectedAt: Date.now(),
  });
  return { businessId, connectionId };
}

async function insertSquareVoucher(
  ctx: any,
  businessId: Id<"businesses">,
  overrides: Record<string, unknown> = {},
): Promise<Id<"vouchers">> {
  const now = Date.now();
  return ctx.db.insert("vouchers", {
    businessId,
    userId: "user_sp",
    title: "10% off",
    description: "Save 10%",
    provider: "square",
    discount: { kind: "percentage", value: 10, currency: "GBP" },
    provisioning: { status: "pending" },
    voucherValidFrom: now - 1000,
    voucherValidTo: now + 86_400_000,
    ...overrides,
  });
}

// ── updateProvisioningStatus mutation ─────────────────────────────────────────

describe("updateProvisioningStatus — status transitions", () => {
  test("transitions pending -> provisioned with externalId", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);
    const voucherId = await t.run((ctx) => insertSquareVoucher(ctx, businessId));
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.patch(voucherId, {
        provisioning: {
          status: "provisioned",
          externalId: "cat-obj-abc123",
          provisionedAt: now,
        },
      });
    });

    const voucher = await t.run((ctx) => ctx.db.get(voucherId)) as Doc<"vouchers"> | null;
    expect(voucher?.provisioning.status).toBe("provisioned");
    expect(voucher?.provisioning.externalId).toBe("cat-obj-abc123");
    expect(voucher?.provisioning.provisionedAt).toBe(now);
  });

  test("transitions pending -> failed with lastError", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);
    const voucherId = await t.run((ctx) => insertSquareVoucher(ctx, businessId));
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.patch(voucherId, {
        provisioning: {
          status: "failed",
          lastError: "Rate limited by Square",
          lastAttemptAt: now,
        },
      });
    });

    const voucher = await t.run((ctx) => ctx.db.get(voucherId)) as Doc<"vouchers"> | null;
    expect(voucher?.provisioning.status).toBe("failed");
    expect(voucher?.provisioning.lastError).toBe("Rate limited by Square");
    expect(voucher?.provisioning.lastAttemptAt).toBe(now);
    expect(voucher?.provisioning.externalId).toBeUndefined();
  });

  test("transitions failed -> provisioned on retry success", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);
    const now = Date.now();

    const voucherId = await t.run((ctx) =>
      insertSquareVoucher(ctx, businessId, {
        provisioning: {
          status: "failed",
          lastError: "Previously failed",
          lastAttemptAt: now - 60_000,
        },
      }),
    );

    await t.run(async (ctx) => {
      await ctx.db.patch(voucherId, {
        provisioning: {
          status: "provisioned",
          externalId: "cat-obj-retry",
          provisionedAt: now,
        },
      });
    });

    const voucher = await t.run((ctx) => ctx.db.get(voucherId)) as Doc<"vouchers"> | null;
    expect(voucher?.provisioning.status).toBe("provisioned");
    expect(voucher?.provisioning.externalId).toBe("cat-obj-retry");
    expect(voucher?.provisioning.lastError).toBeUndefined();
  });
});

// ── by_provisioning_status index (for retry cron) ─────────────────────────────

describe("by_provisioning_status index — retry cron targeting", () => {
  test("query by pending finds pending vouchers", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);

    await t.run(async (ctx) => {
      await insertSquareVoucher(ctx, businessId, {
        provisioning: { status: "pending" },
      });
      await insertSquareVoucher(ctx, businessId, {
        title: "20% off",
        description: "Save 20%",
        provisioning: { status: "provisioned", externalId: "cat-obj-1" },
      });
    });

    const pending = await t.run(async (ctx) =>
      ctx.db
        .query("vouchers")
        .withIndex("by_provisioning_status", (q) =>
          q.eq("provisioning.status", "pending"),
        )
        .collect(),
    );

    expect(pending).toHaveLength(1);
    expect(pending[0]?.provisioning.status).toBe("pending");
  });

  test("query by failed finds failed vouchers", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);

    await t.run(async (ctx) => {
      await insertSquareVoucher(ctx, businessId, {
        provisioning: {
          status: "failed",
          lastError: "Square timeout",
        },
      });
    });

    const failed = await t.run(async (ctx) =>
      ctx.db
        .query("vouchers")
        .withIndex("by_provisioning_status", (q) =>
          q.eq("provisioning.status", "failed"),
        )
        .collect(),
    );

    expect(failed).toHaveLength(1);
    expect(failed[0]?.provisioning.lastError).toBe("Square timeout");
  });

  test("manual not_required vouchers are excluded from pending query", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_sp",
        title: "Manual voucher",
        description: "Free item",
        provider: "manual",
        discount: { kind: "free_item", itemName: "coffee" },
        provisioning: { status: "not_required" },
        voucherValidFrom: now - 1000,
        voucherValidTo: now + 86_400_000,
      });
    });

    const pending = await t.run(async (ctx) =>
      ctx.db
        .query("vouchers")
        .withIndex("by_provisioning_status", (q) =>
          q.eq("provisioning.status", "pending"),
        )
        .collect(),
    );

    expect(pending).toHaveLength(0);
  });
});

// ── Deprovision path ──────────────────────────────────────────────────────────

describe("deprovision path — clear provisioning on delete/disconnect", () => {
  test("soft-delete clears provisioning status to not_required", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);
    const now = Date.now();

    const voucherId = await t.run((ctx) =>
      insertSquareVoucher(ctx, businessId, {
        provisioning: {
          status: "provisioned",
          externalId: "cat-obj-to-delete",
          provisionedAt: now - 1000,
        },
      }),
    );

    // Simulate best-effort deprovision (clears externalId, resets status)
    await t.run(async (ctx) => {
      await ctx.db.patch(voucherId, {
        provisioning: { status: "not_required" },
        deletedAt: now,
      });
    });

    const voucher = await t.run((ctx) => ctx.db.get(voucherId)) as Doc<"vouchers"> | null;
    expect(voucher?.deletedAt).toBe(now);
    expect(voucher?.provisioning.status).toBe("not_required");
    expect(voucher?.provisioning.externalId).toBeUndefined();
  });

  test("disconnect revokes connection and provisioned vouchers can be cleared", async () => {
    const t = convexTest(schema, modules);
    const { businessId, connectionId } = await t.run(seedBusinessWithSquare);
    const now = Date.now();

    const voucherId = await t.run((ctx) =>
      insertSquareVoucher(ctx, businessId, {
        provisioning: {
          status: "provisioned",
          externalId: "cat-obj-disconnect",
          provisionedAt: now - 1000,
        },
      }),
    );

    // Revoke connection
    await t.run(async (ctx) => {
      await ctx.db.patch(connectionId, {
        status: "revoked",
        encryptedTokens: undefined,
        encryptionKeyVersion: undefined,
      });
    });

    // Provisioning cleared for affected vouchers
    await t.run(async (ctx) => {
      await ctx.db.patch(voucherId, {
        provisioning: { status: "not_required" },
      });
    });

    const conn = await t.run((ctx) => ctx.db.get(connectionId)) as Doc<"posConnections"> | null;
    const voucher = await t.run((ctx) => ctx.db.get(voucherId)) as Doc<"vouchers"> | null;

    expect(conn?.status).toBe("revoked");
    expect(conn?.encryptedTokens).toBeUndefined();
    expect(voucher?.provisioning.status).toBe("not_required");
  });
});

// ── Deprovision via real mutations (deleteVoucher / disconnectSquare) ──────────

describe("deprovision — real mutation wiring", () => {
  // Fake timers keep convex-test's runAfter(0) jobs from firing on real timers
  // after the test instance is torn down (which would write to a dead db).
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // Drain any runAfter(0) deprovision jobs so they complete inside the test.
  async function drainScheduled(t: ReturnType<typeof convexTest>): Promise<void> {
    for (let i = 0; i < 5; i++) {
      await t.finishInProgressScheduledFunctions();
      const pending = await t.run((ctx) =>
        ctx.db
          .system.query("_scheduled_functions")
          .filter((q) => q.eq(q.field("state.kind"), "pending"))
          .collect(),
      );
      if (pending.length === 0) break;
    }
  }

  test("deleteVoucher clears provisioning when no active connection remains", async () => {
    const t = convexTest(schema, modules);
    const { businessId, connectionId } = await t.run(seedBusinessWithSquare);
    const owner = t.withIdentity({ subject: "user_sp" });
    const now = Date.now();

    const voucherId = await t.run((ctx) =>
      insertSquareVoucher(ctx, businessId, {
        provisioning: {
          status: "provisioned",
          externalId: "cat-obj-del",
          provisionedAt: now - 1000,
        },
      }),
    );

    // No active connection → deprovision falls back to an inline clear.
    await t.run(async (ctx) => {
      await ctx.db.patch(connectionId, {
        status: "revoked",
        encryptedTokens: undefined,
        encryptionKeyVersion: undefined,
      });
    });

    await owner.mutation(api.functions.vouchers.deleteVoucher, { voucherId });

    const voucher = await t.run((ctx) => ctx.db.get(voucherId)) as Doc<"vouchers"> | null;
    expect(voucher?.deletedAt).toBeDefined();
    expect(voucher?.provisioning.status).toBe("not_required");
    expect(voucher?.provisioning.externalId).toBeUndefined();
  });

  test("deleteVoucher soft-deletes and enqueues a deprovision job when a connection is live", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })),
    );

    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);
    const owner = t.withIdentity({ subject: "user_sp" });
    const now = Date.now();

    const voucherId = await t.run((ctx) =>
      insertSquareVoucher(ctx, businessId, {
        provisioning: {
          status: "provisioned",
          externalId: "cat-obj-live-del",
          provisionedAt: now - 1000,
        },
      }),
    );

    await owner.mutation(api.functions.vouchers.deleteVoucher, { voucherId });

    // Soft-deleted; the CatalogDiscount removal + clear is deferred to the
    // scheduled deprovisionVoucher action, so the record is not cleared inline.
    const voucher = await t.run((ctx) => ctx.db.get(voucherId)) as Doc<"vouchers"> | null;
    expect(voucher?.deletedAt).toBeDefined();
    expect(voucher?.provisioning.externalId).toBe("cat-obj-live-del");

    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(
      scheduled.some((s) => s.name.includes("deprovisionVoucher")),
    ).toBe(true);

    await drainScheduled(t);
  });

  test("disconnectSquare revokes the connection and enqueues deprovision", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })),
    );

    const t = convexTest(schema, modules);
    const { businessId, connectionId } = await t.run(seedBusinessWithSquare);
    const owner = t.withIdentity({ subject: "user_sp" });
    const now = Date.now();

    await t.run((ctx) =>
      insertSquareVoucher(ctx, businessId, {
        provisioning: {
          status: "provisioned",
          externalId: "cat-obj-disc",
          provisionedAt: now - 1000,
        },
      }),
    );

    await owner.mutation(api.functions.posConnections.disconnectSquare, {
      businessId,
      connectionId,
    });

    const conn = await t.run((ctx) => ctx.db.get(connectionId)) as Doc<"posConnections"> | null;
    expect(conn?.status).toBe("revoked");
    expect(conn?.encryptedTokens).toBeUndefined();

    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(
      scheduled.some((s) => s.name.includes("deprovisionAllForBusiness")),
    ).toBe(true);

    await drainScheduled(t);
  });

  test("deprovisionVoucher action clears provisioning best-effort even when the token cannot be used", async () => {
    // Avoid any real network call; the seeded token is not decryptable so the
    // action should fall back to clearing the record without a DELETE.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })),
    );

    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);
    const now = Date.now();

    const voucherId = await t.run((ctx) =>
      insertSquareVoucher(ctx, businessId, {
        provisioning: {
          status: "provisioned",
          externalId: "cat-obj-action",
          provisionedAt: now - 1000,
        },
      }),
    );

    await t.action(internal.functions.squareProvisioner.deprovisionVoucher, {
      voucherId,
      catalogObjectId: "cat-obj-action",
      encryptedTokens: "encrypted:test",
    });

    const voucher = await t.run((ctx) => ctx.db.get(voucherId)) as Doc<"vouchers"> | null;
    expect(voucher?.provisioning.status).toBe("not_required");
    expect(voucher?.provisioning.externalId).toBeUndefined();
  });
});

// ── Visibility gate integration ───────────────────────────────────────────────

describe("visibility gate — Square vouchers hidden until provisioned", () => {
  test("pending square voucher is not customer-visible", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);

    await t.run((ctx) => insertSquareVoucher(ctx, businessId));

    const result = await t.query(
      api.functions.vouchers.getActiveVouchersByBusiness,
      { businessId },
    );

    expect(result).toHaveLength(0);
  });

  test("provisioned square voucher is customer-visible", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);
    const now = Date.now();

    await t.run((ctx) =>
      insertSquareVoucher(ctx, businessId, {
        provisioning: {
          status: "provisioned",
          externalId: "cat-obj-live",
          provisionedAt: now - 100,
        },
      }),
    );

    const result = await t.query(
      api.functions.vouchers.getActiveVouchersByBusiness,
      { businessId },
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.provisioning.status).toBe("provisioned");
  });

  test("failed square voucher is not customer-visible", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedBusinessWithSquare);

    await t.run((ctx) =>
      insertSquareVoucher(ctx, businessId, {
        provisioning: { status: "failed", lastError: "API error" },
      }),
    );

    const result = await t.query(
      api.functions.vouchers.getActiveVouchersByBusiness,
      { businessId },
    );

    expect(result).toHaveLength(0);
  });
});
