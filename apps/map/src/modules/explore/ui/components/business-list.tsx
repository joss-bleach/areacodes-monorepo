"use client";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import Link from "next/link";
import { DraggableDrawer } from "./draggable-drawer";
import { useTRPC } from "@/trpc/client";
import { useExploreFilters } from "@/modules/explore/hooks/use-explore-filters";
import type { BusinessWithVoucher } from "db";
import { BoundaryAlert } from "@/components/boundary-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// Map center coordinates (Brighton, England)
const MAP_CENTER: [number, number] = [50.8236, -0.1435];

// Calculate distance between two coordinates using Haversine formula
// Returns distance in kilometers
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

const BusinessListSuspense = ({
  onDrawerHeightChange,
}: {
  onDrawerHeightChange?: (height: number, isExpanded: boolean) => void;
}) => {
  const [maxHeight, setMaxHeight] = useState(800);
  const [isMounted, setIsMounted] = useState(false);
  const trpc = useTRPC();
  const { industryId, sortBy } = useExploreFilters();

  const { data: businessesWithVouchers, isLoading } = useQuery({
    ...trpc.explore.getBusinessesWithVouchers.queryOptions(
      industryId ? { industryId } : undefined
    ),
    enabled: isMounted,
  });

  // Fetch industries to get industry names
  const { data: industries } = useSuspenseQuery(
    trpc.getIndustries.queryOptions()
  );

  // Create a map of industry ID to name for quick lookup
  const industryMap = useMemo(() => {
    if (!industries) return new Map();
    return new Map(industries.map((industry) => [industry.id, industry.name]));
  }, [industries]);

  // Sort businesses by distance or newest
  const sortedBusinesses = useMemo(() => {
    if (!businessesWithVouchers) return [];

    return [...businessesWithVouchers].sort((a, b) => {
      if (sortBy === "newest") {
        // Sort by createdAt descending (newest first)
        const dateA = new Date(a.business.createdAt).getTime();
        const dateB = new Date(b.business.createdAt).getTime();
        return dateB - dateA;
      } else {
        // Sort by distance (default)
        const distanceA = calculateDistance(
          MAP_CENTER[0],
          MAP_CENTER[1],
          a.business.latitude,
          a.business.longitude
        );
        const distanceB = calculateDistance(
          MAP_CENTER[0],
          MAP_CENTER[1],
          b.business.latitude,
          b.business.longitude
        );
        return distanceA - distanceB;
      }
    });
  }, [businessesWithVouchers, sortBy]);

  useEffect(() => {
    setIsMounted(true);
    setMaxHeight(window.innerHeight - 100);
  }, []);

  // Show loading state until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <DraggableDrawer
        minHeight={100}
        maxHeight={maxHeight}
        initialHeight={120}
        onHeightChange={onDrawerHeightChange}
      >
        <div className="px-6">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            VOUCHERS NEARBY
          </h2>
          <div className="mb-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3 bg-muted">
                  <Skeleton className="w-16 h-16 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DraggableDrawer>
    );
  }

  return (
    <DraggableDrawer
      minHeight={100}
      maxHeight={maxHeight}
      initialHeight={120}
      onHeightChange={onDrawerHeightChange}
    >
      <div className="px-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">
          VOUCHERS NEARBY
        </h2>

        <div className="mb-6">
          {isLoading && !businessesWithVouchers ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3 bg-muted">
                  <Skeleton className="w-16 h-16 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedBusinesses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No businesses with vouchers found nearby.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedBusinesses.map((item) => {
                const distance = calculateDistance(
                  MAP_CENTER[0],
                  MAP_CENTER[1],
                  item.business.latitude,
                  item.business.longitude
                );
                const distanceText =
                  distance < 1
                    ? `${Math.round(distance * 1000)}m away`
                    : `${distance.toFixed(1)}km away`;

                const industryName = item.business.industryId
                  ? industryMap.get(item.business.industryId)
                  : null;

                return (
                  <div
                    key={item.voucher.id}
                    className="bg-background border border-border rounded-lg p-4 space-y-3"
                  >
                    {/* Business Name */}
                    <h3 className="text-lg font-semibold text-foreground leading-tight">
                      {item.business.name}
                    </h3>

                    {/* Industry and Distance */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {industryName && (
                        <>
                          <span>{industryName}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{distanceText}</span>
                    </div>

                    {/* Voucher Title */}
                    <p className="text-sm text-foreground">
                      {item.voucher.title}
                    </p>

                    {/* View Voucher Button */}
                    <Link href={`/v/${item.voucher.id}`}>
                      <Button variant="secondary" className="w-full">
                        Redeem voucher
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DraggableDrawer>
  );
};

const BusinessListError = ({
  onDrawerHeightChange,
}: {
  onDrawerHeightChange?: (height: number, isExpanded: boolean) => void;
}) => {
  const [maxHeight, setMaxHeight] = useState(800);

  useEffect(() => {
    setMaxHeight(window.innerHeight - 100);
  }, []);

  return (
    <DraggableDrawer
      minHeight={100}
      maxHeight={maxHeight}
      initialHeight={120}
      onHeightChange={onDrawerHeightChange}
    >
      <div className="px-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">
          VOUCHERS NEARBY
        </h2>
        <BoundaryAlert
          title="Error"
          description="Error loading businesses. Please try again later."
        />
      </div>
    </DraggableDrawer>
  );
};

export const BusinessList = ({
  onDrawerHeightChange,
}: {
  onDrawerHeightChange?: (height: number, isExpanded: boolean) => void;
}) => {
  return (
    <ErrorBoundary
      fallback={
        <BusinessListError onDrawerHeightChange={onDrawerHeightChange} />
      }
    >
      <BusinessListSuspense onDrawerHeightChange={onDrawerHeightChange} />
    </ErrorBoundary>
  );
};
