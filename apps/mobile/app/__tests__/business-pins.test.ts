import { describe, it, expect } from "vitest";
import { buildBusinessGeoJSON } from "../lib/business-pins";

const businesses = [
  { _id: "b1", name: "Cafe One", latitude: 50.82, longitude: -0.14 },
  { _id: "b2", name: "Shop Two", latitude: 50.83, longitude: -0.13 },
];

describe("buildBusinessGeoJSON", () => {
  it("returns a FeatureCollection", () => {
    const result = buildBusinessGeoJSON(businesses);
    expect(result.type).toBe("FeatureCollection");
  });

  it("has one Feature per business", () => {
    const result = buildBusinessGeoJSON(businesses);
    expect(result.features).toHaveLength(2);
  });

  it("each Feature has a Point geometry", () => {
    const result = buildBusinessGeoJSON(businesses);
    for (const f of result.features) {
      expect(f.geometry.type).toBe("Point");
    }
  });

  it("coordinates are [longitude, latitude] (GeoJSON order)", () => {
    const result = buildBusinessGeoJSON(businesses);
    const first = result.features[0]!;
    expect(first.geometry.coordinates).toEqual([-0.14, 50.82]);
  });

  it("properties include id and name", () => {
    const result = buildBusinessGeoJSON(businesses);
    const first = result.features[0]!;
    expect(first.properties?.id).toBe("b1");
    expect(first.properties?.name).toBe("Cafe One");
  });

  it("returns an empty FeatureCollection for no businesses", () => {
    const result = buildBusinessGeoJSON([]);
    expect(result.features).toHaveLength(0);
  });
});
