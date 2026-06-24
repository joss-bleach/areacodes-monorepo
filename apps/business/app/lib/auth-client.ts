import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { roleSchema } from "@repo/types";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL as string,
  plugins: [
    convexClient(),
    inferAdditionalFields({
      user: {
        role: { type: "string", validator: { input: roleSchema, output: roleSchema } },
      },
    }),
  ],
});
