import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVoucherSheet } from "../lib/voucher-sheet-context";

export default function VoucherDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { openClaim } = useVoucherSheet();

  useEffect(() => {
    if (!id) return;
    // Navigate to map tab, then open the voucher sheet
    router.replace("/(tabs)");
    // Small delay to let navigation settle before presenting sheet
    setTimeout(() => openClaim(id), 100);
  }, [id]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#ffffff" />
    </View>
  );
}
