import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polygon, PROVIDER_DEFAULT } from "react-native-maps";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import BottomSheet from "@gorhom/bottom-sheet";
import Svg, { Path } from "react-native-svg";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { COLORS } from "~/constants/colors";
import { SERVICE_AREA_BOUNDARY, isInServiceArea } from "~/lib/service-area";
import { haversineDistance } from "~/lib/distance";
import { NearbyVouchersContent } from "~/components/map/nearby-vouchers-content";
import { BusinessDetailContent } from "~/components/map/business-detail-content";
import type { MapBusiness, NearbyBusiness, LatestVoucher } from "~/lib/map-types";

const BRIGHTON_HOVE_CENTER = { latitude: 50.8503, longitude: -0.1368 };
const DEFAULT_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };
const NEARBY_RADIUS_METRES = 5_000;

const SERVICE_AREA_COORDS = (SERVICE_AREA_BOUNDARY.geometry.coordinates[0] ?? []).map(
  ([lng, lat]) => ({ latitude: lat as number, longitude: lng as number }),
);


function BusinessMarker({ selected }: { selected: boolean }) {
  return (
    <Svg width={24} height={28} viewBox="0 0 4.02 4.61" opacity={selected ? 1 : 0.4}>
      <Path
        d="M3.43.6h-.01c-.78-.8-2.05-.8-2.83-.01-.39.39-.59.9-.59,1.42s.2,1.03.59,1.42l1.43,1.19,1.42-1.18c.78-.78.78-2.05,0-2.83ZM2.76,2.89c-.19.21-.44.31-.75.31s-.57-.1-.76-.31c-.19-.21-.28-.48-.28-.83s.09-.63.28-.83c.19-.21.44-.31.76-.31s.56.1.75.31c.19.21.28.48.28.83s-.09.62-.28.83Z"
        fill={COLORS.white}
      />
    </Svg>
  );
}

export default function MapScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [90, "72%"], []);

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const rawBusinesses = useQuery(api.functions.explore.getBusinessesWithVouchers, {});
  const businesses = useMemo<MapBusiness[]>(() => rawBusinesses ?? [], [rawBusinesses]);

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  const nearbyBusinesses = useMemo<NearbyBusiness[]>(() => {
    if (!userLocation) return [];
    return businesses
      .map((b) => ({
        ...b,
        distanceMetres: haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          b.latitude,
          b.longitude,
        ),
      }))
      .filter((b) => b.distanceMetres <= NEARBY_RADIUS_METRES)
      .sort((a, b) => a.distanceMetres - b.distanceMetres);
  }, [userLocation, businesses]);

  const latestVouchers = useMemo<LatestVoucher[]>(() =>
    businesses.flatMap((b) =>
      b.vouchers.map((v) => ({
        _id: v._id,
        title: v.title,
        businessName: b.name,
        industryName: b.industry?.name ?? "",
      })),
    ),
  [businesses]);

  const selectedBusiness = useMemo(
    () => businesses.find((b) => b._id === selectedBusinessId) ?? null,
    [selectedBusinessId, businesses],
  );

  const selectedBusinessDistance = useMemo(() => {
    if (!selectedBusiness || !userLocation) return null;
    return haversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      selectedBusiness.latitude,
      selectedBusiness.longitude,
    );
  }, [selectedBusiness, userLocation]);

  const handlePinPress = useCallback((businessId: string) => {
    setSelectedBusinessId(businessId);
    bottomSheetRef.current?.snapToIndex(1);
  }, []);

  const handleBusinessCardPress = useCallback((businessId: string) => {
    setSelectedBusinessId(businessId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedBusinessId(null);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleCloseNearby = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleMapPress = useCallback(() => {
    if (selectedBusinessId !== null) {
      setSelectedBusinessId(null);
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [selectedBusinessId]);

  const isOutsideServiceArea =
    userLocation !== null && !isInServiceArea(userLocation.latitude, userLocation.longitude);

  const hasSelection = selectedBusinessId !== null;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        userInterfaceStyle="dark"
        initialRegion={{ ...BRIGHTON_HOVE_CENTER, ...DEFAULT_DELTA }}
        showsPointsOfInterest={false}
        showsBuildings={false}
        onPress={handleMapPress}
      >
        <Polygon
          coordinates={SERVICE_AREA_COORDS}
          fillColor="rgba(0, 0, 0, 0)"
          strokeColor="rgba(255, 255, 255, 0.5)"
          strokeWidth={1.5}
        />
        {businesses.map((business) => (
          <Marker
            key={business._id}
            coordinate={{ latitude: business.latitude, longitude: business.longitude }}
            onPress={() => handlePinPress(business._id)}
            anchor={{ x: 0.5, y: 1 }}
          >
            <BusinessMarker
              selected={!hasSelection || selectedBusinessId === business._id}
            />
          </Marker>
        ))}
      </MapView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        enablePanDownToClose={false}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        {selectedBusiness ? (
          <BusinessDetailContent
            business={selectedBusiness}
            distanceMetres={selectedBusinessDistance}
            onClose={handleCloseDetail}
          />
        ) : (
          <NearbyVouchersContent
            nearbyBusinesses={nearbyBusinesses}
            latestVouchers={latestVouchers}
            userLocation={userLocation}
            isOutsideServiceArea={isOutsideServiceArea}
            onBusinessPress={handleBusinessCardPress}
            onClose={handleCloseNearby}
          />
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  sheetBackground: { backgroundColor: COLORS.raisedSurface },
  handleIndicator: { backgroundColor: COLORS.handleIndicator },
});
