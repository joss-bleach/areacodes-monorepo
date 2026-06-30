import { query } from "../_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { Effect, Layer } from "effect";
import {
  PilotAnalyticsRepo,
  PilotAnalyticsService,
  type IPilotAnalyticsRepo,
} from "@areacodes/domain";

function makeConvexRepo(ctx: QueryCtx): IPilotAnalyticsRepo {
  return {
    getVouchersForBusiness: (businessId) =>
      Effect.promise(async () => {
        const vouchers = await ctx.db
          .query("vouchers")
          .withIndex("by_business", (q) =>
            q.eq("businessId", businessId as Id<"businesses">),
          )
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .collect();
        return vouchers.map((v) => ({ id: v._id as unknown as string, title: v.title }));
      }),

    getClaimsForVoucher: (voucherId) =>
      Effect.promise(async () => {
        const claims = await ctx.db
          .query("claims")
          .filter((q) => q.eq(q.field("voucherId"), voucherId))
          .collect();
        return claims.map((c) => ({
          claimId: c._id as unknown as string,
          customerId: c.customerId,
        }));
      }),

    getRevealsByClaim: (claimId) =>
      Effect.promise(async () => {
        const reveals = await ctx.db
          .query("reveals")
          .withIndex("by_claim", (q) => q.eq("claimId", claimId as Id<"claims">))
          .collect();
        return reveals.map((r) => ({ redeemedAt: r.redeemedAt }));
      }),
  };
}

function runAnalyticsEffect<A>(
  ctx: QueryCtx,
  effect: Effect.Effect<A, never, PilotAnalyticsRepo>,
): Promise<A> {
  const layer = Layer.succeed(PilotAnalyticsRepo, makeConvexRepo(ctx));
  return Effect.runPromise(Effect.provide(effect, layer));
}

export const getTotalRedemptions = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    return runAnalyticsEffect(
      ctx,
      PilotAnalyticsService.getTotalRedemptions(businessId as unknown as string),
    );
  },
});

export const getNewCustomerCount = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    return runAnalyticsEffect(
      ctx,
      PilotAnalyticsService.getNewCustomerCount(businessId as unknown as string),
    );
  },
});

export const getReturnCustomerCount = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    return runAnalyticsEffect(
      ctx,
      PilotAnalyticsService.getReturnCustomerCount(businessId as unknown as string),
    );
  },
});

export const getVoucherStats = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    return runAnalyticsEffect(
      ctx,
      PilotAnalyticsService.getVoucherStats(businessId as unknown as string),
    );
  },
});
