import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { mapSquareOrderToRedemptions } from "@areacodes/domain";
import { decryptConnectionTokens } from "./posConnections";

const SQUARE_BASE_URL =
  process.env.SQUARE_BASE_URL ?? "https://connect.squareupsandbox.com";

const SQUARE_VERSION = "2024-01-17";

function squareAuthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Square-Version": SQUARE_VERSION,
  };
}

// The live, provisioned Square vouchers for a business — the set whose catalog
// discount IDs we reconcile Square orders against.
function querySquareVouchers(
  ctx: QueryCtx | MutationCtx,
  businessId: Id<"businesses">,
) {
  return ctx.db
    .query("vouchers")
    .withIndex("by_business", (q) => q.eq("businessId", businessId))
    .filter((q) =>
      q.and(
        q.eq(q.field("provider"), "square"),
        q.eq(q.field("deletedAt"), undefined),
      ),
    )
    .collect();
}

// ── Internal queries ───────────────────────────────────────────────────────────

export const getConnectionByMerchantId = internalQuery({
  args: { externalMerchantId: v.string() },
  handler: async (ctx, { externalMerchantId }) => {
    return ctx.db
      .query("posConnections")
      .withIndex("by_external_merchant", (q) =>
        q.eq("externalMerchantId", externalMerchantId),
      )
      .filter((q) => q.eq(q.field("status"), "connected"))
      .first();
  },
});

export const getConnectedSquareConnections = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("posConnections")
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), "square"),
          q.eq(q.field("status"), "connected"),
        ),
      )
      .collect();
  },
});

export const getOurCatalogIds = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const vouchers = await querySquareVouchers(ctx, businessId);
    return vouchers
      .map((v) => v.provisioning.externalId)
      .filter((id): id is string => id !== undefined);
  },
});

// ── Internal mutations ─────────────────────────────────────────────────────────

export const upsertSquareRedemptionEvents = internalMutation({
  args: {
    businessId: v.id("businesses"),
    events: v.array(
      v.object({
        idempotencyKey: v.string(),
        orderId: v.string(),
        catalogDiscountId: v.string(),
        amountDiscounted: v.optional(v.number()),
        occurredAt: v.number(),
      }),
    ),
    recordedAt: v.number(),
  },
  handler: async (ctx, { businessId, events, recordedAt }) => {
    // Build a catalog ID → voucherId map for this business once (not per-event)
    const vouchers = await querySquareVouchers(ctx, businessId);

    const catalogIdToVoucherId = new Map<string, Id<"vouchers">>(
      vouchers
        .filter((v) => v.provisioning.externalId !== undefined)
        .map((v) => [v.provisioning.externalId!, v._id]),
    );

    for (const event of events) {
      // Idempotency: skip if already recorded under this key
      const existing = await ctx.db
        .query("redemptionEvents")
        .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", event.idempotencyKey))
        .first();
      if (existing !== null) continue;

      const voucherId = catalogIdToVoucherId.get(event.catalogDiscountId);
      if (!voucherId) continue; // Not one of our provisioned vouchers

      await ctx.db.insert("redemptionEvents", {
        voucherId,
        businessId,
        source: "square",
        trustTier: "square",
        occurredAt: event.occurredAt,
        recordedAt,
        providerOrderRef: event.orderId,
        amountDiscounted: event.amountDiscounted,
        idempotencyKey: event.idempotencyKey,
      });
    }
  },
});

export const advanceLastReconciledAt = internalMutation({
  args: {
    connectionId: v.id("posConnections"),
    reconciledAt: v.number(),
  },
  handler: async (ctx, { connectionId, reconciledAt }) => {
    await ctx.db.patch(connectionId, { lastReconciledAt: reconciledAt });
  },
});

// ── Internal actions ───────────────────────────────────────────────────────────

// Handles a single Square order from a webhook event.
// Called by the HTTP route after HMAC verification and payload parsing.
// Fetches the full order from Square, maps it, and upserts events.
export const handleSquareWebhookOrder = internalAction({
  args: {
    merchantId: v.string(),
    orderId: v.string(),
    recordedAt: v.number(),
  },
  handler: async (ctx, { merchantId, orderId, recordedAt }) => {
    const connection = await ctx.runQuery(
      internal.functions.squareReconciliation.getConnectionByMerchantId,
      { externalMerchantId: merchantId },
    );
    if (!connection?.encryptedTokens) return;

    let accessToken: string;
    try {
      const tokens = await decryptConnectionTokens(connection.encryptedTokens);
      accessToken = tokens.accessToken;
    } catch {
      return;
    }

    let order: unknown;
    try {
      const res = await fetch(`${SQUARE_BASE_URL}/v2/orders/${orderId}`, {
        headers: squareAuthHeaders(accessToken),
      });

      if (res.status === 401) {
        await ctx.runMutation(internal.functions.posConnections.markConnectionExpiredOrRevoked, {
          connectionId: connection._id,
          status: "expired",
        });
        return;
      }

      if (!res.ok) return;

      const data = (await res.json()) as { order?: unknown };
      order = data.order;
    } catch {
      return;
    }

    if (!order) return;

    const ourCatalogIds = await ctx.runQuery(
      internal.functions.squareReconciliation.getOurCatalogIds,
      { businessId: connection.businessId },
    );

    const events = mapSquareOrderToRedemptions(order as Parameters<typeof mapSquareOrderToRedemptions>[0], ourCatalogIds);
    if (events.length === 0) return;

    await ctx.runMutation(
      internal.functions.squareReconciliation.upsertSquareRedemptionEvents,
      { businessId: connection.businessId, events, recordedAt },
    );
  },
});

// Polling backstop: called by cron. Searches Square Orders API for each connected
// merchant since lastReconciledAt and upserts matching redemption events.
// Advances lastReconciledAt on success; skips silently on error.
export const pollSquareOrders = internalAction({
  args: {},
  handler: async (ctx) => {
    const connections = await ctx.runQuery(
      internal.functions.squareReconciliation.getConnectedSquareConnections,
      {},
    );

    for (const connection of connections) {
      if (!connection.encryptedTokens) continue;

      let accessToken: string;
      try {
        const tokens = await decryptConnectionTokens(connection.encryptedTokens);
        accessToken = tokens.accessToken;
      } catch {
        continue;
      }

      // Poll from lastReconciledAt, defaulting to 7 days ago if never polled
      const since = connection.lastReconciledAt
        ? new Date(connection.lastReconciledAt).toISOString()
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // SearchOrders requires location_ids — fetch the merchant's locations first.
      let locationIds: string[];
      try {
        const locRes = await fetch(`${SQUARE_BASE_URL}/v2/locations`, {
          headers: squareAuthHeaders(accessToken),
        });

        if (locRes.status === 401) {
          await ctx.runMutation(internal.functions.posConnections.markConnectionExpiredOrRevoked, {
            connectionId: connection._id,
            status: "expired",
          });
          continue;
        }

        if (!locRes.ok) continue;

        const locData = (await locRes.json()) as {
          locations?: { id?: string }[];
        };
        locationIds = (locData.locations ?? [])
          .map((l) => l.id)
          .filter((id): id is string => id !== undefined);
      } catch {
        continue;
      }

      if (locationIds.length === 0) continue;

      let orders: Parameters<typeof mapSquareOrderToRedemptions>[0][];
      try {
        const res = await fetch(`${SQUARE_BASE_URL}/v2/orders/search`, {
          method: "POST",
          headers: {
            ...squareAuthHeaders(accessToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location_ids: locationIds,
            query: {
              filter: {
                state_filter: { states: ["COMPLETED"] },
                date_time_filter: { updated_at: { start_at: since } },
              },
              // Square requires the sort field to match the date_time_filter field.
              sort: { sort_field: "UPDATED_AT", sort_order: "ASC" },
            },
          }),
        });

        if (res.status === 401) {
          await ctx.runMutation(internal.functions.posConnections.markConnectionExpiredOrRevoked, {
            connectionId: connection._id,
            status: "expired",
          });
          continue;
        }

        if (!res.ok) continue;

        const data = (await res.json()) as { orders?: unknown[] };
        orders = (data.orders ?? []) as Parameters<typeof mapSquareOrderToRedemptions>[0][];
      } catch {
        continue;
      }

      const ourCatalogIds = await ctx.runQuery(
        internal.functions.squareReconciliation.getOurCatalogIds,
        { businessId: connection.businessId },
      );

      const allEvents = orders.flatMap((order) =>
        mapSquareOrderToRedemptions(order, ourCatalogIds),
      );

      const now = Date.now();

      if (allEvents.length > 0) {
        await ctx.runMutation(
          internal.functions.squareReconciliation.upsertSquareRedemptionEvents,
          { businessId: connection.businessId, events: allEvents, recordedAt: now },
        );
      }

      await ctx.runMutation(
        internal.functions.squareReconciliation.advanceLastReconciledAt,
        { connectionId: connection._id, reconciledAt: now },
      );
    }
  },
});
