import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { authClient } from "../lib/auth-client";

function GoogleIcon() {
  return (
    <Text className="text-base mr-2">G</Text>
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (signInError) {
        setError(signInError.message ?? "Google sign-in failed. Please try again.");
      }
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setError("");
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setError("Apple sign-in failed. Please try again.");
        return;
      }
      const { error: signInError } = await authClient.signIn.social({
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
      if (signInError) {
        setError(signInError.message ?? "Apple sign-in failed. Please try again.");
      } else {
        router.replace("/(tabs)/");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "ERR_REQUEST_CANCELED") {
        setError("Apple sign-in failed. Please try again.");
      }
    } finally {
      setAppleLoading(false);
    }
  }

  async function handleSignUp() {
    if (!name || !email || !password) return;
    setError("");
    setLoading(true);
    try {
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name,
      });
      if (signUpError) {
        setError(signUpError.message ?? "Something went wrong. Please try again.");
      } else {
        router.replace("/(tabs)/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = name.length > 0 && email.length > 0 && password.length > 0 && !loading;
  const socialLoading = googleLoading || appleLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-black"
    >
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-sm">
          <Text className="text-white text-2xl font-bold mb-2">
            Create an account
          </Text>
          <Text className="text-gray-400 text-sm mb-8">
            Save vouchers and support local businesses
          </Text>

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
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
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

          <View className="mb-4">
            <Text className="text-gray-300 text-sm font-medium mb-1.5">
              Full name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#6b7280"
              autoComplete="name"
              className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-300 text-sm font-medium mb-1.5">
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
              className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-300 text-sm font-medium mb-1.5">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#6b7280"
              secureTextEntry
              autoComplete="new-password"
              className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm"
            />
          </View>

          {error ? (
            <Text className="text-red-400 text-sm mb-4">{error}</Text>
          ) : null}

          <Pressable
            onPress={handleSignUp}
            disabled={!canSubmit}
            className="bg-white rounded-lg px-4 py-3 items-center mb-6 disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text className="text-black font-semibold text-sm">
                Create account
              </Text>
            )}
          </Pressable>

          <View className="flex-row justify-center">
            <Text className="text-gray-400 text-sm">Already have an account? </Text>
            <Link href="/(auth)/sign-in">
              <Text className="text-white text-sm underline">Sign in</Text>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
