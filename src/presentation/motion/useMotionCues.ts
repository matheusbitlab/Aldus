import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { cancelAnimation, useSharedValue, withTiming } from "react-native-reanimated";
import type { DeviceMotionMeasurement } from "expo-sensors";
import { useMotionCuesStore } from "../stores/motionCuesStore";
import { motionAvailable, motionCapabilities, motionSensor } from "./sensor";
import { motionDiagnostic, nextMotionSessionId } from "@/src/utils/motionDiagnostics";
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
  const sessionId = nextMotionSessionId();
  if (process.env.EXPO_PUBLIC_MOTION_DIAGNOSTICS === "1") {
   void motionCapabilities().then(capabilities => { if (!cancelled) motionDiagnostic(sessionId, "capabilities", capabilities); });
  }
  void motionAvailable().then(available => {
   if (!cancelled) useMotionCuesStore.getState().setStatus(available ? "available" : "unavailable", available ? "" : "Sensores indisponíveis. Use um build Android com expo-sensors.");
  });
  return () => { cancelled = true; };
 }, []);
 useEffect(() => {
  const sessionId = nextMotionSessionId();
  let previous: Vector = { x: 0, y: 0 }, lastTimestamp: number | null = null, orientation: number | null = null;
  let received = 0, accepted = 0;
  const reset = () => {
   previous = { x: 0, y: 0 };
   cancelAnimation(x); cancelAnimation(y); cancelAnimation(opacity);
   x.value = 0; y.value = 0; opacity.value = 0;
  };
  reset();
  motionDiagnostic(sessionId, "lifecycle", { enabled, hydrated, focused, active });
  if (!enabled || !hydrated || !focused || !active) return reset;
  let sensor: Awaited<ReturnType<typeof motionSensor>>;
  return startMotionSession<DeviceMotionMeasurement>({
   available: async () => {
    sensor = await motionSensor();
    const deviceMotion = await sensor.isAvailableAsync();
    motionDiagnostic(sessionId, "availability", { deviceMotion });
    if (!deviceMotion) return false;
    const permission = (await sensor.getPermissionsAsync()).granted;
    motionDiagnostic(sessionId, "permission", { permission });
    return permission;
   },
   subscribe: receive => {
    sensor.setUpdateInterval(MOTION.intervalMs);
    return sensor.addListener(receive);
   },
   valid: sample => {
    received++;
    const valid = !!screenAcceleration(sample.acceleration, sample.orientation) &&
     Number.isFinite(sample.acceleration?.z) && Number.isFinite(sample.acceleration?.timestamp) &&
     (lastTimestamp === null || sample.acceleration!.timestamp > lastTimestamp);
    if (received <= 3 || received % 120 === 0) motionDiagnostic(sessionId, valid ? "sample-valid" : "sample-invalid", { received, accepted, orientation: sample.orientation, timestamp: sample.acceleration?.timestamp, acceleration: Boolean(sample.acceleration), gravity: Boolean(sample.accelerationIncludingGravity), rotation: Boolean(sample.rotation) });
    return valid;
   },
   receive: sample => {
    const timestamp = sample.acceleration!.timestamp;
    accepted++;
    if (orientation !== sample.orientation) { previous = { x: 0, y: 0 }; lastTimestamp = null; }
    const dt = lastTimestamp === null ? MOTION.intervalMs : (timestamp - lastTimestamp) * 1000;
    previous = smooth(previous, displacement(screenAcceleration(sample.acceleration, sample.orientation)!), dt);
    lastTimestamp = timestamp; orientation = sample.orientation;
    x.value = withTiming(previous.x, { duration: MOTION.intervalMs });
    y.value = withTiming(previous.y, { duration: MOTION.intervalMs });
    opacity.value = withTiming(0.6, { duration: 100 });
    if (accepted === 1 || accepted % 120 === 0) motionDiagnostic(sessionId, "overlay-update", { received, accepted, x: previous.x, y: previous.y, opacity: 0.6 });
   },
   status: available => {
    const store = useMotionCuesStore.getState();
    const status = available ? "available" : "unavailable";
    if (store.status !== status) store.setStatus(status, available ? "" : "Aguardando dados válidos de movimento. Os indicadores reaparecem quando o sensor responder.");
   },
   trace: event => { if (!["sample", "invalid"].includes(event)) motionDiagnostic(sessionId, event, { received, accepted }); },
   reset, staleMs: MOTION.staleMs,
  });
 }, [enabled, hydrated, focused, active, x, y, opacity]);
 return { x, y, opacity };
}
