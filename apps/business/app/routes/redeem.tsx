import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { deriveVoucherCopy } from "@areacodes/domain";

export const Route = createFileRoute("/redeem")({
  validateSearch: (search: Record<string, unknown>) => ({
    v: search.v as string | undefined,
    c: search.c as string | undefined,
  }),
  component: RedeemPage,
});

const PIN_STORAGE_KEY = (businessId: string) =>
  `areacodes:pin_unlock:${businessId}`;

type PageState = "loading" | "unlock" | "confirm" | "redeemed" | "error";

type Discount = {
  kind: string;
  value?: number;
  currency?: string;
  itemName?: string;
  customText?: string;
};

function deriveOfferText(discount: Discount): string {
  const copy = deriveVoucherCopy(discount as Parameters<typeof deriveVoucherCopy>[0]);
  return `Apply: ${copy.title}`;
}

function UnlockView({
  businessName,
  businessId,
  pinSetAt,
  onUnlocked,
}: {
  businessName: string;
  businessId: Id<"businesses">;
  pinSetAt: number | null;
  onUnlocked: () => void;
}) {
  const verifyPin = useAction(api.functions.redemptionAuth.verifyRedemptionPin);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (pinSetAt === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <span className="inline-block bg-foreground text-background px-2 py-1 text-xl font-bold uppercase tracking-tight leading-none">
              {businessName}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            No Redemption PIN has been set for this business. Ask the business
            owner to set a PIN in their portal settings.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return;
    setError(null);
    setSubmitting(true);
    try {
      const ok = await verifyPin({ businessId, pin });
      if (!ok) {
        setError("Incorrect PIN. Try again.");
        setPin("");
        return;
      }
      if (pinSetAt !== null) {
        localStorage.setItem(PIN_STORAGE_KEY(businessId), String(pinSetAt));
      }
      onUnlocked();
    } catch {
      setError("Could not verify PIN. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <span className="inline-block bg-foreground text-background px-2 py-1 text-xl font-bold uppercase tracking-tight leading-none">
            {businessName}
          </span>
          <p className="text-xs text-muted-foreground mt-3 uppercase tracking-tight font-bold">
            Staff Redemption
          </p>
        </div>

        <div className="border border-border p-6">
          <h2 className="text-sm font-bold uppercase tracking-tight mb-1">
            Device Unlock
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            Enter the Redemption PIN to unlock this device. You won't be asked
            again until the PIN is rotated.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="pin"
                className="block text-xs font-bold uppercase tracking-tight mb-1.5"
              >
                Redemption PIN
              </label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="current-password"
                autoFocus
                className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
                placeholder="Enter PIN"
              />
            </div>

            {error && (
              <p
                className="text-red-500 text-xs mb-4"
                role="alert"
                aria-live="polite"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !pin}
              className="w-full bg-foreground text-background py-2.5 text-sm font-bold uppercase tracking-tight disabled:opacity-50 flex items-center justify-center"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Unlock"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ConfirmView({
  businessName,
  voucherTitle,
  voucherDescription,
  discount,
  voucherTerms,
  onRedeem,
}: {
  businessName: string;
  voucherTitle: string;
  voucherDescription: string;
  discount: Discount;
  voucherTerms?: string;
  onRedeem: () => Promise<void>;
}) {
  const [burning, setBurning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRedeem() {
    setError(null);
    setBurning(true);
    try {
      await onRedeem();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to redeem. Please try again.");
      setBurning(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <span className="inline-block bg-foreground text-background px-2 py-1 text-xl font-bold uppercase tracking-tight leading-none">
            {businessName}
          </span>
          <p className="text-xs text-muted-foreground mt-3 uppercase tracking-tight font-bold">
            Staff Redemption
          </p>
        </div>

        <div className="border border-border">
          <div className="p-6 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-tight mb-1">
              Voucher
            </p>
            <p className="text-base font-bold leading-snug mb-1">
              {voucherTitle}
            </p>
            <p className="text-sm text-muted-foreground">{voucherDescription}</p>
            {voucherTerms && (
              <p className="text-xs text-muted-foreground mt-2">{voucherTerms}</p>
            )}
          </div>

          <div className="p-6 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-tight mb-2">
              Action Required
            </p>
            <p className="text-lg font-bold">
              {deriveOfferText(discount)}
            </p>
          </div>

          <div className="p-6">
            {error && (
              <p
                className="text-red-500 text-xs mb-4"
                role="alert"
                aria-live="polite"
              >
                {error}
              </p>
            )}
            <button
              onClick={handleRedeem}
              disabled={burning}
              className="w-full bg-foreground text-background py-3 text-sm font-bold uppercase tracking-tight disabled:opacity-50 flex items-center justify-center"
            >
              {burning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Redeem"
              )}
            </button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              This will mark the voucher as used for this customer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RedeemedView({
  businessName,
  voucherTitle,
  discount,
}: {
  businessName: string;
  voucherTitle: string;
  discount: Discount;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <span className="inline-block bg-foreground text-background px-2 py-1 text-xl font-bold uppercase tracking-tight leading-none">
            {businessName}
          </span>
          <p className="text-xs text-muted-foreground mt-3 uppercase tracking-tight font-bold">
            Staff Redemption
          </p>
        </div>

        <div className="border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl" aria-hidden="true">✓</span>
            <span className="text-xl font-bold uppercase tracking-tight">
              Redeemed
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-1">{voucherTitle}</p>
          <p className="text-sm font-bold">
            {deriveOfferText(discount)}
          </p>
        </div>
      </div>
    </div>
  );
}

function RedeemPage() {
  const { v: voucherId, c: claimId } = Route.useSearch();
  const burnVoucher = useMutation(api.functions.redemptionEvents.burnManualVoucher);

  const pageData = useQuery(
    api.functions.redemptionEvents.getStaffRedemptionPage,
    voucherId && claimId
      ? {
          voucherId: voucherId as Id<"vouchers">,
          claimId: claimId as Id<"claims">,
        }
      : "skip",
  );

  const [pageState, setPageState] = useState<PageState>("loading");

  useEffect(() => {
    if (pageData === undefined) return;

    if (pageData === null) {
      setPageState("error");
      return;
    }

    if (pageData.isRedeemed) {
      setPageState("redeemed");
      return;
    }

    // Check device unlock state
    const stored = localStorage.getItem(
      PIN_STORAGE_KEY(pageData.businessId),
    );
    const unlocked =
      pageData.pinSetAt !== null && stored === String(pageData.pinSetAt);

    setPageState(unlocked ? "confirm" : "unlock");
  }, [pageData]);

  if (!voucherId || !claimId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Invalid redemption link.</p>
      </div>
    );
  }

  if (pageState === "loading" || pageData === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pageState === "error" || pageData === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <p className="text-sm font-bold uppercase tracking-tight mb-2">
            Invalid Voucher
          </p>
          <p className="text-sm text-muted-foreground">
            This voucher link is not valid or has already expired.
          </p>
        </div>
      </div>
    );
  }

  const { voucher, businessId, businessName, pinSetAt } = pageData;

  if (pageState === "redeemed") {
    return (
      <RedeemedView
        businessName={businessName}
        voucherTitle={voucher.title}
        discount={voucher.discount}
      />
    );
  }

  if (pageState === "unlock") {
    return (
      <UnlockView
        businessName={businessName}
        businessId={businessId as Id<"businesses">}
        pinSetAt={pinSetAt}
        onUnlocked={() => setPageState("confirm")}
      />
    );
  }

  return (
    <ConfirmView
      businessName={businessName}
      voucherTitle={voucher.title}
      voucherDescription={voucher.description}
      discount={voucher.discount}
      voucherTerms={voucher.voucherTerms}
      onRedeem={async () => {
        await burnVoucher({
          voucherId: voucherId as Id<"vouchers">,
          claimId: claimId as Id<"claims">,
          businessId: businessId as Id<"businesses">,
          now: Date.now(),
        });
        setPageState("redeemed");
      }}
    />
  );
}
