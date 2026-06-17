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
      <Text
        className="text-gray-500 text-xs uppercase tracking-wide"
        numberOfLines={1}
      >
        {industryName} · {distanceLabel}
      </Text>
    </Pressable>
  );
}
