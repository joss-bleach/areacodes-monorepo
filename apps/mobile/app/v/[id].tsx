import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { authClient } from "../lib/auth-client";
import { isVoucherClaimable, formatValidityWindow } from "../lib/voucher-utils";

const BASE_HEADER_OPTIONS = {
  headerShown: true,
  headerStyle: { backgroundColor: "#000" },
  headerTintColor: "#fff",
} as const;

export default function VoucherDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const voucher = useQuery(
    api.functions.vouchers.getVoucherByIdWithBusiness,
    id ? { voucherId: id as Id<"vouchers"> } : "skip",
  );

  const claimForVoucher = useQuery(
    api.functions.claims.getClaimForVoucher,
    id ? { voucherId: id as Id<"vouchers"> } : "skip",
  );

  const claimVoucher = useMutation(api.functions.claims.claimVoucher);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  if (voucher === undefined) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (voucher === null) {
    return (
      <>
        <Stack.Screen options={{ ...BASE_HEADER_OPTIONS, title: "Voucher" }} />
        <View className="flex-1 bg-black items-center justify-center px-6">
          <Text className="text-white text-lg font-semibold">
            Voucher not found
          </Text>
          <Pressable onPress={() => router.replace("/(tabs)/")} className="mt-4">
            <Text className="text-gray-400 text-sm underline">Browse map</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const claimable = isVoucherClaimable(
    voucher.voucherValidFrom,
    voucher.voucherValidTo,
  );
  const alreadyClaimed = claimForVoucher != null;

  async function handleClaim() {
    if (!session?.user) {
      router.push(
        `/(auth)/sign-in?returnTo=/v/${id}`,
      );
      return;
    }

    setClaiming(true);
    setClaimError(null);
    try {
      await claimVoucher({ voucherId: id as Id<"vouchers"> });
    } catch {
      setClaimError("Could not claim voucher. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          ...BASE_HEADER_OPTIONS,
          title: voucher.title,
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />
      <ScrollView
        className="flex-1 bg-black"
        contentContainerClassName="px-4 py-6"
      >
        <Pressable
          onPress={() => router.push(`/business/${voucher.business._id}`)}
          className="mb-4"
        >
          <Text className="text-gray-400 text-sm">
            {voucher.business.name}
            {voucher.business.industry
              ? ` · ${voucher.business.industry.name}`
              : ""}
          </Text>
        </Pressable>

        <Text className="text-white text-2xl font-bold mb-2">
          {voucher.title}
        </Text>

        <Text className="text-gray-400 text-xs mb-4">
          Valid: {formatValidityWindow(voucher.voucherValidFrom, voucher.voucherValidTo)}
        </Text>

        <Text className="text-gray-300 text-sm leading-relaxed mb-8">
          {voucher.description}
        </Text>

        {claimError ? (
          <Text className="text-red-400 text-xs mb-2">{claimError}</Text>
        ) : null}

        {claimable && !alreadyClaimed && (
          <Pressable
            onPress={handleClaim}
            disabled={claiming}
            className="bg-white rounded-lg px-4 py-3 items-center disabled:opacity-50"
          >
            {claiming ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text className="text-black font-semibold text-sm">Claim</Text>
            )}
          </Pressable>
        )}

        {claimable && alreadyClaimed && (
          <View className="bg-gray-800 rounded-lg px-4 py-3 items-center">
            <Text className="text-green-400 font-semibold text-sm">
              Claimed ✓
            </Text>
          </View>
        )}

        {!claimable && (
          <View className="bg-gray-800 rounded-lg px-4 py-3 items-center">
            <Text className="text-gray-500 text-sm">Expired</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}
