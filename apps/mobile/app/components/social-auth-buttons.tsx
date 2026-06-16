import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { authClient } from "../lib/auth-client";

function GoogleIcon() {
  return <Text className="text-base mr-2">G</Text>;
}

type SocialAuthButtonsProps = {
  mode: "sign-in" | "sign-up";
  onError: (message: string) => void;
};

export function SocialAuthButtons({ mode, onError }: SocialAuthButtonsProps) {
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
        router.replace("/(tabs)/");
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

  return (
    <>
      <Pressable
        onPress={handleGoogleSignIn}
        disabled={socialLoading}
        className="flex-row items-center justify-center bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 mb-3 disabled:opacity-50"
      >
        {googleLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <GoogleIcon />
            <Text className="text-white font-semibold text-sm">Continue with Google</Text>
          </>
        )}
      </Pressable>

      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            mode === "sign-up"
              ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
          }
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={8}
          style={{ height: 44, marginBottom: 12, opacity: appleLoading ? 0.5 : 1 }}
          onPress={handleAppleSignIn}
        />
      )}

      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-px bg-gray-800" />
        <Text className="text-gray-500 text-xs mx-3">or</Text>
        <View className="flex-1 h-px bg-gray-800" />
      </View>
    </>
  );
}
