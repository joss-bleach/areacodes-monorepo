import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { authClient } from "../lib/auth-client";
import { formatValidityWindow } from "../lib/voucher-utils";
import { formatDistance } from "../lib/distance";
import {
  useVoucherSheet,
  type RevealEntry,
} from "../lib/voucher-sheet-context";
import { useWalletAnimation, type LayoutRect } from "../lib/wallet-animation-context";
import { useAuthSheet } from "../lib/auth-sheet-context";
import {
  captureVoucherClaimed,
  captureVoucherRevealed,
  captureVoucherViewed,
} from "../lib/analytics";
import { TicketStub } from "./ticket-stub";
import {
  loadRevealCache,
  upsertRevealCache,
} from "../lib/reveal-cache";

// --- Claim mode inner component ---

function ClaimContent({
  voucherId,
  distanceMetres,
}: {
  voucherId: string;
  distanceMetres?: number;
}) {
  const { close } = useVoucherSheet();
  const { triggerClaimAnimation } = useWalletAnimation();
  const { openAuthSheet } = useAuthSheet();
  const { data: session } = authClient.useSession();

  const voucher = useQuery(
    api.functions.vouchers.getVoucherByIdWithBusiness,
    { voucherId: voucherId as Id<"vouchers"> },
  );
  const claimRecord = useQuery(
    api.functions.claims.getClaimForVoucher,
    { voucherId: voucherId as Id<"vouchers"> },
  );
  const claimVoucher = useMutation(api.functions.claims.claimVoucher);

  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const contentRef = useRef<View>(null);

  useEffect(() => {
    if (voucher) {
      captureVoucherViewed(voucher._id, voucher.business._id);
    }
  }, [voucher?._id]);

  // If server confirms already claimed, reflect that
  const alreadyClaimed = claimed || claimRecord != null;

  async function handleClaim() {
    if (!session?.user) {
      openAuthSheet();
      return;
    }

    setClaiming(true);
    setClaimError(null);
    try {
      await claimVoucher({ voucherId: voucherId as Id<"vouchers"> });
      if (voucher) {
        captureVoucherClaimed(voucher._id, voucher.business._id);
      }
      setClaimed(true);

      // Measure voucher content area to animate from
      contentRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        const layout: LayoutRect = { x: pageX, y: pageY, width, height };
        triggerClaimAnimation(layout);
      });

      // Auto-dismiss after 1 second
      setTimeout(() => close(), 1000);
    } catch {
      setClaimError("Could not save voucher. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  if (voucher === undefined) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (voucher === null) {
    return (
      <View className="px-4 py-8">
        <Text className="text-gray-400 text-sm text-center">
          Voucher not found.
        </Text>
      </View>
    );
  }

  return (
    <BottomSheetScrollView>
      <View ref={contentRef} className="px-4 pb-8">
        {/* Business header */}
        <View className="flex-row items-center mb-4">
          {voucher.business.logoUrl ? (
            <Image
              source={{ uri: voucher.business.logoUrl }}
              className="w-10 h-10 rounded-full mr-3 bg-gray-800"
            />
          ) : (
            <View className="w-10 h-10 rounded-full mr-3 bg-gray-800" />
          )}
          <View className="flex-1">
            <Text className="text-white text-lg font-poppins-bold leading-snug">
              {voucher.business.name}
            </Text>
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-xs uppercase tracking-wide">
                {voucher.business.industry?.name ?? ""}
              </Text>
              {distanceMetres != null && (
                <Text className="text-gray-400 text-xs">
                  {" "}· {formatDistance(distanceMetres)}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View className="border-b border-gray-800 mb-4" />

        {/* Voucher */}
        <Text className="text-gray-500 text-xs uppercase tracking-wide mb-1">
          Voucher
        </Text>
        <Text className="text-white text-base font-poppins-semibold mb-1">
          {voucher.title}
        </Text>
        <Text className="text-gray-300 text-sm leading-relaxed mb-4">
          {voucher.description}
        </Text>

        <View className="border-b border-gray-800 mb-4" />

        {/* Terms */}
        <Text className="text-gray-500 text-xs uppercase tracking-wide mb-1">
          Terms
        </Text>
        <Text className="text-gray-300 text-sm mb-1">
          {formatValidityWindow(voucher.voucherValidFrom, voucher.voucherValidTo)}
        </Text>
        {voucher.voucherTerms ? (
          <Text className="text-gray-500 text-xs leading-relaxed mb-4">
            {voucher.voucherTerms}
          </Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* CTA */}
        {claimError ? (
          <Text className="text-red-400 text-xs mb-2">{claimError}</Text>
        ) : null}

        <Pressable
          onPress={handleClaim}
          disabled={claiming || alreadyClaimed}
          className="border border-white px-4 py-3.5 items-center"
        >
          {claiming ? (
            <ActivityIndicator color="#ffffff" />
          ) : alreadyClaimed ? (
            <View className="flex-row items-center">
              <Text className="text-white font-poppins-semibold text-sm mr-2">
                Saved to wallet
              </Text>
              <Text className="text-white">✓</Text>
            </View>
          ) : (
            <Text className="text-white font-poppins-semibold text-sm">
              Save to wallet
            </Text>
          )}
        </Pressable>
      </View>
    </BottomSheetScrollView>
  );
}

// --- Reveal mode inner component ---

function RevealContent({ entry }: { entry: RevealEntry }) {
  const revealVoucher = useMutation(api.functions.claims.revealVoucher);
  const [voucherCode, setVoucherCode] = useState<string | null>(
    entry.activeCode,
  );
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  useEffect(() => {
    // Check cache first; reveal if code absent or expired
    void (async () => {
      if (entry.activeCode && entry.codeExpiresAt && entry.codeExpiresAt > Date.now()) {
        setVoucherCode(entry.activeCode);
        return;
      }
      // Check local cache
      const cached = await loadRevealCache();
      const match = cached.find((r) => r.claimId === entry.claimId);
      if (match && match.expiresAt > Date.now()) {
        setVoucherCode(match.voucherCode);
        return;
      }
      // Generate new
      await doReveal();
    })();
  }, [entry.claimId]);

  async function doReveal() {
    setRevealing(true);
    setRevealError(null);
    try {
      const result = await revealVoucher({
        claimId: entry.claimId as Id<"claims">,
      });
      captureVoucherRevealed(entry.voucherId, entry.claimId);
      await upsertRevealCache({
        claimId: entry.claimId,
        voucherCode: result.voucherCode,
        expiresAt: result.expiresAt,
        voucherTitle: entry.voucherTitle,
        businessName: entry.businessName ?? undefined,
      });
      setVoucherCode(result.voucherCode);
    } catch {
      setRevealError("Could not load voucher code. Please try again.");
    } finally {
      setRevealing(false);
    }
  }

  return (
    <BottomSheetScrollView>
      <View className="px-4 pb-8">
        {/* Business header */}
        <View className="flex-row items-center mb-4">
          {entry.businessLogoUrl ? (
            <Image
              source={{ uri: entry.businessLogoUrl }}
              className="w-10 h-10 rounded-full mr-3 bg-gray-800"
            />
          ) : (
            <View className="w-10 h-10 rounded-full mr-3 bg-gray-800" />
          )}
          <View className="flex-1">
            <Text className="text-white text-lg font-poppins-bold leading-snug">
              {entry.businessName ?? ""}
            </Text>
          </View>
        </View>

        <View className="border-b border-gray-800 mb-4" />

        <Text className="text-gray-500 text-xs uppercase tracking-wide mb-1">
          Voucher
        </Text>
        <Text className="text-white text-base font-poppins-semibold mb-1">
          {entry.voucherTitle}
        </Text>
        <Text className="text-gray-300 text-sm leading-relaxed mb-4">
          {entry.voucherDescription}
        </Text>

        <View className="border-b border-gray-800 mb-5" />

        {/* QR section */}
        {revealing ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#ffffff" />
            <Text className="text-gray-400 text-xs mt-3">
              Loading your voucher code…
            </Text>
          </View>
        ) : revealError ? (
          <View className="items-center py-8">
            <Text className="text-red-400 text-sm mb-4">{revealError}</Text>
            <Pressable
              onPress={doReveal}
              className="border border-white px-6 py-3"
            >
              <Text className="text-white text-sm font-poppins-semibold">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : voucherCode ? (
          <TicketStub
            voucherCode={voucherCode}
            voucherValidFrom={entry.voucherValidFrom}
            voucherValidTo={entry.voucherValidTo}
          />
        ) : null}
      </View>
    </BottomSheetScrollView>
  );
}

// --- Main sheet ---

export const VoucherSheet = forwardRef<BottomSheetModal>(
  function VoucherSheet(_props, ref) {
    const { mode, close } = useVoucherSheet();

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={["75%"]}
        backgroundStyle={{ backgroundColor: "#111111" }}
        handleIndicatorStyle={{ backgroundColor: "#444444" }}
        onDismiss={close}
        enableDynamicSizing={false}
      >
        {mode?.type === "claim" && (
          <ClaimContent
            voucherId={mode.voucherId}
            distanceMetres={mode.distanceMetres}
          />
        )}
        {mode?.type === "reveal" && <RevealContent entry={mode.entry} />}
      </BottomSheetModal>
    );
  },
);
