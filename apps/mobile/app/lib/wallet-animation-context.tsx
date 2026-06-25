import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type View } from "react-native";
import {
  useSharedValue,
  withTiming,
  withSequence,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";

export type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WalletAnimationContextType = {
  registerWalletTabRef: (ref: View | null) => void;
  triggerClaimAnimation: (sourceLayout: LayoutRect) => void;
  walletTabLayout: LayoutRect | null;
  animationSource: LayoutRect | null;
  animating: boolean;
  animationProgress: SharedValue<number>;
  bounceProgress: SharedValue<number>;
};

const WalletAnimationContext = createContext<WalletAnimationContextType | null>(
  null,
);

export function WalletAnimationProvider({ children }: { children: ReactNode }) {
  const walletTabRef = useRef<View | null>(null);
  const [walletTabLayout, setWalletTabLayout] = useState<LayoutRect | null>(null);
  const [animationSource, setAnimationSource] = useState<LayoutRect | null>(null);
  const [animating, setAnimating] = useState(false);
  const animationProgress = useSharedValue(0);
  const bounceProgress = useSharedValue(1);

  function registerWalletTabRef(ref: View | null) {
    walletTabRef.current = ref;
    if (ref) {
      // Measure after next frame so layout is settled
      setTimeout(() => {
        ref.measure((_x, _y, width, height, pageX, pageY) => {
          setWalletTabLayout({ x: pageX, y: pageY, width, height });
        });
      }, 0);
    }
  }

  function triggerClaimAnimation(sourceLayout: LayoutRect) {
    setAnimationSource(sourceLayout);
    setAnimating(true);
    animationProgress.value = 0;
    animationProgress.value = withTiming(1, { duration: 700 }, (finished) => {
      if (finished) {
        bounceProgress.value = withSequence(
          withSpring(1.35, { damping: 18, stiffness: 400 }),
          withSpring(1, { damping: 18, stiffness: 400 }),
        );
      }
    });
    // Clean up after animation
    setTimeout(() => {
      setAnimating(false);
      setAnimationSource(null);
    }, 800);
  }

  return (
    <WalletAnimationContext.Provider
      value={{
        registerWalletTabRef,
        triggerClaimAnimation,
        walletTabLayout,
        animationSource,
        animating,
        animationProgress,
        bounceProgress,
      }}
    >
      {children}
    </WalletAnimationContext.Provider>
  );
}

export function useWalletAnimation() {
  const ctx = useContext(WalletAnimationContext);
  if (!ctx) throw new Error("useWalletAnimation must be inside WalletAnimationProvider");
  return ctx;
}
