"use client";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

import { useTRPC } from "@/trpc/client";

import { BoundaryAlert } from "@/components/boundary-alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const BusinessInformationStep = () => {
  return (
    <Suspense fallback={<BusinessInformationStepLoading />}>
      <ErrorBoundary fallback={<BusinessInformationStepError />}>
        <BusinessInformationStepSuspense />
      </ErrorBoundary>
    </Suspense>
  );
};

const BusinessInformationStepSuspense = () => {
  const trpc = useTRPC();
  const { data: industries } = useSuspenseQuery(
    trpc.business.getAllIndustries.queryOptions()
  );

  // Group industries by category
  const industriesByCategory = industries.reduce(
    (acc, industry) => {
      if (!acc[industry.category]) {
        acc[industry.category] = [];
      }
      acc[industry.category].push(industry);
      return acc;
    },
    {} as Record<string, typeof industries>
  );

  return (
    <div className="w-full flex flex-col space-y-6">
      <div className="flex flex-col gap-2 w-full">
        <Label htmlFor="name">Business name</Label>
        <Input
          id="name"
          placeholder="Enter your business name"
          className="w-full"
        />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Label htmlFor="name">Business description</Label>
        <Textarea
          id="description"
          placeholder="Tell us a bit about your business"
          className="w-full"
        />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Label htmlFor="industry">Industry</Label>
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an industry" />
          </SelectTrigger>
          <SelectContent side="bottom">
            {Object.entries(industriesByCategory).map(([category, items]) => (
              <SelectGroup key={category}>
                <SelectLabel>{category}</SelectLabel>
                {items.map((industry) => (
                  <SelectItem key={industry.id} value={industry.id}>
                    {industry.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const BusinessInformationStepError = () => {
  return (
    <BoundaryAlert
      title="Error loading form"
      description="Error loading form. Please try again later."
    />
  );
};

const BusinessInformationStepLoading = () => {
  return (
    <div className="w-full flex flex-col space-y-6">
      <div className="flex flex-col gap-2 w-full">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
};
