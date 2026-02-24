import { useEffect, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { Link } from "@tanstack/react-router";
import { DraggableDrawer } from "./draggable-drawer";
import { BoundaryAlert } from "./boundary-alert";
import { Skeleton, Button } from "@repo/ui";
import { useExploreFilters } from "~/hooks/use-explore-filters";
import type { Id } from "@repo/convex";

const MAP_CENTER: [number, number] = [50.8236, -0.1435];

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
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

const BusinessListContent = ({
  onDrawerHeightChange,
}: {
  onDrawerHeightChange?: (height: number, isExpanded: boolean) => void;
}) => {
  const [maxHeight, setMaxHeight] = useState(800);
  const [isMounted, setIsMounted] = useState(false);
  const { industryId, sortBy } = useExploreFilters();

  const businessesWithVouchers = useQuery(
    api.functions.explore.getBusinessesWithVouchers,
    isMounted
      ? industryId
        ? { industryId: industryId as Id<"industries"> }
        : {}
      : "skip"
  );

  const isLoading = businessesWithVouchers === undefined;

  useEffect(() => {
    setIsMounted(true);
    setMaxHeight(window.innerHeight - 100);
  }, []);

  // Flatten businesses + vouchers into display items
  const flatItems = useMemo(() => {
    if (!businessesWithVouchers) return [];
    return businessesWithVouchers.flatMap((business) =>
      business.vouchers.map((voucher) => ({ business, voucher }))
    );
  }, [businessesWithVouchers]);

  const sortedItems = useMemo(() => {
    return [...flatItems].sort((a, b) => {
      if (sortBy === "newest") {
        return b.business._creationTime - a.business._creationTime;
      }
      const distA = calculateDistance(
        MAP_CENTER[0],
        MAP_CENTER[1],
        a.business.latitude,
        a.business.longitude
      );
      const distB = calculateDistance(
        MAP_CENTER[0],
        MAP_CENTER[1],
        b.business.latitude,
        b.business.longitude
      );
      return distA - distB;
    });
  }, [flatItems, sortBy]);

  const header = (
    <div className="px-6 pt-2 pb-4">
      <h2 className="text-2xl font-bold text-foreground">VOUCHERS NEARBY</h2>
    </div>
  );

  if (!isMounted || isLoading) {
    return (
      <DraggableDrawer
        minHeight={100}
        maxHeight={maxHeight}
        initialHeight={120}
        onHeightChange={onDrawerHeightChange}
        header={header}
      >
        <div className="px-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 p-3 bg-muted">
                <Skeleton className="w-16 h-16 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
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
      header={header}
    >
      <div className="px-6">
        {sortedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No businesses with vouchers found nearby.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedItems.map(({ business, voucher }) => {
              const distance = calculateDistance(
                MAP_CENTER[0],
                MAP_CENTER[1],
                business.latitude,
                business.longitude
              );
              const distanceText =
                distance < 1
                  ? `${Math.round(distance * 1000)}m away`
                  : `${distance.toFixed(1)}km away`;

              const industryName = business.industry?.name;

              return (
                <div
                  key={voucher._id}
                  className="bg-background border border-border p-4 space-y-3"
                >
                  <h3 className="text-lg font-semibold text-foreground leading-tight">
                    {business.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {industryName && (
                      <>
                        <span>{industryName}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{distanceText}</span>
                  </div>
                  <p className="text-sm text-foreground">{voucher.title}</p>
                  <Link
                    to="/v/$id"
                    params={{ id: voucher._id }}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 min-h-[44px] sm:min-h-[36px] w-full"
                  >
                    Redeem voucher
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DraggableDrawer>
  );
};

export const BusinessList = ({
  onDrawerHeightChange,
}: {
  onDrawerHeightChange?: (height: number, isExpanded: boolean) => void;
}) => {
  const [maxHeight, setMaxHeight] = useState(800);

  useEffect(() => {
    setMaxHeight(window.innerHeight - 100);
  }, []);

  try {
    return <BusinessListContent onDrawerHeightChange={onDrawerHeightChange} />;
  } catch {
    return (
      <DraggableDrawer
        minHeight={100}
        maxHeight={maxHeight}
        initialHeight={120}
        onHeightChange={onDrawerHeightChange}
        header={
          <div className="px-6 pt-2 pb-4">
            <h2 className="text-2xl font-bold text-foreground">
              VOUCHERS NEARBY
            </h2>
          </div>
        }
      >
        <div className="px-6">
          <BoundaryAlert
            title="Error"
            description="Error loading businesses. Please try again later."
          />
        </div>
      </DraggableDrawer>
    );
  }
};
