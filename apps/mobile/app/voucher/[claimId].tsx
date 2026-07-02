import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import QRCode from "react-native-qrcode-svg";
import { useMutation, useQuery } from "convex/react";
import { Effect } from "effect";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { deriveRedemptionUrl } from "@areacodes/domain";
import { COLORS } from "../constants/colors";
import { useVoucherSheet, type RevealEntry } from "../lib/voucher-sheet-context";
import { AREACODES_ICON_SVG } from "../components/icons/AreacodesIcon";
import { captureVoucherRevealed } from "../lib/analytics";
import { loadRevealCache, upsertRevealCache } from "../lib/reveal-cache";
import { tryReveal } from "../lib/mutation-effects";

const BUSINESS_URL =
  process.env.EXPO_PUBLIC_BUSINESS_URL ?? "https://business.acbrighton.com";

function BackChevron() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={COLORS.white}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatValidUntil(ms: number): string {
  if (!ms) return "";
  return `Valid until ${new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

// --- QR + code + caption, on the white redemption panel + dark meta below ---

function RevealBody({ entry }: { entry: RevealEntry }) {
  const revealVoucher = useMutation(api.functions.claims.revealVoucher);
  const [voucherCode, setVoucherCode] = useState<string | null>(entry.activeCode);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  // Reactively track the server-side burn so an open voucher flips to Redeemed
  // live while the QR is on screen (no client-trust — driven by the event).
  const redemptionEvent = useQuery(
    api.functions.redemptionEvents.getRedemptionEventByClaim,
    { claimId: entry.claimId as Id<"claims"> },
  );
  const isRedeemed = entry.isRedeemed || redemptionEvent != null;

  function doReveal() {
    return Effect.runPromise(
      Effect.sync(() => {
        setRevealing(true);
        setRevealError(null);
      }).pipe(
        Effect.flatMap(() =>
          tryReveal(() => revealVoucher({ claimId: entry.claimId as Id<"claims"> })),
        ),
        Effect.tap(({ voucherCode: code, expiresAt }) =>
          Effect.promise(async () => {
            captureVoucherRevealed(entry.voucherId, entry.businessId ?? "");
            await upsertRevealCache({
              claimId: entry.claimId,
              voucherCode: code,
              expiresAt,
              voucherTitle: entry.voucherTitle,
              businessName: entry.businessName ?? undefined,
            });
            setVoucherCode(code);
          }),
        ),
        Effect.tapError((err) => Effect.sync(() => setRevealError(err.message))),
        Effect.ensuring(Effect.sync(() => setRevealing(false))),
        Effect.ignore,
      ),
    );
  }

  useEffect(() => {
    void (async () => {
      if (isRedeemed) return;
      if (entry.activeCode && entry.codeExpiresAt && entry.codeExpiresAt > Date.now()) {
        setVoucherCode(entry.activeCode);
        return;
      }
      const cached = await loadRevealCache();
      const match = cached.find((r) => r.claimId === entry.claimId);
      if (match && match.expiresAt > Date.now()) {
        setVoucherCode(match.voucherCode);
        return;
      }
      doReveal();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.claimId]);

  const qrValue =
    entry.provider === "manual" && entry.claimId && entry.voucherId
      ? deriveRedemptionUrl(BUSINESS_URL, entry.voucherId, entry.claimId)
      : (voucherCode ?? "");

  let caption = "Show this at the counter to redeem";
  if (isRedeemed) caption = "This voucher has been redeemed";

  return (
    <View className="flex-col" style={{ backgroundColor: COLORS.raisedSurface }}>
      {/* Offer header */}
      <View style={{ alignItems: "center", paddingTop: 28, paddingBottom: 24, paddingHorizontal: 24 }}>
        <Text
          style={{
            color: COLORS.dimInk,
            fontFamily: "Poppins_700Bold",
            fontSize: 11,
            lineHeight: 14,
            letterSpacing: 0.44,
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          {entry.businessName ?? ""}
        </Text>
        <Text
          adjustsFontSizeToFit
          numberOfLines={2}
          minimumFontScale={0.5}
          style={{
            color: COLORS.white,
            fontFamily: "Poppins_700Bold",
            fontSize: 48,
            lineHeight: 54,
            letterSpacing: -1.9,
            textTransform: "uppercase",
            textAlign: "center",
            marginTop: 10,
          }}
        >
          {entry.voucherTitle}
        </Text>
        {entry.voucherDescription ? (
          <Text
            style={{
              color: COLORS.dimInk,
              fontSize: 13,
              lineHeight: 19.5,
              textAlign: "center",
              marginTop: 10,
            }}
          >
            {entry.voucherDescription}
          </Text>
        ) : null}
      </View>

      {/* Perforated divider — notches cut the card edge with the page colour */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            marginLeft: -7,
            backgroundColor: COLORS.black,
          }}
        />
        <View style={{ flex: 1, height: 1, backgroundColor: COLORS.borderInk }} />
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            marginRight: -7,
            backgroundColor: COLORS.black,
          }}
        />
      </View>

      {/* QR + code */}
      <View style={{ alignItems: "center", paddingTop: 26, paddingBottom: 20, paddingHorizontal: 24 }}>
        {revealing ? (
          <View style={{ height: 200, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={COLORS.white} />
            <Text style={{ color: COLORS.dimInk, fontSize: 12, marginTop: 12 }}>
              Loading your voucher code...
            </Text>
          </View>
        ) : revealError ? (
          <View style={{ height: 200, alignItems: "center", justifyContent: "center" }}>
            <Text
              style={{ color: COLORS.destructive, fontSize: 14, marginBottom: 16, textAlign: "center" }}
              accessibilityLiveRegion="polite"
            >
              {revealError}
            </Text>
            <Pressable
              onPress={doReveal}
              style={{ borderWidth: 1, borderColor: COLORS.white, paddingHorizontal: 24, paddingVertical: 12 }}
              accessibilityLabel="Try loading voucher code again"
              accessibilityRole="button"
            >
              <Text style={{ color: COLORS.white, fontFamily: "Poppins_600SemiBold", fontSize: 14 }}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View
              style={{
                width: 200,
                height: 200,
                alignItems: "center",
                justifyContent: "center",
                padding: 14,
                backgroundColor: COLORS.white,
                opacity: isRedeemed ? 0.5 : 1,
              }}
            >
              {isRedeemed ? (
                <Text style={{ fontSize: 56 }} accessibilityLabel="Redeemed">
                  ✓
                </Text>
              ) : (
                <QRCode
                  value={qrValue || " "}
                  size={172}
                  backgroundColor={COLORS.white}
                  color={COLORS.black}
                  // High error correction so the centred brand mark can mask
                  // ~15% of modules without breaking the scan.
                  ecl="H"
                  logoSVG={AREACODES_ICON_SVG}
                  logoSize={38}
                  logoColor={COLORS.black}
                  logoBackgroundColor={COLORS.white}
                  logoMargin={5}
                />
              )}
            </View>

            {!isRedeemed && voucherCode ? (
              <Text
                style={{
                  color: COLORS.white,
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 15,
                  lineHeight: 18,
                  letterSpacing: 1.5,
                  marginTop: 18,
                }}
              >
                {voucherCode}
              </Text>
            ) : null}

            <Text
              style={{
                color: COLORS.dimInk,
                fontSize: 12,
                lineHeight: 16,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {caption}
            </Text>
          </>
        )}
      </View>

      {/* Status footer */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderInk,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 6,
              height: 6,
              backgroundColor: isRedeemed ? COLORS.dimInk : COLORS.success,
            }}
          />
          <Text
            style={{
              color: isRedeemed ? COLORS.dimInk : COLORS.success,
              fontFamily: "Poppins_700Bold",
              fontSize: 11,
              lineHeight: 14,
              textTransform: "uppercase",
            }}
          >
            {isRedeemed ? "Redeemed" : "Active"}
          </Text>
        </View>
        <Text style={{ color: COLORS.dimInk, fontSize: 12, lineHeight: 16 }}>
          {formatValidUntil(entry.voucherValidTo)}
        </Text>
      </View>
    </View>
  );
}

export default function VoucherRevealScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { revealEntry } = useVoucherSheet();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.navigate("/(tabs)/wallet");
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.black }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 20,
          paddingTop: insets.top + 6,
          paddingBottom: 16,
        }}
      >
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityLabel="Back to wallet"
          accessibilityRole="button"
        >
          <BackChevron />
        </Pressable>
        <Text
          style={{
            color: COLORS.white,
            fontFamily: "Poppins_700Bold",
            fontSize: 15,
            lineHeight: 18,
            letterSpacing: -0.3,
            textTransform: "uppercase",
          }}
        >
          Your voucher
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {revealEntry ? (
          <View
            style={{
              marginHorizontal: 20,
              borderWidth: 1,
              borderColor: COLORS.borderInk,
            }}
          >
            <RevealBody entry={revealEntry} />
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 80 }}>
            <Text style={{ color: COLORS.dimInk, fontSize: 14 }}>
              Voucher unavailable.
            </Text>
            <Pressable onPress={goBack} style={{ marginTop: 16 }} accessibilityRole="button">
              <Text style={{ color: COLORS.white, fontFamily: "Poppins_600SemiBold", fontSize: 14 }}>
                Back to wallet
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
