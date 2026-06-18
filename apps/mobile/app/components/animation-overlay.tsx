import { View, Dimensions } from "react-native";
import Animated, { useAnimatedStyle, interpolate } from "react-native-reanimated";
import { useWalletAnimation } from "../lib/wallet-animation-context";

const THUMBNAIL_WIDTH = 120;
const THUMBNAIL_HEIGHT = 64;

export function AnimationOverlay() {
  const { animating, animationSource, walletTabLayout, animationProgress } =
    useWalletAnimation();

  const { width: screenWidth } = Dimensions.get("window");

  const animatedStyle = useAnimatedStyle(() => {
    if (!animationSource || !walletTabLayout) {
      return { opacity: 0 };
    }

    const srcCenterX = animationSource.x + animationSource.width / 2;
    const srcCenterY = animationSource.y + animationSource.height / 2;
    const dstCenterX = walletTabLayout.x + walletTabLayout.width / 2;
    const dstCenterY = walletTabLayout.y + walletTabLayout.height / 2;

    const p = animationProgress.value;

    const translateX =
      srcCenterX + (dstCenterX - srcCenterX) * p - THUMBNAIL_WIDTH / 2;
    const translateY =
      srcCenterY + (dstCenterY - srcCenterY) * p - THUMBNAIL_HEIGHT / 2;

    const scale = interpolate(p, [0, 1], [1, 0.15]);
    const skewX = interpolate(p, [0, 0.5, 1], [0, 8, 0]);
    const opacity = interpolate(p, [0, 0.85, 1], [1, 1, 0]);

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { scale },
        { skewX: `${skewX}deg` },
      ],
    };
  });

  if (!animating) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: screenWidth,
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            position: "absolute",
            width: THUMBNAIL_WIDTH,
            height: THUMBNAIL_HEIGHT,
            backgroundColor: "#1a1a1a",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#333",
          },
        ]}
      />
    </View>
  );
}
