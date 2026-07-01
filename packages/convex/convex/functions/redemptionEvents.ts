import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { validateManualBurn, deriveManualIdempotencyKey } from "@areacodes/domain";

// ── Public query — staff redemption page ──────────────────────────────────────
// Returns all data needed to render the staff redemption page.
// No auth required: the URL (voucherId + claimId) is the authorization token.

export const getStaffRedemptionPage = query({
  args: {
    voucherId: v.id("vouchers"),
    claimId: v.id("claims"),
  },
  handler: async (ctx, { voucherId, claimId }) => {
    const voucher = await ctx.db.get(voucherId);
    if (!voucher) return null;

    const claim = await ctx.db.get(claimId);
    if (!claim || claim.voucherId !== voucherId) return null;

    const business = await ctx.db.get(voucher.businessId);
    if (!business) return null;

    const pinRecord = await ctx.db
      .query("redemptionAuth")
      .withIndex("by_business", (q) => q.eq("businessId", voucher.businessId))
      .first();

    const idempotencyKey = deriveManualIdempotencyKey(claimId);
    const existing = await ctx.db
      .query("redemptionEvents")
      .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();

    return {
      voucher: {
        _id: voucher._id,
        title: voucher.title,
        description: voucher.description,
        discount: voucher.discount,
        voucherValidFrom: voucher.voucherValidFrom,
        voucherValidTo: voucher.voucherValidTo,
        voucherTerms: voucher.voucherTerms,
        provider: voucher.provider,
      },
      claim: {
        _id: claim._id,
        customerId: claim.customerId,
      },
      businessId: voucher.businessId,
      businessName: business.name,
      isRedeemed: existing !== null,
      pinSetAt: pinRecord?.redemptionPinSetAt ?? null,
    };
  },
});

// ── Public mutation — burn a Manual voucher ────────────────────────────────────
// Validates the claim and writes a redemptionEvent.
// Idempotent: a second call with the same claimId is a silent no-op.
// `now` is passed as an arg so tests can control time.

export const burnManualVoucher = mutation({
  args: {
    voucherId: v.id("vouchers"),
    claimId: v.id("claims"),
    businessId: v.id("businesses"),
    now: v.number(),
  },
  handler: async (ctx, { voucherId, claimId, businessId, now }) => {
    // Idempotency: return early if already burned
    const idempotencyKey = deriveManualIdempotencyKey(claimId);
    const existing = await ctx.db
      .query("redemptionEvents")
      .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();
    if (existing !== null) return;

    const voucher = await ctx.db.get(voucherId);
    if (!voucher) throw new Error("Voucher not found");

    const claim = await ctx.db.get(claimId);
    if (!claim) throw new Error("Claim not found");

    // Verify this claim belongs to this voucher
    if (claim.voucherId !== voucherId) {
      throw new Error("Claim does not belong to this voucher");
    }

    const validation = validateManualBurn({
      voucher: {
        deletedAt: voucher.deletedAt,
        flaggedAt: voucher.flaggedAt,
        voucherValidFrom: voucher.voucherValidFrom,
        voucherValidTo: voucher.voucherValidTo,
        businessId: voucher.businessId,
        provider: voucher.provider,
        provisioning: { status: voucher.provisioning.status },
      },
      claimId,
      businessId,
      now,
      alreadyBurned: false,
    });

    if (!validation.valid) {
      throw new Error(`Cannot burn voucher: ${validation.reason}`);
    }

    await ctx.db.insert("redemptionEvents", {
      voucherId,
      businessId: voucher.businessId as Id<"businesses">,
      source: "manual",
      trustTier: "manual",
      occurredAt: now,
      recordedAt: now,
      claimId,
      customerId: claim.customerId,
      idempotencyKey,
    });
  },
});

// ── Public query — check if a claim has been burned ───────────────────────────
// Used by the customer wallet to determine Redeemed state.

export const getRedemptionEventByClaim = query({
  args: { claimId: v.id("claims") },
  handler: async (ctx, { claimId }) => {
    return ctx.db
      .query("redemptionEvents")
      .withIndex("by_idempotency", (q) =>
        q.eq("idempotencyKey", deriveManualIdempotencyKey(claimId)),
      )
      .first();
  },
});
