import { StyleSheet, View } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { SERVICE_AREA_BOUNDARY } from "~/lib/service-area";
import { buildBusinessGeoJSON } from "~/lib/business-pins";

MapLibreGL.setAccessToken(null);

// Matches the dark-matter style used by the web map app at map.acbrighton.com
const MAP_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Geographic center of Brighton & Hove [longitude, latitude]
const BRIGHTON_HOVE_CENTER: [number, number] = [-0.1368, 50.8503];
const DEFAULT_ZOOM = 11.5;

export default function MapScreen() {
  const router = useRouter();
  const businesses = useQuery(api.functions.explore.getBusinessesWithVouchers, {});

  const businessGeoJSON = buildBusinessGeoJSON(businesses ?? []);

  function handlePinPress(e: { features: Array<{ properties?: Record<string, unknown> | null }> }) {
    const feature = e.features[0];
    const id = feature?.properties?.id;
    if (typeof id === "string") {
      router.push(`/business/${id}`);
    }
  }

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={styles.map}
        mapStyle={MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapLibreGL.Camera
          zoomLevel={DEFAULT_ZOOM}
          centerCoordinate={BRIGHTON_HOVE_CENTER}
          animationMode="moveTo"
        />

        <MapLibreGL.ShapeSource
          id="service-area"
          shape={SERVICE_AREA_BOUNDARY}
        >
          <MapLibreGL.FillLayer
            id="service-area-fill"
            style={{
              fillColor: "rgba(255, 255, 255, 0.06)",
              fillOutlineColor: "rgba(255, 255, 255, 0)",
            }}
          />
          <MapLibreGL.LineLayer
            id="service-area-line"
            style={{
              lineColor: "#ffffff",
              lineWidth: 2,
              lineOpacity: 0.65,
            }}
          />
        </MapLibreGL.ShapeSource>

        {businesses !== undefined && businesses.length > 0 && (
          <MapLibreGL.ShapeSource
            id="businesses"
            shape={businessGeoJSON}
            onPress={handlePinPress}
          >
            <MapLibreGL.CircleLayer
              id="business-pins"
              style={{
                circleRadius: 8,
                circleColor: "#ffffff",
                circleStrokeColor: "#000000",
                circleStrokeWidth: 2,
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
