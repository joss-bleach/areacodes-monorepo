import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { authClient } from "../lib/auth-client";
import { ScreenHeader } from "../components/screen-header";
import { useAuthSheet } from "../lib/auth-sheet-context";

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

export default function AccountScreen() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/(tabs)");
  }

  if (isPending) {
    return (
      <View className="flex-1 bg-black">
        <ScreenHeader title="Account" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      </View>
    );
  }

  if (!session?.user) {
    return <AccountUnauthenticated />;
  }

  return (
    <View className="flex-1 bg-black">
      <ScreenHeader title="Account" />
      <View className="flex-1 px-6 pt-6">
      <Text className="text-gray-400 text-sm mb-8">
        Manage your Areacodes account
      </Text>

      <View className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <Text className="text-gray-400 text-xs font-poppins-medium uppercase tracking-wider mb-1">
          Name
        </Text>
        <Text className="text-white text-base">{session.user.name}</Text>
      </View>

      <View className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <Text className="text-gray-400 text-xs font-poppins-medium uppercase tracking-wider mb-1">
          Email
        </Text>
        <Text className="text-white text-base">{session.user.email}</Text>
      </View>

      <Pressable
        onPress={handleSignOut}
        className="border border-gray-700 px-4 py-3 items-center"
      >
        <Text className="text-white font-poppins-medium text-sm">Sign out</Text>
      </Pressable>
      </View>
    </View>
  );
}
