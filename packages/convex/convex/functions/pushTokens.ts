import { internalAction, internalQuery, mutation } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

export const registerPushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const customerId = await requireAuth(ctx);

    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { token, registeredAt: Date.now() });
    } else {
      await ctx.db.insert("pushTokens", {
        customerId,
        token,
        registeredAt: Date.now(),
      });
    }
  },
});

export const getTokensForCustomers = internalQuery({
  args: { customerIds: v.array(v.string()) },
  handler: async (ctx, { customerIds }) => {
    const results = await Promise.all(
      customerIds.map((customerId) =>
        ctx.db
          .query("pushTokens")
          .withIndex("by_customer", (q) => q.eq("customerId", customerId))
          .first(),
      ),
    );
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

export const sendVoucherPushNotifications = internalAction({
  args: {
    businessId: v.id("businesses"),
    voucherId: v.id("vouchers"),
    businessName: v.string(),
    voucherTitle: v.string(),
  },
  handler: async (ctx, { businessId, voucherId, businessName, voucherTitle }) => {
    const followers = await ctx.runQuery(
      api.functions.follows.getFollowersByBusiness,
      { businessId },
    );

    if (followers.length === 0) return;

    const customerIds = followers.map((f) => f.customerId);
    const tokenRecords = await ctx.runQuery(
      internal.functions.pushTokens.getTokensForCustomers,
      { customerIds },
    );

    if (tokenRecords.length === 0) return;

    const messages = tokenRecords.map((record) => ({
      to: record.token,
      title: businessName,
      body: `New voucher: ${voucherTitle}`,
      data: { businessId, voucherId },
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });
  },
});
