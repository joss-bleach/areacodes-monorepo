import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import QRCode from "react-native-qrcode-svg";
import { formatValidityWindow } from "../lib/voucher-utils";
import {
  getWalletStateLabel,
  formatCodeExpiry,
  type WalletState,
} from "../lib/wallet-utils";
import {
  type CachedReveal,
  loadRevealCache,
  upsertRevealCache,
  filterValidReveals,
} from "../lib/reveal-cache";
import { captureVoucherRevealed, posthog } from "../lib/analytics";

const STATE_BADGE_STYLES: Record<
  WalletState,
  { background: string; text: string }
> = {
  revealed: { background: "bg-green-900", text: "text-green-400" },
  claimed: { background: "bg-blue-900", text: "text-blue-400" },
  expired: { background: "bg-gray-800", text: "text-gray-500" },
  suspended: { background: "bg-gray-800", text: "text-gray-500" },
};

function StateBadge({ state }: { state: WalletState }) {
  const { background, text } = STATE_BADGE_STYLES[state];

  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${background}`}>
      <Text className={`text-xs font-medium ${text}`}>
        {getWalletStateLabel(state)}
      </Text>
    </View>
  );
}

type WalletEntry = {
  claimId: string;
  voucherId: string;
  state: WalletState;
  activeCode: string | null;
  codeExpiresAt: number | null;
  businessId: string | null;
  businessName: string | null;
  voucherValidFrom: number | null;
  voucher: { _id: string; title: string; voucherValidTo: number } | null;
};

function RevealCodeDisplay({
  voucherCode,
  codeExpiresAt,
}: {
  voucherCode: string;
  codeExpiresAt: number | null;
}) {
  return (
    <View className="bg-gray-800 rounded-lg px-4 py-4 mt-2 items-center">
      <View className="mb-4 p-3 bg-white rounded-lg">
        <QRCode
          value={voucherCode}
          size={180}
          backgroundColor="#ffffff"
          color="#000000"
        />
      </View>
      <Text className="text-white font-mono text-xl font-bold text-center tracking-widest">
        {voucherCode}
      </Text>
      {codeExpiresAt != null ? (
        <Text className="text-gray-400 text-xs text-center mt-2">
          {formatCodeExpiry(codeExpiresAt)}
        </Text>
      ) : null}
    </View>
  );
}

function WalletCard({
  entry,
  onRevealSuccess,
}: {
  entry: WalletEntry;
  onRevealSuccess: (reveal: CachedReveal) => void;
}) {
  const revealVoucher = useMutation(api.functions.claims.revealVoucher);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  const title = entry.voucher?.title ?? "Voucher";
  const validTo = entry.voucher?.voucherValidTo;
  const validFrom = entry.voucherValidFrom;
  const validityLine =
    validFrom != null && validTo != null
      ? formatValidityWindow(validFrom, validTo)
      : null;

  async function handleReveal() {
    setRevealing(true);
    setRevealError(null);
    try {
      const result = await revealVoucher({
        claimId: entry.claimId as Id<"claims">,
      });
      if (entry.businessId) {
        captureVoucherRevealed(entry.voucherId, entry.businessId);
      }
      const cached: CachedReveal = {
        claimId: entry.claimId,
        voucherCode: result.voucherCode,
        expiresAt: result.expiresAt,
        voucherTitle: entry.voucher?.title,
        businessName: entry.businessName ?? undefined,
      };
      await upsertRevealCache(cached);
      onRevealSuccess(cached);
    } catch {
      setRevealError("Could not reveal voucher. Please try again.");
    } finally {
      setRevealing(false);
    }
  }

  return (
    <View className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-white font-semibold text-base flex-1 mr-2">
          {title}
        </Text>
        <StateBadge state={entry.state} />
      </View>

      {entry.businessName ? (
        <Text className="text-gray-400 text-xs mb-1">{entry.businessName}</Text>
      ) : null}

      {validityLine ? (
        <Text className="text-gray-500 text-xs mb-3">
          Valid: {validityLine}
        </Text>
      ) : null}

      {revealError ? (
        <Text className="text-red-400 text-xs mb-2">{revealError}</Text>
      ) : null}

      {entry.state === "claimed" ? (
        <Pressable
          onPress={handleReveal}
          disabled={revealing}
          className="bg-white rounded-lg px-4 py-3 items-center disabled:opacity-50"
        >
          {revealing ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text className="text-black font-semibold text-sm">Use Now</Text>
          )}
        </Pressable>
      ) : null}

      {entry.state === "revealed" && entry.activeCode ? (
        <RevealCodeDisplay
          voucherCode={entry.activeCode}
          codeExpiresAt={entry.codeExpiresAt}
        />
      ) : null}
    </View>
  );
}

function CachedRevealCard({ reveal }: { reveal: CachedReveal }) {
  return (
    <View className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-white font-semibold text-base flex-1 mr-2">
          {reveal.voucherTitle ?? "Voucher"}
        </Text>
        <StateBadge state="revealed" />
      </View>

      {reveal.businessName ? (
        <Text className="text-gray-400 text-xs mb-1">{reveal.businessName}</Text>
      ) : null}

      <RevealCodeDisplay
        voucherCode={reveal.voucherCode}
        codeExpiresAt={reveal.expiresAt}
      />
    </View>
  );
}

export default function WalletScreen() {
  const wallet = useQuery(api.functions.claims.getWallet, {});
  const [cachedReveals, setCachedReveals] = useState<CachedReveal[]>([]);

  useEffect(() => {
    void posthog?.screen("Wallet");
    loadRevealCache().then(setCachedReveals);
  }, []);

  // Keep cache fresh whenever Convex returns revealed entries
  useEffect(() => {
    if (!wallet) return;
    wallet
      .filter((e) => e.state === "revealed" && e.activeCode && e.codeExpiresAt)
      .forEach((e) => {
        void upsertRevealCache({
          claimId: e.claimId,
          voucherCode: e.activeCode!,
          expiresAt: e.codeExpiresAt!,
          voucherTitle: e.voucher?.title,
          businessName: e.businessName ?? undefined,
        });
      });
  }, [wallet]);

  function handleRevealSuccess(reveal: CachedReveal) {
    setCachedReveals((prev) => [
      ...prev.filter((r) => r.claimId !== reveal.claimId),
      reveal,
    ]);
  }

  if (wallet === undefined) {
    const validCached = filterValidReveals(cachedReveals, Date.now());

    if (validCached.length > 0) {
      return (
        <ScrollView
          className="flex-1 bg-black"
          contentContainerClassName="px-4 py-6"
        >
          <Text className="text-white text-2xl font-bold mb-2">Wallet</Text>
          <Text className="text-yellow-500 text-xs mb-6">
            Offline — showing cached codes
          </Text>
          {validCached.map((reveal) => (
            <CachedRevealCard key={reveal.claimId} reveal={reveal} />
          ))}
        </ScrollView>
      );
    }

    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  const activeEntries = wallet.filter(
    (e) => e.state === "revealed" || e.state === "claimed",
  );
  const inactiveEntries = wallet.filter(
    (e) => e.state === "expired" || e.state === "suspended",
  );

  return (
    <ScrollView className="flex-1 bg-black" contentContainerClassName="px-4 py-6">
      <Text className="text-white text-2xl font-bold mb-6">Wallet</Text>

      {wallet.length === 0 ? (
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-gray-400 text-base text-center">
            No vouchers yet.
          </Text>
          <Text className="text-gray-600 text-sm text-center mt-2">
            Browse the map to find and claim vouchers.
          </Text>
        </View>
      ) : (
        <>
          {activeEntries.length > 0 ? (
            <>
              <Text className="text-gray-400 text-xs uppercase tracking-wide mb-3">
                Active
              </Text>
              {activeEntries.map((entry) => (
                <WalletCard
                  key={entry.claimId}
                  entry={entry as WalletEntry}
                  onRevealSuccess={handleRevealSuccess}
                />
              ))}
            </>
          ) : null}

          {inactiveEntries.length > 0 ? (
            <>
              <Text className="text-gray-400 text-xs uppercase tracking-wide mb-3 mt-4">
                Past
              </Text>
              {inactiveEntries.map((entry) => (
                <WalletCard
                  key={entry.claimId}
                  entry={entry as WalletEntry}
                  onRevealSuccess={handleRevealSuccess}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
