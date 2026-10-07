import { useLocalSearchParams } from "expo-router";
import { SafeAreaView, StyleSheet, Text } from "react-native";
import { WebView } from "react-native-webview";
import { AuthGuard } from "@/src/presentation/components/AuthGuard";

const providers = { biblion: { title: "BibliON", url: "https://www.biblion.org.br/" }, mec: { title: "MEC Livros", url: "https://plataformaintegrada.mec.gov.br/" } } as const;
export default function ServiceWebView() { const { provider } = useLocalSearchParams<{ provider: string }>(); const service = providers[provider as keyof typeof providers]; return <AuthGuard>{!service ? <SafeAreaView style={styles.center}><Text>Serviço não encontrado.</Text></SafeAreaView> : <SafeAreaView style={styles.screen}><Text style={styles.title}>{service.title}</Text><WebView source={{ uri: service.url }} startInLoadingState style={styles.webview} /></SafeAreaView>}</AuthGuard>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#F7F4EE" }, title: { paddingHorizontal: 18, paddingVertical: 14, color: "#1F2D2B", fontWeight: "700", fontSize: 18 }, webview: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center" } });
