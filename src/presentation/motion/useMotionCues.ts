import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { cancelAnimation, useSharedValue, withTiming } from "react-native-reanimated";
import type { DeviceMotionMeasurement } from "expo-sensors";
import { useMotionCuesStore } from "../stores/motionCuesStore";
import { motionAvailable, motionSensor } from "./sensor";
import { displacement, MOTION, screenAcceleration, smooth, Vector } from "./processing";
import { startMotionSession } from "./session";

export function useMotionCues() {
 const enabled = useMotionCuesStore(s => s.enabled);
 const hydrated = useMotionCuesStore(s => s.hydrated);
 const [focused, setFocused] = useState(false);
 useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
 const [active, setActive] = useState(AppState.currentState === "active");
 const x = useSharedValue(0), y = useSharedValue(0), opacity = useSharedValue(0);
 useEffect(() => {
  const subscription = AppState.addEventListener("change", state => setActive(state === "active"));
  return () => subscription.remove();
 }, []);
 useEffect(() => {
  let cancelled = false;
  void motionAvailable().then(available => {
   if (!cancelled) useMotionCuesStore.getState().setStatus(available ? "available" : "unavailable", available ? "" : "Sensores indisponíveis. Use um build Android com expo-sensors.");
  });
  return () => { cancelled = true; };
 }, []);
 useEffect(() => {
  const reset = () => {
   cancelAnimation(x); cancelAnimation(y); cancelAnimation(opacity);
   x.value = 0; y.value = 0; opacity.value = 0;
  };
  reset();
  if (!enabled || !hydrated || !focused || !active) return reset;
  let sensor: Awaited<ReturnType<typeof motionSensor>>;
  let previous: Vector = { x: 0, y: 0 }, lastTimestamp: number | null = null, orientation: number | null = null;
  return startMotionSession<DeviceMotionMeasurement>({
   available: async () => {
    sensor = await motionSensor();
    if (!await sensor.isAvailableAsync()) return false;
    return (await sensor.getPermissionsAsync()).granted;
   },
   subscribe: receive => {
    sensor.setUpdateInterval(MOTION.intervalMs);
    return sensor.addListener(receive);
   },
   valid: sample => !!screenAcceleration(sample.acceleration, sample.orientation) &&
    Number.isFinite(sample.acceleration?.z) && Number.isFinite(sample.acceleration?.timestamp) &&
    (lastTimestamp === null || sample.acceleration!.timestamp > lastTimestamp),
   receive: sample => {
    const timestamp = sample.acceleration!.timestamp;
    if (orientation !== sample.orientation) { previous = { x: 0, y: 0 }; lastTimestamp = null; }
    const dt = lastTimestamp === null ? MOTION.intervalMs : (timestamp - lastTimestamp) * 1000;
    previous = smooth(previous, displacement(screenAcceleration(sample.acceleration, sample.orientation)!), dt);
    lastTimestamp = timestamp; orientation = sample.orientation;
    x.value = withTiming(previous.x, { duration: MOTION.intervalMs });
    y.value = withTiming(previous.y, { duration: MOTION.intervalMs });
    opacity.value = withTiming(0.6, { duration: 100 });
   },
   status: available => {
    const store = useMotionCuesStore.getState();
    const status = available ? "available" : "unavailable";
    if (store.status !== status) store.setStatus(status, available ? "" : "Sem aceleração válida ou permissão. Desative e ative para tentar novamente.");
   },
   reset, staleMs: MOTION.staleMs,
  });
 }, [enabled, hydrated, focused, active, x, y, opacity]);
 return { x, y, opacity };
}
