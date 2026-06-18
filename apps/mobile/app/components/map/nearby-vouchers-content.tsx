import { FlatList, Pressable, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { NearbyBusinessCard } from "./nearby-business-card";
import { LatestOfferRow } from "./latest-offer-row";
import { formatDistance } from "~/lib/distance";
import type { MOCK_BUSINESSES, MOCK_LATEST_VOUCHERS } from "~/lib/mock-map-data";
import { useVoucherSheet } from "../../lib/voucher-sheet-context";

interface NearbyVouchersContentProps {
  nearbyBusinesses: Array<(typeof MOCK_BUSINESSES)[number] & { distanceMetres: number }>;
  latestVouchers: typeof MOCK_LATEST_VOUCHERS;
  userLocation: { latitude: number; longitude: number } | null;
  isOutsideServiceArea: boolean;
  onBusinessPress: (businessId: string) => void;
  onClose: () => void;
}

export function NearbyVouchersContent({
  nearbyBusinesses,
  latestVouchers,
  userLocation,
  isOutsideServiceArea,
  onBusinessPress,
  onClose,
}: NearbyVouchersContentProps) {
  const { openClaim } = useVoucherSheet();
  return (
    <BottomSheetScrollView>
      <View className="flex-row items-center justify-between px-4 pb-3">
        <Text className="text-white text-xl font-poppins-bold">Nearby vouchers</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text className="text-white text-2xl leading-none">×</Text>
        </Pressable>
      </View>

      {isOutsideServiceArea ? (
        <Text className="text-gray-500 text-xs px-4 pb-4">
          Areacodes currently only serves Brighton & Hove
        </Text>
      ) : userLocation && nearbyBusinesses.length > 0 ? (
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
      ) : !userLocation ? (
        <Text className="text-gray-500 text-xs px-4 pb-4">
          Enable location to see nearby vouchers
        </Text>
      ) : null}

      <Text className="text-white text-lg font-poppins-semibold px-4 pb-3">
        Latest offers
      </Text>
      {latestVouchers.map((voucher) => (
        <View key={voucher._id} className="px-4">
          <LatestOfferRow
            voucherTitle={voucher.title}
            businessName={voucher.businessName}
            industryName={voucher.industryName}
            onPress={() => openClaim(voucher._id)}
          />
        </View>
      ))}
    </BottomSheetScrollView>
  );
}
