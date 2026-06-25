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
      className="bg-zinc-800 px-4 py-3 mb-2 rounded-lg"
    >
      <Text
        className="text-white text-lg font-poppins-medium mb-0.5"
        numberOfLines={1}
      >
        {voucherTitle}
      </Text>
      <Text
        className="text-gray-500 text-base uppercase tracking-wide"
        numberOfLines={1}
      >
        {businessName} | {industryName}
      </Text>
    </Pressable>
  );
}
