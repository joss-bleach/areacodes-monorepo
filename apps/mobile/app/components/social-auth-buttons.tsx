import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";
import { COLORS } from "../constants/colors";
import { authClient } from "../lib/auth-client";
import {
  captureSignInCompleted,
  captureSignUpCompleted,
} from "../lib/analytics";

function GoogleIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" style={{ marginRight: 8 }}>
      <Path
        fill={color}
        d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748z"
      />
    </Svg>
  );
}

type SocialAuthButtonsProps = {
  mode: "sign-in" | "sign-up";
  onError: (message: string) => void;
  onSuccess?: () => void;
  theme?: "dark" | "light";
};

export function SocialAuthButtons({ mode, onError, onSuccess, theme = "dark" }: SocialAuthButtonsProps) {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const socialLoading = googleLoading || appleLoading;

  async function handleGoogleSignIn() {
    onError("");
    setGoogleLoading(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (error) {
        onError(error.message ?? "Google sign-in failed. Please try again.");
      } else {
        if (mode === "sign-up") {
          captureSignUpCompleted("google");
        } else {
          captureSignInCompleted("google");
        }
        if (onSuccess) onSuccess();
        else router.replace("/(tabs)");
      }
    } catch {
      onError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleAppleSignIn() {
    onError("");
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        onError("Apple sign-in failed. Please try again.");
        return;
      }
      const { error } = await authClient.signIn.social({
        provider: "apple",
        idToken: {
          token: credential.identityToken,
          user: credential.fullName
            ? {
                name: {
                  firstName: credential.fullName.givenName ?? undefined,
                  lastName: credential.fullName.familyName ?? undefined,
                },
                email: credential.email ?? undefined,
              }
            : undefined,
        },
      });
      if (error) {
        onError(error.message ?? "Apple sign-in failed. Please try again.");
      } else {
        if (mode === "sign-up") {
          captureSignUpCompleted("apple");
        } else {
          captureSignInCompleted("apple");
        }
        if (onSuccess) onSuccess();
        else router.replace("/(tabs)");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "ERR_REQUEST_CANCELED") {
        onError("Apple sign-in failed. Please try again.");
      }
    } finally {
      setAppleLoading(false);
    }
  }

  const isDark = theme === "dark";
  const bgColor = isDark ? COLORS.secondarySurface : COLORS.white;
  const borderColor = isDark ? "#374151" : "#E5E7EB";
  const textColor = isDark ? COLORS.white : "#111827";

  return (
    <>
      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            mode === "sign-up"
              ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
          }
          buttonStyle={
            isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={0}
          style={{ height: 44, marginBottom: 12, opacity: appleLoading ? 0.5 : 1 }}
          onPress={handleAppleSignIn}
        />
      )}

      <Pressable
        onPress={handleGoogleSignIn}
        disabled={socialLoading}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 12,
          marginBottom: 12,
          opacity: socialLoading ? 0.5 : 1,
          borderWidth: 1,
          backgroundColor: bgColor,
          borderColor: borderColor,
        }}
        accessibilityLabel={mode === "sign-up" ? "Sign up with Google" : "Sign in with Google"}
        accessibilityRole="button"
        accessibilityState={{ disabled: socialLoading }}
      >
        {googleLoading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <>
            <GoogleIcon color={textColor} />
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 14,
                color: textColor,
              }}
            >
              Continue with Google
            </Text>
          </>
        )}
      </Pressable>
    </>
  );
}
