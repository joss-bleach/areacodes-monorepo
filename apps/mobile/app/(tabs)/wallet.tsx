import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useState, useEffect } from "react";
import { ScreenHeader } from "../components/screen-header";
import { SkeletonBox } from "../components/skeleton-box";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { authClient } from "../lib/auth-client";
import { posthog } from "../lib/analytics";
import { useVoucherSheet, type RevealEntry } from "../lib/voucher-sheet-context";
import { useAuthSheet } from "../lib/auth-sheet-context";
import {
  loadRevealCache,
  filterValidReveals,
  type CachedReveal,
} from "../lib/reveal-cache";

type WalletEntry = {
  claimId: string;
  voucherId: string;
  state: string;
  activeCode: string | null;
  codeExpiresAt: number | null;
  businessId: string | null;
  businessName: string | null;
  businessLogoUrl: string | null;
  voucherValidFrom: number | null;
  provider: string | null;
  isRedeemed: boolean;
  voucher: {
    _id: string;
    title: string;
    description?: string;
    voucherValidTo: number;
  } | null;
};

function walletEntryToRevealEntry(entry: WalletEntry): RevealEntry {
  return {
    claimId: entry.claimId,
    voucherId: entry.voucherId,
    businessId: entry.businessId ?? null,
    businessName: entry.businessName,
    businessLogoUrl: entry.businessLogoUrl,
    voucherTitle: entry.voucher?.title ?? "Voucher",
    voucherDescription: entry.voucher?.description ?? "",
    voucherValidFrom: entry.voucherValidFrom ?? 0,
    voucherValidTo: entry.voucher?.voucherValidTo ?? 0,
    activeCode: entry.activeCode,
    codeExpiresAt: entry.codeExpiresAt,
    provider: entry.provider,
    isRedeemed: entry.isRedeemed,
  };
}

function WalletCardSkeleton() {
  return (
    <View className="bg-zinc-900 p-4 mb-3">
      <View className="flex-row items-center mb-3">
        <SkeletonBox style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
        <SkeletonBox style={{ height: 16, flex: 1 }} />
      </View>
      <View className="border-t border-gray-800 pt-3">
        <SkeletonBox style={{ height: 20, width: "75%", marginBottom: 8 }} />
        <SkeletonBox style={{ height: 12, width: "33%" }} />
      </View>
    </View>
  );
}

function WalletSkeleton() {
  return (
    <View
      className="px-4 py-6"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <SkeletonBox style={{ height: 12, width: 96, marginBottom: 16 }} />
      <WalletCardSkeleton />
      <WalletCardSkeleton />
      <WalletCardSkeleton />
    </View>
  );
}

function VoucherCard({ entry, onPress }: { entry: WalletEntry; onPress: () => void }) {
  const validTo = entry.voucher?.voucherValidTo;
  const expiryLabel = validTo
    ? `Until ${new Date(validTo).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    : null;

  return (
    <Pressable
      onPress={onPress}
      className="bg-zinc-900 p-4 mb-3 active:opacity-70"
      style={{ opacity: entry.isRedeemed ? 0.6 : 1 }}
      accessibilityLabel={`${entry.voucher?.title ?? "Voucher"} from ${entry.businessName ?? "business"}${entry.isRedeemed ? ", Redeemed" : expiryLabel ? `, ${expiryLabel}` : ""}`}
      accessibilityRole="button"
      accessibilityHint="Double tap to view voucher"
    >
      <View className="flex-row items-center mb-3">
        {entry.businessLogoUrl ? (
          <Image
            source={{ uri: entry.businessLogoUrl }}
            className="w-10 h-10 rounded-full mr-3 bg-gray-800"
            accessibilityElementsHidden
          />
        ) : (
          <View className="w-10 h-10 rounded-full mr-3 bg-gray-800" accessibilityElementsHidden />
        )}
        <View className="flex-1">
          <Text className="text-white font-poppins-semibold text-sm leading-snug">
            {entry.businessName ?? ""}
          </Text>
        </View>
      </View>
      <View className="border-t border-gray-800 pt-3">
        <Text className="text-white font-poppins-bold text-base mb-0.5">
          {entry.voucher?.title ?? "Voucher"}
        </Text>
        {entry.isRedeemed ? (
          <Text className="text-gray-400 text-xs">Redeemed</Text>
        ) : expiryLabel ? (
          <Text className="text-gray-400 text-xs">{expiryLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function CachedRevealCard({ reveal, onPress }: { reveal: CachedReveal; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-zinc-900 p-4 mb-3 active:opacity-70"
      accessibilityLabel={`${reveal.voucherTitle ?? "Voucher"} from ${reveal.businessName ?? "business"} — offline cached code`}
      accessibilityRole="button"
      accessibilityHint="Double tap to view voucher code"
    >
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full mr-3 bg-gray-800" accessibilityElementsHidden />
        <Text className="text-white font-poppins-semibold text-sm flex-1">
          {reveal.businessName ?? ""}
        </Text>
      </View>
      <View className="border-t border-gray-800 pt-3">
        <Text className="text-white font-poppins-bold text-base mb-0.5">
          {reveal.voucherTitle ?? "Voucher"}
        </Text>
        <Text className="text-gray-400 text-xs">Offline - showing cached code</Text>
      </View>
    </Pressable>
  );
}

export default function WalletScreen() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const walletResult = useQuery(
    api.functions.claims.getWallet,
    session ? {} : "skip",
  );
  const [cachedReveals, setCachedReveals] = useState<CachedReveal[]>([]);
  const [pastExpanded, setPastExpanded] = useState(false);
  const { openReveal } = useVoucherSheet();
  const { openAuthSheet } = useAuthSheet();

  useEffect(() => {
    void posthog?.screen("Wallet");
    loadRevealCache().then(setCachedReveals);
  }, []);

  useEffect(() => {
    if (!sessionLoading && !session) openAuthSheet();
  }, [sessionLoading, session]);

  if (sessionLoading) {
    return (
      <View className="flex-1 bg-black">
        <ScreenHeader title="My wallet" />
        <WalletSkeleton />
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 bg-black">
        <ScreenHeader title="My wallet" />
      </View>
    );
  }

  if (walletResult === undefined || !walletResult.ok) {
    const validCached = filterValidReveals(cachedReveals, Date.now());
    if (validCached.length > 0) {
      return (
        <View className="flex-1 bg-black">
          <ScreenHeader title="My wallet" />
          <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
            {validCached.map((reveal) => (
              <CachedRevealCard
                key={reveal.claimId}
                reveal={reveal}
                onPress={() =>
                  openReveal({
                    claimId: reveal.claimId,
                    voucherId: "",
                    businessId: null,
                    businessName: reveal.businessName ?? null,
                    businessLogoUrl: null,
                    voucherTitle: reveal.voucherTitle ?? "Voucher",
                    voucherDescription: "",
                    voucherValidFrom: 0,
                    voucherValidTo: reveal.expiresAt,
                    activeCode: reveal.voucherCode,
                    codeExpiresAt: reveal.expiresAt,
                  })
                }
              />
            ))}
          </ScrollView>
        </View>
      );
    }
    return (
      <View className="flex-1 bg-black">
        <ScreenHeader title="My wallet" />
        <WalletSkeleton />
      </View>
    );
  }

  const { entries } = walletResult;
  const now = Date.now();
  const activeEntries = entries.filter(
    (e) =>
      e.state !== "expired" &&
      e.state !== "suspended" &&
      e.voucher != null &&
      e.voucher.voucherValidTo > now,
  ) as WalletEntry[];
  const pastEntries = entries.filter(
    (e) =>
      e.state === "expired" ||
      e.state === "suspended" ||
      (e.voucher != null && e.voucher.voucherValidTo <= now),
  ) as WalletEntry[];

  return (
    <View className="flex-1 bg-black">
      <ScreenHeader title="My wallet" />
      <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
        {entries.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-400 text-base text-center">
              No vouchers yet.
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-2">
              Browse the map to find and save vouchers.
            </Text>
          </View>
        ) : (
          <>
            {activeEntries.length > 0 && (
              <>
                <Text className="text-gray-400 text-xs uppercase tracking-wide mb-3">
                  Active
                </Text>
                {activeEntries.map((entry) => (
                  <VoucherCard
                    key={entry.claimId}
                    entry={entry}
                    onPress={() => openReveal(walletEntryToRevealEntry(entry))}
                  />
                ))}
              </>
            )}

            {pastEntries.length > 0 && (
              <View className="mt-4">
                <Pressable
                  onPress={() => setPastExpanded((p) => !p)}
                  className="flex-row items-center mb-3"
                  style={{ paddingVertical: 8 }}
                  accessibilityLabel={pastExpanded ? "Hide past vouchers" : `Show past vouchers (${pastEntries.length})`}
                  accessibilityRole="button"
                >
                  <Text className="text-gray-400 text-xs uppercase tracking-wide flex-1">
                    Past
                  </Text>
                  <Text className="text-gray-400 text-xs">
                    {pastExpanded ? "Hide" : `Show (${pastEntries.length})`}
                  </Text>
                </Pressable>
                {pastExpanded &&
                  pastEntries.map((entry) => (
                    <VoucherCard
                      key={entry.claimId}
                      entry={entry}
                      onPress={() => openReveal(walletEntryToRevealEntry(entry))}
                    />
                  ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
