import { Text, View } from "react-native";
import type { ViewStyle } from "react-native";

interface StampTextProps {
  children: string;
  size?: "sm" | "md" | "lg" | "xl";
  style?: ViewStyle;
}

// lineHeight is set well above fontSize so Poppins Bold's cap-height and
// accents never clip against the box edge. paddingTop is set higher than
// paddingBottom to counter RN's extra leading, which lands below the
// baseline rather than being split evenly — without the offset the block
// reads bottom-heavy even though the padding values look symmetric.
const SIZES = {
  sm: { fontSize: 13, lineHeight: 16, px: 6, pt: 4, pb: 2, letterSpacing: -0.2 },
  md: { fontSize: 18, lineHeight: 22, px: 8, pt: 5, pb: 3, letterSpacing: -0.3 },
  lg: { fontSize: 24, lineHeight: 29, px: 10, pt: 6, pb: 3, letterSpacing: -0.4 },
  xl: { fontSize: 30, lineHeight: 36, px: 12, pt: 7, pb: 4, letterSpacing: -0.5 },
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
          paddingTop: s.pt,
          paddingBottom: s.pb,
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
          includeFontPadding: false,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
