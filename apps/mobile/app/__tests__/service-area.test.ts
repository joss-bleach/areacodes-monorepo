import { describe, it, expect } from "vitest";
import { SERVICE_AREA_BOUNDARY } from "../lib/service-area";

const BRIGHTON_HOVE_BOUNDS = {
  minLng: -0.26,
  maxLng: -0.01,
  minLat: 50.78,
  maxLat: 50.92,
};

describe("service area boundary", () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const coords = SERVICE_AREA_BOUNDARY.geometry.coordinates[0]!;

  it("is a GeoJSON Feature", () => {
    expect(SERVICE_AREA_BOUNDARY.type).toBe("Feature");
  });

  it("has a Polygon geometry", () => {
    expect(SERVICE_AREA_BOUNDARY.geometry.type).toBe("Polygon");
  });

  it("is a closed polygon (first and last coordinate identical)", () => {
    expect(coords[0]).toEqual(coords[coords.length - 1]);
  });

  it("has at least 4 coordinate pairs (minimum valid polygon)", () => {
    expect(coords.length).toBeGreaterThanOrEqual(4);
  });

  it("has all coordinates within Brighton & Hove bounds", () => {
    for (const [lng, lat] of coords) {
      expect(lng).toBeGreaterThan(BRIGHTON_HOVE_BOUNDS.minLng);
      expect(lng).toBeLessThan(BRIGHTON_HOVE_BOUNDS.maxLng);
      expect(lat).toBeGreaterThan(BRIGHTON_HOVE_BOUNDS.minLat);
      expect(lat).toBeLessThan(BRIGHTON_HOVE_BOUNDS.maxLat);
    }
  });
});
