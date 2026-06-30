import { query, internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { QueryCtx, ActionCtx, MutationCtx } from "../_generated/server";
import { Effect, Layer } from "effect";
import {
  AdminAnalyticsRepo,
  PilotAnalyticsService,
  type IAdminAnalyticsRepo,
} from "@areacodes/domain";
import { internal } from "../_generated/api";

async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  // Better Auth's convex() plugin includes all user fields in the JWT payload,
  // so role is available as a claim on the identity token.
  if ((identity as { role?: string }).role !== "admin")
    throw new Error("Forbidden: Admin only");
}

function makeAdminRepo(ctx: QueryCtx): IAdminAnalyticsRepo {
  return {
    getAllBusinesses: () =>
      Effect.promise(async () => {
        const businesses = await ctx.db.query("businesses").collect();
        return businesses
          .filter((b) => !b.deletedAt)
          .map((b) => ({ id: b._id as unknown as string, name: b.name }));
      }),

    getAllVouchers: () =>
      Effect.promise(async () => {
        const vouchers = await ctx.db.query("vouchers").collect();
        return vouchers.map((v) => ({
          id: v._id as unknown as string,
          businessId: v.businessId as unknown as string,
          voucherFormat: v.voucherFormat,
          deletedAt: v.deletedAt,
        }));
      }),

    getAllClaims: () =>
      Effect.promise(async () => {
        const claims = await ctx.db.query("claims").collect();
        return claims.map((c) => ({
          claimId: c._id as unknown as string,
          customerId: c.customerId,
          voucherId: c.voucherId as unknown as string,
          claimedAt: c.claimedAt,
        }));
      }),

    getAllReveals: () =>
      Effect.promise(async () => {
        const reveals = await ctx.db.query("reveals").collect();
        return reveals.map((r) => ({
          claimId: r.claimId as unknown as string,
          revealedAt: r.revealedAt,
          redeemedAt: r.redeemedAt,
        }));
      }),
  };
}

function runAdminEffect<A>(
  ctx: QueryCtx,
  effect: Effect.Effect<A, never, AdminAnalyticsRepo>,
): Promise<A> {
  const layer = Layer.succeed(AdminAnalyticsRepo, makeAdminRepo(ctx));
  return Effect.runPromise(Effect.provide(effect, layer));
}

export const getWeeklyFunnel = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return runAdminEffect(ctx, PilotAnalyticsService.getWeeklyFunnel());
  },
});

export const getBusinessLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return runAdminEffect(ctx, PilotAnalyticsService.getBusinessLeaderboard());
  },
});

export const getCrossBusinessDiscoveryCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return runAdminEffect(ctx, PilotAnalyticsService.getCrossBusinessDiscoveryCount());
  },
});

export const getVoucherFormatBreakdown = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return runAdminEffect(ctx, PilotAnalyticsService.getVoucherFormatBreakdown());
  },
});

export const getPosthogWeeklyViews = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.db
      .query("posthogWeeklyViews")
      .withIndex("by_week_start")
      .collect();
  },
});

export const syncPosthogWeeklyViews = internalAction({
  args: {},
  handler: async (ctx: ActionCtx) => {
    const apiKey = process.env.POSTHOG_API_KEY;
    const projectId = process.env.POSTHOG_PROJECT_ID;

    if (!apiKey || !projectId) {
      console.log("POSTHOG_API_KEY or POSTHOG_PROJECT_ID not set — skipping sync");
      return;
    }

    const response = await fetch(
      `https://us.posthog.com/api/projects/${projectId}/query/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query: `
              SELECT
                toStartOfWeek(timestamp, 1) AS week_start,
                count() AS view_count
              FROM events
              WHERE event = 'business_viewed'
              GROUP BY week_start
              ORDER BY week_start
            `,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`PostHog API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { results: Array<[string, number]> };
    const syncedAt = Date.now();

    await ctx.runMutation(internal.functions.adminAnalytics.writePosthogCache, {
      rows: data.results.map(([weekStartStr, viewCount]) => ({
        weekStart: new Date(weekStartStr).getTime(),
        viewCount,
        syncedAt,
      })),
    });
  },
});

export const writePosthogCache = internalMutation({
  args: {
    rows: v.array(
      v.object({
        weekStart: v.number(),
        viewCount: v.number(),
        syncedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db.query("posthogWeeklyViews").collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }
    for (const row of rows) {
      await ctx.db.insert("posthogWeeklyViews", row);
    }
  },
});
