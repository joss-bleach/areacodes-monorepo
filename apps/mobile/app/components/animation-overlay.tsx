import { View, Dimensions } from "react-native";
import Animated, { useAnimatedStyle, interpolate } from "react-native-reanimated";
import { useWalletAnimation } from "../lib/wallet-animation-context";

export function AnimationOverlay() {
  const { animating, animationSource, walletTabLayout, animationProgress } =
    useWalletAnimation();

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const animatedStyle = useAnimatedStyle(() => {
    if (!animationSource || !walletTabLayout) {
      return { opacity: 0 };
    }

    const w = animationSource.width;
    const h = Math.min(animationSource.height, 260);

    const srcCenterX = animationSource.x + animationSource.width / 2;
    const srcCenterY = animationSource.y + h / 2;
    const dstCenterX = walletTabLayout.x + walletTabLayout.width / 2;
    const dstCenterY = walletTabLayout.y + walletTabLayout.height / 2;

    const p = animationProgress.value;

    // Accelerate toward wallet (ease-in on position)
    const pEased = p * p;

    const centerX = srcCenterX + (dstCenterX - srcCenterX) * pEased;
    const centerY = srcCenterY + (dstCenterY - srcCenterY) * pEased;

    const translateX = centerX - w / 2;
    const translateY = centerY - h / 2;

    // Shrink to a point — scaleY collapses faster to sell the "sucked in" feel
    const scale = interpolate(p, [0, 1], [1, 0.04]);
    const scaleY = interpolate(p, [0, 0.3, 1], [1, 0.85, 0.04]);

    // Skew leans as it flies, peaks mid-animation
    const skewX = interpolate(p, [0, 0.4, 0.75, 1], [0, -12, -6, 0]);
    const skewY = interpolate(p, [0, 0.35, 0.7, 1], [0, 5, 2, 0]);

    const opacity = interpolate(p, [0, 0.55, 0.9, 1], [1, 1, 0.6, 0]);

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { scale },
        { scaleY },
        { skewX: `${skewX}deg` },
        { skewY: `${skewY}deg` },
      ],
    };
  });

  if (!animating) return null;

  const w = animationSource?.width ?? 300;
  const h = Math.min(animationSource?.height ?? 200, 260);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: screenWidth,
        height: screenHeight,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            position: "absolute",
            width: w,
            height: h,
            backgroundColor: "#111111",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#2a2a2a",
            overflow: "hidden",
          },
        ]}
      >
        {/* Subtle inner highlight to sell it as a card */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: "#333",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        />
      </Animated.View>
    </View>
  );
}
