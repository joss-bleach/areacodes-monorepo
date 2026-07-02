import { useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { Skeleton } from "@repo/ui";
import { BoundaryAlert } from "~/components/boundary-alert";

const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
};

function PilotBadge({ trialEnd }: { trialEnd: number }) {
  const daysLeft = Math.max(
    0,
    Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <span className="inline-flex items-center border border-border px-2 py-0.5 text-xs font-bold uppercase tracking-tight text-muted-foreground leading-none">
      Pilot — {daysLeft}d left
    </span>
  );
}

export const DashboardTop = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });
  const subscription = useQuery(
    api.functions.subscriptions.getSubscription,
    business ? { businessId: business._id } : "skip",
  );
  const greeting = getTimeOfDayGreeting();

  if (business === undefined) {
    return (
      <div className="flex flex-col mb-6">
        <Skeleton className="h-10 w-64 mb-3" />
        <Skeleton className="h-5 w-48" />
      </div>
    );
  }

  if (business === null) {
    return (
      <BoundaryAlert
        title="Error"
        description="Error loading business information."
      />
    );
  }

  return (
    <div className="flex flex-col mb-6">
      <h1 className="text-xs text-muted-foreground mb-2">
        {greeting}
      </h1>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-block bg-foreground text-background px-2 py-1 text-2xl font-bold uppercase tracking-tight leading-none">
          {business.name}
        </span>
        {subscription?.status === "trialing" && subscription.trialEnd && (
          <PilotBadge trialEnd={subscription.trialEnd} />
        )}
      </div>
    </div>
  );
};
