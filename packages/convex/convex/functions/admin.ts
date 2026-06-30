import { mutation, query, internalAction } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Effect, Layer } from "effect";
import {
  BusinessRepo,
  type IBusinessRepo,
  AdminBusinessService,
  AuthAdminPort,
  EmailPort,
  AuthAdminError,
  type IAuthAdminPort,
  type IEmailPort,
} from "@areacodes/domain";
import { authComponent, createAuth } from "../betterAuth/auth";
import type { Id } from "../_generated/dataModel";

async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  // Better Auth's convex() plugin includes all user fields in the JWT payload,
  // so role is available as a claim on the identity token.
  if ((identity as { role?: string }).role !== "admin")
    throw new Error("Forbidden: Admin only");
  return identity.subject;
}

export const getAllBusinesses = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const businesses = await ctx.db.query("businesses").collect();
    return await Promise.all(
      businesses.map(async (business) => {
        const industry = await ctx.db.get(business.industryId);
        const logoUrl = business.logoStorageId
          ? await ctx.storage.getUrl(business.logoStorageId)
          : null;
        const authUser = await authComponent.getAnyUserById(ctx, business.userId).catch(() => null);
        const hasLoggedIn = authUser?.emailVerified ?? false;
        const ownerEmail = (authUser as { email?: string } | null)?.email ?? null;
        return { ...business, logoUrl, industry, hasLoggedIn, ownerEmail };
      })
    );
  },
});

export const getAllVouchers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const vouchers = await ctx.db.query("vouchers").collect();
    return await Promise.all(
      vouchers.map(async (voucher) => {
        const business = await ctx.db.get(voucher.businessId);
        const voucherUrl = voucher.voucherStorageId
          ? await ctx.storage.getUrl(voucher.voucherStorageId)
          : null;
        return { ...voucher, voucherUrl, business };
      })
    );
  },
});

export const getAuditLog = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("auditLog")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

export const flagBusiness = mutation({
  args: {
    businessId: v.id("businesses"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { businessId, notes }) => {
    const userId = await requireAdmin(ctx);
    const business = await ctx.db.get(businessId);
    if (!business) throw new Error("Business not found");

    const now = Date.now();
    await ctx.db.patch(businessId, { flaggedAt: now });

    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect();
    for (const voucher of vouchers) {
      if (!voucher.deletedAt) {
        await ctx.db.patch(voucher._id, { flaggedAt: now });
      }
    }

    await ctx.db.insert("auditLog", {
      userId,
      action: "flag_business",
      targetType: "business",
      targetId: businessId,
      notes,
      createdAt: now,
    });

    return { success: true };
  },
});

export const reinstateBusiness = mutation({
  args: {
    businessId: v.id("businesses"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { businessId, notes }) => {
    const userId = await requireAdmin(ctx);
    const business = await ctx.db.get(businessId);
    if (!business) throw new Error("Business not found");

    await ctx.db.patch(businessId, { flaggedAt: undefined });

    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect();
    for (const voucher of vouchers) {
      if (voucher.flaggedAt !== undefined) {
        await ctx.db.patch(voucher._id, { flaggedAt: undefined });
      }
    }

    const now = Date.now();
    await ctx.db.insert("auditLog", {
      userId,
      action: "reinstate_business",
      targetType: "business",
      targetId: businessId,
      notes,
      createdAt: now,
    });

    return { success: true };
  },
});

export const removeVoucher = mutation({
  args: {
    voucherId: v.id("vouchers"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { voucherId, notes }) => {
    const userId = await requireAdmin(ctx);
    const voucher = await ctx.db.get(voucherId);
    if (!voucher) throw new Error("Voucher not found");

    await ctx.db.patch(voucherId, { flaggedAt: Date.now() });

    await ctx.db.insert("auditLog", {
      userId,
      action: "remove_voucher",
      targetType: "voucher",
      targetId: voucherId,
      notes,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

function makeConvexRepo(ctx: MutationCtx): IBusinessRepo {
  return {
    findBySlug: (slug) =>
      Effect.promise(() =>
        ctx.db
          .query("businesses")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first(),
      ),
    findById: (id) =>
      Effect.promise(() => ctx.db.get(id as Id<"businesses">)),
    insert: (data) =>
      Effect.promise(async () => {
        const id = await ctx.db.insert("businesses", {
          userId: data.userId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          websiteUrl: data.websiteUrl,
          industryId: data.industryId as Id<"industries">,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          logoStorageId: data.logoStorageId as Id<"_storage"> | undefined,
          invitationSentAt: Date.now(),
        });
        return id as unknown as string;
      }),
    patch: (id, data) =>
      Effect.promise(async () => {
        await ctx.db.patch(id as Id<"businesses">, {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.websiteUrl !== undefined ? { websiteUrl: data.websiteUrl } : {}),
          ...(data.industryId !== undefined
            ? { industryId: data.industryId as Id<"industries"> }
            : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
          ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
          ...(Object.prototype.hasOwnProperty.call(data, "logoStorageId")
            ? { logoStorageId: data.logoStorageId as Id<"_storage"> | undefined }
            : {}),
          ...(data.deletedAt !== undefined ? { deletedAt: data.deletedAt } : {}),
        });
      }),
    findVouchersByBusiness: (businessId) =>
      Effect.promise(() =>
        ctx.db
          .query("vouchers")
          .withIndex("by_business", (q) =>
            q.eq("businessId", businessId as Id<"businesses">),
          )
          .collect(),
      ),
    patchVoucher: (id, data) =>
      Effect.promise(async () => {
        await ctx.db.patch(id as Id<"vouchers">, { deletedAt: data.deletedAt });
      }),
    deleteStorage: (storageId) =>
      Effect.promise(async () => {
        await ctx.storage.delete(storageId as Id<"_storage">);
      }),
  };
}

export const addBusinessByAdmin = mutation({
  args: {
    name: v.string(),
    ownerEmail: v.string(),
    description: v.string(),
    websiteUrl: v.string(),
    industryId: v.id("industries"),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    logoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    // Type the admin API — the admin plugin adds .api.admin.createUser when configured
    type BetterAuthAdminApi = {
      admin: {
        createUser: (opts: {
          body: { email: string; name: string; role?: string; password?: string };
          headers?: Headers;
        }) => Promise<{ user: { id: string; email: string } }>;
      };
    };
    const adminApi = auth.api as unknown as BetterAuthAdminApi;

    const authAdminImpl: IAuthAdminPort = {
      createUser: (email, name) =>
        Effect.tryPromise({
          try: async () => {
            const response = await adminApi.admin.createUser({
              body: { email, name, role: "business" },
              headers,
            });
            return response.user.id;
          },
          catch: (e) => new AuthAdminError({ message: String(e) }),
        }),
    };

    const emailImpl: IEmailPort = {
      sendInvitation: (to, businessName) =>
        Effect.promise(() =>
          ctx.scheduler.runAfter(0, internal.functions.admin.sendBusinessInvitation, {
            email: to,
            businessName,
          }),
        ),
    };

    const layer = Layer.mergeAll(
      Layer.succeed(AuthAdminPort, authAdminImpl),
      Layer.succeed(EmailPort, emailImpl),
      Layer.succeed(BusinessRepo, makeConvexRepo(ctx)),
    );

    return await Effect.runPromise(
      Effect.provide(
        AdminBusinessService.addBusiness({
          name: args.name,
          ownerEmail: args.ownerEmail,
          description: args.description,
          websiteUrl: args.websiteUrl,
          industryId: args.industryId,
          address: args.address,
          latitude: args.latitude,
          longitude: args.longitude,
          logoStorageId: args.logoStorageId,
        }),
        layer,
      ),
    );
  },
});

export const resendBusinessInvitation = mutation({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    await requireAdmin(ctx);
    const business = await ctx.db.get(businessId);
    if (!business) throw new Error("Business not found");
    const authUser = await authComponent.getAnyUserById(ctx, business.userId).catch(() => null);
    const email = (authUser as { email?: string } | null)?.email;
    if (!email) throw new Error("Could not find owner email");
    await ctx.scheduler.runAfter(0, internal.functions.admin.sendBusinessInvitation, {
      email,
      businessName: business.name,
    });
    await ctx.db.patch(businessId, { invitationSentAt: Date.now() });
  },
});

export const sendBusinessInvitation = internalAction({
  args: {
    email: v.string(),
    businessName: v.string(),
  },
  handler: async (_ctx, { email, businessName }) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set — business invitation email not sent");
      return;
    }

    const businessPortalUrl = process.env.BUSINESS_PORTAL_URL ?? "https://business.acbrighton.com";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Areacodes business account is live</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:Poppins,Arial,sans-serif;color:#f9f9f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:0;">
    <tr>
      <td style="padding:40px 40px 32px 40px;border-bottom:1px solid #1f1f1f;">
        <img src="${businessPortalUrl}/areacodes-white.svg" alt="Areacodes" width="140" height="19" style="display:block;border:0;" />
      </td>
    </tr>
    <tr>
      <td style="padding:40px 40px 0 40px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 20px 0;color:#a3a3a3;">Business account</p>
        <p style="display:inline-block;background:#f9f9f9;color:#000000;font-size:20px;font-weight:700;letter-spacing:-0.01em;text-transform:uppercase;padding:8px 16px;margin:0 0 32px 0;font-family:Poppins,Arial,sans-serif;">You're live on Areacodes</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 20px 0;color:#f9f9f9;">
          <strong style="font-weight:700;">${businessName}</strong> is now set up and ready to go.
        </p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 8px 0;color:#a3a3a3;">
          Sign in with this email address:
        </p>
        <p style="font-size:15px;font-weight:700;letter-spacing:0.02em;margin:0 0 32px 0;color:#f9f9f9;">${email}</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 32px 0;color:#a3a3a3;">
          No password needed - we'll send a one-time code to your inbox each time you sign in.
        </p>
        <p style="margin:0 0 36px 0;">
          <a href="${businessPortalUrl}/sign-in" style="background:#f9f9f9;color:#000000;text-decoration:none;padding:14px 28px;font-size:14px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;font-family:Poppins,Arial,sans-serif;display:inline-block;">
            Go to Business Portal &rarr;
          </a>
        </p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 16px 0;color:#a3a3a3;">
          Once you're in, add your vouchers and see how customers are discovering you.
        </p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 48px 0;color:#a3a3a3;">Any questions? Just reply to this email.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 40px 40px 40px;border-top:1px solid #1f1f1f;">
        <p style="font-size:12px;color:#555555;margin:0;">You're receiving this because the Areacodes team set up your business account.</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Areacodes <noreply@bleach.digital>",
        to: email,
        subject: "Your Areacodes business account is live",
        html,
      }),
    });
  },
});
