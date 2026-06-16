import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { formatValidityWindow } from "../lib/voucher-utils";
import {
  getWalletStateLabel,
  formatCodeExpiry,
  type WalletState,
} from "../lib/wallet-utils";

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
  businessName: string | null;
  voucherValidFrom: number | null;
  voucher: { _id: string; title: string; voucherValidTo: number } | null;
};

function WalletCard({ entry }: { entry: WalletEntry }) {
  const title = entry.voucher?.title ?? "Voucher";
  const validTo = entry.voucher?.voucherValidTo;
  const validFrom = entry.voucherValidFrom;
  const validityLine =
    validFrom != null && validTo != null
      ? formatValidityWindow(validFrom, validTo)
      : null;

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

      {entry.state === "revealed" && entry.activeCode ? (
        <View className="bg-gray-800 rounded-lg px-4 py-3 mt-1">
          <Text className="text-white font-mono text-lg font-bold text-center tracking-widest">
            {entry.activeCode}
          </Text>
          {entry.codeExpiresAt != null ? (
            <Text className="text-gray-400 text-xs text-center mt-1">
              {formatCodeExpiry(entry.codeExpiresAt)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function WalletScreen() {
  const wallet = useQuery(api.functions.claims.getWallet, {});

  if (wallet === undefined) {
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
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
