import { internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { decryptConnectionTokens } from "./posConnections";
import { mapDiscountToCatalogObject } from "@areacodes/domain";

const SQUARE_BASE_URL =
  process.env.SQUARE_BASE_URL ?? "https://connect.squareupsandbox.com";

// ── Internal mutations ─────────────────────────────────────────────────────────

export const setProvisioningProvisioned = internalMutation({
  args: {
    voucherId: v.id("vouchers"),
    catalogObjectId: v.string(),
    provisionedAt: v.number(),
  },
  handler: async (ctx, { voucherId, catalogObjectId, provisionedAt }) => {
    await ctx.db.patch(voucherId, {
      provisioning: {
        status: "provisioned",
        externalId: catalogObjectId,
        provisionedAt,
      },
    });
  },
});

export const setProvisioningFailed = internalMutation({
  args: {
    voucherId: v.id("vouchers"),
    lastError: v.string(),
    lastAttemptAt: v.number(),
  },
  handler: async (ctx, { voucherId, lastError, lastAttemptAt }) => {
    const voucher = await ctx.db.get(voucherId);
    if (!voucher) return;
    await ctx.db.patch(voucherId, {
      provisioning: {
        ...voucher.provisioning,
        status: "failed",
        lastError,
        lastAttemptAt,
      },
    });
  },
});

export const clearProvisioning = internalMutation({
  args: { voucherId: v.id("vouchers") },
  handler: async (ctx, { voucherId }) => {
    await ctx.db.patch(voucherId, {
      provisioning: { status: "not_required" },
    });
  },
});

// ── Provision a single voucher ─────────────────────────────────────────────────

export const provisionVoucher = internalAction({
  args: { voucherId: v.id("vouchers") },
  handler: async (ctx, { voucherId }) => {
    const voucher = await ctx.runQuery(
      internal.functions.squareProvisioner.getVoucherForProvisioning,
      { voucherId },
    );

    if (!voucher) return;
    if (voucher.provider !== "square") return;

    const connection = await ctx.runQuery(
      internal.functions.squareProvisioner.getActiveSquareConnection,
      { businessId: voucher.businessId },
    );

    const now = Date.now();

    if (!connection?.encryptedTokens) {
      await ctx.runMutation(internal.functions.squareProvisioner.setProvisioningFailed, {
        voucherId,
        lastError: "No active Square connection found",
        lastAttemptAt: now,
      });
      return;
    }

    let accessToken: string;
    try {
      const tokens = await decryptConnectionTokens(connection.encryptedTokens);
      accessToken = tokens.accessToken;
    } catch (err) {
      await ctx.runMutation(internal.functions.squareProvisioner.setProvisioningFailed, {
        voucherId,
        lastError: "Failed to decrypt Square credentials",
        lastAttemptAt: now,
      });
      return;
    }

    const idempotencyKey = `areacodes-${voucherId}`;
    const catalogRequest = mapDiscountToCatalogObject(voucher.title, voucher.discount);
    const body = { ...catalogRequest, idempotency_key: idempotencyKey };

    try {
      const res = await fetch(`${SQUARE_BASE_URL}/v2/catalog/object`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-01-17",
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        await ctx.runMutation(internal.functions.squareProvisioner.setProvisioningFailed, {
          voucherId,
          lastError: "Square authorization failed — reconnect your Square account",
          lastAttemptAt: now,
        });
        return;
      }

      if (res.status === 429) {
        await ctx.runMutation(internal.functions.squareProvisioner.setProvisioningFailed, {
          voucherId,
          lastError: "Square rate limit exceeded — will retry",
          lastAttemptAt: now,
        });
        return;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        await ctx.runMutation(internal.functions.squareProvisioner.setProvisioningFailed, {
          voucherId,
          lastError: `Square API error (${res.status}): ${body.slice(0, 200)}`,
          lastAttemptAt: now,
        });
        return;
      }

      const data = (await res.json()) as {
        catalog_object?: { id?: string };
      };
      const catalogObjectId = data.catalog_object?.id;

      if (!catalogObjectId) {
        await ctx.runMutation(internal.functions.squareProvisioner.setProvisioningFailed, {
          voucherId,
          lastError: "Square returned no catalog object ID",
          lastAttemptAt: now,
        });
        return;
      }

      await ctx.runMutation(
        internal.functions.squareProvisioner.setProvisioningProvisioned,
        { voucherId, catalogObjectId, provisionedAt: now },
      );
    } catch (err) {
      await ctx.runMutation(internal.functions.squareProvisioner.setProvisioningFailed, {
        voucherId,
        lastError: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        lastAttemptAt: now,
      });
    }
  },
});

// ── Best-effort deprovision ───────────────────────────────────────────────────

export const deprovisionVoucher = internalAction({
  args: {
    voucherId: v.id("vouchers"),
    catalogObjectId: v.string(),
    encryptedTokens: v.string(),
  },
  handler: async (ctx, { voucherId, catalogObjectId, encryptedTokens }) => {
    let accessToken: string;
    try {
      const tokens = await decryptConnectionTokens(encryptedTokens);
      accessToken = tokens.accessToken;
    } catch {
      // Best-effort: if we can't decrypt, just clear the provisioning record
      await ctx.runMutation(internal.functions.squareProvisioner.clearProvisioning, {
        voucherId,
      });
      return;
    }

    try {
      await fetch(`${SQUARE_BASE_URL}/v2/catalog/object/${catalogObjectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Square-Version": "2024-01-17",
        },
      });
    } catch {
      // Best-effort: swallow errors on delete
    }

    await ctx.runMutation(internal.functions.squareProvisioner.clearProvisioning, {
      voucherId,
    });
  },
});

// ── Retry cron handler ─────────────────────────────────────────────────────────

export const retryPendingAndFailed = internalAction({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.runQuery(
      internal.functions.squareProvisioner.getVouchersByProvisioningStatus,
      { status: "pending" },
    );
    const failed = await ctx.runQuery(
      internal.functions.squareProvisioner.getVouchersByProvisioningStatus,
      { status: "failed" },
    );

    const toRetry = [...pending, ...failed];

    for (const voucher of toRetry) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.squareProvisioner.provisionVoucher,
        { voucherId: voucher._id },
      );
    }
  },
});

// ── Internal queries (used by internalActions only) ───────────────────────────

import { internalQuery } from "../_generated/server";

export const getVoucherForProvisioning = internalQuery({
  args: { voucherId: v.id("vouchers") },
  handler: async (ctx, { voucherId }) => {
    return ctx.db.get(voucherId);
  },
});

export const getActiveSquareConnection = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    return ctx.db
      .query("posConnections")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), "square"),
          q.eq(q.field("status"), "connected"),
        ),
      )
      .first();
  },
});

export const getVouchersByProvisioningStatus = internalQuery({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("failed"),
      v.literal("provisioned"),
      v.literal("not_required"),
    ),
  },
  handler: async (ctx, { status }) => {
    return ctx.db
      .query("vouchers")
      .withIndex("by_provisioning_status", (q) =>
        q.eq("provisioning.status", status),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.eq(q.field("provider"), "square"),
        ),
      )
      .collect();
  },
});

// ── Deprovision all vouchers for a business (on disconnect) ───────────────────

export const deprovisionAllForBusiness = internalAction({
  args: {
    businessId: v.id("businesses"),
    encryptedTokens: v.string(),
  },
  handler: async (ctx, { businessId, encryptedTokens }) => {
    const provisioned = await ctx.runQuery(
      internal.functions.squareProvisioner.getProvisionedVouchersByBusiness,
      { businessId },
    );

    for (const voucher of provisioned) {
      if (voucher.provisioning.externalId) {
        await ctx.scheduler.runAfter(
          0,
          internal.functions.squareProvisioner.deprovisionVoucher,
          {
            voucherId: voucher._id,
            catalogObjectId: voucher.provisioning.externalId,
            encryptedTokens,
          },
        );
      } else {
        // Pending/failed — just clear the record
        await ctx.runMutation(internal.functions.squareProvisioner.clearProvisioning, {
          voucherId: voucher._id,
        });
      }
    }
  },
});

export const getProvisionedVouchersByBusiness = internalQuery({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    return ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.eq(q.field("provider"), "square"),
        ),
      )
      .collect();
  },
});
