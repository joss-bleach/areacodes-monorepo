# Mobile Map — Bottom Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare map screen with a draggable bottom sheet that shows nearby businesses and latest vouchers, swapping to a business detail view when a pin or card is tapped.

**Architecture:** A `BottomSheet` (two snap points: peek / expanded) lives on top of the `MapView`. The sheet renders either `NearbyVouchersContent` or `BusinessDetailContent` based on `selectedBusinessId` state held in the map screen. All content uses mock data; the query hookup is a later task.

**Tech Stack:** `@gorhom/bottom-sheet@^5`, `react-native-gesture-handler`, `expo-location`, `react-native-reanimated` (already installed), NativeWind for styling.

## Global Constraints

- All UI uses NativeWind (`className`) — no inline styles except `StyleSheet` for map/sheet config that NativeWind can't target.
- Fonts: `font-poppins-bold`, `font-poppins-semibold`, `font-poppins-medium` are the available weight classes.
- Dark theme throughout — background `#111111`, cards `bg-gray-900`, text `text-white` / `text-gray-400` / `text-gray-500`.
- Mock data lives in `apps/mobile/app/lib/mock-map-data.ts` (already created). All tasks read from it; do not modify it.
- Business "nearby" radius: 5 000 m.
- Bottom sheet peek height: 90 dp. Expanded: `"72%"`.
- The sheet can never be fully dismissed (`enablePanDownToClose={false}`).
- Pin selected state: selected pin at full opacity, all others at `opacity={0.4}`. When nothing is selected all pins are full opacity.

---

## File Map

| Path | Action | Responsibility |
|---|---|---|
| `apps/mobile/package.json` | Modify | Add new deps |
| `apps/mobile/app.config.js` | Modify | Add `expo-location` plugin with usage string |
| `apps/mobile/app/_layout.tsx` | Modify | Wrap root in `GestureHandlerRootView` |
| `apps/mobile/app/lib/distance.ts` | Create | Haversine formula + distance formatter |
| `apps/mobile/app/components/map/nearby-business-card.tsx` | Create | Horizontal strip card |
| `apps/mobile/app/components/map/latest-offer-row.tsx` | Create | Text-only list item for Latest offers |
| `apps/mobile/app/components/map/nearby-vouchers-content.tsx` | Create | Sheet content: nearby strip + latest offers list |
| `apps/mobile/app/components/map/business-detail-content.tsx` | Create | Sheet content: single business read-only detail |
| `apps/mobile/app/(tabs)/index.tsx` | Rewrite | Map screen orchestrator: location, pins, sheet state |
| `apps/mobile/app/components/icons/MapTabIcon.tsx` | Create | Brand SVG icon for Map tab |
| `apps/mobile/app/components/icons/WalletTabIcon.tsx` | Create | Brand SVG icon for Wallet tab |
| `apps/mobile/app/components/icons/AccountTabIcon.tsx` | Create | Brand SVG icon for Account tab |
| `apps/mobile/app/(tabs)/_layout.tsx` | Modify | Wire brand icons into tab bar |

---

### Task 1: Install dependencies and wire GestureHandlerRootView

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.config.js`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Produces: `GestureHandlerRootView` wrapping the entire app; `expo-location` and `@gorhom/bottom-sheet` importable in subsequent tasks.

> ⚠️ Adding `expo-location` is a native module. It requires a **dev client rebuild** (`eas build --profile development`) before it will work on device. Run `npx expo install expo-location` to get the Expo-compatible version rather than a raw `bun add`.

- [ ] **Step 1: Install packages**

Run from the monorepo root:
```bash
cd apps/mobile
npx expo install expo-location
bun add @gorhom/bottom-sheet react-native-gesture-handler
```

Expected: packages appear in `apps/mobile/package.json` under `dependencies`.

- [ ] **Step 2: Add expo-location config plugin to app.config.js**

Find the `plugins` array in `apps/mobile/app.config.js`. It currently is empty (`plugins: [`). Add:

```js
plugins: [
  [
    "expo-location",
    {
      locationWhenInUsePermission: "Areacodes uses your location to show nearby vouchers.",
    },
  ],
],
```

- [ ] **Step 3: Wrap root layout with GestureHandlerRootView**

In `apps/mobile/app/_layout.tsx`, add the import at the top:

```tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";
```

Then wrap the outermost return value. The current return is:

```tsx
return (
  <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
    <AppProviders>
      ...
    </AppProviders>
  </ConvexProviderWithAuth>
);
```

Change it to:

```tsx
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
      <AppProviders>
        ...
      </AppProviders>
    </ConvexProviderWithAuth>
  </GestureHandlerRootView>
);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/mobile
bun run check-types
```

Expected: no new errors (there may be pre-existing ones unrelated to this task).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.config.js apps/mobile/app/_layout.tsx bun.lock
git commit -m "feat(mobile): install bottom-sheet + location deps, add GestureHandlerRootView"
```

---

### Task 2: Distance utility and NearbyBusinessCard

**Files:**
- Create: `apps/mobile/app/lib/distance.ts`
- Create: `apps/mobile/app/components/map/nearby-business-card.tsx`

**Interfaces:**
- Produces:
  - `haversineDistance(lat1, lon1, lat2, lon2): number` — returns metres
  - `formatDistance(metres: number): string` — e.g. `"212m"` or `"1.4km"`
  - `NearbyBusinessCard` component

- [ ] **Step 1: Create distance.ts**

```typescript
// apps/mobile/app/lib/distance.ts

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)}m`;
  return `${(metres / 1000).toFixed(1)}km`;
}
```

- [ ] **Step 2: Create NearbyBusinessCard**

```tsx
// apps/mobile/app/components/map/nearby-business-card.tsx
import { Image, Pressable, Text, View } from "react-native";

interface NearbyBusinessCardProps {
  name: string;
  logoUrl: string | null;
  voucherTitle: string;
  industryName: string;
  distanceLabel: string;
  onPress: () => void;
}

export function NearbyBusinessCard({
  name,
  logoUrl,
  voucherTitle,
  industryName,
  distanceLabel,
  onPress,
}: NearbyBusinessCardProps) {
  return (
    <Pressable onPress={onPress} className="mr-3 w-44">
      <View className="w-full aspect-square bg-gray-800 rounded-lg overflow-hidden mb-2">
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-gray-700" />
        )}
      </View>
      <Text
        className="text-white font-poppins-semibold text-sm leading-tight mb-0.5"
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text className="text-gray-400 text-xs mb-0.5" numberOfLines={1}>
        {voucherTitle}
      </Text>
      <Text className="text-gray-500 text-xs uppercase tracking-wide" numberOfLines={1}>
        {industryName} · {distanceLabel}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/mobile && bun run check-types
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/lib/distance.ts apps/mobile/app/components/map/nearby-business-card.tsx
git commit -m "feat(mobile): add haversine distance util and NearbyBusinessCard"
```

---

### Task 3: LatestOfferRow and NearbyVouchersContent

**Files:**
- Create: `apps/mobile/app/components/map/latest-offer-row.tsx`
- Create: `apps/mobile/app/components/map/nearby-vouchers-content.tsx`

**Interfaces:**
- Consumes:
  - `NearbyBusinessCard` from Task 2
  - `formatDistance` from Task 2
  - `MOCK_BUSINESSES` and `MOCK_LATEST_VOUCHERS` types from `~/lib/mock-map-data`
- Produces:
  - `LatestOfferRow` component
  - `NearbyVouchersContent` component with props:
    ```typescript
    interface NearbyVouchersContentProps {
      nearbyBusinesses: Array<(typeof MOCK_BUSINESSES)[number] & { distanceMetres: number }>;
      latestVouchers: typeof MOCK_LATEST_VOUCHERS;
      userLocation: { latitude: number; longitude: number } | null;
      onBusinessPress: (businessId: string) => void;
      onClose: () => void;
    }
    ```

- [ ] **Step 1: Create LatestOfferRow**

```tsx
// apps/mobile/app/components/map/latest-offer-row.tsx
import { Pressable, Text } from "react-native";

interface LatestOfferRowProps {
  voucherTitle: string;
  businessName: string;
  industryName: string;
  onPress: () => void;
}

export function LatestOfferRow({
  voucherTitle,
  businessName,
  industryName,
  onPress,
}: LatestOfferRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-gray-900 px-4 py-3 mb-2 rounded-lg"
    >
      <Text
        className="text-white text-sm font-poppins-medium mb-0.5"
        numberOfLines={1}
      >
        {voucherTitle}
      </Text>
      <Text className="text-gray-500 text-xs uppercase tracking-wide" numberOfLines={1}>
        {businessName} | {industryName}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Create NearbyVouchersContent**

```tsx
// apps/mobile/app/components/map/nearby-vouchers-content.tsx
import { FlatList, Pressable, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { NearbyBusinessCard } from "./nearby-business-card";
import { LatestOfferRow } from "./latest-offer-row";
import { formatDistance } from "~/lib/distance";
import type { MOCK_BUSINESSES, MOCK_LATEST_VOUCHERS } from "~/lib/mock-map-data";

interface NearbyVouchersContentProps {
  nearbyBusinesses: Array<(typeof MOCK_BUSINESSES)[number] & { distanceMetres: number }>;
  latestVouchers: typeof MOCK_LATEST_VOUCHERS;
  userLocation: { latitude: number; longitude: number } | null;
  onBusinessPress: (businessId: string) => void;
  onClose: () => void;
}

export function NearbyVouchersContent({
  nearbyBusinesses,
  latestVouchers,
  userLocation,
  onBusinessPress,
  onClose,
}: NearbyVouchersContentProps) {
  return (
    <BottomSheetScrollView>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-3">
        <Text className="text-white text-xl font-poppins-bold">Nearby vouchers</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text className="text-white text-2xl leading-none">×</Text>
        </Pressable>
      </View>

      {/* Nearby strip */}
      {userLocation && nearbyBusinesses.length > 0 && (
        <FlatList
          horizontal
          data={nearbyBusinesses}
          keyExtractor={(b) => b._id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <NearbyBusinessCard
              name={item.name}
              logoUrl={item.logoUrl}
              voucherTitle={item.vouchers[0]?.title ?? ""}
              industryName={item.industry?.name ?? ""}
              distanceLabel={formatDistance(item.distanceMetres)}
              onPress={() => onBusinessPress(item._id)}
            />
          )}
        />
      )}

      {!userLocation && (
        <Text className="text-gray-500 text-xs px-4 pb-4">
          Enable location to see nearby vouchers
        </Text>
      )}

      {/* Latest offers */}
      <Text className="text-white text-lg font-poppins-semibold px-4 pb-3">
        Latest offers
      </Text>
      {latestVouchers.map((voucher) => (
        <View key={voucher._id} className="px-4 mb-2">
          <LatestOfferRow
            voucherTitle={voucher.title}
            businessName={voucher.businessName}
            industryName={voucher.industryName}
            onPress={() => {
              // TBD: navigate to voucher — pending voucher UI decisions
            }}
          />
        </View>
      ))}
    </BottomSheetScrollView>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/mobile && bun run check-types
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/components/map/latest-offer-row.tsx apps/mobile/app/components/map/nearby-vouchers-content.tsx
git commit -m "feat(mobile): add LatestOfferRow and NearbyVouchersContent sheet components"
```

---

### Task 4: BusinessDetailContent

**Files:**
- Create: `apps/mobile/app/components/map/business-detail-content.tsx`

**Interfaces:**
- Consumes: `formatDistance` from Task 2; `MOCK_BUSINESSES` type from `~/lib/mock-map-data`
- Produces:
  ```typescript
  interface BusinessDetailContentProps {
    business: (typeof MOCK_BUSINESSES)[number];
    distanceMetres: number | null;
    onClose: () => void;
  }
  ```

- [ ] **Step 1: Create BusinessDetailContent**

```tsx
// apps/mobile/app/components/map/business-detail-content.tsx
import { Pressable, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { formatDistance } from "~/lib/distance";
import type { MOCK_BUSINESSES } from "~/lib/mock-map-data";

interface BusinessDetailContentProps {
  business: (typeof MOCK_BUSINESSES)[number];
  distanceMetres: number | null;
  onClose: () => void;
}

export function BusinessDetailContent({
  business,
  distanceMetres,
  onClose,
}: BusinessDetailContentProps) {
  return (
    <BottomSheetScrollView>
      {/* Header */}
      <View className="flex-row items-start justify-between px-4 pb-3">
        <View className="flex-1 mr-4">
          <Text className="text-white text-xl font-poppins-bold leading-tight">
            {business.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-gray-400 text-xs uppercase tracking-wide">
              {business.industry?.name ?? ""}
            </Text>
            {distanceMetres !== null && (
              <Text className="text-gray-400 text-xs">
                {" "}· {formatDistance(distanceMetres)}
              </Text>
            )}
          </View>
        </View>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text className="text-white text-2xl leading-none">×</Text>
        </Pressable>
      </View>

      <View className="border-b border-gray-800 mx-4 mb-4" />

      {/* About */}
      <Text className="text-gray-500 text-xs uppercase tracking-wide px-4 mb-2">
        About
      </Text>
      <Text className="text-white text-sm px-4 mb-6 leading-relaxed">
        {business.description}
      </Text>

      {/* Active vouchers */}
      <Text className="text-white text-lg font-poppins-semibold px-4 mb-3">
        Active vouchers
      </Text>
      {business.vouchers.map((voucher) => (
        <View
          key={voucher._id}
          className="bg-gray-900 rounded-lg mx-4 mb-3 p-4"
        >
          <Text className="text-white font-poppins-semibold text-sm mb-1">
            {voucher.title}
          </Text>
          <Text className="text-gray-400 text-xs mb-2 leading-relaxed">
            {voucher.description}
          </Text>
          <Text className="text-gray-500 text-xs">
            Until{" "}
            {new Date(voucher.voucherValidTo).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
      ))}
    </BottomSheetScrollView>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/mobile && bun run check-types
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/components/map/business-detail-content.tsx
git commit -m "feat(mobile): add BusinessDetailContent sheet component"
```

---

### Task 5: Rewrite MapScreen — location, pins, bottom sheet orchestration

**Files:**
- Rewrite: `apps/mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: all components from Tasks 2–4; `haversineDistance` from Task 2; `MOCK_BUSINESSES`, `MOCK_LATEST_VOUCHERS` from `~/lib/mock-map-data`.
- Produces: the complete interactive map screen.

**Key behaviours:**
- Location permission requested on mount via `Location.requestForegroundPermissionsAsync()`.
- `nearbyBusinesses` = mock businesses within 5 000 m of user, sorted by distance ascending, each augmented with `distanceMetres`.
- `selectedBusinessId` drives both pin opacity and sheet content.
- Pin press → `setSelectedBusinessId(id)` + `bottomSheetRef.current?.snapToIndex(1)`.
- Card press (in nearby strip) → `setSelectedBusinessId(id)` (sheet already expanded).
- Business detail X → `setSelectedBusinessId(null)` (stays expanded, shows nearby vouchers).
- Nearby vouchers X → `bottomSheetRef.current?.snapToIndex(0)` (collapses to peek).
- When `selectedBusinessId` is null: all pins full opacity. When set: selected pin opacity 1, all others 0.4.

- [ ] **Step 1: Rewrite index.tsx**

Replace the entire file with:

```tsx
// apps/mobile/app/(tabs)/index.tsx
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polygon, PROVIDER_DEFAULT } from "react-native-maps";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import BottomSheet from "@gorhom/bottom-sheet";
import Svg, { Path } from "react-native-svg";
import { SERVICE_AREA_BOUNDARY } from "~/lib/service-area";
import { MOCK_BUSINESSES, MOCK_LATEST_VOUCHERS } from "~/lib/mock-map-data";
import { haversineDistance } from "~/lib/distance";
import { NearbyVouchersContent } from "~/components/map/nearby-vouchers-content";
import { BusinessDetailContent } from "~/components/map/business-detail-content";

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
        fill="#ffffff"
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

  const nearbyBusinesses = useMemo(() => {
    if (!userLocation) return [];
    return MOCK_BUSINESSES.map((b) => ({
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
  }, [userLocation]);

  const selectedBusiness = useMemo(
    () => MOCK_BUSINESSES.find((b) => b._id === selectedBusinessId) ?? null,
    [selectedBusinessId],
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
  }, []);

  const handleCloseNearby = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

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
      >
        <Polygon
          coordinates={SERVICE_AREA_COORDS}
          fillColor="rgba(255, 255, 255, 0.06)"
          strokeColor="rgba(255, 255, 255, 0.65)"
          strokeWidth={2}
        />
        {MOCK_BUSINESSES.map((business) => (
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
            latestVouchers={MOCK_LATEST_VOUCHERS}
            userLocation={userLocation}
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
  sheetBackground: { backgroundColor: "#111111" },
  handleIndicator: { backgroundColor: "#444444" },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/mobile && bun run check-types
```

Expected: no new errors.

- [ ] **Step 3: Start dev server and test on device/simulator**

```bash
cd apps/mobile && npx expo start
```

Verify the following manually:
1. Map screen loads with the bottom sheet peeking at the bottom.
2. Dragging the sheet up expands it — "Nearby vouchers" header + horizontal strip (if location granted) + "Latest offers" list are visible.
3. Dragging down collapses back to peek.
4. Tapping the × in expanded state collapses to peek.
5. Tapping a map pin snaps the sheet to expanded and shows business detail.
6. All non-selected pins dim to ~40% opacity; selected pin stays bright.
7. Tapping × in business detail returns to nearby vouchers content (sheet stays expanded).
8. If location permission is denied: nearby strip is hidden, "Enable location" nudge appears, latest offers still shows.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): rewrite map screen with bottom sheet, location, and mock data"
```

---

### Task 6: Brand SVG tab bar icons

**Files:**
- Create: `apps/mobile/app/components/icons/MapTabIcon.tsx`
- Create: `apps/mobile/app/components/icons/WalletTabIcon.tsx`
- Create: `apps/mobile/app/components/icons/AccountTabIcon.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

**Source SVGs** (read-only, do not modify):
- Map tab: `brand_assets/mobile/ac/icons/location-marker.svg`
- Wallet tab: `brand_assets/mobile/ac/icons/map.svg` (ticket icon)
- Account tab: `brand_assets/mobile/ac/icons/user.svg`

**Interfaces:**
- Each icon component accepts `{ color: string }` — expo-router passes the active/inactive tint colour.
- Produces: three icon components; updated `_layout.tsx` wiring them in.

- [ ] **Step 1: Create MapTabIcon**

```tsx
// apps/mobile/app/components/icons/MapTabIcon.tsx
import Svg, { Path } from "react-native-svg";

export function MapTabIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.6569 16.6569C16.7202 17.5935 14.7616 19.5521 13.4138 20.8999C12.6327 21.681 11.3677 21.6814 10.5866 20.9003C9.26234 19.576 7.34159 17.6553 6.34315 16.6569C3.21895 13.5327 3.21895 8.46734 6.34315 5.34315C9.46734 2.21895 14.5327 2.21895 17.6569 5.34315C20.781 8.46734 20.781 13.5327 17.6569 16.6569Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 11C15 12.6569 13.6569 14 12 14C10.3431 14 9 12.6569 9 11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

- [ ] **Step 2: Create WalletTabIcon**

```tsx
// apps/mobile/app/components/icons/WalletTabIcon.tsx
import Svg, { Path } from "react-native-svg";

export function WalletTabIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={16} viewBox="0 0 20 16" fill="none">
      <Path
        d="M13 1V3M13 7V9M13 13V15M3 1C1.89543 1 1 1.89543 1 3V6C2.10457 6 3 6.89543 3 8C3 9.10457 2.10457 10 1 10V13C1 14.1046 1.89543 15 3 15H17C18.1046 15 19 14.1046 19 13V10C17.8954 10 17 9.10457 17 8C17 6.89543 17.8954 6 19 6V3C19 1.89543 18.1046 1 17 1H3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

- [ ] **Step 3: Create AccountTabIcon**

```tsx
// apps/mobile/app/components/icons/AccountTabIcon.tsx
import Svg, { Path } from "react-native-svg";

export function AccountTabIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

- [ ] **Step 4: Wire icons into tab layout**

Replace `apps/mobile/app/(tabs)/_layout.tsx` with:

```tsx
import { Tabs } from "expo-router";
import { MapTabIcon } from "~/components/icons/MapTabIcon";
import { WalletTabIcon } from "~/components/icons/WalletTabIcon";
import { AccountTabIcon } from "~/components/icons/AccountTabIcon";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#000000" },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#666666",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => <MapTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color }) => <WalletTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => <AccountTabIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd apps/mobile && bun run check-types
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/components/icons/ apps/mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile): replace default tab icons with brand SVGs"
```
