import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useRef, useState } from "react";
import { Appearance, Text, TextInput } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ONBOARDING_KEY } from "./(onboarding)/index";
import { StatusBar } from "expo-status-bar";

// Expo Go ignores the `userInterfaceStyle` app config, so force dark at
// runtime. This also makes native views (e.g. Apple Maps) render in dark mode.
Appearance.setColorScheme("dark");

// React Native has no font cascade: only Text with an explicit fontFamily uses
// Poppins. Patch the base render so every Text/TextInput defaults to Poppins
// while still letting per-element font-poppins-* classes override the weight.
function applyDefaultFont(Component: typeof Text | typeof TextInput) {
  const target = Component as unknown as {
    render: (props: { style?: unknown }, ref: unknown) => unknown;
  };
  const original = target.render;
  target.render = function render(props, ref) {
    return original.call(
      this,
      { ...props, style: [{ fontFamily: "Poppins_400Regular" }, props.style] },
      ref,
    );
  };
}
applyDefaultFont(Text);
applyDefaultFont(TextInput);
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ConvexProviderWithAuth } from "convex/react";
import * as Notifications from "expo-notifications";
import { authClient } from "./lib/auth-client";
import { convex } from "./lib/convex-client";
import { useConvexAuth } from "./lib/use-convex-auth";
import { useRegisterPushTokenOnAuth } from "./lib/use-push-notifications";
import {
  captureAppOpened,
  capturePushNotificationTapped,
  posthog,
} from "./lib/analytics";
import { WalletAnimationProvider } from "./lib/wallet-animation-context";
import { AuthSheetProvider, useAuthSheet } from "./lib/auth-sheet-context";
import { AnimationOverlay } from "./components/animation-overlay";
import { AuthSheet } from "./components/auth-sheet";

const PROTECTED_TABS = new Set(["wallet", "account"]);

function useAuthGuard() {
  const { data: session, isPending } = authClient.useSession();
  const { openAuthSheet } = useAuthSheet();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;

    const inAuthGroup = segments[0] === "(auth)";
    const secondSegment = segments[1];
    const inProtectedTab =
      segments[0] === "(tabs)" &&
      secondSegment !== undefined &&
      PROTECTED_TABS.has(secondSegment);

    if (!session?.user && inProtectedTab) {
      openAuthSheet();
      router.replace("/(tabs)");
    } else if (session?.user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, isPending, segments, router, openAuthSheet]);
}

function useNotificationDeepLink() {
  const router = useRouter();
  const handled = useRef<string | null>(null);

  function navigateToNotification(
    response: Notifications.NotificationResponse,
  ) {
    const data = response.notification.request.content.data as {
      businessId?: string;
      voucherId?: string;
    };
    if (handled.current === response.notification.request.identifier) return;
    handled.current = response.notification.request.identifier;
    if (data.voucherId) {
      capturePushNotificationTapped(data.voucherId);
      router.push(`/v/${data.voucherId}`);
    } else if (data.businessId) {
      router.push(`/business/${data.businessId}`);
    }
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
  const { sheetRef } = useAuthSheet();
  useAuthGuard();
  useRegisterPushTokenOnAuth();
  useNotificationDeepLink();

  useEffect(() => {
    captureAppOpened();
    return () => {
      void posthog?.flush();
    };
  }, []);

  return (
    <>
      {children}
      <AnimationOverlay />
      <AuthSheet ref={sheetRef} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (__DEV__) {
      setHasSeenOnboarding(false);
      return;
    }
    void SecureStore.getItemAsync(ONBOARDING_KEY).then((value) => {
      setHasSeenOnboarding(value === "true");
    });
  }, []);

  if (!fontsLoaded || hasSeenOnboarding === null) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
          <WalletAnimationProvider>
            <AuthSheetProvider>
              <AppProviders>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Protected guard={!hasSeenOnboarding}>
                    <Stack.Screen name="(onboarding)" />
                  </Stack.Protected>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen
                    name="sign-up"
                    options={{ presentation: "modal", gestureEnabled: false }}
                  />
                </Stack>
              </AppProviders>
            </AuthSheetProvider>
          </WalletAnimationProvider>
        </ConvexProviderWithAuth>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
