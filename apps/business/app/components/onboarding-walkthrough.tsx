import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Button } from "@repo/ui";
import { usePilotFeature } from "~/hooks/use-pilot-feature";

const storageKey = (businessId: string) => `hasSeenWalkthrough_${businessId}`;

function ChecklistItem({
  label,
  done,
  linkTo,
  linkLabel,
  slug,
}: {
  label: string;
  done: boolean;
  linkTo?: string;
  linkLabel?: string;
  slug: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div className="flex flex-col gap-0.5">
        <span className={done ? "line-through text-muted-foreground" : "text-foreground"}>
          {label}
        </span>
        {!done && linkTo && linkLabel && (
          <Link
            to={linkTo}
            params={{ slug }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {linkLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}

function WalkthroughContent({ businessId }: { businessId: Id<"businesses"> }) {
  const { slug } = useParams({ strict: false }) as { slug: string };

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return Boolean(localStorage.getItem(storageKey(businessId)));
  });

  // Mark walkthrough as seen on first render so it won't show on subsequent visits
  useEffect(() => {
    if (!dismissed) {
      localStorage.setItem(storageKey(businessId), "1");
    }
  }, [dismissed, businessId]);

  const connections = useQuery(
    api.functions.posConnections.getPosConnections,
    !dismissed ? { businessId } : "skip",
  );
  const vouchers = useQuery(
    api.functions.vouchers.getActiveVouchersByBusiness,
    !dismissed ? { businessId } : "skip",
  );

  if (dismissed) return null;

  const hasPosConnection = (connections?.length ?? 0) > 0;
  const hasVoucher = (vouchers?.length ?? 0) > 0;
  const allDone = hasPosConnection && hasVoucher;

  const handleDismiss = () => {
    localStorage.setItem(storageKey(businessId), "1");
    setDismissed(true);
  };

  return (
    <div className="relative mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss walkthrough"
        className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {allDone ? "You're all set!" : "Get started with AreaCodes"}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {allDone
            ? "You've completed the key setup steps. Your vouchers are live."
            : "Two things to do first — then you're ready to go."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <ChecklistItem
          label="Connect your POS"
          done={hasPosConnection}
          linkTo="/b/$slug/pos"
          linkLabel="Go to POS settings"
          slug={slug}
        />
        <ChecklistItem
          label="Add your first voucher"
          done={hasVoucher}
          slug={slug}
        />
      </div>

      {!allDone && (
        <p className="mt-4 text-xs text-muted-foreground">
          You can do these in any order — nothing is blocked.
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export const OnboardingWalkthrough = () => {
  const isEnabled = usePilotFeature("onboarding_walkthrough");
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(
    api.functions.businesses.getBusinessBySlug,
    isEnabled ? { slug } : "skip",
  );

  if (!isEnabled || !business) return null;

  return <WalkthroughContent businessId={business._id} />;
};
