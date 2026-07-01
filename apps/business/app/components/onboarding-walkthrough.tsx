import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { Check, X } from "lucide-react";
import { useAddVoucher } from "~/hooks/use-add-voucher";

const storageKey = (businessId: string) => `walkthroughDismissed_${businessId}`;

type Business = {
  _id: Id<"businesses">;
  slug: string;
  description?: string;
  logoUrl?: string | null;
};

function ChecklistItem({
  done,
  label,
  description,
  action,
}: {
  done: boolean;
  label: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0">
      <div
        className={`mt-0.5 w-5 h-5 shrink-0 flex items-center justify-center border ${
          done ? "bg-foreground border-foreground" : "border-muted-foreground"
        }`}
      >
        {done && <Check className="w-3 h-3 text-background stroke-[3]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold uppercase tracking-tight leading-none mb-1 ${done ? "text-muted-foreground line-through decoration-muted-foreground" : "text-foreground"}`}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {!done && action && (
        <div className="shrink-0">{action}</div>
      )}
    </div>
  );
}

function WalkthroughContent({ business }: { business: Business }) {
  const { setIsOpen: openVoucherModal } = useAddVoucher();

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return Boolean(localStorage.getItem(storageKey(business._id)));
  });

  // Mark as seen on first render — walkthrough is a first-visit experience
  useEffect(() => {
    if (!dismissed) {
      localStorage.setItem(storageKey(business._id), "1");
    }
  }, [dismissed, business._id]);

  const connections = useQuery(
    api.functions.posConnections.getPosConnections,
    !dismissed ? { businessId: business._id } : "skip",
  );
  const vouchers = useQuery(
    api.functions.vouchers.getActiveVouchersByBusiness,
    !dismissed ? { businessId: business._id } : "skip",
  );

  if (dismissed) return null;

  const profileComplete = !!(business.description && business.logoUrl);
  const hasVoucher = (vouchers?.length ?? 0) > 0;
  const hasPosConnection = (connections?.length ?? 0) > 0;
  const completedCount = [profileComplete, hasVoucher, hasPosConnection].filter(Boolean).length;
  const allDone = completedCount === 3;

  const handleDismiss = () => {
    localStorage.setItem(storageKey(business._id), "1");
    setDismissed(true);
  };

  return (
    <div className="relative border border-border bg-surface-raised mb-8">
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
        <div>
          <h2 className="inline-block bg-foreground text-background px-2 py-1 text-sm font-bold uppercase tracking-tight leading-none">
            {allDone ? "You're all set" : `Get started — ${completedCount}/3 done`}
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {allDone
              ? "Your profile is live, your vouchers are active, and redemptions are tracked."
              : "Complete these steps to get the most out of Areacodes."}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="ml-4 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6">
        <ChecklistItem
          done={profileComplete}
          label="Complete your profile"
          description="Add a description and logo — customers see this on the map before they claim."
          action={
            <Link
              to="/b/$slug/edit"
              params={{ slug: business.slug }}
              className="text-xs font-bold uppercase tracking-tight text-foreground underline underline-offset-2 hover:text-muted-foreground transition-colors"
            >
              Edit profile
            </Link>
          }
        />
        <ChecklistItem
          done={hasVoucher}
          label="Add your first voucher"
          description="Publish a deal that local customers can claim on Areacodes."
          action={
            <button
              onClick={() => openVoucherModal(true)}
              className="text-xs font-bold uppercase tracking-tight text-foreground underline underline-offset-2 hover:text-muted-foreground transition-colors"
            >
              Create voucher
            </button>
          }
        />
        <ChecklistItem
          done={hasPosConnection}
          label="Connect your POS"
          description="Track redemptions automatically via Square or Zettle — no manual work."
          action={
            <Link
              to="/b/$slug/pos"
              params={{ slug: business.slug }}
              className="text-xs font-bold uppercase tracking-tight text-foreground underline underline-offset-2 hover:text-muted-foreground transition-colors"
            >
              Set up integration
            </Link>
          }
        />
      </div>
    </div>
  );
}

export const OnboardingWalkthrough = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });

  if (!business) return null;

  return <WalkthroughContent business={business} />;
};
