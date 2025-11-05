"use client";

import { useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type SortOption = "distance" | "rating" | "name" | "newest";
type FilterOption = {
  industry?: string;
  distance?: number;
};

export const MapFilterButton = () => {
  const [sortBy, setSortBy] = useState<SortOption>("distance");
  const [filters, setFilters] = useState<FilterOption>({});

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "distance", label: "Distance" },
    { value: "rating", label: "Rating" },
    { value: "name", label: "Name" },
    { value: "newest", label: "Newest" },
  ];

  const distanceOptions = [
    { value: 1, label: "Within 1 mile" },
    { value: 5, label: "Within 5 miles" },
    { value: 10, label: "Within 10 miles" },
    { value: 25, label: "Within 25 miles" },
  ];

  const industryOptions = [
    "Restaurants",
    "Retail",
    "Services",
    "Entertainment",
    "Healthcare",
    "Education",
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="bg-transparent shadow-none hover:bg-black/50"
        >
          <SlidersHorizontalIcon className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm px-4">
        <SheetHeader>
          <SheetTitle>Sort & Filter</SheetTitle>
        </SheetHeader>

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

          {/* Filter by Distance */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Distance
            </h3>
            <div className="space-y-2">
              {distanceOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      distance:
                        filters.distance === option.value
                          ? undefined
                          : option.value,
                    }))
                  }
                  className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                    filters.distance === option.value
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
            <div className="space-y-2">
              {industryOptions.map((industry) => (
                <button
                  key={industry}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      industry:
                        filters.industry === industry ? undefined : industry,
                    }))
                  }
                  className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                    filters.industry === industry
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
