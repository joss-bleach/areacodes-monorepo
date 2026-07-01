import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  industries: defineTable({
    name: v.string(),
    category: v.string(),
    slug: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"]),

  businesses: defineTable({
    userId: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    websiteUrl: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    industryId: v.id("industries"),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    deletedAt: v.optional(v.number()),
    flaggedAt: v.optional(v.number()),
    invitationSentAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_slug", ["slug"])
    .index("by_industry", ["industryId"]),

  vouchers: defineTable({
    businessId: v.id("businesses"),
    userId: v.string(),
    title: v.string(),
    description: v.string(),
    provider: v.union(v.literal("square"), v.literal("manual")),
    discount: v.object({
      kind: v.union(
        v.literal("percentage"),
        v.literal("fixed_amount"),
        v.literal("free_item"),
        v.literal("bogof"),
        v.literal("custom"),
      ),
      value: v.optional(v.number()),
      currency: v.optional(v.string()),
      itemName: v.optional(v.string()),
      customText: v.optional(v.string()),
    }),
    provisioning: v.object({
      status: v.union(
        v.literal("not_required"),
        v.literal("pending"),
        v.literal("provisioned"),
        v.literal("failed"),
      ),
      externalId: v.optional(v.string()),
      lastError: v.optional(v.string()),
      lastAttemptAt: v.optional(v.number()),
      provisionedAt: v.optional(v.number()),
    }),
    voucherTerms: v.optional(v.string()),
    voucherValidFrom: v.number(),
    voucherValidTo: v.number(),
    deletedAt: v.optional(v.number()),
    flaggedAt: v.optional(v.number()),
  })
    .index("by_business", ["businessId"])
    .index("by_user", ["userId"])
    .index("by_valid_to", ["voucherValidTo"])
    .index("by_provisioning_status", ["provisioning.status"]),

  redemptionEvents: defineTable({
    voucherId: v.id("vouchers"),
    businessId: v.id("businesses"),
    source: v.union(v.literal("square"), v.literal("manual")),
    trustTier: v.union(v.literal("square"), v.literal("manual")),
    occurredAt: v.number(),
    recordedAt: v.number(),
    claimId: v.optional(v.id("claims")),
    customerId: v.optional(v.string()),
    providerOrderRef: v.optional(v.string()),
    amountDiscounted: v.optional(v.number()),
    idempotencyKey: v.string(),
  })
    .index("by_voucher", ["voucherId"])
    .index("by_business", ["businessId"])
    .index("by_idempotency", ["idempotencyKey"]),

  redemptionAuth: defineTable({
    businessId: v.id("businesses"),
    redemptionPinHash: v.string(),
    redemptionPinSetAt: v.number(),
  }).index("by_business", ["businessId"]),

  auditLog: defineTable({
    userId: v.string(),
    action: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  claims: defineTable({
    customerId: v.string(),
    voucherId: v.id("vouchers"),
    claimedAt: v.number(),
  }).index("by_customer_voucher", ["customerId", "voucherId"]),

  reveals: defineTable({
    claimId: v.id("claims"),
    voucherCode: v.string(),
    revealedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_claim", ["claimId"])
    .index("by_voucher_code", ["voucherCode"]),

  posConnections: defineTable({
    businessId: v.id("businesses"),
    provider: v.literal("square"),
    status: v.union(
      v.literal("connected"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    externalMerchantId: v.string(),
    scopes: v.array(v.string()),
    encryptedTokens: v.string(),
    encryptionKeyVersion: v.string(),
    tokenExpiresAt: v.number(),
    lastReconciledAt: v.optional(v.number()),
    connectedAt: v.number(),
  })
    .index("by_business", ["businessId"])
    .index("by_external_merchant", ["externalMerchantId"]),

  subscriptions: defineTable({
    businessId: v.id("businesses"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.string(),
    trialEnd: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    priceId: v.optional(v.string()),
    lastStripeEventId: v.optional(v.string()),
  })
    .index("by_business", ["businessId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),

  follows: defineTable({
    customerId: v.string(),
    businessId: v.id("businesses"),
    followedAt: v.number(),
  })
    .index("by_customer_business", ["customerId", "businessId"])
    .index("by_business", ["businessId"]),

  pushTokens: defineTable({
    customerId: v.string(),
    token: v.string(),
    registeredAt: v.number(),
  }).index("by_customer", ["customerId"]),

  config: defineTable({
    activePilotFeatures: v.array(v.string()),
  }),

  posthogWeeklyViews: defineTable({
    weekStart: v.number(),
    viewCount: v.number(),
    syncedAt: v.number(),
  }).index("by_week_start", ["weekStart"]),
});
