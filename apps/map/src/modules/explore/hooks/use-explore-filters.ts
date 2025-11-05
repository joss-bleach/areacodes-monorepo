"use client";

import { useQueryState, parseAsString } from "nuqs";

export type SortOption = "distance" | "newest";

export const useExploreFilters = () => {
  const [industryId, setIndustryId] = useQueryState(
    "industry",
    parseAsString
  );

  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsString.withDefault("distance")
  );

  // Future filters can be added here:
  // const [distance, setDistance] = useQueryState("distance", parseAsInteger);

  return {
    industryId,
    setIndustryId: (id: string | null) => setIndustryId(id),
    sortBy: (sortBy as SortOption) || "distance",
    setSortBy: (sort: SortOption | null) => setSortBy(sort),
    // Future: distance, etc.
  };
};

