import { internalMutation, mutation } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

export const seedMockData = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", "ten-tonne-tattoos"))
      .first();
    if (existing) return { skipped: true, reason: "already seeded" };

    const now = Date.now();
    const in30 = now + 30 * 24 * 60 * 60 * 1000;
    const in60 = now + 60 * 24 * 60 * 60 * 1000;
    const userId = "seed";

    const tattooInd = await ctx.db.insert("industries", { name: "Tattoos & Piercing", category: "Beauty", slug: "tattoos-piercing" });
    const coffeeInd = await ctx.db.insert("industries", { name: "Coffee", category: "Food & Drink", slug: "coffee" });
    const barInd = await ctx.db.insert("industries", { name: "Bar", category: "Food & Drink", slug: "bar" });
    const cafeInd = await ctx.db.insert("industries", { name: "Café", category: "Food & Drink", slug: "cafe" });
    const shopInd = await ctx.db.insert("industries", { name: "Shop", category: "Retail", slug: "shop" });
    const floristInd = await ctx.db.insert("industries", { name: "Florist", category: "Retail", slug: "florist" });

    const b1 = await ctx.db.insert("businesses", {
      userId, name: "Ten Tonne Tattoos", slug: "ten-tonne-tattoos",
      description: "Tattoos and piercings in the heart of Brighton",
      websiteUrl: "https://tentonnetattoos.co.uk",
      address: "12 Gardner Street, Brighton BN1 1UP",
      latitude: 50.8218, longitude: -0.1374, industryId: tattooInd,
    });
    await ctx.db.insert("vouchers", {
      businessId: b1, userId,
      provider: "manual",
      discount: { kind: "custom", customText: "£50 small tattoos and two for £90" },
      provisioning: { status: "not_required" },
      title: "Walk in Wednesday",
      description: "£50 small tattoos and two for £90. All Wednesdays, June–August 2026.",
      voucherValidFrom: now, voucherValidTo: in60,
    });

    const b2 = await ctx.db.insert("businesses", {
      userId, name: "Your Local Coffee", slug: "your-local-coffee",
      description: "Specialty coffee and fresh bakes in the North Laine.",
      websiteUrl: "https://yourlocalcoffee.co.uk",
      address: "34 Sydney Street, Brighton BN1 4EP",
      latitude: 50.8265, longitude: -0.1389, industryId: coffeeInd,
    });
    await ctx.db.insert("vouchers", {
      businessId: b2, userId,
      provider: "manual",
      discount: { kind: "free_item", itemName: "pastry" },
      provisioning: { status: "not_required" },
      title: "Free pastry with a large",
      description: "Get a free pastry with any large hot drink, every day until end of July.",
      voucherValidFrom: now, voucherValidTo: in30,
    });

    const b3 = await ctx.db.insert("businesses", {
      userId, name: "Neon & Nostalgia", slug: "neon-and-nostalgia",
      description: "Retro arcade bar with craft beers and cocktails.",
      websiteUrl: "https://neonandnostalgia.co.uk",
      address: "7 Pool Valley, Brighton BN1 1NJ",
      latitude: 50.8195, longitude: -0.1413, industryId: barInd,
    });
    await ctx.db.insert("vouchers", {
      businessId: b3, userId,
      provider: "manual",
      discount: { kind: "fixed_amount", value: 3500, currency: "GBP" },
      provisioning: { status: "not_required" },
      title: "High Score Date Night",
      description: "Two cocktails + unlimited arcade play for £35. Fridays and Saturdays.",
      voucherValidFrom: now, voucherValidTo: in30,
    });

    const b4 = await ctx.db.insert("businesses", {
      userId, name: "Cracked Mug & Bookery", slug: "cracked-mug-bookery",
      description: "Second-hand books, specialty teas, and cosy reading nooks.",
      websiteUrl: "https://crackedmugbookery.co.uk",
      address: "55 Gloucester Road, Brighton BN1 4AQ",
      latitude: 50.8301, longitude: -0.1357, industryId: cafeInd,
    });
    await ctx.db.insert("vouchers", {
      businessId: b4, userId,
      provider: "manual",
      discount: { kind: "custom", customText: "Private reading session with tea" },
      provisioning: { status: "not_required" },
      title: "Midnight page-turner pass",
      description: "Stay after closing for a private reading session with tea included. Fridays only.",
      voucherValidFrom: now, voucherValidTo: in60,
    });

    const b5 = await ctx.db.insert("businesses", {
      userId, name: "Whittle & Wave", slug: "whittle-and-wave",
      description: "Handcrafted wooden homewares made in Brighton.",
      websiteUrl: "https://whittleandwave.co.uk",
      address: "22 Church Road, Hove BN3 2FN",
      latitude: 50.8289, longitude: -0.1621, industryId: shopInd,
    });
    await ctx.db.insert("vouchers", {
      businessId: b5, userId,
      provider: "manual",
      discount: { kind: "custom", customText: "Free personalised engraving on any item over £40" },
      provisioning: { status: "not_required" },
      title: "Custom Engraving Upgrade",
      description: "Free personalised engraving on any item over £40.",
      voucherValidFrom: now, voucherValidTo: in30,
    });

    const b6 = await ctx.db.insert("businesses", {
      userId, name: "Root & Radical", slug: "root-and-radical",
      description: "Independent florist specialising in wild and seasonal arrangements.",
      websiteUrl: "https://rootandradical.co.uk",
      address: "88 Western Road, Brighton BN1 2LB",
      latitude: 50.8234, longitude: -0.1512, industryId: floristInd,
    });
    await ctx.db.insert("vouchers", {
      businessId: b6, userId,
      provider: "manual",
      discount: { kind: "custom", customText: "10 stamps = free seasonal bouquet" },
      provisioning: { status: "not_required" },
      title: '"Mystery Cutting" Punch Card',
      description: "10 stamps gets you a free seasonal bouquet, chosen by our florists.",
      voucherValidFrom: now, voucherValidTo: in60,
    });

    return { seeded: true, businesses: 6, vouchers: 6, industries: 6 };
  },
});

export const clearUsersExceptAdmin = mutation({
  args: { keepEmail: v.string() },
  handler: async (ctx, { keepEmail }) => {
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "user",
        where: [{ field: "email", operator: "ne", value: keepEmail }],
      },
      paginationOpts: { cursor: null, numItems: 1000 },
    });
    return { done: true };
  },
});

export const clearBusinessesAndVouchers = mutation({
  args: {},
  handler: async (ctx) => {
    const vouchers = await ctx.db.query("vouchers").collect();
    await Promise.all(vouchers.map((v) => ctx.db.delete(v._id)));

    const businesses = await ctx.db.query("businesses").collect();
    await Promise.all(businesses.map((b) => ctx.db.delete(b._id)));

    return { deleted: { vouchers: vouchers.length, businesses: businesses.length } };
  },
});

export const seedAdminUser = internalMutation({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, { email, name }) => {
    const existing = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", value: email }],
    });
    if (existing) return { skipped: true, reason: "user already exists" };

    const now = Date.now();
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name,
          email,
          emailVerified: true,
          role: "admin",
          createdAt: now,
          updatedAt: now,
        },
      },
    });
    return { created: true, email };
  },
});
