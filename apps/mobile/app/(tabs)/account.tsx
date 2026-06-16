import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { authClient } from "../lib/auth-client";

export default function AccountScreen() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/(auth)/sign-in");
  }

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (!session?.user) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-white text-xl font-bold mb-2">Account</Text>
        <Text className="text-gray-400 text-sm mb-6 text-center">
          Sign in to manage your account and view your voucher history.
        </Text>
        <Pressable
          onPress={() => router.push("/(auth)/sign-in")}
          className="bg-white rounded-lg px-6 py-3"
        >
          <Text className="text-black font-semibold text-sm">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black px-6 pt-16">
      <Text className="text-white text-2xl font-bold mb-1">Account</Text>
      <Text className="text-gray-400 text-sm mb-8">
        Manage your Areacodes account
      </Text>

      <View className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <Text className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
          Name
        </Text>
        <Text className="text-white text-base">{session.user.name}</Text>
      </View>

      <View className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <Text className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
          Email
        </Text>
        <Text className="text-white text-base">{session.user.email}</Text>
      </View>

      <Pressable
        onPress={handleSignOut}
        className="border border-gray-700 rounded-lg px-4 py-3 items-center"
      >
        <Text className="text-white font-medium text-sm">Sign out</Text>
      </Pressable>
    </View>
  );
}
