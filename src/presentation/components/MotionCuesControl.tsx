import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useMotionCuesStore } from "../stores/motionCuesStore";
import { motionAvailable, motionSensor } from "../motion/sensor";
export function MotionCuesControl({ color }: { color: string }) {
 const { enabled, hydrated, status, message, setEnabled, setStatus } = useMotionCuesStore();
 const [busy, setBusy] = useState(false);
 useEffect(() => {
  let active = true;
  void motionAvailable().then((available) => {
   if (!active) return;
   setStatus(available ? "available" : "unavailable", available ? "" : "Disponível no Android com expo-sensors.");
  });
  return () => { active = false; };
 }, [setStatus]);
 const toggle = async (value: boolean) => {
  if (!value) { setEnabled(false); return; }
  setBusy(true);
  try {
   const sensor = await motionSensor();
   if (!await sensor.isAvailableAsync()) { setStatus("unavailable", "DeviceMotion indisponível neste aparelho/build. Não foram recebidos dados de movimento."); return; }
   let permission = await sensor.getPermissionsAsync();
   if (!permission.granted && permission.canAskAgain) permission = await sensor.requestPermissionsAsync();
   if (permission.granted) { setStatus("checking", "Aguardando dados de movimento…"); setEnabled(true); }
   else setStatus("unavailable", "Permissão de movimento negada. Revise as permissões do app nas configurações do Android.");
  } catch { setStatus("unavailable", "Sensores indisponíveis neste aplicativo."); }
  finally { setBusy(false); }
 };
 return <View style={{ marginTop: 20, gap: 8 }}>
  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
    <Text style={{ color, fontWeight: "600" }}>Modo anti-enjoo</Text>
    <Switch accessibilityLabel="Modo anti-enjoo" value={enabled} disabled={busy || !hydrated} onValueChange={value => { void toggle(value); }} />
  </View>
  <Text style={{ color, fontSize: 12 }}>Exibe indicadores de movimento nas bordas da tela durante a leitura.</Text>
  {message ? <Text accessibilityRole="alert" style={{ color, fontSize: 12 }}>{message}</Text> : null}
 </View>;
}
