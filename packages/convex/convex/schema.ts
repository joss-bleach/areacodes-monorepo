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
    clerkUserId: v.string(),
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
  })
    .index("by_clerk_user", ["clerkUserId"])
    .index("by_slug", ["slug"])
    .index("by_industry", ["industryId"]),

  vouchers: defineTable({
    businessId: v.id("businesses"),
    clerkUserId: v.string(),
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
  })
    .index("by_business", ["businessId"])
    .index("by_clerk_user", ["clerkUserId"])
    .index("by_valid_to", ["voucherValidTo"]),

  auditLog: defineTable({
    adminClerkUserId: v.string(),
    action: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),
});
