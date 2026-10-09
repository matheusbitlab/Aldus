const enabled = process.env.EXPO_PUBLIC_MOTION_DIAGNOSTICS === "1";
let sequence = 0;
export function nextMotionSessionId() { return ++sequence; }
export function motionDiagnostic(sessionId: number, event: string, fields: { deviceMotion?: boolean; accelerometer?: boolean; permission?: boolean; received?: number; accepted?: number; orientation?: number; timestamp?: number; acceleration?: boolean; gravity?: boolean; rotation?: boolean; x?: number; y?: number; opacity?: number; enabled?: boolean; hydrated?: boolean; focused?: boolean; active?: boolean } = {}) {
 if (enabled) console.info("[MotionDiagnostic]", JSON.stringify({ sessionId, event, at: Date.now(), ...fields }));
}
