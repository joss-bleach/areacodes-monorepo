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
  })
    .index("by_user", ["userId"])
    .index("by_slug", ["slug"])
    .index("by_industry", ["industryId"]),

  vouchers: defineTable({
    businessId: v.id("businesses"),
    userId: v.string(),
    title: v.string(),
    description: v.string(),
    voucherFormat: v.union(
      v.literal("barcode"),
      v.literal("qr_code"),
      v.literal("generated_text")
    ),
    voucherStorageId: v.optional(v.id("_storage")),
    voucherGenCode: v.optional(v.string()),
    voucherTerms: v.optional(v.string()),
    voucherValidFrom: v.number(),
    voucherValidTo: v.number(),
    deletedAt: v.optional(v.number()),
    flaggedAt: v.optional(v.number()),
  })
    .index("by_business", ["businessId"])
    .index("by_user", ["userId"])
    .index("by_valid_to", ["voucherValidTo"]),

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
    redeemedAt: v.optional(v.number()),
  }).index("by_claim", ["claimId"]),

  posConnections: defineTable({
    businessId: v.id("businesses"),
    provider: v.union(v.literal("square"), v.literal("zettle")),
    credentials: v.string(),
    connectedAt: v.number(),
  }),

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
});
