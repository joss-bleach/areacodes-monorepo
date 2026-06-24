import { useRef } from "react";
import {
  Dimensions,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const ONBOARDING_KEY = "hasSeenOnboarding";

const { width: W, height: H } = Dimensions.get("window");
const PARALLAX_FACTOR = 0.18;
const BAR_WIDTH = (W - 32 - 12) / 4;

const SLIDES = [
  {
    image: require("../../assets/onboarding/1.png") as number,
    title: "Explore the map",
    subtitle: "Every pin is an independent business waiting to be discovered.",
  },
  {
    image: require("../../assets/onboarding/2.png") as number,
    title: "Save your vouchers",
    subtitle: "Find exclusive deals from the businesses you love.",
  },
  {
    image: require("../../assets/onboarding/3.png") as number,
    title: "Support locals",
    subtitle: "Save money, and put it straight back into your neighbourhood.",
  },
  {
    image: require("../../assets/onboarding/4.png") as number,
    title: "Get updates on your favourite spots",
    subtitle: "Get notified when your favourite independents have new offers.",
  },
];

function ProgressBar({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const fillStyle = useAnimatedStyle(() => {
    const width = interpolate(
      scrollX.value,
      [index * W, (index + 1) * W],
      [0, BAR_WIDTH],
      "clamp",
    );
    return { width };
  });

  return (
    <View
      style={{
        flex: 1,
        height: 3,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.35)",
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          { position: "absolute", left: 0, height: 3, borderRadius: 2, backgroundColor: "white" },
          fillStyle,
        ]}
      />
    </View>
  );
}

function ParallaxImage({
  source,
  index,
  scrollX,
}: {
  source: number;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      [(index - 1) * W, index * W, (index + 1) * W],
      [W * PARALLAX_FACTOR, 0, -W * PARALLAX_FACTOR],
      "clamp",
    );
    return { transform: [{ translateX }] };
  });

  return (
    <Animated.Image
      source={source}
      style={[{ position: "absolute", width: W, height: H }, animatedStyle]}
      resizeMode="cover"
    />
  );
}

function SlideText({
  title,
  subtitle,
  index,
  scrollX,
}: {
  title: string;
  subtitle: string;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const titleStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value,
      [(index - 0.5) * W, index * W],
      [0, 1],
      "clamp",
    );
    return {
      opacity: progress,
      transform: [{ translateY: interpolate(progress, [0, 1], [28, 0]) }],
    };
  });

  const subtitleStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value,
      [(index - 0.35) * W, index * W],
      [0, 1],
      "clamp",
    );
    return {
      opacity: progress,
      transform: [{ translateY: interpolate(progress, [0, 1], [20, 0]) }],
    };
  });

  return (
    <>
      <Animated.View style={titleStyle}>
        <Text
          style={{
            color: "white",
            fontSize: 26,
            fontFamily: "Poppins_700Bold",
            lineHeight: 34,
            marginBottom: 6,
          }}
        >
          {title}
        </Text>
      </Animated.View>
      <Animated.View style={[subtitleStyle, { marginBottom: 24 }]}>
        <Text
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 14,
            fontFamily: "Poppins_400Regular",
            lineHeight: 20,
          }}
        >
          {subtitle}
        </Text>
      </Animated.View>
    </>
  );
}

function SlideButton({ label, onPress }: { label: string; onPress: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 10, stiffness: 250 });
        }}
        onPress={onPress}
        style={{
          backgroundColor: "white",
          paddingVertical: 14,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "black",
            fontFamily: "Poppins_600SemiBold",
            fontSize: 15,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  async function handleContinue() {
    await Notifications.requestPermissionsAsync();
    if (!__DEV__) {
      await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
    }
    router.push("/sign-up");
  }

  function scrollToSlide(index: number) {
    scrollRef.current?.scrollTo({ x: index * W, animated: true });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {/* Progress bars — fixed overlay */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 16,
          right: 16,
          flexDirection: "row",
          gap: 4,
          zIndex: 10,
        }}
      >
        {SLIDES.map((_, i) => (
          <ProgressBar key={i} index={i} scrollX={scrollX} />
        ))}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={{ width: W, height: H, overflow: "hidden" }}>
            <ParallaxImage source={slide.image} index={i} scrollX={scrollX} />

            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                paddingHorizontal: 24,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <SlideText
                title={slide.title}
                subtitle={slide.subtitle}
                index={i}
                scrollX={scrollX}
              />
              <SlideButton
                label={i === SLIDES.length - 1 ? "Continue" : "Next"}
                onPress={() => {
                  if (i < SLIDES.length - 1) {
                    scrollToSlide(i + 1);
                  } else {
                    void handleContinue();
                  }
                }}
              />
            </View>
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}
