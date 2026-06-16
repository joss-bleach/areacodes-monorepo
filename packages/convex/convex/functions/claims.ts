import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { Effect, Layer } from "effect";
import {
  VoucherRepo,
  ClaimRepo,
  RevealRepo,
  SubscriptionRepo,
  VoucherService,
  type IVoucherRepo,
  type IClaimRepo,
  type IRevealRepo,
} from "@areacodes/domain";
import { makeConvexSubscriptionQueryRepo } from "../lib/subscription-gate";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

function makeConvexVoucherRepo(ctx: QueryCtx | MutationCtx): IVoucherRepo {
  return {
    findBusiness: (id) =>
      Effect.promise(() => ctx.db.get(id as Id<"businesses">)),
    findById: (id) =>
      Effect.promise(() => ctx.db.get(id as Id<"vouchers">)),
    insert: () => Effect.die("not available in this context"),
    patch: () => Effect.die("not available in this context"),
    deleteStorage: () => Effect.die("not available in this context"),
  };
}

// The read methods work in both query and mutation contexts; only the mutation
// repos can insert. Query repos `die` on insert so misuse fails loudly.

function makeConvexClaimQueryRepo(ctx: QueryCtx): IClaimRepo {
  return {
    findByCustomerVoucher: (customerId, voucherId) =>
      Effect.promise(() =>
        ctx.db
          .query("claims")
          .withIndex("by_customer_voucher", (q) =>
            q.eq("customerId", customerId).eq("voucherId", voucherId as Id<"vouchers">),
          )
          .first(),
      ),
    findById: (id) =>
      Effect.promise(() => ctx.db.get(id as Id<"claims">)),
    findByCustomer: (customerId) =>
      Effect.promise(() =>
        ctx.db
          .query("claims")
          .filter((q) => q.eq(q.field("customerId"), customerId))
          .collect(),
      ),
    insert: () => Effect.die("not available in query context"),
  };
}

function makeConvexClaimRepo(ctx: MutationCtx): IClaimRepo {
  return {
    ...makeConvexClaimQueryRepo(ctx),
    insert: (data) =>
      Effect.promise(async () => {
        const id = await ctx.db.insert("claims", {
          customerId: data.customerId,
          voucherId: data.voucherId as Id<"vouchers">,
          claimedAt: data.claimedAt,
        });
        return id as unknown as string;
      }),
  };
}

function makeConvexRevealQueryRepo(ctx: QueryCtx): IRevealRepo {
  return {
    findByClaim: (claimId) =>
      Effect.promise(() =>
        ctx.db
          .query("reveals")
          .withIndex("by_claim", (q) => q.eq("claimId", claimId as Id<"claims">))
          .order("desc")
          .first(),
      ),
    insert: () => Effect.die("not available in query context"),
  };
}

function makeConvexRevealRepo(ctx: MutationCtx): IRevealRepo {
  return {
    ...makeConvexRevealQueryRepo(ctx),
    insert: (data) =>
      Effect.promise(async () => {
        const id = await ctx.db.insert("reveals", {
          claimId: data.claimId as Id<"claims">,
          voucherCode: data.voucherCode,
          revealedAt: data.revealedAt,
          expiresAt: data.expiresAt,
        });
        return id as unknown as string;
      }),
  };
}

export const claimVoucher = mutation({
  args: { voucherId: v.id("vouchers") },
  handler: async (ctx, { voucherId }) => {
    const customerId = await requireAuth(ctx);
    const now = Date.now();

    const layer = Layer.mergeAll(
      Layer.succeed(VoucherRepo, makeConvexVoucherRepo(ctx)),
      Layer.succeed(ClaimRepo, makeConvexClaimRepo(ctx)),
    );

    const claimId = await Effect.runPromise(
      Effect.provide(VoucherService.claim(customerId, voucherId, now), layer),
    );

    return claimId as Id<"claims">;
  },
});

export const revealVoucher = mutation({
  args: { claimId: v.id("claims") },
  handler: async (ctx, { claimId }) => {
    await requireAuth(ctx);
    const now = Date.now();

    const layer = Layer.mergeAll(
      Layer.succeed(VoucherRepo, makeConvexVoucherRepo(ctx)),
      Layer.succeed(ClaimRepo, makeConvexClaimRepo(ctx)),
      Layer.succeed(RevealRepo, makeConvexRevealRepo(ctx)),
      Layer.succeed(SubscriptionRepo, makeConvexSubscriptionQueryRepo(ctx)),
    );

    const result = await Effect.runPromise(
      Effect.provide(VoucherService.reveal(claimId, now), layer),
    );

    return result;
  },
});

export const getWallet = query({
  args: {},
  handler: async (ctx) => {
    const customerId = await requireAuth(ctx);
    const now = Date.now();

    const layer = Layer.mergeAll(
      Layer.succeed(VoucherRepo, makeConvexVoucherRepo(ctx)),
      Layer.succeed(ClaimRepo, makeConvexClaimQueryRepo(ctx)),
      Layer.succeed(RevealRepo, makeConvexRevealQueryRepo(ctx)),
      Layer.succeed(SubscriptionRepo, makeConvexSubscriptionQueryRepo(ctx)),
    );

    const entries = await Effect.runPromise(
      Effect.provide(VoucherService.getWallet(customerId, now), layer),
    );

    // Enrich each entry with business name and voucherValidFrom for display.
    return await Promise.all(
      entries.map(async (entry) => {
        const voucher = await ctx.db.get(entry.voucherId as Id<"vouchers">);
        const business = voucher ? await ctx.db.get(voucher.businessId) : null;
        return {
          ...entry,
          businessName: business?.name ?? null,
          voucherValidFrom: voucher?.voucherValidFrom ?? null,
        };
      }),
    );
  },
});

export const getClaimForVoucher = query({
  args: { voucherId: v.id("vouchers") },
  handler: async (ctx, { voucherId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("claims")
      .withIndex("by_customer_voucher", (q) =>
        q.eq("customerId", identity.subject).eq("voucherId", voucherId),
      )
      .first();
  },
});
