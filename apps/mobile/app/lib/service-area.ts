import type { Feature, Polygon } from "geojson";

// Simplified polygon of the Brighton & Hove unitary authority boundary.
// Coordinates are [longitude, latitude] pairs, clockwise from the SW coast.
export const SERVICE_AREA_BOUNDARY: Feature<Polygon> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-0.2470, 50.8190], // SW coast — Fishersgate/Southwick boundary
        [-0.2470, 50.8490], // W — Portslade-by-Sea
        [-0.2340, 50.8660], // NW — north Portslade
        [-0.2140, 50.8780], // N — Hangleton
        [-0.1940, 50.8900], // N — Hove Park / Withdean
        [-0.1640, 50.9010], // N — Patcham
        [-0.1370, 50.9050], // N — between Patcham and Brighton
        [-0.1080, 50.9000], // N — Hollingbury / Coldean
        [-0.0830, 50.8840], // NE — near Falmer
        [-0.0570, 50.8760], // NE — Woodingdean
        [-0.0340, 50.8620], // E — Ovingdean / Rottingdean border
        [-0.0220, 50.8440], // E — Saltdean
        [-0.0220, 50.7970], // SE coast — Rottingdean
        [-0.2470, 50.7970], // SW coast — Fishersgate (west)
        [-0.2470, 50.8190], // Close polygon
      ],
    ],
  },
};
