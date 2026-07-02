import { Text, View } from "react-native";
import type { ViewStyle } from "react-native";

interface StampTextProps {
  children: string;
  size?: "sm" | "md" | "lg" | "xl";
  style?: ViewStyle;
}

const SIZES = {
  sm: { fontSize: 13, lineHeight: 14, px: 6, py: 2, letterSpacing: -0.2 },
  md: { fontSize: 18, lineHeight: 20, px: 8, py: 3, letterSpacing: -0.3 },
  lg: { fontSize: 24, lineHeight: 26, px: 10, py: 4, letterSpacing: -0.4 },
  xl: { fontSize: 30, lineHeight: 32, px: 12, py: 5, letterSpacing: -0.5 },
};

// Stamp chip: Paper White fill on dark surfaces, Pressroom Black text.
// The signature brand motif — a sharp-edged filled block, never rounded.
export function StampText({ children, size = "md", style }: StampTextProps) {
  const s = SIZES[size];
  return (
    <View
      style={[
        {
          backgroundColor: "#F9F9F9",
          alignSelf: "flex-start",
          paddingHorizontal: s.px,
          paddingVertical: s.py,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: "#000000",
          fontFamily: "Poppins_700Bold",
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          letterSpacing: s.letterSpacing,
          textTransform: "uppercase",
        }}
      >
        {children}
      </Text>
    </View>
  );
}
