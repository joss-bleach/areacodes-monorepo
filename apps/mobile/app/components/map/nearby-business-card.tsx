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
    <Pressable
      onPress={onPress}
      className="mr-3 w-44"
      accessibilityLabel={`${name} - ${voucherTitle} - ${industryName}, ${distanceLabel} away`}
      accessibilityRole="button"
      accessibilityHint="Double tap to view business details"
    >
      <View className="w-full aspect-square bg-gray-800 overflow-hidden mb-2">
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            className="w-full h-full"
            resizeMode="cover"
            accessibilityElementsHidden
          />
        ) : (
          <View className="w-full h-full bg-gray-700" accessibilityElementsHidden />
        )}
      </View>
      <Text
        className="text-white font-poppins-semibold text-lg leading-tight mb-0.5"
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text className="text-gray-400 text-base mb-0.5" numberOfLines={1}>
        {voucherTitle}
      </Text>
      <Text
        className="text-gray-400 text-sm uppercase tracking-wide"
        numberOfLines={1}
      >
        {industryName} · {distanceLabel}
      </Text>
    </Pressable>
  );
}
