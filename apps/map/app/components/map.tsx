import { useEffect, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "@repo/convex";
import { useExploreFilters } from "~/hooks/use-explore-filters";
import { BoundaryAlert } from "./boundary-alert";
import type { Id } from "@repo/convex";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

type Business = {
  _id: Id<"businesses">;
  name: string;
  slug: string;
  description: string;
  latitude: number;
  longitude: number;
  logoUrl: string | null;
};

function MapClickHandler() {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = (e: any) => {
      const target = e.originalEvent?.target;
      if (
        target?.closest(".leaflet-marker-icon") ||
        target?.closest(".leaflet-popup")
      ) {
        return;
      }
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
          href={`/v/${business._id}`}
          className="text-sm text-primary hover:underline inline-block mt-1"
        >
          View vouchers
        </a>
      </div>
    </div>
  );
}

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

  if (!customIcon) return null;

  const position: [number, number] = [business.latitude, business.longitude];

  return (
    <Marker
      position={position}
      icon={customIcon}
      eventHandlers={{
        mouseover: (e) => e.target.openPopup(),
        click: (e) => e.target.openPopup(),
        mouseout: (e) => {
          const marker = e.target;
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
          mouseout: (e) => {
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
    setTimeout(() => setIsReady(true), 500);
  }, []);

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
              <BusinessMarker key={business._id} business={business} />
            ))}
          </>
        )}
      </MapContainer>
    </div>
  );
};

export const Map = ({
  scrollWheelZoom = true,
}: {
  scrollWheelZoom?: boolean;
}) => {
  const { industryId } = useExploreFilters();

  const businesses = useQuery(
    api.functions.explore.getBusinessesWithVouchers,
    industryId ? { industryId: industryId as Id<"industries"> } : {}
  );

  const uniqueBusinesses = useMemo(() => {
    if (!businesses) return [];
    return businesses.map((b) => ({
      _id: b._id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      latitude: b.latitude,
      longitude: b.longitude,
      logoUrl: b.logoUrl,
    }));
  }, [businesses]);

  if (businesses === undefined) {
    return <div className="absolute inset-0 bg-muted animate-pulse" />;
  }

  return (
    <MapContainerWrapper
      businesses={uniqueBusinesses}
      scrollWheelZoom={scrollWheelZoom}
    />
  );
};

export const MapError = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <BoundaryAlert
        title="Error"
        description="Error loading map. Please try again later."
      />
    </div>
  );
};
