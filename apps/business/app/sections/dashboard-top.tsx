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
  const endDate = new Date(trialEnd).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
      Pilot — {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining (ends {endDate})
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
      <h1 className="text-4xl text-foreground">
        {greeting}, {business.name}
      </h1>
      <div className="flex items-center gap-3 mt-1">
        <p className="text-muted-foreground">Your voucher overview.</p>
        {subscription?.status === "trialing" && subscription.trialEnd && (
          <PilotBadge trialEnd={subscription.trialEnd} />
        )}
      </div>
    </div>
  );
};
