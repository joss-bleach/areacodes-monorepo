import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { memoryAdapter } from "better-auth/adapters/memory";
import { expo } from "@better-auth/expo";

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
  // areacodes:// is the Expo deep-link scheme for the mobile app.
  // Required so the expo server plugin can append cookies to OAuth redirect URLs.
  trustedOrigins: ["areacodes://"],
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    // Apple: native-only idToken bridge (custom bridge via expo-apple-authentication).
    // clientId = bundle ID, used as the JWT audience in verifyIdToken.
    // clientSecret is not needed for the native idToken flow (no web OAuth redirect).
    apple: {
      clientId: process.env.APPLE_CLIENT_ID ?? "com.acbrighton.consumer",
      appBundleIdentifier:
        process.env.APPLE_APP_BUNDLE_ID ?? "com.acbrighton.consumer",
    },
  },
  plugins: [
    expo(),
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
