import { Platform } from "react-native";
export async function motionSensor() {
 if (Platform.OS !== "android") throw new Error("Android necessário");
 return (await import("expo-sensors")).DeviceMotion;
}
export async function motionAvailable() {
 try { return await (await motionSensor()).isAvailableAsync(); } catch { return false; }
}
