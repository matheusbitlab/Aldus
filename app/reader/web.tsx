import { useLocalSearchParams } from "expo-router";
import { SafeAreaView, StyleSheet, Text } from "react-native";
import { WebView } from "react-native-webview";
import { AuthGuard } from "@/src/presentation/components/AuthGuard";
export default function WebReader() { const { url, title } = useLocalSearchParams<{ url: string; title?: string }>(); return <AuthGuard>{!url ? <SafeAreaView style={styles.center}><Text>Link de leitura não encontrado.</Text></SafeAreaView> : <SafeAreaView style={styles.screen}><Text style={styles.title} numberOfLines={1}>{title ?? "Leitor online"}</Text><WebView source={{ uri: url }} startInLoadingState style={styles.webview} /></SafeAreaView>}</AuthGuard>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#F7F4EE" }, title: { padding: 16, color: "#1F2D2B", fontWeight: "700" }, webview: { flex: 1 }, center: { flex: 1, justifyContent: "center", alignItems: "center" } });
