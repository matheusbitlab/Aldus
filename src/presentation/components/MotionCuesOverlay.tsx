import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMotionCues } from "../motion/useMotionCues";

export function MotionCuesOverlay({ color }: { color: string }) {
 const insets = useSafeAreaInsets();
 const { x, y, opacity } = useMotionCues();
 const animated = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: x.value }, { translateY: y.value }] }));
 return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
  style={[StyleSheet.absoluteFill, { top: insets.top + 32, bottom: insets.bottom + 32, left: insets.left, right: insets.right }]}>
  {(["left", "right"] as const).map(side => <View key={side} style={{ position: "absolute", [side]: 10, top: 0, bottom: 0, justifyContent: "space-around" }}>
   {[0, 1, 2, 3].map(index => <Animated.View key={index} style={[{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }, animated]} />)}
  </View>)}
 </View>;
}
