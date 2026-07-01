import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { StampText } from "./stamp-text";

function MapArrowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ScreenHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      className="bg-black flex-row items-center px-4 pb-4"
      style={{ paddingTop: insets.top + 8 }}
    >
      <Pressable
        onPress={() => router.navigate("/(tabs)")}
        className="mr-4 p-1"
        hitSlop={12}
        accessibilityLabel="Back to map"
        accessibilityRole="button"
      >
        <MapArrowIcon />
      </Pressable>
      <StampText size="md">{title}</StampText>
    </View>
  );
}
