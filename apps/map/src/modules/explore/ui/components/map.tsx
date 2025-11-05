"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "react-error-boundary";
import { useQuery } from "@tanstack/react-query";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useTRPC } from "@/trpc/client";
import { useExploreFilters } from "@/modules/explore/hooks/use-explore-filters";
import { BoundaryAlert } from "@/components/boundary-alert";
import type { Business } from "db";

// Dynamically import MapContainer to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

// Component to handle map clicks and close popups
function MapClickHandler() {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = (e: any) => {
      // Check if click was on a marker or popup
      const target = e.originalEvent?.target;
      if (
        target?.closest(".leaflet-marker-icon") ||
        target?.closest(".leaflet-popup")
      ) {
        return;
      }
      // Close all popups
      map.eachLayer((layer: any) => {
        if (layer.getPopup && layer.isPopupOpen && layer.isPopupOpen()) {
          layer.closePopup();
        }
      });
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [map]);

  return null;
}

// Component to update scrollWheelZoom dynamically
function MapScrollHandler({ scrollWheelZoom }: { scrollWheelZoom: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (scrollWheelZoom) {
      map.scrollWheelZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
    }
  }, [map, scrollWheelZoom]);

  return null;
}

// Business popup content component - matches comp-363.tsx structure exactly
function BusinessPopupContent({ business }: { business: Business }) {
  return (
    <div className="flex items-start gap-3">
      {business.logoUrl ? (
        <img
          className="shrink-0 rounded-full self-start mt-2"
          src={business.logoUrl}
          width={40}
          height={40}
          alt={business.name}
          onError={(e) => {
            // Hide image if it fails to load
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="shrink-0 rounded-full w-10 h-10 bg-muted border border-border flex items-center justify-center self-start mt-2">
          <span className="text-xs font-medium text-muted-foreground">
            {business.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="space-y-1 flex-1">
        <p className="text-sm font-medium leading-tight">{business.name}</p>
        <p className="text-sm text-muted-foreground">{business.description}</p>
        <a
          href={`/b/${business.slug}`}
          className="text-sm text-primary hover:underline inline-block mt-1"
        >
          View business
        </a>
      </div>
    </div>
  );
}

// Business marker component
function BusinessMarker({ business }: { business: Business }) {
  const [customIcon, setCustomIcon] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        const icon = L.default.icon({
          iconUrl: "/marker.svg",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });
        setCustomIcon(icon);
      });
    }
  }, []);

  if (!customIcon) {
    return null;
  }

  const position: [number, number] = [business.latitude, business.longitude];

  return (
    <Marker
      position={position}
      icon={customIcon}
      eventHandlers={{
        mouseover: (e) => {
          const marker = e.target;
          marker.openPopup();
        },
        click: (e) => {
          const marker = e.target;
          marker.openPopup();
        },
        mouseout: (e) => {
          const marker = e.target;
          // Close popup when mouse leaves marker
          setTimeout(() => {
            const popup = marker.getPopup();
            if (popup && !popup.getElement()?.matches(":hover")) {
              marker.closePopup();
            }
          }, 100);
        },
      }}
    >
      <Popup
        className="custom-popup"
        closeButton={false}
        autoPan={false}
        maxWidth={340}
        closeOnClick={false}
        closeOnEscapeKey={true}
        eventHandlers={{
          mouseover: () => {
            // Keep popup open when hovering over it
          },
          mouseout: (e) => {
            // Close popup when mouse leaves popup area
            const popup = e.target;
            setTimeout(() => {
              if (!popup.getElement()?.matches(":hover")) {
                popup.close();
              }
            }, 100);
          },
        }}
      >
        <BusinessPopupContent business={business} />
      </Popup>
    </Marker>
  );
}

// Stable map container component that doesn't recreate on data changes
const MapContainerWrapper = ({
  businesses,
  scrollWheelZoom,
}: {
  businesses: Business[];
  scrollWheelZoom: boolean;
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsMounted(true);

    // Fix Leaflet default icon paths
    import("leaflet").then((L) => {
      delete (L.default.Icon.Default.prototype as any)._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    });

    setTimeout(() => {
      setIsReady(true);
    }, 500);
  }, []);

  // Default to Brighton, England coordinates (50°49'25.0"N 0°08'36.7"W)
  const center: [number, number] = [50.8236, -0.1435];
  const zoom = 15;

  if (!isMounted) {
    return <div className="absolute inset-0 bg-muted animate-pulse" />;
  }

  return (
    <div className="absolute inset-0">
      <MapContainer
        key="map-container"
        center={center}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full z-0"
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        {isReady && (
          <>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapClickHandler />
            <MapScrollHandler scrollWheelZoom={scrollWheelZoom} />
            {businesses.map((business) => (
              <BusinessMarker key={business.id} business={business} />
            ))}
          </>
        )}
      </MapContainer>
    </div>
  );
};

const MapSuspense = ({
  scrollWheelZoom = true,
}: {
  scrollWheelZoom?: boolean;
}) => {
  const trpc = useTRPC();
  const { industryId } = useExploreFilters();

  const { data: businessesWithVouchers } = useQuery({
    ...trpc.explore.getBusinessesWithVouchers.queryOptions(
      industryId ? { industryId } : undefined
    ),
    enabled: typeof window !== "undefined",
  });

  // Extract unique businesses (one marker per business)
  const uniqueBusinesses = useMemo(() => {
    if (!businessesWithVouchers) return [];
    const seen = new Set<string>();
    return businessesWithVouchers
      .map((item) => item.business)
      .filter((business) => {
        if (seen.has(business.id)) {
          return false;
        }
        seen.add(business.id);
        return true;
      });
  }, [businessesWithVouchers]);

  // Always render MapContainerWrapper to prevent recreation
  // Pass empty array if no data yet
  return (
    <MapContainerWrapper
      businesses={uniqueBusinesses}
      scrollWheelZoom={scrollWheelZoom}
    />
  );
};

const MapLoading = () => {
  return <div className="absolute inset-0 bg-muted animate-pulse" />;
};

const MapError = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <BoundaryAlert
        title="Error"
        description="Error loading map. Please try again later."
      />
    </div>
  );
};

export const Map = ({
  scrollWheelZoom = true,
}: {
  scrollWheelZoom?: boolean;
}) => {
  return (
    <ErrorBoundary fallback={<MapError />}>
      <MapSuspense scrollWheelZoom={scrollWheelZoom} />
    </ErrorBoundary>
  );
};
