# Wallet & Voucher Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the voucher claim and wallet flows: bottom-sheet voucher discovery with a "fly to wallet" claim animation, a frictionless auto-reveal wallet, and a global auth sheet replacing all navigation-based auth gates.

**Architecture:** All global sheets (voucher, auth) are mounted as `BottomSheetModal` instances in `_layout.tsx` and controlled via React contexts. The wallet tab icon registers its screen position on mount; a `AnimationOverlay` reads that position to animate a thumbnail flying from the claim sheet to the wallet tab on successful claim. The `VoucherSheet` handles both claim mode (unclaimed voucher) and reveal mode (wallet entry auto-reveal), keeping one component for both surfaces.

**Tech Stack:** Expo Router, `@gorhom/bottom-sheet` v5 (`BottomSheetModal` + `BottomSheetModalProvider`), `react-native-reanimated` v4, Convex queries/mutations, `expo-clipboard`

## Global Constraints

- Dark background: `#000000`, sheet background: `#111111`
- Font: Poppins via `font-poppins-*` Tailwind classes
- All new components use NativeWind Tailwind classes (no `StyleSheet.create`)
- `BottomSheetModal` requires `BottomSheetModalProvider` wrapping the entire app
- Never navigate to `/(auth)/sign-in` or `/sign-up` for in-app auth gates — use the `AuthSheet` instead
- `getWalletEntry` display state: active = voucher `voucherValidTo > now` AND not redeemed; past = expired OR redeemed
- No 2-hour code countdown shown to the user at any point

---

### Task 1: Extend `getWallet` to return `businessLogoUrl`

**Files:**
- Modify: `packages/convex/convex/functions/claims.ts:166-178`

**Interfaces:**
- Produces: `getWallet` handler returns `businessLogoUrl: string | null` on each entry (alongside existing `businessName`, `businessId`)

- [ ] **Step 1: Add `businessLogoUrl` to the `getWallet` enrichment block**

Replace the `entries.map` block at line 166 of `packages/convex/convex/functions/claims.ts`:

```ts
return await Promise.all(
  entries.map(async (entry) => {
    const voucher = await ctx.db.get(entry.voucherId as Id<"vouchers">);
    const business = voucher ? await ctx.db.get(voucher.businessId) : null;
    const businessLogoUrl =
      business?.logoStorageId
        ? await ctx.storage.getUrl(business.logoStorageId)
        : null;
    return {
      ...entry,
      businessId: business?._id ?? null,
      businessName: business?.name ?? null,
      businessLogoUrl,
      voucherValidFrom: voucher?.voucherValidFrom ?? null,
    };
  }),
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/convex && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/convex/convex/functions/claims.ts
git commit -m "feat(convex): return businessLogoUrl in getWallet"
```

---

### Task 2: TicketStub component

The ticket stub is a white card with a perforated divider (two dark semicircle notches on each side + dashed line). Top half: QR code + instruction. Bottom half: copyable code + validity dates.

**Files:**
- Create: `apps/mobile/app/components/ticket-stub.tsx`

**Interfaces:**
- Produces: `<TicketStub voucherCode={string} voucherValidFrom={number} voucherValidTo={number} />` — self-contained, no external deps beyond `expo-clipboard`

- [ ] **Step 1: Install expo-clipboard if not present**

Check `apps/mobile/package.json` — if `expo-clipboard` is absent, add it:
```bash
cd apps/mobile && npx expo install expo-clipboard
```

- [ ] **Step 2: Create TicketStub**

Create `apps/mobile/app/components/ticket-stub.tsx`:

```tsx
import { Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { useState } from "react";
import { formatValidityWindow } from "../lib/voucher-utils";

interface TicketStubProps {
  voucherCode: string;
  voucherValidFrom: number;
  voucherValidTo: number;
}

export function TicketStub({
  voucherCode,
  voucherValidFrom,
  voucherValidTo,
}: TicketStubProps) {
  const [copied, setCopied] = useState(false);
  const notchColor = "#111111"; // matches sheet background

  async function handleCopy() {
    await Clipboard.setStringAsync(voucherCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View className="bg-white rounded-xl mx-4 overflow-visible">
      {/* Top half: QR */}
      <View className="items-center px-6 pt-6 pb-5">
        <View className="p-3 bg-white rounded-lg">
          <QRCode
            value={voucherCode}
            size={180}
            backgroundColor="#ffffff"
            color="#000000"
          />
        </View>
        <Text className="text-gray-500 text-xs text-center mt-4 leading-relaxed">
          Show the QR to use the voucher to the merchant staff
        </Text>
      </View>

      {/* Perforated divider */}
      <View style={{ height: 20, position: "relative" }}>
        {/* Left notch */}
        <View
          style={{
            position: "absolute",
            left: -10,
            top: 0,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: notchColor,
          }}
        />
        {/* Dashed line */}
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 9,
            borderStyle: "dashed",
            borderTopWidth: 1.5,
            borderColor: "#d1d5db",
          }}
        />
        {/* Right notch */}
        <View
          style={{
            position: "absolute",
            right: -10,
            top: 0,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: notchColor,
          }}
        />
      </View>

      {/* Bottom half: code + dates */}
      <View className="items-center px-6 pt-4 pb-6">
        <Pressable
          onPress={handleCopy}
          className="flex-row items-center bg-gray-100 rounded-lg px-5 py-3 mb-3"
        >
          <Text className="text-black font-poppins-semibold text-base tracking-widest mr-2">
            {voucherCode}
          </Text>
          <Text className="text-gray-500 text-base">
            {copied ? "✓" : "⎘"}
          </Text>
        </Pressable>
        <Text className="text-gray-400 text-xs text-center">
          Valid through:{" "}
          {formatValidityWindow(voucherValidFrom, voucherValidTo)}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/components/ticket-stub.tsx
git commit -m "feat(mobile): add TicketStub component"
```

---

### Task 3: Wallet animation context + AnimationOverlay + animated WalletTabIcon

The wallet tab icon registers its screen position. When a claim animation is triggered, an absolutely-positioned thumbnail flies from the voucher sheet toward the tab icon while it bounces.

**Files:**
- Create: `apps/mobile/app/lib/wallet-animation-context.tsx`
- Create: `apps/mobile/app/components/animation-overlay.tsx`
- Modify: `apps/mobile/app/components/icons/WalletTabIcon.tsx`

**Interfaces:**
- Produces:
  - `WalletAnimationProvider` — React context provider, wraps app
  - `useWalletAnimation(): { registerWalletTabRef: (ref: View) => void; triggerClaimAnimation: (sourceLayout: LayoutRect) => void; bounceProgress: SharedValue<number> }`
  - `AnimationOverlay` — full-screen `pointerEvents: 'none'` absolutely-positioned view
  - `LayoutRect = { x: number; y: number; width: number; height: number }`

- [ ] **Step 1: Create wallet-animation-context.tsx**

Create `apps/mobile/app/lib/wallet-animation-context.tsx`:

```tsx
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type View } from "react-native";
import {
  useSharedValue,
  withTiming,
  withSequence,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";

export type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WalletAnimationContextType = {
  registerWalletTabRef: (ref: View | null) => void;
  triggerClaimAnimation: (sourceLayout: LayoutRect) => void;
  walletTabLayout: LayoutRect | null;
  animationSource: LayoutRect | null;
  animating: boolean;
  animationProgress: SharedValue<number>;
  bounceProgress: SharedValue<number>;
};

const WalletAnimationContext = createContext<WalletAnimationContextType | null>(
  null,
);

export function WalletAnimationProvider({ children }: { children: ReactNode }) {
  const walletTabRef = useRef<View | null>(null);
  const [walletTabLayout, setWalletTabLayout] = useState<LayoutRect | null>(null);
  const [animationSource, setAnimationSource] = useState<LayoutRect | null>(null);
  const [animating, setAnimating] = useState(false);
  const animationProgress = useSharedValue(0);
  const bounceProgress = useSharedValue(1);

  function registerWalletTabRef(ref: View | null) {
    walletTabRef.current = ref;
    if (ref) {
      // Measure after next frame so layout is settled
      setTimeout(() => {
        ref.measure((_x, _y, width, height, pageX, pageY) => {
          setWalletTabLayout({ x: pageX, y: pageY, width, height });
        });
      }, 0);
    }
  }

  function triggerClaimAnimation(sourceLayout: LayoutRect) {
    setAnimationSource(sourceLayout);
    setAnimating(true);
    animationProgress.value = 0;
    animationProgress.value = withTiming(1, { duration: 550 }, (finished) => {
      if (finished) {
        bounceProgress.value = withSequence(
          withSpring(1.4, { damping: 4, stiffness: 300 }),
          withSpring(1, { damping: 8, stiffness: 200 }),
        );
      }
    });
    // Clean up after animation
    setTimeout(() => {
      setAnimating(false);
      setAnimationSource(null);
    }, 650);
  }

  return (
    <WalletAnimationContext.Provider
      value={{
        registerWalletTabRef,
        triggerClaimAnimation,
        walletTabLayout,
        animationSource,
        animating,
        animationProgress,
        bounceProgress,
      }}
    >
      {children}
    </WalletAnimationContext.Provider>
  );
}

export function useWalletAnimation() {
  const ctx = useContext(WalletAnimationContext);
  if (!ctx) throw new Error("useWalletAnimation must be inside WalletAnimationProvider");
  return ctx;
}
```

- [ ] **Step 2: Create AnimationOverlay**

Create `apps/mobile/app/components/animation-overlay.tsx`:

```tsx
import { View, Dimensions } from "react-native";
import Animated, { useAnimatedStyle, interpolate } from "react-native-reanimated";
import { useWalletAnimation } from "../lib/wallet-animation-context";

const THUMBNAIL_WIDTH = 120;
const THUMBNAIL_HEIGHT = 64;

export function AnimationOverlay() {
  const { animating, animationSource, walletTabLayout, animationProgress } =
    useWalletAnimation();

  const { width: screenWidth } = Dimensions.get("window");

  const animatedStyle = useAnimatedStyle(() => {
    if (!animationSource || !walletTabLayout) {
      return { opacity: 0 };
    }

    const srcCenterX = animationSource.x + animationSource.width / 2;
    const srcCenterY = animationSource.y + animationSource.height / 2;
    const dstCenterX = walletTabLayout.x + walletTabLayout.width / 2;
    const dstCenterY = walletTabLayout.y + walletTabLayout.height / 2;

    const p = animationProgress.value;

    const translateX =
      srcCenterX + (dstCenterX - srcCenterX) * p - THUMBNAIL_WIDTH / 2;
    const translateY =
      srcCenterY + (dstCenterY - srcCenterY) * p - THUMBNAIL_HEIGHT / 2;

    const scale = interpolate(p, [0, 1], [1, 0.15]);
    const skewX = interpolate(p, [0, 0.5, 1], [0, 8, 0]);
    const opacity = interpolate(p, [0, 0.85, 1], [1, 1, 0]);

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { scale },
        { skewX: `${skewX}deg` },
      ],
    };
  });

  if (!animating) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: screenWidth,
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            position: "absolute",
            width: THUMBNAIL_WIDTH,
            height: THUMBNAIL_HEIGHT,
            backgroundColor: "#1a1a1a",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#333",
          },
        ]}
      />
    </View>
  );
}
```

- [ ] **Step 3: Update WalletTabIcon to register position and bounce**

Replace `apps/mobile/app/components/icons/WalletTabIcon.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useWalletAnimation } from "../../lib/wallet-animation-context";

export function WalletTabIcon({ color }: { color: string }) {
  const ref = useRef<View>(null);
  const { registerWalletTabRef, bounceProgress } = useWalletAnimation();

  useEffect(() => {
    if (ref.current) {
      registerWalletTabRef(ref.current);
    }
  }, [registerWalletTabRef]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceProgress.value }],
  }));

  return (
    <Animated.View ref={ref} style={animatedStyle}>
      <Svg width={20} height={16} viewBox="0 0 20 16" fill="none">
        <Path
          d="M13 1V3M13 7V9M13 13V15M3 1C1.89543 1 1 1.89543 1 3V6C2.10457 6 3 6.89543 3 8C3 9.10457 2.10457 10 1 10V13C1 14.1046 1.89543 15 3 15H17C18.1046 15 19 14.1046 19 13V10C17.8954 10 17 9.10457 17 8C17 6.89543 17.8954 6 19 6V3C19 1.89543 18.1046 1 17 1H3Z"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/lib/wallet-animation-context.tsx \
        apps/mobile/app/components/animation-overlay.tsx \
        apps/mobile/app/components/icons/WalletTabIcon.tsx
git commit -m "feat(mobile): add wallet claim animation infrastructure"
```

---

### Task 4: AuthSheet — global bottom-sheet auth gate

Replace all navigation-based auth gates (`router.push("/(auth)/sign-in")`, `router.push("/sign-up")`) with a single bottom sheet modal. The `useAuthGuard` hook in `_layout.tsx` calls `openAuthSheet()` instead of navigating.

**Files:**
- Create: `apps/mobile/app/lib/auth-sheet-context.tsx`
- Create: `apps/mobile/app/components/auth-sheet.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/(tabs)/account.tsx`

**Interfaces:**
- Consumes: existing sign-in/sign-up form logic from `apps/mobile/app/(auth)/sign-in.tsx` and `apps/mobile/app/sign-up.tsx`
- Produces: `AuthSheetProvider`, `useAuthSheet(): { openAuthSheet: () => void }`

- [ ] **Step 1: Create auth-sheet-context.tsx**

Create `apps/mobile/app/lib/auth-sheet-context.tsx`:

```tsx
import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { type BottomSheetModal } from "@gorhom/bottom-sheet";

type AuthSheetContextType = {
  openAuthSheet: () => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
};

const AuthSheetContext = createContext<AuthSheetContextType | null>(null);

export function AuthSheetProvider({ children }: { children: ReactNode }) {
  const sheetRef = useRef<BottomSheetModal>(null);

  function openAuthSheet() {
    sheetRef.current?.present();
  }

  return (
    <AuthSheetContext.Provider value={{ openAuthSheet, sheetRef }}>
      {children}
    </AuthSheetContext.Provider>
  );
}

export function useAuthSheet() {
  const ctx = useContext(AuthSheetContext);
  if (!ctx) throw new Error("useAuthSheet must be inside AuthSheetProvider");
  return ctx;
}
```

- [ ] **Step 2: Create AuthSheet component**

Create `apps/mobile/app/components/auth-sheet.tsx`:

```tsx
import { forwardRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import BottomSheet, {
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { authClient } from "../lib/auth-client";
import { SocialAuthButtons } from "./social-auth-buttons";
import {
  captureSignInCompleted,
  captureSignUpCompleted,
} from "../lib/analytics";

type Mode = "sign-in" | "sign-up";

export const AuthSheet = forwardRef<BottomSheetModal>(function AuthSheet(
  _props,
  ref,
) {
  const [mode, setMode] = useState<Mode>("sign-up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setTermsAccepted(false);
    setError("");
    setLoading(false);
  }

  async function handleSignIn() {
    if (!email || !password) return;
    setError("");
    setLoading(true);
    try {
      const { error: err } = await authClient.signIn.email({ email, password });
      if (err) {
        setError(err.message ?? "Something went wrong. Please try again.");
      } else {
        captureSignInCompleted("email");
        resetForm();
        (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (!name || !email || !password || !termsAccepted) return;
    setError("");
    setLoading(true);
    try {
      const { error: err } = await authClient.signUp.email({
        email,
        password,
        name,
      });
      if (err) {
        setError(err.message ?? "Something went wrong. Please try again.");
      } else {
        captureSignUpCompleted("email");
        resetForm();
        (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSignIn = email.length > 0 && password.length > 0 && !loading;
  const canSignUp =
    name.length > 0 &&
    email.length > 0 &&
    password.length > 0 &&
    termsAccepted &&
    !loading;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={["85%"]}
      backgroundStyle={{ backgroundColor: "#111111" }}
      handleIndicatorStyle={{ backgroundColor: "#444444" }}
      onDismiss={resetForm}
      keyboardBehavior="extend"
    >
      <BottomSheetScrollView>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="px-6 pt-4 pb-10">
            <Text className="text-white text-2xl font-poppins-bold mb-1">
              {mode === "sign-up" ? "Create account" : "Welcome back"}
            </Text>
            <Text className="text-gray-400 text-sm mb-8">
              {mode === "sign-up"
                ? "Sign up to save vouchers to your wallet"
                : "Sign in to your Areacodes account"}
            </Text>

            <SocialAuthButtons mode={mode} onError={setError} />

            {mode === "sign-up" && (
              <View className="mb-4">
                <Text className="text-gray-300 text-sm font-poppins-medium mb-1.5">
                  Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#6b7280"
                  autoComplete="name"
                  className="bg-gray-900 border border-gray-700 text-white px-4 py-3 text-sm"
                />
              </View>
            )}

            <View className="mb-4">
              <Text className="text-gray-300 text-sm font-poppins-medium mb-1.5">
                Email address
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                className="bg-gray-900 border border-gray-700 text-white px-4 py-3 text-sm"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-300 text-sm font-poppins-medium mb-1.5">
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#6b7280"
                secureTextEntry
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                className="bg-gray-900 border border-gray-700 text-white px-4 py-3 text-sm"
              />
            </View>

            {mode === "sign-up" && (
              <View className="flex-row items-center mb-6">
                <Switch
                  value={termsAccepted}
                  onValueChange={setTermsAccepted}
                  trackColor={{ false: "#374151", true: "#ffffff" }}
                  thumbColor="#000000"
                />
                <Text className="text-gray-400 text-xs ml-3 flex-1">
                  I agree to the Terms of Service and Privacy Policy
                </Text>
              </View>
            )}

            {error ? (
              <Text className="text-red-400 text-sm mb-4">{error}</Text>
            ) : null}

            <Pressable
              onPress={mode === "sign-up" ? handleSignUp : handleSignIn}
              disabled={mode === "sign-up" ? !canSignUp : !canSignIn}
              className="bg-white px-4 py-3 items-center mb-6 disabled:opacity-50"
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text className="text-black font-poppins-semibold text-sm">
                  {mode === "sign-up" ? "Create account" : "Sign in"}
                </Text>
              )}
            </Pressable>

            <View className="flex-row justify-center">
              <Text className="text-gray-400 text-sm">
                {mode === "sign-up"
                  ? "Already have an account? "
                  : "Don't have an account? "}
              </Text>
              <Pressable
                onPress={() => {
                  setMode(mode === "sign-up" ? "sign-in" : "sign-up");
                  setError("");
                }}
              >
                <Text className="text-white text-sm underline">
                  {mode === "sign-up" ? "Sign in" : "Sign up"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
```

- [ ] **Step 3: Update `_layout.tsx` — add providers, mount AuthSheet, AnimationOverlay, update auth guard**

In `apps/mobile/app/_layout.tsx`, apply these changes:

**3a.** Add new imports at the top:
```tsx
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { WalletAnimationProvider } from "./lib/wallet-animation-context";
import { AuthSheetProvider, useAuthSheet } from "./lib/auth-sheet-context";
import { AnimationOverlay } from "./components/animation-overlay";
import { AuthSheet } from "./components/auth-sheet";
```

**3b.** Replace `useAuthGuard` — swap `router.push("/sign-up")` for `openAuthSheet()`:
```tsx
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
```

**3c.** Update `AppProviders` to mount the auth sheet ref and overlay:
```tsx
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
```

**3d.** Wrap `RootLayout` return with `BottomSheetModalProvider`, `WalletAnimationProvider`, `AuthSheetProvider`:
```tsx
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
```

- [ ] **Step 4: Update account.tsx — use auth sheet instead of navigation**

Replace the unauthenticated state block in `apps/mobile/app/(tabs)/account.tsx`:

```tsx
// Add import at top:
import { useAuthSheet } from "../lib/auth-sheet-context";

// Replace the !session?.user block:
if (!session?.user) {
  return (
    <AccountUnauthenticated />
  );
}
```

Add the component above `AccountScreen`:
```tsx
function AccountUnauthenticated() {
  const { openAuthSheet } = useAuthSheet();
  return (
    <View className="flex-1 bg-black">
      <ScreenHeader title="Account" />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-gray-400 text-sm mb-6 text-center">
          Sign in to manage your account and view your voucher history.
        </Text>
        <Pressable
          onPress={openAuthSheet}
          className="bg-white px-6 py-3"
        >
          <Text className="text-black font-poppins-semibold text-sm">Sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Manually verify auth sheet**

Run `npx expo start` in `apps/mobile`. Tap the Wallet or Account tab without being signed in — the auth sheet should slide up from the bottom with sign-up form. Test sign-in/sign-up flows complete and dismiss the sheet.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/lib/auth-sheet-context.tsx \
        apps/mobile/app/components/auth-sheet.tsx \
        apps/mobile/app/_layout.tsx \
        apps/mobile/app/(tabs)/account.tsx
git commit -m "feat(mobile): replace navigation auth gate with global AuthSheet"
```

---

### Task 5: VoucherSheet — claim and reveal modes

A single `BottomSheetModal` that handles both:
- **Claim mode**: shows voucher info + "Save to wallet" button; on success triggers claim animation then auto-dismisses after 1s
- **Reveal mode**: auto-generates a code on open (or uses cached), shows TicketStub

**Files:**
- Create: `apps/mobile/app/lib/voucher-sheet-context.tsx`
- Create: `apps/mobile/app/components/voucher-sheet.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Consumes:
  - `api.functions.vouchers.getVoucherByIdWithBusiness` — returns `{ title, description, voucherValidFrom, voucherValidTo, voucherTerms, business: { name, logoUrl, industry: { name } } }`
  - `api.functions.claims.claimVoucher({ voucherId })` — returns `Id<"claims">`
  - `api.functions.claims.revealVoucher({ claimId })` — returns `{ voucherCode: string, expiresAt: number }`
  - `api.functions.claims.getClaimForVoucher({ voucherId })` — returns claim record or null
  - `useWalletAnimation().triggerClaimAnimation(layout: LayoutRect)`
  - `useAuthSheet().openAuthSheet()`
  - `TicketStub` from `../components/ticket-stub`
- Produces:
  - `VoucherSheetProvider`
  - `useVoucherSheet(): { openClaim: (voucherId: string, distanceMetres?: number) => void; openReveal: (entry: RevealEntry) => void }`
  - `RevealEntry = { claimId: string; voucherId: string; businessName: string | null; businessLogoUrl: string | null; voucherTitle: string; voucherDescription: string; voucherValidFrom: number; voucherValidTo: number; activeCode: string | null; codeExpiresAt: number | null }`

- [ ] **Step 1: Create voucher-sheet-context.tsx**

Create `apps/mobile/app/lib/voucher-sheet-context.tsx`:

```tsx
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type BottomSheetModal } from "@gorhom/bottom-sheet";

export type RevealEntry = {
  claimId: string;
  voucherId: string;
  businessName: string | null;
  businessLogoUrl: string | null;
  voucherTitle: string;
  voucherDescription: string;
  voucherValidFrom: number;
  voucherValidTo: number;
  activeCode: string | null;
  codeExpiresAt: number | null;
};

type VoucherSheetMode =
  | { type: "claim"; voucherId: string; distanceMetres?: number }
  | { type: "reveal"; entry: RevealEntry }
  | null;

type VoucherSheetContextType = {
  mode: VoucherSheetMode;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  openClaim: (voucherId: string, distanceMetres?: number) => void;
  openReveal: (entry: RevealEntry) => void;
  close: () => void;
};

const VoucherSheetContext = createContext<VoucherSheetContextType | null>(null);

export function VoucherSheetProvider({ children }: { children: ReactNode }) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [mode, setMode] = useState<VoucherSheetMode>(null);

  function openClaim(voucherId: string, distanceMetres?: number) {
    setMode({ type: "claim", voucherId, distanceMetres });
    sheetRef.current?.present();
  }

  function openReveal(entry: RevealEntry) {
    setMode({ type: "reveal", entry });
    sheetRef.current?.present();
  }

  function close() {
    sheetRef.current?.dismiss();
    setMode(null);
  }

  return (
    <VoucherSheetContext.Provider
      value={{ mode, sheetRef, openClaim, openReveal, close }}
    >
      {children}
    </VoucherSheetContext.Provider>
  );
}

export function useVoucherSheet() {
  const ctx = useContext(VoucherSheetContext);
  if (!ctx)
    throw new Error("useVoucherSheet must be inside VoucherSheetProvider");
  return ctx;
}
```

- [ ] **Step 2: Create voucher-sheet.tsx**

Create `apps/mobile/app/components/voucher-sheet.tsx`:

```tsx
import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { authClient } from "../lib/auth-client";
import { formatValidityWindow } from "../lib/voucher-utils";
import { formatDistance } from "../lib/distance";
import {
  useVoucherSheet,
  type RevealEntry,
} from "../lib/voucher-sheet-context";
import { useWalletAnimation, type LayoutRect } from "../lib/wallet-animation-context";
import { useAuthSheet } from "../lib/auth-sheet-context";
import {
  captureVoucherClaimed,
  captureVoucherRevealed,
  captureVoucherViewed,
} from "../lib/analytics";
import { TicketStub } from "./ticket-stub";
import {
  loadRevealCache,
  upsertRevealCache,
} from "../lib/reveal-cache";

// --- Claim mode inner component ---

function ClaimContent({
  voucherId,
  distanceMetres,
}: {
  voucherId: string;
  distanceMetres?: number;
}) {
  const { close } = useVoucherSheet();
  const { triggerClaimAnimation } = useWalletAnimation();
  const { openAuthSheet } = useAuthSheet();
  const { data: session } = authClient.useSession();

  const voucher = useQuery(
    api.functions.vouchers.getVoucherByIdWithBusiness,
    { voucherId: voucherId as Id<"vouchers"> },
  );
  const claimRecord = useQuery(
    api.functions.claims.getClaimForVoucher,
    { voucherId: voucherId as Id<"vouchers"> },
  );
  const claimVoucher = useMutation(api.functions.claims.claimVoucher);

  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const contentRef = useRef<View>(null);

  useEffect(() => {
    if (voucher) {
      captureVoucherViewed(voucher._id, voucher.business._id);
    }
  }, [voucher?._id]);

  // If server confirms already claimed, reflect that
  const alreadyClaimed = claimed || claimRecord != null;

  async function handleClaim() {
    if (!session?.user) {
      openAuthSheet();
      return;
    }

    setClaiming(true);
    setClaimError(null);
    try {
      await claimVoucher({ voucherId: voucherId as Id<"vouchers"> });
      if (voucher) {
        captureVoucherClaimed(voucher._id, voucher.business._id);
      }
      setClaimed(true);

      // Measure voucher content area to animate from
      contentRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        const layout: LayoutRect = { x: pageX, y: pageY, width, height };
        triggerClaimAnimation(layout);
      });

      // Auto-dismiss after 1 second
      setTimeout(() => close(), 1000);
    } catch {
      setClaimError("Could not save voucher. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  if (voucher === undefined) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (voucher === null) {
    return (
      <View className="px-4 py-8">
        <Text className="text-gray-400 text-sm text-center">
          Voucher not found.
        </Text>
      </View>
    );
  }

  return (
    <BottomSheetScrollView>
      <View ref={contentRef} className="px-4 pb-8">
        {/* Business header */}
        <View className="flex-row items-center mb-4">
          {voucher.business.logoUrl ? (
            <Image
              source={{ uri: voucher.business.logoUrl }}
              className="w-10 h-10 rounded-full mr-3 bg-gray-800"
            />
          ) : (
            <View className="w-10 h-10 rounded-full mr-3 bg-gray-800" />
          )}
          <View className="flex-1">
            <Text className="text-white text-lg font-poppins-bold leading-snug">
              {voucher.business.name}
            </Text>
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-xs uppercase tracking-wide">
                {voucher.business.industry?.name ?? ""}
              </Text>
              {distanceMetres != null && (
                <Text className="text-gray-400 text-xs">
                  {" "}· {formatDistance(distanceMetres)}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View className="border-b border-gray-800 mb-4" />

        {/* Voucher */}
        <Text className="text-gray-500 text-xs uppercase tracking-wide mb-1">
          Voucher
        </Text>
        <Text className="text-white text-base font-poppins-semibold mb-1">
          {voucher.title}
        </Text>
        <Text className="text-gray-300 text-sm leading-relaxed mb-4">
          {voucher.description}
        </Text>

        <View className="border-b border-gray-800 mb-4" />

        {/* Terms */}
        <Text className="text-gray-500 text-xs uppercase tracking-wide mb-1">
          Terms
        </Text>
        <Text className="text-gray-300 text-sm mb-1">
          {formatValidityWindow(voucher.voucherValidFrom, voucher.voucherValidTo)}
        </Text>
        {voucher.voucherTerms ? (
          <Text className="text-gray-500 text-xs leading-relaxed mb-4">
            {voucher.voucherTerms}
          </Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* CTA */}
        {claimError ? (
          <Text className="text-red-400 text-xs mb-2">{claimError}</Text>
        ) : null}

        <Pressable
          onPress={handleClaim}
          disabled={claiming || alreadyClaimed}
          className="border border-white px-4 py-3.5 items-center"
        >
          {claiming ? (
            <ActivityIndicator color="#ffffff" />
          ) : alreadyClaimed ? (
            <View className="flex-row items-center">
              <Text className="text-white font-poppins-semibold text-sm mr-2">
                Saved to wallet
              </Text>
              <Text className="text-white">✓</Text>
            </View>
          ) : (
            <Text className="text-white font-poppins-semibold text-sm">
              Save to wallet
            </Text>
          )}
        </Pressable>
      </View>
    </BottomSheetScrollView>
  );
}

// --- Reveal mode inner component ---

function RevealContent({ entry }: { entry: RevealEntry }) {
  const revealVoucher = useMutation(api.functions.claims.revealVoucher);
  const [voucherCode, setVoucherCode] = useState<string | null>(
    entry.activeCode,
  );
  const [validFrom, setValidFrom] = useState<number>(entry.voucherValidFrom);
  const [validTo, setValidTo] = useState<number>(entry.voucherValidTo);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  useEffect(() => {
    // Check cache first; reveal if code absent or expired
    void (async () => {
      if (entry.activeCode && entry.codeExpiresAt && entry.codeExpiresAt > Date.now()) {
        setVoucherCode(entry.activeCode);
        return;
      }
      // Check local cache
      const cached = await loadRevealCache();
      const match = cached.find((r) => r.claimId === entry.claimId);
      if (match && match.expiresAt > Date.now()) {
        setVoucherCode(match.voucherCode);
        return;
      }
      // Generate new
      await doReveal();
    })();
  }, [entry.claimId]);

  async function doReveal() {
    setRevealing(true);
    setRevealError(null);
    try {
      const result = await revealVoucher({
        claimId: entry.claimId as Id<"claims">,
      });
      captureVoucherRevealed(entry.voucherId, entry.claimId);
      await upsertRevealCache({
        claimId: entry.claimId,
        voucherCode: result.voucherCode,
        expiresAt: result.expiresAt,
        voucherTitle: entry.voucherTitle,
        businessName: entry.businessName ?? undefined,
      });
      setVoucherCode(result.voucherCode);
    } catch {
      setRevealError("Could not load voucher code. Please try again.");
    } finally {
      setRevealing(false);
    }
  }

  return (
    <BottomSheetScrollView>
      <View className="px-4 pb-8">
        {/* Business header */}
        <View className="flex-row items-center mb-4">
          {entry.businessLogoUrl ? (
            <Image
              source={{ uri: entry.businessLogoUrl }}
              className="w-10 h-10 rounded-full mr-3 bg-gray-800"
            />
          ) : (
            <View className="w-10 h-10 rounded-full mr-3 bg-gray-800" />
          )}
          <View className="flex-1">
            <Text className="text-white text-lg font-poppins-bold leading-snug">
              {entry.businessName ?? ""}
            </Text>
          </View>
        </View>

        <View className="border-b border-gray-800 mb-4" />

        <Text className="text-gray-500 text-xs uppercase tracking-wide mb-1">
          Voucher
        </Text>
        <Text className="text-white text-base font-poppins-semibold mb-1">
          {entry.voucherTitle}
        </Text>
        <Text className="text-gray-300 text-sm leading-relaxed mb-4">
          {entry.voucherDescription}
        </Text>

        <View className="border-b border-gray-800 mb-5" />

        {/* QR section */}
        {revealing ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#ffffff" />
            <Text className="text-gray-400 text-xs mt-3">
              Loading your voucher code…
            </Text>
          </View>
        ) : revealError ? (
          <View className="items-center py-8">
            <Text className="text-red-400 text-sm mb-4">{revealError}</Text>
            <Pressable
              onPress={doReveal}
              className="border border-white px-6 py-3"
            >
              <Text className="text-white text-sm font-poppins-semibold">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : voucherCode ? (
          <TicketStub
            voucherCode={voucherCode}
            voucherValidFrom={entry.voucherValidFrom}
            voucherValidTo={entry.voucherValidTo}
          />
        ) : null}
      </View>
    </BottomSheetScrollView>
  );
}

// --- Main sheet ---

export const VoucherSheet = forwardRef<BottomSheetModal>(
  function VoucherSheet(_props, ref) {
    const { mode, close } = useVoucherSheet();

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={["75%"]}
        backgroundStyle={{ backgroundColor: "#111111" }}
        handleIndicatorStyle={{ backgroundColor: "#444444" }}
        onDismiss={close}
        enableDynamicSizing={false}
      >
        {mode?.type === "claim" && (
          <ClaimContent
            voucherId={mode.voucherId}
            distanceMetres={mode.distanceMetres}
          />
        )}
        {mode?.type === "reveal" && <RevealContent entry={mode.entry} />}
      </BottomSheetModal>
    );
  },
);
```

- [ ] **Step 3: Mount VoucherSheet and VoucherSheetProvider in `_layout.tsx`**

**3a.** Add imports:
```tsx
import { VoucherSheetProvider } from "./lib/voucher-sheet-context";
import { VoucherSheet } from "./components/voucher-sheet";
```

**3b.** Add `VoucherSheetProvider` around `AuthSheetProvider` in the provider tree:
```tsx
<WalletAnimationProvider>
  <AuthSheetProvider>
    <VoucherSheetProvider>
      <AppProviders>
        ...
      </AppProviders>
    </VoucherSheetProvider>
  </AuthSheetProvider>
</WalletAnimationProvider>
```

**3c.** Mount the `VoucherSheet` inside `AppProviders` (alongside `AuthSheet`):
```tsx
function AppProviders({ children }: { children: React.ReactNode }) {
  const { sheetRef: authSheetRef } = useAuthSheet();
  const { sheetRef: voucherSheetRef } = useVoucherSheet();
  useAuthGuard();
  useRegisterPushTokenOnAuth();
  useNotificationDeepLink();

  useEffect(() => {
    captureAppOpened();
    return () => { void posthog?.flush(); };
  }, []);

  return (
    <>
      {children}
      <AnimationOverlay />
      <AuthSheet ref={authSheetRef} />
      <VoucherSheet ref={voucherSheetRef} />
    </>
  );
}
```

Also add import in `AppProviders`:
```tsx
import { useVoucherSheet } from "./lib/voucher-sheet-context";
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/lib/voucher-sheet-context.tsx \
        apps/mobile/app/components/voucher-sheet.tsx \
        apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add VoucherSheet with claim and reveal modes"
```

---

### Task 6: Wallet screen redesign

Replace the existing wallet screen with the new design: business logo + name cards, Active/Past sections, Past collapsed, tapping a card opens `VoucherSheet` in reveal mode.

**Files:**
- Modify: `apps/mobile/app/(tabs)/wallet.tsx`

**Interfaces:**
- Consumes:
  - `useVoucherSheet().openReveal(entry: RevealEntry)`
  - `getWallet` now returns `businessLogoUrl: string | null` (Task 1)
  - `RevealEntry` type from `../lib/voucher-sheet-context`

- [ ] **Step 1: Rewrite wallet.tsx**

Replace the entire content of `apps/mobile/app/(tabs)/wallet.tsx`:

```tsx
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { ScreenHeader } from "../components/screen-header";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { posthog } from "../lib/analytics";
import { useVoucherSheet, type RevealEntry } from "../lib/voucher-sheet-context";
import {
  loadRevealCache,
  filterValidReveals,
  type CachedReveal,
} from "../lib/reveal-cache";

type WalletEntry = {
  claimId: string;
  voucherId: string;
  state: string;
  activeCode: string | null;
  codeExpiresAt: number | null;
  businessId: string | null;
  businessName: string | null;
  businessLogoUrl: string | null;
  voucherValidFrom: number | null;
  voucher: {
    _id: string;
    title: string;
    description?: string;
    voucherValidTo: number;
  } | null;
};

function walletEntryToRevealEntry(entry: WalletEntry): RevealEntry {
  return {
    claimId: entry.claimId,
    voucherId: entry.voucherId,
    businessName: entry.businessName,
    businessLogoUrl: entry.businessLogoUrl,
    voucherTitle: entry.voucher?.title ?? "Voucher",
    voucherDescription: entry.voucher?.description ?? "",
    voucherValidFrom: entry.voucherValidFrom ?? 0,
    voucherValidTo: entry.voucher?.voucherValidTo ?? 0,
    activeCode: entry.activeCode,
    codeExpiresAt: entry.codeExpiresAt,
  };
}

function VoucherCard({ entry, onPress }: { entry: WalletEntry; onPress: () => void }) {
  const validTo = entry.voucher?.voucherValidTo;
  const expiryLabel = validTo
    ? `Until ${new Date(validTo).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    : null;

  return (
    <Pressable
      onPress={onPress}
      className="bg-zinc-900 rounded-xl p-4 mb-3 active:opacity-70"
    >
      <View className="flex-row items-center mb-3">
        {entry.businessLogoUrl ? (
          <Image
            source={{ uri: entry.businessLogoUrl }}
            className="w-10 h-10 rounded-full mr-3 bg-gray-800"
          />
        ) : (
          <View className="w-10 h-10 rounded-full mr-3 bg-gray-800" />
        )}
        <View className="flex-1">
          <Text className="text-white font-poppins-semibold text-sm leading-snug">
            {entry.businessName ?? ""}
          </Text>
        </View>
      </View>
      <View className="border-t border-gray-800 pt-3">
        <Text className="text-white font-poppins-bold text-base mb-0.5">
          {entry.voucher?.title ?? "Voucher"}
        </Text>
        {expiryLabel ? (
          <Text className="text-gray-400 text-xs">{expiryLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function CachedRevealCard({ reveal, onPress }: { reveal: CachedReveal; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-zinc-900 rounded-xl p-4 mb-3 active:opacity-70"
    >
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full mr-3 bg-gray-800" />
        <Text className="text-white font-poppins-semibold text-sm flex-1">
          {reveal.businessName ?? ""}
        </Text>
      </View>
      <View className="border-t border-gray-800 pt-3">
        <Text className="text-white font-poppins-bold text-base mb-0.5">
          {reveal.voucherTitle ?? "Voucher"}
        </Text>
        <Text className="text-yellow-500 text-xs">Offline — showing cached code</Text>
      </View>
    </Pressable>
  );
}

export default function WalletScreen() {
  const wallet = useQuery(api.functions.claims.getWallet, {});
  const [cachedReveals, setCachedReveals] = useState<CachedReveal[]>([]);
  const [pastExpanded, setPastExpanded] = useState(false);
  const { openReveal } = useVoucherSheet();

  useEffect(() => {
    void posthog?.screen("Wallet");
    loadRevealCache().then(setCachedReveals);
  }, []);

  // Offline fallback
  if (wallet === undefined) {
    const validCached = filterValidReveals(cachedReveals, Date.now());
    if (validCached.length > 0) {
      return (
        <View className="flex-1 bg-black">
          <ScreenHeader title="My wallet" />
          <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
            {validCached.map((reveal) => (
              <CachedRevealCard
                key={reveal.claimId}
                reveal={reveal}
                onPress={() => {
                  // Convert cached reveal to RevealEntry for offline display
                  openReveal({
                    claimId: reveal.claimId,
                    voucherId: "",
                    businessName: reveal.businessName ?? null,
                    businessLogoUrl: null,
                    voucherTitle: reveal.voucherTitle ?? "Voucher",
                    voucherDescription: "",
                    voucherValidFrom: 0,
                    voucherValidTo: reveal.expiresAt,
                    activeCode: reveal.voucherCode,
                    codeExpiresAt: reveal.expiresAt,
                  });
                }}
              />
            ))}
          </ScrollView>
        </View>
      );
    }
    return (
      <View className="flex-1 bg-black">
        <ScreenHeader title="My wallet" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      </View>
    );
  }

  const now = Date.now();
  const activeEntries = wallet.filter(
    (e) =>
      e.state !== "redeemed" &&
      e.voucher != null &&
      e.voucher.voucherValidTo > now,
  ) as WalletEntry[];
  const pastEntries = wallet.filter(
    (e) =>
      e.state === "redeemed" ||
      (e.voucher != null && e.voucher.voucherValidTo <= now),
  ) as WalletEntry[];

  return (
    <View className="flex-1 bg-black">
      <ScreenHeader title="My wallet" />
      <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
        {wallet.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-400 text-base text-center">
              No vouchers yet.
            </Text>
            <Text className="text-gray-600 text-sm text-center mt-2">
              Browse the map to find and save vouchers.
            </Text>
          </View>
        ) : (
          <>
            {activeEntries.length > 0 && (
              <>
                <Text className="text-gray-400 text-xs uppercase tracking-wide mb-3">
                  Active vouchers
                </Text>
                {activeEntries.map((entry) => (
                  <VoucherCard
                    key={entry.claimId}
                    entry={entry}
                    onPress={() => openReveal(walletEntryToRevealEntry(entry))}
                  />
                ))}
              </>
            )}

            {pastEntries.length > 0 && (
              <View className="mt-4">
                <Pressable
                  onPress={() => setPastExpanded((p) => !p)}
                  className="flex-row items-center mb-3"
                >
                  <Text className="text-gray-400 text-xs uppercase tracking-wide flex-1">
                    Past
                  </Text>
                  <Text className="text-gray-600 text-xs">
                    {pastExpanded ? "Hide" : `Show (${pastEntries.length})`}
                  </Text>
                </Pressable>
                {pastExpanded &&
                  pastEntries.map((entry) => (
                    <VoucherCard
                      key={entry.claimId}
                      entry={entry}
                      onPress={() => openReveal(walletEntryToRevealEntry(entry))}
                    />
                  ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/wallet.tsx
git commit -m "feat(mobile): redesign wallet screen with logo cards and Active/Past sections"
```

---

### Task 7: Wire up map and deep links to VoucherSheet

Update `NearbyVouchersContent`, `BusinessDetailContent`, and the `/v/[id]` deep-link route to open `VoucherSheet` in claim mode instead of navigating.

**Files:**
- Modify: `apps/mobile/app/components/map/nearby-vouchers-content.tsx`
- Modify: `apps/mobile/app/components/map/business-detail-content.tsx`
- Modify: `apps/mobile/app/v/[id].tsx`

**Interfaces:**
- Consumes: `useVoucherSheet().openClaim(voucherId, distanceMetres?)`

- [ ] **Step 1: Update NearbyVouchersContent**

The `LatestOfferRow` has an `onPress` with a `// TBD` comment. Wire it to `openClaim`. Also update the interface to not pass `onVoucherPress` (the sheet context handles it directly):

In `apps/mobile/app/components/map/nearby-vouchers-content.tsx`:

Add import:
```tsx
import { useVoucherSheet } from "../../lib/voucher-sheet-context";
```

Inside the `NearbyVouchersContent` function, add at the top:
```tsx
const { openClaim } = useVoucherSheet();
```

Replace the `LatestOfferRow onPress` TBD:
```tsx
onPress={() => openClaim(voucher._id)}
```

Also update the `NearbyBusinessCard onPress` for vouchers if applicable — but that goes to business detail, leave as is.

- [ ] **Step 2: Update BusinessDetailContent**

The business detail currently shows voucher cards with no press handler. Make each voucher card tappable:

In `apps/mobile/app/components/map/business-detail-content.tsx`:

Add import:
```tsx
import { useVoucherSheet } from "../../lib/voucher-sheet-context";
```

Inside `BusinessDetailContent`, add:
```tsx
const { openClaim } = useVoucherSheet();
```

Wrap each voucher `View` in a `Pressable`:
```tsx
{business.vouchers.map((voucher) => (
  <Pressable
    key={voucher._id}
    onPress={() => openClaim(voucher._id as string, distanceMetres ?? undefined)}
    className="bg-zinc-800 rounded-lg mx-4 mb-3 p-4 active:opacity-70"
  >
    <Text className="text-white font-poppins-semibold text-sm mb-1">
      {voucher.title}
    </Text>
    <Text className="text-gray-400 text-xs mb-2 leading-relaxed">
      {voucher.description}
    </Text>
    <Text className="text-gray-500 text-xs">
      Until{" "}
      {new Date(voucher.voucherValidTo).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}
    </Text>
  </Pressable>
))}
```

- [ ] **Step 3: Update `/v/[id].tsx` deep-link route**

Replace the entire content of `apps/mobile/app/v/[id].tsx` to navigate to the map tab and open the sheet:

```tsx
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVoucherSheet } from "../lib/voucher-sheet-context";

export default function VoucherDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { openClaim } = useVoucherSheet();

  useEffect(() => {
    if (!id) return;
    // Navigate to map tab, then open the voucher sheet
    router.replace("/(tabs)");
    // Small delay to let navigation settle before presenting sheet
    setTimeout(() => openClaim(id), 100);
  }, [id]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#ffffff" />
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/components/map/nearby-vouchers-content.tsx \
        apps/mobile/app/components/map/business-detail-content.tsx \
        apps/mobile/app/v/[id].tsx
git commit -m "feat(mobile): wire up map and deep links to VoucherSheet"
```

---

### Task 8: Manual QA pass

- [ ] **Scenario 1 — Unauthenticated claim attempt**
  1. Sign out. Tap a voucher on the map → claim sheet opens.
  2. Tap "Save to wallet" → auth sheet slides up. Sign in.
  3. Auth sheet dismisses. Tap voucher again → "Save to wallet" available. Tap it.
  4. Button changes to "Saved to wallet ✓", thumbnail flies to wallet tab, wallet tab bounces. Sheet auto-closes.

- [ ] **Scenario 2 — Authenticated claim**
  1. Sign in. Tap a voucher → claim sheet opens.
  2. Tap "Save to wallet" → button changes to "Saved to wallet ✓".
  3. Thumbnail animates from sheet toward wallet tab icon. Tab bounces on arrival. Sheet closes after ~1s.

- [ ] **Scenario 3 — Wallet reveal**
  1. Tap Wallet tab → see redesigned card list with business logos.
  2. Tap a card → VoucherSheet opens in reveal mode. QR code loads within 1–2s.
  3. Ticket stub renders with perforated divider. Code is copyable (tap → "✓").
  4. Dismiss sheet → back to wallet list.

- [ ] **Scenario 4 — Expired reveal auto-regeneration**
  1. If a cached code has expired, tapping the wallet card should generate a new code silently (no countdown shown, no error unless the server call fails).

- [ ] **Scenario 5 — Past section**
  1. Tap "Show (N)" on the Past section → past vouchers appear. Tap "Hide" → collapse.

- [ ] **Scenario 6 — Deep link**
  1. Open `areacodes://v/<voucher-id>` → app navigates to map tab and voucher claim sheet opens over it.

- [ ] **Commit after all scenarios pass**

```bash
git commit --allow-empty -m "chore: wallet/voucher flows QA passed"
```
