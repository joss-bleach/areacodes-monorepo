import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { authClient } from "../lib/auth-client";
import { isVoucherClaimable, formatValidityWindow } from "../lib/voucher-utils";

const BASE_HEADER_OPTIONS = {
  headerShown: true,
  headerStyle: { backgroundColor: "#000" },
  headerTintColor: "#fff",
} as const;

export default function BusinessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const business = useQuery(
    api.functions.explore.getBusinessByIdWithVouchers,
    id ? { businessId: id as Id<"businesses"> } : "skip"
  );

  if (business === undefined) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (business === null) {
    return (
      <>
        <Stack.Screen options={{ ...BASE_HEADER_OPTIONS, title: "Business" }} />
        <View className="flex-1 bg-black items-center justify-center px-6">
          <Text className="text-white text-lg font-semibold">Business not found</Text>
          <Pressable onPress={() => router.back()} className="mt-4">
            <Text className="text-gray-400 text-sm underline">Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  function handleClaim(voucherId: string) {
    if (!session?.user) {
      router.push(`/(auth)/sign-in?returnTo=/business/${id}&voucherId=${voucherId}`);
      return;
    }
    // Auth is in place — claim flow (requires Convex auth bridge, tracked separately)
  }

  return (
    <>
      <Stack.Screen
        options={{
          ...BASE_HEADER_OPTIONS,
          title: business.name,
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />
      <ScrollView className="flex-1 bg-black" contentContainerClassName="px-4 py-6">
        <Text className="text-white text-2xl font-bold mb-2">{business.name}</Text>

        {business.industry && (
          <Text className="text-gray-400 text-xs uppercase tracking-wide mb-4">
            {business.industry.name}
          </Text>
        )}

        <Text className="text-gray-300 text-sm leading-relaxed mb-8">
          {business.description}
        </Text>

        <Text className="text-white text-lg font-semibold mb-4">Active vouchers</Text>

        {business.vouchers.length === 0 ? (
          <Text className="text-gray-500 text-sm">No active vouchers right now.</Text>
        ) : (
          business.vouchers.map((voucher) => {
            const claimable = isVoucherClaimable(voucher.voucherValidFrom, voucher.voucherValidTo);
            return (
              <View
                key={voucher._id}
                className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4"
              >
                <Text className="text-white font-semibold text-base mb-1">
                  {voucher.title}
                </Text>
                <Text className="text-gray-300 text-sm mb-3">{voucher.description}</Text>
                <Text className="text-gray-500 text-xs mb-4">
                  Valid: {formatValidityWindow(voucher.voucherValidFrom, voucher.voucherValidTo)}
                </Text>

                {claimable ? (
                  <Pressable
                    onPress={() => handleClaim(voucher._id)}
                    className="bg-white rounded-lg px-4 py-3 items-center"
                  >
                    <Text className="text-black font-semibold text-sm">Claim</Text>
                  </Pressable>
                ) : (
                  <View className="bg-gray-800 rounded-lg px-4 py-3 items-center">
                    <Text className="text-gray-500 text-sm">Expired</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}
