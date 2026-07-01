import { mutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { Effect, Layer } from "effect";
import {
  VoucherRepo,
  ClaimRepo,
  RevealRepo,
  SubscriptionRepo,
  VoucherService,
  VoucherExpired,
  AlreadyRevealed,
  ClaimNotFound,
  VouchersSuspended,
  type IVoucherRepo,
  type IClaimRepo,
  type IRevealRepo,
} from "@areacodes/domain";
import { makeConvexSubscriptionQueryRepo } from "../lib/subscription_gate";
import type { ClaimErrorPayload, RevealErrorPayload, GetWalletErrorCode } from "../lib/errors";

function makeConvexVoucherRepo(ctx: QueryCtx | MutationCtx): IVoucherRepo {
  return {
    findBusiness: (id) =>
      Effect.promise(() => ctx.db.get(id as Id<"businesses">)),
    findById: (id) =>
      Effect.promise(() => ctx.db.get(id as Id<"vouchers">)),
    insert: () => Effect.die("not available in this context"),
    patch: () => Effect.die("not available in this context"),
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" } satisfies ClaimErrorPayload);

    const layer = Layer.mergeAll(
      Layer.succeed(VoucherRepo, makeConvexVoucherRepo(ctx)),
      Layer.succeed(ClaimRepo, makeConvexClaimRepo(ctx)),
    );

    const claimId = await Effect.runPromise(
      Effect.provide(VoucherService.claim(identity.subject, voucherId, Date.now()), layer).pipe(
        Effect.orDieWith(
          (_: VoucherExpired) => new ConvexError({ code: "VOUCHER_EXPIRED" } satisfies ClaimErrorPayload),
        ),
      ),
    );

    return claimId as Id<"claims">;
  },
});

export const revealVoucher = mutation({
  args: { claimId: v.id("claims") },
  handler: async (ctx, { claimId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" } satisfies RevealErrorPayload);

    const layer = Layer.mergeAll(
      Layer.succeed(VoucherRepo, makeConvexVoucherRepo(ctx)),
      Layer.succeed(ClaimRepo, makeConvexClaimRepo(ctx)),
      Layer.succeed(RevealRepo, makeConvexRevealRepo(ctx)),
      Layer.succeed(SubscriptionRepo, makeConvexSubscriptionQueryRepo(ctx)),
    );

    return await Effect.runPromise(
      Effect.provide(VoucherService.reveal(claimId, Date.now()), layer).pipe(
        Effect.orDieWith(
          (err: AlreadyRevealed | ClaimNotFound | VouchersSuspended) => {
            const code: RevealErrorPayload["code"] =
              err._tag === "AlreadyRevealed" ? "ALREADY_REVEALED"
              : err._tag === "ClaimNotFound" ? "CLAIM_NOT_FOUND"
              : "VOUCHER_SUSPENDED";
            return new ConvexError({ code } satisfies RevealErrorPayload);
          },
        ),
      ),
    );
  },
});

export const getWallet = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { ok: false as const, error: "UNAUTHENTICATED" as GetWalletErrorCode };

    const layer = Layer.mergeAll(
      Layer.succeed(VoucherRepo, makeConvexVoucherRepo(ctx)),
      Layer.succeed(ClaimRepo, makeConvexClaimQueryRepo(ctx)),
      Layer.succeed(RevealRepo, makeConvexRevealQueryRepo(ctx)),
      Layer.succeed(SubscriptionRepo, makeConvexSubscriptionQueryRepo(ctx)),
    );

    const entries = await Effect.runPromise(
      Effect.provide(VoucherService.getWallet(identity.subject, Date.now()), layer),
    );

    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const voucher = await ctx.db.get(entry.voucherId as Id<"vouchers">);
        const business = voucher ? await ctx.db.get(voucher.businessId) : null;
        const businessLogoUrl =
          business?.logoStorageId
            ? await ctx.storage.getUrl(business.logoStorageId)
            : null;
        const redemptionEvent = await ctx.db
          .query("redemptionEvents")
          .withIndex("by_idempotency", (q) =>
            q.eq("idempotencyKey", `manual:${entry.claimId}`),
          )
          .first();
        return {
          ...entry,
          businessId: business?._id ?? null,
          businessName: business?.name ?? null,
          businessLogoUrl,
          voucherValidFrom: voucher?.voucherValidFrom ?? null,
          provider: voucher?.provider ?? null,
          isRedeemed: redemptionEvent !== null,
        };
      }),
    );

    return { ok: true as const, entries: enriched };
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
