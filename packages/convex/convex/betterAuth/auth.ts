import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { admin, emailOTP } from "better-auth/plugins";
import * as z from "zod";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";

const roleSchema = z.enum(["customer", "business", "admin"]);

export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  { local: { schema }, verbose: false },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    appName: "Areacodes",
    baseURL: process.env.CONVEX_SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    trustedOrigins: [
      "areacodes://",
      "exp://*",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    advanced: {
      // SameSite=None + Secure required for cross-origin cookie sending
      // (admin/mobile clients are different origins from convex.site)
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
      },
    },
    emailAndPassword: { enabled: true },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID ?? "com.acbrighton.consumer",
        appBundleIdentifier:
          process.env.APPLE_APP_BUNDLE_ID ?? "com.acbrighton.consumer",
      },
    },
    plugins: [
      expo(),
      convex({ authConfig }),
      crossDomain({ siteUrl: process.env.ADMIN_URL ?? "http://localhost:3002" }),
      admin({
        defaultRole: "customer",
        adminRoles: ["admin"],
      }),
      emailOTP({
        expiresIn: 60 * 10, // 10 minutes
        // Pilot Business Users are provisioned by staff — never self-registered.
        disableSignUp: true,
        sendVerificationOTP: async ({ email, otp }: { email: string; otp: string }) => {
          const resendApiKey = process.env.RESEND_API_KEY;
          if (!resendApiKey) {
            console.warn("RESEND_API_KEY not set — OTP not sent");
            return;
          }

          const actionCtx = requireActionCtx(ctx);
          const user = await actionCtx.runQuery(components.betterAuth.adapter.findOne, {
            model: "user",
            where: [{ field: "email", value: email }],
          }) as { role?: string | null } | null;
          const role = user?.role ?? "business";

            const businessPortalUrl = process.env.BUSINESS_PORTAL_URL ?? "https://business.acbrighton.com";
          const logoUrl = `${businessPortalUrl}/areacodes-white.svg`;

          const html = role === "admin"
            ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Areacodes sign-in code</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:Poppins,Arial,sans-serif;color:#f9f9f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:0;">
    <tr>
      <td style="padding:40px 40px 32px 40px;border-bottom:1px solid #1f1f1f;">
        <img src="${logoUrl}" alt="Areacodes" width="140" height="19" style="display:block;border:0;" />
      </td>
    </tr>
    <tr>
      <td style="padding:40px 40px 48px 40px;">
        <p style="font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 16px 0;color:#a3a3a3;">Admin sign-in code</p>
        <p style="display:inline-block;background:#f9f9f9;color:#000000;font-size:36px;font-weight:700;letter-spacing:0.2em;padding:16px 24px;margin:0 0 32px 0;font-family:Poppins,Arial,sans-serif;">${otp}</p>
        <p style="font-size:14px;line-height:1.7;margin:0 0 8px 0;color:#a3a3a3;">This code expires in 10 minutes.</p>
        <p style="font-size:14px;line-height:1.7;margin:0;color:#a3a3a3;">If you didn't request this, you can safely ignore this email.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 40px 40px 40px;border-top:1px solid #1f1f1f;">
        <p style="font-size:12px;color:#555555;margin:0;">Areacodes Admin - internal tool</p>
      </td>
    </tr>
  </table>
</body>
</html>`
            : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Areacodes sign-in code</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:Poppins,Arial,sans-serif;color:#f9f9f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:0;">
    <tr>
      <td style="padding:40px 40px 32px 40px;border-bottom:1px solid #1f1f1f;">
        <img src="${logoUrl}" alt="Areacodes" width="140" height="19" style="display:block;border:0;" />
      </td>
    </tr>
    <tr>
      <td style="padding:40px 40px 48px 40px;">
        <p style="font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 16px 0;color:#a3a3a3;">Business Dashboard sign-in code</p>
        <p style="display:inline-block;background:#f9f9f9;color:#000000;font-size:36px;font-weight:700;letter-spacing:0.2em;padding:16px 24px;margin:0 0 32px 0;font-family:Poppins,Arial,sans-serif;">${otp}</p>
        <p style="font-size:14px;line-height:1.7;margin:0 0 8px 0;color:#a3a3a3;">This code expires in 10 minutes.</p>
        <p style="font-size:14px;line-height:1.7;margin:0 0 32px 0;color:#a3a3a3;">If you didn't request this, you can safely ignore this email.</p>
        <p style="font-size:13px;line-height:1.8;margin:0;color:#717171;">Areacodes is a local discovery platform that puts your business in front of nearby customers. Through your Business Dashboard you can publish exclusive vouchers and offers, track redemptions in real time, and grow your presence in the local community.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 40px 40px 40px;border-top:1px solid #1f1f1f;">
        <p style="font-size:12px;color:#555555;margin:0;">Areacodes Business Dashboard</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Areacodes <noreply@bleach.digital>",
              to: email,
              subject: "Your Areacodes sign-in code",
              html,
            }),
          });
          if (!res.ok) {
            const body = await res.text();
            console.error(`Resend error ${res.status}: ${body}`);
            throw new Error(`Failed to send OTP email: ${res.status}`);
          }
        },
      }),
    ],
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "customer",
          validator: { input: roleSchema, output: roleSchema },
        },
      },
    },
  } satisfies BetterAuthOptions;
};

// For `auth` CLI schema generation — needs a context-free options object
export const options = createAuthOptions({} as GenericCtx<DataModel>);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
