import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import type { ViewStyle } from "react-native";

interface SkeletonBoxProps {
  style?: ViewStyle;
  className?: string;
}

export function SkeletonBox({ style, className }: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ opacity, backgroundColor: "#27272A" }, style]}
      className={className}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
