"use client";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

import { useTRPC } from "@/trpc/client";
import { BoundaryAlert } from "@/components/boundary-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning";
  } else if (hour >= 12 && hour < 18) {
    return "Good afternoon";
  } else {
    return "Good evening";
  }
};

export const DashboardTop = () => {
  return (
    <Suspense fallback={<DashboardTopLoading />}>
      <ErrorBoundary fallback={<DashboardTopError />}>
        <DashboardTopSuspense />
      </ErrorBoundary>
    </Suspense>
  );
};

const DashboardTopSuspense = () => {
  const { slug } = useParams();
  const trpc = useTRPC();
  const { data: business } = useSuspenseQuery(
    trpc.business.getBusinessBySlug.queryOptions({ slug: slug as string })
  );
  const greeting = getTimeOfDayGreeting();

  return (
    <div className="flex flex-col mb-6">
      <h1 className="text-3xl font-semibold text-foreground">
        {greeting}, {business?.name}
      </h1>
      <p className="text-muted-foreground mt-1">
        Here&apos;s what&apos;s happening with your vouchers today
      </p>
    </div>
  );
};

const DashboardTopError = () => {
  return (
    <BoundaryAlert
      title="Error"
      description="Error loading business information."
    />
  );
};

const DashboardTopLoading = () => {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col mb-6">
        <Skeleton className="h-9 w-64 mb-3" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
};
