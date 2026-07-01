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
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { COLORS } from "../constants/colors";
import { authClient } from "../lib/auth-client";
import { SocialAuthButtons } from "./social-auth-buttons";
import {
  captureSignInCompleted,
  captureSignUpCompleted,
} from "../lib/analytics";
import { StampText } from "./stamp-text";

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
      backgroundStyle={{ backgroundColor: COLORS.raisedSurface }}
      handleIndicatorStyle={{ backgroundColor: COLORS.handleIndicator }}
      onDismiss={resetForm}
      keyboardBehavior="extend"
    >
      <BottomSheetScrollView>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="px-6 pt-4 pb-10">
            <StampText size="lg" style={{ marginBottom: 6 }}>
              {mode === "sign-up" ? "Create account" : "Welcome back"}
            </StampText>
            <Text className="text-gray-400 text-sm mb-8">
              {mode === "sign-up"
                ? "Sign up to save vouchers to your wallet"
                : "Sign in to your Areacodes account"}
            </Text>

            <SocialAuthButtons mode={mode} onError={setError} />

            {mode === "sign-up" && (
              <View className="mb-4">
                <Text className="text-gray-400 text-sm font-poppins-medium mb-1.5">
                  Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.dimInk}
                  autoComplete="name"
                  accessibilityLabel="Name"
                  className="bg-gray-900 border border-gray-700 text-white px-4 py-3 text-sm"
                />
              </View>
            )}

            <View className="mb-4">
              <Text className="text-gray-400 text-sm font-poppins-medium mb-1.5">
                Email address
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.dimInk}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                accessibilityLabel="Email address"
                className="bg-gray-900 border border-gray-700 text-white px-4 py-3 text-sm"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-400 text-sm font-poppins-medium mb-1.5">
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.dimInk}
                secureTextEntry
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                accessibilityLabel="Password"
                className="bg-gray-900 border border-gray-700 text-white px-4 py-3 text-sm"
              />
            </View>

            {mode === "sign-up" && (
              <View className="flex-row items-center mb-6">
                <Switch
                  value={termsAccepted}
                  onValueChange={setTermsAccepted}
                  trackColor={{ false: COLORS.secondarySurface, true: COLORS.white }}
                  thumbColor={COLORS.black}
                  accessibilityLabel="Accept Terms of Service and Privacy Policy"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: termsAccepted }}
                />
                <Text className="text-gray-400 text-xs ml-3 flex-1">
                  I agree to the Terms of Service and Privacy Policy
                </Text>
              </View>
            )}

            {error ? (
              <Text
                className="text-red-400 text-sm mb-4"
                accessibilityLiveRegion="polite"
              >
                {error}
              </Text>
            ) : null}

            <Pressable
              onPress={mode === "sign-up" ? handleSignUp : handleSignIn}
              disabled={mode === "sign-up" ? !canSignUp : !canSignIn}
              className="bg-white px-4 py-3 items-center mb-6 disabled:opacity-50"
              accessibilityLabel={mode === "sign-up" ? "Create account" : "Sign in"}
              accessibilityRole="button"
              accessibilityState={{ disabled: mode === "sign-up" ? !canSignUp : !canSignIn }}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.black} />
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
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                accessibilityLabel={mode === "sign-up" ? "Switch to sign in" : "Switch to sign up"}
                accessibilityRole="button"
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
