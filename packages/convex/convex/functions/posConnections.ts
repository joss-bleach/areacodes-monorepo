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
import type { Id } from "../_generated/dataModel";
import { Effect, Layer } from "effect";
import {
  PosConnectionRepo,
  PosGateway,
  SquareClient,
  ZettleClient,
  type IPosConnectionRepo,
  type PosConnectionDoc,
  type RedemptionCount,
} from "@areacodes/domain";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

function makeConvexPosRepo(ctx: MutationCtx): IPosConnectionRepo {
  return {
    findById: (id) =>
      Effect.promise(() =>
        ctx.db.get(id as Id<"posConnections">).then((doc) =>
          doc
            ? ({
                _id: doc._id as unknown as string,
                businessId: doc.businessId as unknown as string,
                provider: doc.provider,
                credentials: doc.credentials,
                connectedAt: doc.connectedAt,
                lastPolledAt: doc.lastPolledAt,
              } satisfies PosConnectionDoc)
            : null,
        ),
      ),
    findByBusiness: (businessId) =>
      Effect.promise(() =>
        ctx.db
          .query("posConnections")
          .withIndex("by_business", (q) =>
            q.eq("businessId", businessId as Id<"businesses">),
          )
          .collect()
          .then((docs) =>
            docs.map(
              (doc) =>
                ({
                  _id: doc._id as unknown as string,
                  businessId: doc.businessId as unknown as string,
                  provider: doc.provider,
                  credentials: doc.credentials,
                  connectedAt: doc.connectedAt,
                  lastPolledAt: doc.lastPolledAt,
                }) satisfies PosConnectionDoc,
            ),
          ),
      ),
    insert: (data) =>
      Effect.promise(async () => {
        const id = await ctx.db.insert("posConnections", {
          businessId: data.businessId as Id<"businesses">,
          provider: data.provider,
          credentials: data.credentials,
          connectedAt: data.connectedAt,
          lastPolledAt: data.lastPolledAt,
        });
        return id as unknown as string;
      }),
    remove: (id) =>
      Effect.promise(() => ctx.db.delete(id as Id<"posConnections">)),
  };
}

function makeConvexPosQueryRepo(ctx: QueryCtx): IPosConnectionRepo {
  return {
    findById: (id) =>
      Effect.promise(() =>
        ctx.db.get(id as Id<"posConnections">).then((doc) =>
          doc
            ? ({
                _id: doc._id as unknown as string,
                businessId: doc.businessId as unknown as string,
                provider: doc.provider,
                credentials: doc.credentials,
                connectedAt: doc.connectedAt,
                lastPolledAt: doc.lastPolledAt,
              } satisfies PosConnectionDoc)
            : null,
        ),
      ),
    findByBusiness: (businessId) =>
      Effect.promise(() =>
        ctx.db
          .query("posConnections")
          .withIndex("by_business", (q) =>
            q.eq("businessId", businessId as Id<"businesses">),
          )
          .collect()
          .then((docs) =>
            docs.map(
              (doc) =>
                ({
                  _id: doc._id as unknown as string,
                  businessId: doc.businessId as unknown as string,
                  provider: doc.provider,
                  credentials: doc.credentials,
                  connectedAt: doc.connectedAt,
                  lastPolledAt: doc.lastPolledAt,
                }) satisfies PosConnectionDoc,
            ),
          ),
      ),
    insert: () => Effect.die("not available in query context"),
    remove: () => Effect.die("not available in query context"),
  };
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
      const credObj = JSON.parse(conn.credentials) as { apiKey: string };
      const apiKey = credObj.apiKey;

      let counts: readonly RedemptionCount[];

      if (conn.provider === "square") {
        const squareLayer = PosGateway.makeSquareLayer(apiKey);
        const result = await Effect.runPromise(
          Effect.provide(
            Effect.either(PosGateway.pollSquareRedemptions(since)),
            squareLayer,
          ),
        );
        if (result._tag === "Left") {
          console.error(
            `Square poll failed for connection ${conn._id}:`,
            result.left.message,
          );
          continue;
        }
        counts = result.right;
      } else {
        const zettleLayer = PosGateway.makeZettleLayer(apiKey);
        const result = await Effect.runPromise(
          Effect.provide(
            Effect.either(PosGateway.pollZettleRedemptions(since)),
            zettleLayer,
          ),
        );
        if (result._tag === "Left") {
          console.error(
            `Zettle poll failed for connection ${conn._id}:`,
            result.left.message,
          );
          continue;
        }
        counts = result.right;
      }

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
