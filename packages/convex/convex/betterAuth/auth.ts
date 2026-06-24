import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
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
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    trustedOrigins: [
      "areacodes://",
      "exp://*",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
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
