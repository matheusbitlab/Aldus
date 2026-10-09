import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface Props {
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  minimumValue: number;
  maximumValue: number;
  step: number;
  value: number;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
  onValueChange: (value: number) => void;
}

// A vertical gesture belongs to the surrounding preferences ScrollView.
// Android SeekBar takes ownership on DOWN, before direction can be determined.
export const isSettingsSliderGesture = (dx: number, dy: number) => Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy);

export function ReaderSettingsSlider(props: Props) {
  const latest = useRef(props); latest.current = props;
  const width = useRef(0);
  const [preview, setPreview] = useState<number | null>(null);
  const gestureValue = useRef(props.value);
  const valueAtStart = useRef(props.value);
  const quantize = (value: number) => {
    const p = latest.current;
    return Math.max(p.minimumValue, Math.min(p.maximumValue, p.minimumValue + Math.round((value - p.minimumValue) / p.step) * p.step));
  };
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => isSettingsSliderGesture(gesture.dx, gesture.dy),
    onPanResponderGrant: () => { valueAtStart.current = latest.current.value; gestureValue.current = latest.current.value; setPreview(latest.current.value); },
    onPanResponderMove: (_, gesture) => {
      const p = latest.current;
      gestureValue.current = quantize(valueAtStart.current + gesture.dx / Math.max(1, width.current - 24) * (p.maximumValue - p.minimumValue));
      setPreview(gestureValue.current);
    },
    onPanResponderRelease: () => { latest.current.onValueChange(gestureValue.current); setPreview(null); },
    onPanResponderTerminate: () => setPreview(null),
    onPanResponderTerminationRequest: () => true,
  }), []);
  const p = latest.current;
  const shown = preview ?? p.value;
  const percent = 100 * (shown - p.minimumValue) / (p.maximumValue - p.minimumValue);
  return (
    <View style={props.style} {...responder.panHandlers} onLayout={event => { width.current = event.nativeEvent.layout.width; }}>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel={props.accessibilityLabel}
        accessibilityValue={{ min: p.minimumValue, max: p.maximumValue, now: shown }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={event => p.onValueChange(quantize(p.value + (event.nativeEvent.actionName === "increment" ? p.step : -p.step)))}
        onPress={event => p.onValueChange(quantize(p.minimumValue + Math.max(0, event.nativeEvent.locationX - 12) / Math.max(1, width.current - 24) * (p.maximumValue - p.minimumValue)))}
        style={styles.touchArea}
      >
        <View pointerEvents="none" style={[styles.track, { backgroundColor: props.maximumTrackTintColor }]}>
          <View style={[styles.fill, { width: `${percent}%`, backgroundColor: props.minimumTrackTintColor }]} />
          <View style={[styles.thumb, { left: `${percent}%`, backgroundColor: props.thumbTintColor }]} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: { flex: 1, minHeight: 38, justifyContent: "center", paddingHorizontal: 12 },
  track: { height: 4, borderRadius: 2 },
  fill: { height: 4, borderRadius: 2 },
  thumb: { position: "absolute", top: -10, marginLeft: -12, width: 24, height: 24, borderRadius: 12 },
});
