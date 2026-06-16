import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "expo-secure-store": new URL(
        "./app/__mocks__/expo-secure-store.ts",
        import.meta.url,
      ).pathname,
      "posthog-react-native": new URL(
        "./app/__mocks__/posthog-react-native.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    environment: "node",
  },
});
