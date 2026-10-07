// Prototype: acceleration m/s²; displacement in React Native points.
export const MOTION = { intervalMs: 33, tauMs: 160, deadZone: 0.12, gain: 3, maxX: 7, maxY: 16, staleMs: 1500 };
export type Vector = { x: number; y: number };
// Android Expo emits device axes, unrotated: +X right, +Y up in natural portrait.
// Apply display orientation once, then invert Y for screen coordinates.
// Cues follow acceleration; never integrate velocity or position.
export function screenAcceleration(a: Vector | null | undefined, orientation: number): Vector | null {
 if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y) || ![0, 90, 180, -90].includes(orientation)) return null;
 switch (orientation) {
  case 90: return { x: a.y, y: a.x };
  case -90: return { x: -a.y, y: -a.x };
  case 180: return { x: -a.x, y: a.y };
  default: return { x: a.x, y: -a.y };
 }
}
export function deadZone(value: number): number {
 return Math.abs(value) <= MOTION.deadZone ? 0 : Math.sign(value) * (Math.abs(value) - MOTION.deadZone);
}
export function displacement(a: Vector): Vector {
 const limit = (v: number, max: number) => Math.max(-max, Math.min(max, deadZone(v) * MOTION.gain));
 return { x: limit(a.x, MOTION.maxX), y: limit(a.y, MOTION.maxY) };
}
export function smooth(previous: Vector, target: Vector, dtMs: number): Vector {
 const alpha = 1 - Math.exp(-Math.max(0, Math.min(250, dtMs)) / MOTION.tauMs);
 return { x: previous.x + alpha * (target.x - previous.x), y: previous.y + alpha * (target.y - previous.y) };
}
