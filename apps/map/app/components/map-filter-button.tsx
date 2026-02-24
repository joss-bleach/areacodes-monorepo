import { Suspense, useMemo } from "react";
import * as React from "react";
import { SlidersHorizontalIcon, X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  Button,
  Badge,
  Skeleton,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui";
import {
  useExploreFilters,
  type SortOption,
} from "~/hooks/use-explore-filters";
import type { Id } from "@repo/convex";

type Industry = {
  _id: Id<"industries">;
  name: string;
  category: string;
  slug: string;
};

const IndustryFilterContent = ({
  industryId,
  setIndustryId,
}: {
  industryId: string | null;
  setIndustryId: (id: string | null) => void;
}) => {
  const industries = useQuery(api.functions.industries.getAllIndustries, {});

  if (!industries) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

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
                    key={industry._id}
                    onClick={() =>
                      setIndustryId(
                        industryId === industry._id ? null : industry._id
                      )
                    }
                    className={`w-full text-left px-4 py-3 border transition-colors ${
                      industryId === industry._id
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

  const industries = useQuery(api.functions.industries.getAllIndustries, {});

  const selectedIndustry = useMemo(() => {
    if (!industryId || !industries) return null;
    return industries.find((industry) => industry._id === industryId) || null;
  }, [industryId, industries]);

  const hasActiveFilters = !!industryId || sortBy !== "distance";

  const clearAllFilters = () => {
    setIndustryId(null);
    setSortBy("distance");
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
          aria-label="Sort & Filter"
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
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Sort by
              </h3>
              <div className="space-y-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`w-full text-left px-4 py-3 border transition-colors ${
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

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Industry
              </h3>
              <IndustryFilterContent
                industryId={industryId}
                setIndustryId={setIndustryId}
              />
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="border-t bg-background p-4 mt-auto">
            <Button onClick={() => setOpen(false)} className="w-full">
              Apply
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
