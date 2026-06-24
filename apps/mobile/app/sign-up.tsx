import { useState } from "react";
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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Effect } from "effect";
import { authClient } from "./lib/auth-client";
import { captureSignInCompleted, captureSignUpCompleted } from "./lib/analytics";
import { tryAuth } from "./lib/mutation-effects";
import { SocialAuthButtons } from "./components/social-auth-buttons";

type Mode = "sign-up" | "sign-in";

export default function SignUpModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("sign-up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClose() {
    router.replace("/(tabs)");
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
  }

  function handleSignUp() {
    if (!name || !email || !password || !termsAccepted) return;
    return Effect.runPromise(
      Effect.sync(() => { setLoading(true); setError(""); }).pipe(
        Effect.flatMap(() => tryAuth(() => authClient.signUp.email({ email, password, name }))),
        Effect.tap(() => Effect.sync(() => {
          captureSignUpCompleted("email");
          router.replace("/(tabs)");
        })),
        Effect.tapError((err) => Effect.sync(() => setError(err.message))),
        Effect.ensuring(Effect.sync(() => setLoading(false))),
        Effect.ignore,
      ),
    );
  }

  function handleSignIn() {
    if (!email || !password) return;
    return Effect.runPromise(
      Effect.sync(() => { setLoading(true); setError(""); }).pipe(
        Effect.flatMap(() => tryAuth(() => authClient.signIn.email({ email, password }))),
        Effect.tap(() => Effect.sync(() => {
          captureSignInCompleted("email");
          router.replace("/(tabs)");
        })),
        Effect.tapError((err) => Effect.sync(() => setError(err.message))),
        Effect.ensuring(Effect.sync(() => setLoading(false))),
        Effect.ignore,
      ),
    );
  }

  const canSubmit = mode === "sign-up"
    ? name.length > 0 && email.length > 0 && password.length > 0 && termsAccepted && !loading
    : email.length > 0 && password.length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "white" }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingTop: insets.top + 20,
          paddingBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontFamily: "Poppins_700Bold",
            color: "black",
          }}
        >
          {mode === "sign-up" ? "Get started" : "Welcome back"}
        </Text>
        <Pressable onPress={handleClose} hitSlop={12}>
          <Text style={{ fontSize: 20, color: "black", lineHeight: 24 }}>✕</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12 }}>
        {mode === "sign-up" && (
          <>
            <Text
              style={{
                color: "#374151",
                fontSize: 13,
                fontFamily: "Poppins_500Medium",
                marginBottom: 6,
              }}
            >
              Full name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              autoComplete="name"
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: "black",
                marginBottom: 14,
                fontFamily: "Poppins_400Regular",
              }}
            />
          </>
        )}

        <Text
          style={{
            color: "#374151",
            fontSize: 13,
            fontFamily: "Poppins_500Medium",
            marginBottom: 6,
          }}
        >
          Email
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            color: "black",
            marginBottom: 14,
            fontFamily: "Poppins_400Regular",
          }}
        />

        <Text
          style={{
            color: "#374151",
            fontSize: 13,
            fontFamily: "Poppins_500Medium",
            marginBottom: 6,
          }}
        >
          Password
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            color: "black",
            marginBottom: 16,
            fontFamily: "Poppins_400Regular",
          }}
        />

        {mode === "sign-up" && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 12,
                color: "#6B7280",
                lineHeight: 18,
                fontFamily: "Poppins_400Regular",
              }}
            >
              {"I accept the "}
              <Text style={{ textDecorationLine: "underline", color: "#111827" }}>
                Terms
              </Text>
              {" and I have read the "}
              <Text style={{ textDecorationLine: "underline", color: "#111827" }}>
                Privacy Policy & cookies
              </Text>
            </Text>
            <Switch
              value={termsAccepted}
              onValueChange={setTermsAccepted}
              trackColor={{ false: "#9CA3AF", true: "#111827" }}
              thumbColor="white"
            />
          </View>
        )}

        {error ? (
          <Text
            style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, fontFamily: "Poppins_400Regular" }}
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={() => void (mode === "sign-up" ? handleSignUp() : handleSignIn())}
          disabled={!canSubmit}
          style={{
            backgroundColor: "black",
            paddingVertical: 14,
            alignItems: "center",
            marginBottom: 20,
            opacity: canSubmit ? 1 : 0.4,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              style={{
                color: "white",
                fontFamily: "Poppins_600SemiBold",
                fontSize: 15,
              }}
            >
              {mode === "sign-up" ? "Get started" : "Sign in"}
            </Text>
          )}
        </Pressable>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: 13,
              marginHorizontal: 12,
              fontFamily: "Poppins_400Regular",
            }}
          >
            or
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
        </View>

        <SocialAuthButtons
          mode={mode}
          theme="light"
          onError={setError}
          onSuccess={() => router.replace("/(tabs)")}
        />

        <View
          style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}
        >
          <Text
            style={{
              color: "#6B7280",
              fontSize: 13,
              fontFamily: "Poppins_400Regular",
            }}
          >
            {mode === "sign-up" ? "Already have an account? " : "Don't have an account? "}
          </Text>
          <Pressable onPress={() => switchMode(mode === "sign-up" ? "sign-in" : "sign-up")} hitSlop={8}>
            <Text
              style={{
                color: "#111827",
                fontSize: 13,
                textDecorationLine: "underline",
                fontFamily: "Poppins_400Regular",
              }}
            >
              {mode === "sign-up" ? "Log in." : "Sign up."}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
