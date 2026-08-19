import { SafeAreaView, StyleSheet, Text } from "react-native";

export default function Settings() {
  return <SafeAreaView style={styles.screen}><Text style={styles.eyebrow}>PREFERENCES</Text><Text style={styles.title}>Settings</Text><Text style={styles.body}>Reader preferences are available from the reading controls.</Text></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#F7F4EE", padding: 28 }, eyebrow: { color: "#D97757", fontSize: 11, fontWeight: "700", letterSpacing: 2 }, title: { color: "#1F2D2B", fontSize: 36, fontWeight: "700", marginTop: 8 }, body: { color: "#68716D", marginTop: 16, fontSize: 16 } });
