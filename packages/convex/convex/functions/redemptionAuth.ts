import { action, internalMutation, internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { ActionCtx, QueryCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import { argon2id, argon2Verify } from "hash-wasm";

async function requireAuth(ctx: ActionCtx | QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

// Ensures the authenticated user owns the business before mutating its
// redemption auth. Mirrors the owner check used across the business services.
async function requireBusinessOwner(
  ctx: QueryCtx,
  businessId: Id<"businesses">,
  ownerId: string,
): Promise<void> {
  const business = await ctx.db.get(businessId);
  if (!business) throw new Error("Business not found");
  if (business.userId !== ownerId) throw new Error("Unauthorized");
}

// Use lightweight params in test environments to avoid CPU saturation across parallel test files.
// Production uses OWASP-recommended argon2id parameters (19 MiB, 2 iterations).
const IS_TEST = typeof process !== "undefined" && process.env.NODE_ENV === "test";

async function hashPin(pin: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return argon2id({
    password: pin,
    salt,
    iterations: IS_TEST ? 1 : 2,
    parallelism: 1,
    memorySize: IS_TEST ? 512 : 19456,
    hashLength: 32,
    outputType: "encoded",
  });
}

// ── Internal helpers ─────────────────────────────────────────────────────────

export const getAuth = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    return ctx.db
      .query("redemptionAuth")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .first();
  },
});

export const assertOwner = internalQuery({
  args: { businessId: v.id("businesses"), ownerId: v.string() },
  handler: async (ctx, { businessId, ownerId }) => {
    await requireBusinessOwner(ctx, businessId, ownerId);
  },
});

export const storePin = internalMutation({
  args: {
    businessId: v.id("businesses"),
    redemptionPinHash: v.string(),
    redemptionPinSetAt: v.number(),
  },
  handler: async (ctx, { businessId, redemptionPinHash, redemptionPinSetAt }) => {
    const existing = await ctx.db
      .query("redemptionAuth")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { redemptionPinHash, redemptionPinSetAt });
    } else {
      await ctx.db.insert("redemptionAuth", {
        businessId,
        redemptionPinHash,
        redemptionPinSetAt,
      });
    }
  },
});

// ── Public query ─────────────────────────────────────────────────────────────

export const getRedemptionPinStatus = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const ownerId = await requireAuth(ctx);
    await requireBusinessOwner(ctx, businessId, ownerId);
    const record = await ctx.db
      .query("redemptionAuth")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .first();

    if (!record) return { isSet: false as const };
    return { isSet: true as const, setAt: record.redemptionPinSetAt };
  },
});

// ── Public actions ───────────────────────────────────────────────────────────

export const setRedemptionPin = action({
  args: {
    businessId: v.id("businesses"),
    pin: v.string(),
  },
  handler: async (ctx, { businessId, pin }) => {
    const ownerId = await requireAuth(ctx);
    await ctx.runQuery(internal.functions.redemptionAuth.assertOwner, {
      businessId,
      ownerId,
    });
    const hash = await hashPin(pin);
    const now = Date.now();
    await ctx.runMutation(internal.functions.redemptionAuth.storePin, {
      businessId,
      redemptionPinHash: hash,
      redemptionPinSetAt: now,
    });
  },
});

export const verifyRedemptionPin = action({
  args: {
    businessId: v.id("businesses"),
    pin: v.string(),
  },
  handler: async (ctx, { businessId, pin }): Promise<boolean> => {
    const record = (await ctx.runQuery(
      internal.functions.redemptionAuth.getAuth,
      { businessId },
    )) as Doc<"redemptionAuth"> | null;
    if (!record) return false;
    try {
      return await argon2Verify({ password: pin, hash: record.redemptionPinHash });
    } catch {
      return false;
    }
  },
});
