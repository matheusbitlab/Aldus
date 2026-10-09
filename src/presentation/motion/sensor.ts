import { Platform } from "react-native";
export async function motionSensor() {
 if (Platform.OS !== "android") throw new Error("Android necessário");
 return (await import("expo-sensors")).DeviceMotion;
}
export async function motionAvailable() {
 try { return await (await motionSensor()).isAvailableAsync(); } catch { return false; }
}

export async function motionCapabilities() {
 if (Platform.OS !== "android") return { deviceMotion: false, accelerometer: false };
 try {
  const { DeviceMotion, Accelerometer } = await import("expo-sensors");
  const [deviceMotion, accelerometer] = await Promise.all([DeviceMotion.isAvailableAsync(), Accelerometer.isAvailableAsync()]);
  return { deviceMotion, accelerometer };
 } catch { return { deviceMotion: false, accelerometer: false }; }
}
