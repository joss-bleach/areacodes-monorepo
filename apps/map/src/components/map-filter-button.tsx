"use client";

import { Suspense, useMemo } from "react";
import * as React from "react";
import { SlidersHorizontalIcon, X } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import {
  useExploreFilters,
  type SortOption,
} from "@/modules/explore/hooks/use-explore-filters";
import type { Industry } from "db";

const IndustryFilterContent = ({
  industryId,
  setIndustryId,
}: {
  industryId: string | null;
  setIndustryId: (id: string | null) => void;
}) => {
  const trpc = useTRPC();
  const { data: industries } = useSuspenseQuery(
    trpc.getIndustries.queryOptions()
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
    {} as Record<string, Industry[]>
  );

  return (
    <Accordion type="multiple" className="w-full">
      {Object.entries(industriesByCategory).map(
        ([category, categoryIndustries]) => (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="text-sm font-semibold">
              {category}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {categoryIndustries.map((industry) => (
                  <button
                    key={industry.id}
                    onClick={() =>
                      setIndustryId(
                        industryId === industry.id ? null : industry.id
                      )
                    }
                    className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                      industryId === industry.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {industry.name}
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      )}
    </Accordion>
  );
};

export const MapFilterButton = () => {
  const { industryId, setIndustryId, sortBy, setSortBy } = useExploreFilters();
  const [open, setOpen] = React.useState(false);

  const trpc = useTRPC();
  const { data: industries } = useSuspenseQuery(
    trpc.getIndustries.queryOptions()
  );

  // Find the selected industry name
  const selectedIndustry = useMemo(() => {
    if (!industryId) return null;
    return industries?.find((industry) => industry.id === industryId) || null;
  }, [industryId, industries]);

  // Check if there are any active filters
  const hasActiveFilters = !!industryId || sortBy !== "distance";

  const clearAllFilters = () => {
    setIndustryId(null);
    setSortBy("distance");
  };

  const handleApply = () => {
    setOpen(false);
  };

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "distance", label: "Distance" },
    { value: "newest", label: "Newest" },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="bg-transparent shadow-none hover:bg-black/50"
        >
          <SlidersHorizontalIcon className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-sm px-6 sm:px-4 flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>Sort & Filter</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Active Filters Section */}
          {hasActiveFilters && (
            <div className="mt-6 pb-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Active Filters
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-xs"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedIndustry && (
                  <Badge variant="secondary" className="px-2 py-1">
                    <span>{selectedIndustry.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIndustryId(null);
                      }}
                      className="ml-1 hover:opacity-70 transition-opacity cursor-pointer"
                      aria-label={`Remove ${selectedIndustry.name} filter`}
                    >
                      <X className="h-3 w-3 pointer-events-none" />
                    </button>
                  </Badge>
                )}
                {sortBy !== "distance" && (
                  <Badge variant="secondary" className="px-2 py-1">
                    <span>
                      Sort: {sortOptions.find((o) => o.value === sortBy)?.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortBy("distance");
                      }}
                      className="ml-1 hover:opacity-70 transition-opacity cursor-pointer"
                      aria-label="Reset sort to distance"
                    >
                      <X className="h-3 w-3 pointer-events-none" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-8 pb-6">
            {/* Sort By */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Sort by
              </h3>
              <div className="space-y-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                      sortBy === option.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter by Industry */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Industry
              </h3>
              <Suspense
                fallback={
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                }
              >
                <IndustryFilterContent
                  industryId={industryId}
                  setIndustryId={setIndustryId}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Apply Button - Only show when filters are active */}
        {hasActiveFilters && (
          <div className="border-t bg-background p-4 mt-auto">
            <Button onClick={handleApply} className="w-full">
              Apply
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
