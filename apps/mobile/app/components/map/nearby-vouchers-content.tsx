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
      <View className="flex-row items-center justify-between px-4 pb-3">
        <Text className="text-white text-xl font-poppins-bold">Nearby vouchers</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text className="text-white text-2xl leading-none">×</Text>
        </Pressable>
      </View>

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

      <Text className="text-white text-lg font-poppins-semibold px-4 pb-3">
        Latest offers
      </Text>
      {latestVouchers.map((voucher) => (
        <View key={voucher._id} className="px-4">
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
