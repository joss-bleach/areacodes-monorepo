import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL ?? "https://sensible-orca-923.eu-west-1.convex.site",
  plugins: [
    convexClient(),
    expoClient({
      scheme: "areacodes",
      storage: {
        getItem: SecureStore.getItem,
        setItem: SecureStore.setItemAsync,
      },
    }),
  ],
});
