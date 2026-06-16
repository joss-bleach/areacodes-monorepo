import type { FeatureCollection, Feature, Point } from "geojson";

interface BusinessPinData {
  _id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export function buildBusinessGeoJSON(
  businesses: BusinessPinData[]
): FeatureCollection<Point, { id: string; name: string }> {
  return {
    type: "FeatureCollection",
    features: businesses.map(
      (b): Feature<Point, { id: string; name: string }> => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [b.longitude, b.latitude] },
        properties: { id: b._id, name: b.name },
      })
    ),
  };
}
