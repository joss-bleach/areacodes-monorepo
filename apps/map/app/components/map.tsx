import { useEffect, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useExploreFilters } from "~/hooks/use-explore-filters";
import { BoundaryAlert } from "./boundary-alert";
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

type MapInnerComponent = React.ComponentType<{
  businesses: Business[];
  scrollWheelZoom: boolean;
}>;

export const Map = ({
  scrollWheelZoom = true,
}: {
  scrollWheelZoom?: boolean;
}) => {
  const { industryId } = useExploreFilters();
  const [MapInner, setMapInner] = useState<MapInnerComponent | null>(null);

  const businesses = useQuery(
    api.functions.explore.getBusinessesWithVouchers,
    industryId ? { industryId: industryId as Id<"industries"> } : {}
  );

  // Dynamic import ensures maplibre-gl never loads during SSR.
  // useEffect only runs on the client, so this is safe.
  useEffect(() => {
    import("./map-inner").then((mod) => {
      setMapInner(() => mod.MapInner);
    });
  }, []);

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
      industryName: b.industry?.name ?? null,
    }));
  }, [businesses]);

  if (businesses === undefined || !MapInner) {
    return <div className="absolute inset-0 bg-muted animate-pulse" />;
  }

  return (
    <MapInner
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
