import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ConvexProviderWithAuth } from "convex/react";
import { authClient } from "./lib/auth-client";
import { convex } from "./lib/convex-client";
import { useConvexAuth } from "./lib/use-convex-auth";

const PROTECTED_TABS = new Set(["wallet", "account"]);

function useAuthGuard() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;

    const inAuthGroup = segments[0] === "(auth)";
    const secondSegment = segments[1];
    const inProtectedTab =
      segments[0] === "(tabs)" && secondSegment !== undefined && PROTECTED_TABS.has(secondSegment);

    if (!session?.user && inProtectedTab) {
      router.replace("/(auth)/sign-in");
    } else if (session?.user && inAuthGroup) {
      router.replace("/(tabs)/");
    }
  }, [session, isPending, segments, router]);
}

export default function RootLayout() {
  useAuthGuard();

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </ConvexProviderWithAuth>
  );
}
