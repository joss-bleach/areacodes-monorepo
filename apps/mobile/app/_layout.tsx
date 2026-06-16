import "../global.css";
import { useEffect, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ConvexProviderWithAuth } from "convex/react";
import * as Notifications from "expo-notifications";
import { authClient } from "./lib/auth-client";
import { convex } from "./lib/convex-client";
import { useConvexAuth } from "./lib/use-convex-auth";
import { useRegisterPushTokenOnAuth } from "./lib/use-push-notifications";

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

function useNotificationDeepLink() {
  const router = useRouter();
  const handled = useRef<string | null>(null);

  function navigateToNotification(
    response: Notifications.NotificationResponse,
  ) {
    const data = response.notification.request.content.data as {
      businessId?: string;
    };
    if (!data.businessId || handled.current === response.notification.request.identifier) return;
    handled.current = response.notification.request.identifier;
    router.push(`/business/${data.businessId}`);
  }

  useEffect(() => {
    // Handle tap when app was closed (cold start)
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) navigateToNotification(response);
    });

    // Handle tap when app is in background
    const subscription = Notifications.addNotificationResponseReceivedListener(
      navigateToNotification,
    );
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function AppProviders({ children }: { children: React.ReactNode }) {
  useAuthGuard();
  useRegisterPushTokenOnAuth();
  useNotificationDeepLink();
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
      <AppProviders>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </AppProviders>
    </ConvexProviderWithAuth>
  );
}
