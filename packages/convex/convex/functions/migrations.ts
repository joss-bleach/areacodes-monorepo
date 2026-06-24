import { internalMutation } from "../_generated/server";

// One-time migration: rename clerkUserId → userId on businesses and vouchers.
// Run with: bunx convex run functions/migrations:fixClerkUserId
export const fixClerkUserId = internalMutation({
  args: {},
  handler: async (ctx) => {
    const businesses = await ctx.db.query("businesses").collect();
    let businessFixed = 0;
    for (const b of businesses) {
      const raw = b as Record<string, unknown>;
      if (raw.clerkUserId) {
        const { clerkUserId: _, ...rest } = raw as { clerkUserId: string } & typeof b;
        await ctx.db.replace(b._id, {
          ...rest,
          userId: (raw.userId ?? raw.clerkUserId) as string,
        });
        businessFixed++;
      }
    }

    const vouchers = await ctx.db.query("vouchers").collect();
    let voucherFixed = 0;
    for (const v of vouchers) {
      const raw = v as Record<string, unknown>;
      if (raw.clerkUserId) {
        const { clerkUserId: _, ...rest } = raw as { clerkUserId: string } & typeof v;
        await ctx.db.replace(v._id, {
          ...rest,
          userId: (raw.userId ?? raw.clerkUserId) as string,
        });
        voucherFixed++;
      }
    }

    return { businessFixed, voucherFixed };
  },
});
