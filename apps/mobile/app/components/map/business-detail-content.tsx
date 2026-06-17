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

      <Text className="text-gray-500 text-xs uppercase tracking-wide px-4 mb-2">
        About
      </Text>
      <Text className="text-white text-sm px-4 mb-6 leading-relaxed">
        {business.description}
      </Text>

      <Text className="text-white text-lg font-poppins-semibold px-4 mb-3">
        Active vouchers
      </Text>
      {business.vouchers.map((voucher) => (
        <View key={voucher._id} className="bg-gray-900 rounded-lg mx-4 mb-3 p-4">
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
