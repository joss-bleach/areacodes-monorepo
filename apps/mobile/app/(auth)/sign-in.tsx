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
import { authClient } from "../lib/auth-client";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message ?? "Something went wrong. Please try again.");
      } else {
        router.replace("/(tabs)/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = email.length > 0 && password.length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-black"
    >
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-sm">
          <Text className="text-white text-2xl font-bold mb-2">Welcome back</Text>
          <Text className="text-gray-400 text-sm mb-8">
            Sign in to your Areacodes account
          </Text>

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
              autoComplete="current-password"
              className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm"
            />
          </View>

          {error ? (
            <Text className="text-red-400 text-sm mb-4">{error}</Text>
          ) : null}

          <Pressable
            onPress={handleSignIn}
            disabled={!canSubmit}
            className="bg-white rounded-lg px-4 py-3 items-center mb-6 disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text className="text-black font-semibold text-sm">Sign in</Text>
            )}
          </Pressable>

          <View className="flex-row justify-center">
            <Text className="text-gray-400 text-sm">Don&apos;t have an account? </Text>
            <Link href="/(auth)/sign-up">
              <Text className="text-white text-sm underline">Sign up</Text>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
