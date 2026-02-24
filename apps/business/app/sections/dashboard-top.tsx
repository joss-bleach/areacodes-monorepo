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

export const DashboardTop = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });
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
      <p className="text-muted-foreground mt-1">
        Your voucher overview.
      </p>
    </div>
  );
};
