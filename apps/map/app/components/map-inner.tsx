// Client-only module — only imported via dynamic import in map.tsx.
// maplibre-gl accesses `window` on module init, so it must
// never be statically imported in an SSR context.
import { useCallback, useRef, useState } from "react";
import {
  Map as MapCN,
  MapMarker,
  MarkerContent,
  MapPopup,
} from "~/components/ui/map";
import { Button } from "@repo/ui";
import { ExternalLink } from "lucide-react";
import type { Id } from "@repo/convex";

type Business = {
  _id: Id<"businesses">;
  name: string;
  slug: string;
  description: string;
  latitude: number;
  longitude: number;
  logoUrl: string | null;
  industryName: string | null;
};

const isTouchDevice = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

function BusinessMarker({ business }: { business: Business }) {
  const [showPopup, setShowPopup] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimeout = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
  };

  const handleMouseEnter = useCallback(() => {
    if (isTouchDevice()) return;
    clearHoverTimeout();
    setShowPopup(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice()) return;
    hoverTimeout.current = setTimeout(() => setShowPopup(false), 200);
  }, []);

  const handleClick = useCallback(() => {
    setShowPopup((prev) => !prev);
  }, []);

  return (
    <>
      <MapMarker
        longitude={business.longitude}
        latitude={business.latitude}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <MarkerContent>
          <img
            src="/marker.svg"
            width={32}
            height={32}
            alt=""
            className="drop-shadow-lg hover:scale-110 transition-transform"
          />
        </MarkerContent>
      </MapMarker>
      {showPopup && (
        <MapPopup
          longitude={business.longitude}
          latitude={business.latitude}
          onClose={() => setShowPopup(false)}
          closeOnClick={false}
          className="p-0 w-72"
          offset={32}
        >
          <div
            onMouseEnter={() => {
              if (!isTouchDevice()) clearHoverTimeout();
            }}
            onMouseLeave={() => {
              if (!isTouchDevice()) {
                hoverTimeout.current = setTimeout(
                  () => setShowPopup(false),
                  200
                );
              }
            }}
          >
            <div className="flex items-start gap-3 p-3">
              {business.logoUrl ? (
                <img
                  className="shrink-0 rounded-full self-start size-10 object-cover"
                  src={business.logoUrl}
                  alt={business.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="shrink-0 rounded-full size-10 bg-muted border border-border flex items-center justify-center self-start">
                  <span className="text-xs font-medium text-muted-foreground">
                    {business.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight text-foreground">
                  {business.name}
                </p>
                {business.industryName && (
                  <p className="text-xs text-primary">
                    {business.industryName}
                  </p>
                )}
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {business.description}
                </p>
              </div>
            </div>
            <div className="border-t px-3 py-2">
              <Button size="sm" className="w-full h-8" asChild>
                <a href={`/b/${business._id}`}>
                  View vouchers
                  <ExternalLink className="size-3.5 ml-1.5" />
                </a>
              </Button>
            </div>
          </div>
        </MapPopup>
      )}
    </>
  );
}

export function MapInner({
  businesses,
  scrollWheelZoom,
}: {
  businesses: Business[];
  scrollWheelZoom: boolean;
}) {
  const center: [number, number] = [-0.1435, 50.8236]; // [lng, lat] for MapLibre

  return (
    <div className="absolute inset-0">
      <MapCN
        center={center}
        zoom={15}
        theme="dark"
        scrollZoom={scrollWheelZoom}
      >
        {businesses.map((business) => (
          <BusinessMarker key={business._id} business={business} />
        ))}
      </MapCN>
    </div>
  );
}
