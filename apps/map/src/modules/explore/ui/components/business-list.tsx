"use client";
import { useEffect, useState, Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { DraggableDrawer } from "./draggable-drawer";
import { useTRPC } from "@/trpc/client";
import { BoundaryAlert } from "@/components/boundary-alert";
import { Skeleton } from "@/components/ui/skeleton";

const BusinessListSuspense = ({
  onDrawerHeightChange,
}: {
  onDrawerHeightChange?: (height: number, isExpanded: boolean) => void;
}) => {
  const [maxHeight, setMaxHeight] = useState(800);
  const trpc = useTRPC();

  const { data: businessesWithVouchers } = useSuspenseQuery(
    trpc.explore.getBusinessesWithVouchers.queryOptions()
  );

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

        <div className="mb-6">
          {businessesWithVouchers?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No businesses with vouchers found nearby.
            </p>
          ) : (
            <div className="space-y-3">
              {businessesWithVouchers?.map((item) => (
                <div key={item.voucher.id} className="flex gap-3 p-3 bg-muted">
                  <div className="w-16 h-16 overflow-hidden shrink-0 rounded-md">
                    <img
                      src={item.business.logoUrl}
                      alt={item.business.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to a placeholder if image fails to load
                        (e.target as HTMLImageElement).src =
                          "/restaurant-.jpg?height=64&width=64&query=restaurant";
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">
                      {item.voucher.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {item.business.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DraggableDrawer>
  );
};

const BusinessListLoading = ({
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
    <Suspense fallback={<BusinessListLoading onDrawerHeightChange={onDrawerHeightChange} />}>
      <ErrorBoundary fallback={<BusinessListError onDrawerHeightChange={onDrawerHeightChange} />}>
        <BusinessListSuspense onDrawerHeightChange={onDrawerHeightChange} />
      </ErrorBoundary>
    </Suspense>
  );
};
