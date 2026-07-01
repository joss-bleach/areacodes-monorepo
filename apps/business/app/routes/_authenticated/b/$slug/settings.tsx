import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useAction } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { Button, Skeleton } from "@repo/ui";
import { BusinessNavbar } from "~/components/business-navbar";
import { BoundaryAlert } from "~/components/boundary-alert";

export const Route = createFileRoute("/_authenticated/b/$slug/settings")({
  component: SettingsPage,
});

function formatSetAt(ts: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts));
}

function RedemptionPinSection({ businessId }: { businessId: Id<"businesses"> }) {
  const status = useQuery(api.functions.redemptionAuth.getRedemptionPinStatus, {
    businessId,
  });
  const setPin = useAction(api.functions.redemptionAuth.setRedemptionPin);

  const [pin, setPin2] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === undefined) {
    return (
      <div className="border border-border p-6">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      toast.error("PIN must be at least 4 characters");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      await setPin({ businessId, pin });
      toast.success(status?.isSet ? "Redemption PIN updated" : "Redemption PIN set");
      setPin2("");
      setConfirmPin("");
    } catch {
      toast.error("Failed to save PIN. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-foreground" />
              <span className="text-sm font-bold uppercase tracking-tight">
                Redemption PIN
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-prose">
              Staff enter this PIN once to unlock the redemption device. Rotating
              the PIN immediately invalidates all unlocked devices.
            </p>
          </div>
          {status.isSet && (
            <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Set {formatSetAt(status.setAt)}</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="pin"
              className="block text-xs font-bold uppercase tracking-tight mb-1.5"
            >
              {status.isSet ? "New PIN" : "PIN"}
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin2(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
              placeholder="Enter PIN"
            />
          </div>
          <div>
            <label
              htmlFor="confirm-pin"
              className="block text-xs font-bold uppercase tracking-tight mb-1.5"
            >
              Confirm PIN
            </label>
            <input
              id="confirm-pin"
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
              placeholder="Repeat PIN"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isSubmitting || !pin || !confirmPin}
            className="h-9 px-4 text-xs font-bold uppercase tracking-tight"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving…
              </>
            ) : status.isSet ? (
              "Rotate PIN"
            ) : (
              "Set PIN"
            )}
          </Button>
          {status.isSet && (
            <p className="text-xs text-muted-foreground">
              Rotating invalidates all unlocked staff devices.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

function SettingsPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });
  const businessId = business?._id as Id<"businesses"> | undefined;

  if (business === null) {
    return <BoundaryAlert title="Error" description="Business not found." />;
  }

  return (
    <>
      <BusinessNavbar />
      <main className="w-screen py-6">
        <div className="container-app">
          <div className="mb-6">
            <span className="inline-block bg-foreground text-background px-2 py-1 text-xl font-bold uppercase tracking-tight leading-none">
              Settings
            </span>
            <p className="text-xs text-muted-foreground mt-2">
              Manage redemption PIN and portal configuration
            </p>
          </div>

          {businessId === undefined ? (
            <div className="border border-border p-6">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <RedemptionPinSection businessId={businessId} />
          )}
        </div>
      </main>
    </>
  );
}
