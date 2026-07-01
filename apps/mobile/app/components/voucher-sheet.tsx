import { forwardRef, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { Effect } from "effect";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { COLORS } from "../constants/colors";
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
import { SkeletonBox } from "./skeleton-box";
import { TicketStub } from "./ticket-stub";
import {
  loadRevealCache,
  upsertRevealCache,
} from "../lib/reveal-cache";
import { tryClaim, tryReveal, ClaimError } from "../lib/mutation-effects";

// --- Skeletons ---

function ClaimSkeleton() {
  return (
    <View
      className="px-4 pb-8 pt-2"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View className="flex-row items-center mb-4">
        <SkeletonBox style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBox style={{ height: 20, width: 160 }} />
          <SkeletonBox style={{ height: 12, width: 96 }} />
        </View>
      </View>
      <View className="border-b border-gray-800 mb-4" />
      <SkeletonBox style={{ height: 12, width: 56, marginBottom: 8 }} />
      <SkeletonBox style={{ height: 20, width: 192, marginBottom: 12 }} />
      <SkeletonBox style={{ height: 16, width: "100%", marginBottom: 6 }} />
      <SkeletonBox style={{ height: 16, width: "75%", marginBottom: 16 }} />
      <View className="border-b border-gray-800 mb-4" />
      <SkeletonBox style={{ height: 12, width: 40, marginBottom: 8 }} />
      <SkeletonBox style={{ height: 16, width: 192, marginBottom: 24 }} />
      <SkeletonBox style={{ height: 48, width: "100%" }} />
    </View>
  );
}

// --- Claim mode inner component ---

function ClaimContent({
  voucherId,
  distanceMetres,
  close,
}: {
  voucherId: string;
  distanceMetres?: number;
  close: () => void;
}) {
  const { triggerClaimAnimation } = useWalletAnimation();
  const { openAuthSheet } = useAuthSheet();
  const { data: session } = authClient.useSession();
  const { isAuthenticated: convexAuthed } = useConvexAuth();
  const convexAuthedRef = useRef(convexAuthed);
  convexAuthedRef.current = convexAuthed;

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

  const alreadyClaimed = claimed || claimRecord != null;

  function waitForConvexAuth(): Effect.Effect<void, ClaimError> {
    return Effect.async<void, ClaimError>((resume) => {
      const deadline = Date.now() + 5000;
      const poll = () => {
        if (convexAuthedRef.current) {
          resume(Effect.succeed(undefined));
        } else if (Date.now() >= deadline) {
          resume(Effect.fail(new ClaimError({ code: "UNAUTHENTICATED" })));
        } else {
          setTimeout(poll, 250);
        }
      };
      poll();
    });
  }

  function handleClaim() {
    if (!session?.user) {
      openAuthSheet();
      return;
    }

    return Effect.runPromise(
      Effect.sync(() => { setClaiming(true); setClaimError(null); }).pipe(
        Effect.flatMap(() => waitForConvexAuth()),
        Effect.flatMap(() =>
          tryClaim(() => claimVoucher({ voucherId: voucherId as Id<"vouchers"> })),
        ),
        Effect.catchIf(
          (e) => e instanceof ClaimError && e.code === "UNAUTHENTICATED",
          () =>
            Effect.sleep(500).pipe(
              Effect.flatMap(() => waitForConvexAuth()),
              Effect.flatMap(() =>
                tryClaim(() => claimVoucher({ voucherId: voucherId as Id<"vouchers"> })),
              ),
            ),
        ),
        Effect.tap(() =>
          Effect.sync(() => {
            if (voucher) captureVoucherClaimed(voucher._id, voucher.business._id);
            setClaimed(true);
            contentRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
              const layout: LayoutRect = { x: pageX, y: pageY, width, height };
              triggerClaimAnimation(layout);
            });
            close();
          }),
        ),
        Effect.tapError((err) => Effect.sync(() => setClaimError(err.message))),
        Effect.ensuring(Effect.sync(() => setClaiming(false))),
        Effect.ignore,
      ),
    );
  }

  if (voucher === undefined) {
    return <ClaimSkeleton />;
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
              accessibilityElementsHidden
            />
          ) : (
            <View className="w-10 h-10 rounded-full mr-3 bg-gray-800" accessibilityElementsHidden />
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
        <Text className="text-gray-400 text-xs uppercase tracking-wide mb-1">
          Voucher
        </Text>
        <Text className="text-white text-base font-poppins-semibold mb-1">
          {voucher.title}
        </Text>
        <Text className="text-gray-400 text-sm leading-relaxed mb-4">
          {voucher.description}
        </Text>

        <View className="border-b border-gray-800 mb-4" />

        {/* Terms */}
        <Text className="text-gray-400 text-xs uppercase tracking-wide mb-1">
          Terms
        </Text>
        <Text className="text-gray-400 text-sm mb-1">
          {formatValidityWindow(voucher.voucherValidFrom, voucher.voucherValidTo)}
        </Text>
        {voucher.voucherTerms ? (
          <Text className="text-gray-400 text-xs leading-relaxed mb-4">
            {voucher.voucherTerms}
          </Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* CTA */}
        {claimError ? (
          <Text
            className="text-red-400 text-xs mb-2"
            accessibilityLiveRegion="polite"
          >
            {claimError}
          </Text>
        ) : null}

        <Pressable
          onPress={handleClaim}
          disabled={claiming || alreadyClaimed}
          className="border border-white px-4 py-3.5 items-center"
          accessibilityLabel={alreadyClaimed ? "Saved to wallet" : "Save to wallet"}
          accessibilityRole="button"
          accessibilityState={{ disabled: claiming || alreadyClaimed }}
        >
          {claiming ? (
            <ActivityIndicator color={COLORS.white} />
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
      Effect.sync(() => { setRevealing(true); setRevealError(null); }).pipe(
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
  }, [entry.claimId]);

  return (
    <BottomSheetScrollView>
      <View className="px-4 pb-8">
        {/* Business header */}
        <View className="flex-row items-center mb-4">
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
            <Text className="text-white text-lg font-poppins-bold leading-snug">
              {entry.businessName ?? ""}
            </Text>
          </View>
        </View>

        <View className="border-b border-gray-800 mb-4" />

        <Text className="text-gray-400 text-xs uppercase tracking-wide mb-1">
          Voucher
        </Text>
        <Text className="text-white text-base font-poppins-semibold mb-1">
          {entry.voucherTitle}
        </Text>
        <Text className="text-gray-400 text-sm leading-relaxed mb-4">
          {entry.voucherDescription}
        </Text>

        <View className="border-b border-gray-800 mb-5" />

        {/* QR section */}
        {revealing ? (
          <View className="items-center py-12">
            <ActivityIndicator color={COLORS.white} />
            <Text className="text-gray-400 text-xs mt-3">
              Loading your voucher code...
            </Text>
          </View>
        ) : revealError ? (
          <View className="items-center py-8">
            <Text
              className="text-red-400 text-sm mb-4"
              accessibilityLiveRegion="polite"
            >
              {revealError}
            </Text>
            <Pressable
              onPress={doReveal}
              className="border border-white px-6 py-3"
              accessibilityLabel="Try loading voucher code again"
              accessibilityRole="button"
            >
              <Text className="text-white text-sm font-poppins-semibold">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : isRedeemed ? (
          <TicketStub
            voucherCode=""
            voucherValidFrom={entry.voucherValidFrom}
            voucherValidTo={entry.voucherValidTo}
            provider={entry.provider as "manual" | "square" | undefined}
            claimId={entry.claimId}
            voucherId={entry.voucherId}
            isRedeemed
          />
        ) : voucherCode ? (
          <TicketStub
            voucherCode={voucherCode}
            voucherValidFrom={entry.voucherValidFrom}
            voucherValidTo={entry.voucherValidTo}
            provider={entry.provider as "manual" | "square" | undefined}
            claimId={entry.claimId}
            voucherId={entry.voucherId}
          />
        ) : null}
      </View>
    </BottomSheetScrollView>
  );
}

// --- Main sheet ---

export const VoucherSheet = forwardRef<BottomSheetModal>(
  function VoucherSheet(_props, ref) {
    const { mode, clearMode, close } = useVoucherSheet();

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={["75%"]}
        backgroundStyle={{ backgroundColor: COLORS.raisedSurface }}
        handleIndicatorStyle={{ backgroundColor: COLORS.handleIndicator }}
        onDismiss={clearMode}
        enableDynamicSizing={false}
      >
        {mode?.type === "claim" && (
          <ClaimContent
            voucherId={mode.voucherId}
            distanceMetres={mode.distanceMetres}
            close={close}
          />
        )}
        {mode?.type === "reveal" && <RevealContent entry={mode.entry} />}
      </BottomSheetModal>
    );
  },
);
