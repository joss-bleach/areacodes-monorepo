import {
  mutation,
  query,
  internalMutation,
  internalAction,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { Effect } from "effect";
import { PosGateway, type RedemptionCount } from "@areacodes/domain";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

// ── Public mutations ──────────────────────────────────────────────────────────

export const connectPosProvider = mutation({
  args: {
    businessId: v.id("businesses"),
    provider: v.union(v.literal("square"), v.literal("zettle")),
    apiKey: v.string(),
  },
  handler: async (ctx, { businessId, provider, apiKey }) => {
    await requireAuth(ctx);

    // Remove existing connection for this business+provider if any
    const existing = await ctx.db
      .query("posConnections")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .filter((q) => q.eq(q.field("provider"), provider))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    const credentials = JSON.stringify({ apiKey });
    const id = await ctx.db.insert("posConnections", {
      businessId,
      provider,
      credentials,
      connectedAt: Date.now(),
    });

    return id;
  },
});

export const disconnectPosProvider = mutation({
  args: {
    businessId: v.id("businesses"),
    provider: v.union(v.literal("square"), v.literal("zettle")),
  },
  handler: async (ctx, { businessId, provider }) => {
    await requireAuth(ctx);

    const conn = await ctx.db
      .query("posConnections")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .filter((q) => q.eq(q.field("provider"), provider))
      .first();

    if (conn) {
      await ctx.db.delete(conn._id);
    }
  },
});

export const getPosConnections = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("posConnections")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect();
  },
});

// ── Internal: polling machinery ───────────────────────────────────────────────

export const getAllPosConnections = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("posConnections").collect();
  },
});

export const upsertRedemptionCounts = internalMutation({
  args: {
    counts: v.array(v.object({ voucherCode: v.string(), count: v.number() })),
  },
  handler: async (ctx, { counts }) => {
    for (const { voucherCode, count } of counts) {
      if (count === 0) continue;

      const reveal = await ctx.db
        .query("reveals")
        .withIndex("by_voucher_code", (q) => q.eq("voucherCode", voucherCode))
        .first();
      if (!reveal) continue;

      const claim = await ctx.db.get(reveal.claimId);
      if (!claim) continue;

      const voucher = await ctx.db.get(claim.voucherId);
      if (!voucher) continue;

      await ctx.db.patch(claim.voucherId, {
        redemptionCount: (voucher.redemptionCount ?? 0) + count,
      });
    }
  },
});

export const markConnectionPolled = internalMutation({
  args: { connectionId: v.id("posConnections"), polledAt: v.number() },
  handler: async (ctx, { connectionId, polledAt }) => {
    await ctx.db.patch(connectionId, { lastPolledAt: polledAt });
  },
});

export const runRedemptionPolling = internalAction({
  args: {},
  handler: async (ctx) => {
    const connections = await ctx.runQuery(
      internal.functions.posConnections.getAllPosConnections,
      {},
    );

    const now = Date.now();

    for (const conn of connections) {
      const since = conn.lastPolledAt ?? conn.connectedAt;
      const { apiKey } = JSON.parse(conn.credentials) as { apiKey: string };

      const poll =
        conn.provider === "square"
          ? PosGateway.pollSquareRedemptions(since).pipe(
              Effect.provide(PosGateway.makeSquareLayer(apiKey)),
            )
          : PosGateway.pollZettleRedemptions(since).pipe(
              Effect.provide(PosGateway.makeZettleLayer(apiKey)),
            );

      const result = await Effect.runPromise(Effect.either(poll));
      if (result._tag === "Left") {
        console.error(
          `${conn.provider} poll failed for connection ${conn._id}:`,
          result.left.message,
        );
        continue;
      }
      const counts = result.right;

      if (counts.length > 0) {
        await ctx.runMutation(
          internal.functions.posConnections.upsertRedemptionCounts,
          { counts: counts as RedemptionCount[] },
        );
      }

      await ctx.runMutation(
        internal.functions.posConnections.markConnectionPolled,
        { connectionId: conn._id, polledAt: now },
      );
    }
  },
});
