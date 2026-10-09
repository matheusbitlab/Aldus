import { useEffect, useRef, useState, PropsWithChildren } from "react";
import { AccessibilityInfo, Animated } from "react-native";

export function FlashcardFlip({
  revealed,
  children,
}: PropsWithChildren<{ revealed: boolean }>) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    opacity.stopAnimation();
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0.4);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [revealed, reduced, opacity]);
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity,
        transform: reduced
          ? []
          : [
              { perspective: 800 },
              {
                rotateY: opacity.interpolate({
                  inputRange: [0.4, 1],
                  outputRange: ["-90deg", "0deg"],
                }),
              },
            ],
      }}
    >
      {children}
    </Animated.View>
  );
}
