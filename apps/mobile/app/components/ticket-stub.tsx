import { Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { useState } from "react";
import { formatValidityWindow } from "../lib/voucher-utils";
import { COLORS } from "../constants/colors";

interface TicketStubProps {
  voucherCode: string;
  voucherValidFrom: number;
  voucherValidTo: number;
}

export function TicketStub({
  voucherCode,
  voucherValidFrom,
  voucherValidTo,
}: TicketStubProps) {
  const [copied, setCopied] = useState(false);
  const notchColor = COLORS.raisedSurface;

  async function handleCopy() {
    await Clipboard.setStringAsync(voucherCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={{ backgroundColor: COLORS.white, marginHorizontal: 16 }}>
      {/* Top half: QR */}
      <View style={{ alignItems: "center", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
        <View style={{ padding: 12, backgroundColor: COLORS.white }}>
          <QRCode
            value={voucherCode}
            size={180}
            backgroundColor={COLORS.white}
            color={COLORS.black}
          />
        </View>
        <Text style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 18 }}>
          Show the QR to the merchant staff to use your voucher
        </Text>
      </View>

      {/* Perforated divider */}
      <View style={{ height: 20, position: "relative" }}>
        {/* Left notch */}
        <View
          style={{
            position: "absolute",
            left: -10,
            top: 0,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: notchColor,
          }}
        />
        {/* Dashed line */}
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 9,
            borderStyle: "dashed",
            borderTopWidth: 1.5,
            borderColor: "#D1D5DB",
          }}
        />
        {/* Right notch */}
        <View
          style={{
            position: "absolute",
            right: -10,
            top: 0,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: notchColor,
          }}
        />
      </View>

      {/* Bottom half: code + dates */}
      <View style={{ alignItems: "center", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
        <Pressable
          onPress={handleCopy}
          style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", paddingHorizontal: 20, paddingVertical: 12, marginBottom: 12 }}
          accessibilityLabel={copied ? "Code copied" : `Copy voucher code ${voucherCode}`}
          accessibilityRole="button"
          accessibilityHint="Double tap to copy code to clipboard"
        >
          <Text style={{ color: COLORS.black, fontFamily: "Poppins_600SemiBold", fontSize: 16, letterSpacing: 4, marginRight: 8 }}>
            {voucherCode}
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 16 }}>
            {copied ? "✓" : "⎘"}
          </Text>
        </Pressable>
        <Text style={{ color: "#6B7280", fontSize: 12, textAlign: "center" }}>
          Valid through:{" "}
          {formatValidityWindow(voucherValidFrom, voucherValidTo)}
        </Text>
      </View>
    </View>
  );
}
