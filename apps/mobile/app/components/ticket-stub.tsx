import { Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { useState } from "react";
import { formatValidityWindow } from "../lib/voucher-utils";

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
  const notchColor = "#111111"; // matches sheet background

  async function handleCopy() {
    await Clipboard.setStringAsync(voucherCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View className="bg-white rounded-xl mx-4 overflow-visible">
      {/* Top half: QR */}
      <View className="items-center px-6 pt-6 pb-5">
        <View className="p-3 bg-white rounded-lg">
          <QRCode
            value={voucherCode}
            size={180}
            backgroundColor="#ffffff"
            color="#000000"
          />
        </View>
        <Text className="text-gray-500 text-xs text-center mt-4 leading-relaxed">
          Show the QR to use the voucher to the merchant staff
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
            borderColor: "#d1d5db",
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
      <View className="items-center px-6 pt-4 pb-6">
        <Pressable
          onPress={handleCopy}
          className="flex-row items-center bg-gray-100 rounded-lg px-5 py-3 mb-3"
        >
          <Text className="text-black font-poppins-semibold text-base tracking-widest mr-2">
            {voucherCode}
          </Text>
          <Text className="text-gray-500 text-base">
            {copied ? "✓" : "⎘"}
          </Text>
        </Pressable>
        <Text className="text-gray-400 text-xs text-center">
          Valid through:{" "}
          {formatValidityWindow(voucherValidFrom, voucherValidTo)}
        </Text>
      </View>
    </View>
  );
}
