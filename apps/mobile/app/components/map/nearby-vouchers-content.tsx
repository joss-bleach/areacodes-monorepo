import { FlatList, Pressable, Text, View } from "react-native";
import { BottomSheetScrollView, useBottomSheet } from "@gorhom/bottom-sheet";
import Animated, { useAnimatedStyle, interpolate } from "react-native-reanimated";
import { NearbyBusinessCard } from "./nearby-business-card";
import { LatestOfferRow } from "./latest-offer-row";
import { StampText } from "../stamp-text";
import { formatDistance } from "~/lib/distance";
import type { NearbyBusiness, LatestVoucher } from "~/lib/map-types";
import { useVoucherSheet } from "../../lib/voucher-sheet-context";

interface NearbyVouchersContentProps {
  nearbyBusinesses: NearbyBusiness[];
  latestVouchers: LatestVoucher[];
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
  const { animatedIndex } = useBottomSheet();
  const closeButtonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [0, 0.5], [0, 1], "clamp"),
  }));
  return (
    <BottomSheetScrollView>
      <View className="flex-row items-center justify-between px-4 pb-4">
        <StampText size="lg">Nearby vouchers</StampText>
        <Animated.View style={closeButtonStyle}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text className="text-white text-2xl leading-none">×</Text>
          </Pressable>
        </Animated.View>
      </View>

      {isOutsideServiceArea ? (
        <Text className="text-gray-400 text-sm px-4 pb-4">
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
        <Text className="text-gray-400 text-sm px-4 pb-4">
          Enable location to see nearby vouchers
        </Text>
      ) : null}

      <Text className="text-white text-xl font-poppins-semibold px-4 pb-3">
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
