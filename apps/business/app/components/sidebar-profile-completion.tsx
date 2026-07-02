import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";

type Business = {
  _id: Id<"businesses">;
  slug: string;
  description?: string;
  logoUrl?: string | null;
};

const RING_SIZE = 32;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ percent }: { percent: number }) {
  const offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          strokeWidth={RING_STROKE}
          fill="none"
          className="stroke-border"
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-success-foreground transition-[stroke-dashoffset]"
        />
      </svg>
      <span className="absolute text-[8px] font-bold tabular-nums text-foreground">
        {percent}
      </span>
    </div>
  );
}

function ChecklistRow({
  done,
  label,
  to,
  slug,
  onNavigate,
}: {
  done: boolean;
  label: string;
  to: "/b/$slug/edit" | "/b/$slug/vouchers/new" | "/b/$slug/pos";
  slug: string;
  onNavigate: () => void;
}) {
  const indicator = (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
        done
          ? "bg-success-bg border-success-border"
          : "border-muted-foreground"
      }`}
    >
      {done && <Check className="h-2.5 w-2.5 text-success-foreground stroke-[3]" />}
    </span>
  );

  const labelClasses = `text-xs font-bold uppercase tracking-tight ${
    done ? "text-muted-foreground line-through decoration-muted-foreground" : "text-foreground"
  }`;

  if (done) {
    return (
      <div className="flex items-center gap-2 py-2">
        {indicator}
        <span className={labelClasses}>{label}</span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      params={{ slug }}
      onClick={onNavigate}
      className="flex items-center gap-2 py-2 hover:text-muted-foreground transition-colors"
    >
      {indicator}
      <span className={labelClasses}>{label}</span>
    </Link>
  );
}

function ProfileCompletionContent({ business }: { business: Business }) {
  const [open, setOpen] = useState(false);

  const connections = useQuery(api.functions.posConnections.getPosConnections, {
    businessId: business._id,
  });
  const vouchers = useQuery(api.functions.vouchers.getActiveVouchersByBusiness, {
    businessId: business._id,
  });

  const profileComplete = !!(business.description && business.logoUrl);
  const hasVoucher = (vouchers?.length ?? 0) > 0;
  const hasPosConnection = (connections?.length ?? 0) > 0;
  const completedCount = [profileComplete, hasVoucher, hasPosConnection].filter(Boolean).length;

  if (completedCount === 3) return null;

  const percent = Math.round((completedCount / 3) * 100);
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex w-full items-center gap-2 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          aria-label={`Profile completion ${percent}%`}
        >
          <ProgressRing percent={percent} />
          <span className="truncate text-xs font-bold uppercase tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
            Profile Completion
          </span>
          <span className="ml-auto shrink-0 text-xs font-bold tabular-nums text-muted-foreground group-data-[collapsible=icon]:hidden">
            {percent}%
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-64 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-tight text-foreground">
            Profile Completion
          </h3>
          <span className="text-xs font-bold tabular-nums text-muted-foreground">
            {percent}%
          </span>
        </div>
        <div className="divide-y divide-border">
          <ChecklistRow
            done={profileComplete}
            label="Complete your profile"
            to="/b/$slug/edit"
            slug={business.slug}
            onNavigate={close}
          />
          <ChecklistRow
            done={hasVoucher}
            label="Add your first voucher"
            to="/b/$slug/vouchers/new"
            slug={business.slug}
            onNavigate={close}
          />
          <ChecklistRow
            done={hasPosConnection}
            label="Connect your POS"
            to="/b/$slug/pos"
            slug={business.slug}
            onNavigate={close}
          />
        </div>
        <button
          onClick={close}
          className="mt-3 w-full border border-border py-1.5 text-xs font-bold uppercase tracking-tight text-foreground hover:bg-muted transition-colors"
        >
          Close
        </button>
      </PopoverContent>
    </Popover>
  );
}

export function SidebarProfileCompletion() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });

  if (!business) return null;

  return <ProfileCompletionContent business={business} />;
}
