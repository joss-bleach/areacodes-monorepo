import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { memoryAdapter } from "better-auth/adapters/memory";

// In production, replace memoryAdapter with a real database adapter
// (e.g. drizzle + Turso/LibSQL). All models must be included.
const database = memoryAdapter({
  user: [],
  session: [],
  account: [],
  verification: [],
  jwks: [],
});

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3003",
  basePath: "/auth",
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-in-production",
  database,
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  // Apple Sign-In is disabled — blocked by upstream @better-auth/expo bug #7049.
  // TODO: Enable when https://github.com/better-auth/better-auth/issues/7049 is resolved.
  plugins: [
    jwt({
      jwt: {
        expirationTime: "1h",
        generatePayload: async ({
          user,
        }: {
          user: { id: string; role?: string };
        }) => {
          return {
            sub: user.id,
            role: user.role ?? "customer",
          };
        },
      },
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
      },
    },
  },
});
